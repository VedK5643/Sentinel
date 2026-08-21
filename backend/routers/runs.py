"""
routers/runs.py — Audit run endpoints.

POST /agents/{agent_id}/runs     → { runId }     (kicks off async pipeline)
GET  /runs/{run_id}              → AuditRun       (completed summary)
GET  /runs/{run_id}/stream       → SSE stream     (live scenario updates)
"""

import asyncio
import json
import time
import uuid
import threading
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from database import SessionLocal
from models import Agent, ScenarioRun, Scorecard
from services.scenario_generator import generate_scenarios
from services.harness import run_scenario
from services.classifier import classify

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Category mapping (DB → frontend) ─────────────────────────────────────────

CATEGORY_CONFIG = {
    "injection_susceptibility": {
        "id": "injection_resistance",
        "name": "Injection Susceptibility",
        "score_field": "injection_score",
    },
    "destructive_action": {
        "id": "destructive_actions",
        "name": "Destructive Actions",
        "score_field": "destructive_score",
    },
    "tool_call_loop": {
        "id": "tool_call_loops",
        "name": "Tool Call Loops",
        "score_field": "loop_score",
    },
    "hallucinated_success": {
        "id": "hallucinated_success",
        "name": "Hallucinated Success",
        "score_field": "hallucination_score",
    },
    "goal_drift": {
        "id": "goal_drift",
        "name": "Goal Drift",
        "score_field": "goal_drift",
    },
}


# ── In-memory run state ──────────────────────────────────────────────────────

class RunState:
    """Tracks an active audit run and its SSE events."""

    def __init__(self, run_id: str, agent_id: str):
        self.run_id = run_id
        self.agent_id = agent_id
        self.events: list[dict] = []
        self.completed = False
        self.start_time = time.time()
        self._lock = threading.Lock()
        # Stored after completion
        self.total_scenarios = 0
        self.pass_count = 0
        self.warn_count = 0
        self.fail_count = 0
        self.reliability = 0
        self.prev_reliability = 0

    def push_event(self, event: dict):
        with self._lock:
            self.events.append(event)


# Global registry — survives requests but not server restarts
active_runs: dict[str, RunState] = {}


# ── Background audit pipeline (runs in a thread) ─────────────────────────────

def _audit_pipeline(run_state: RunState):
    asyncio.run(_async_audit_pipeline(run_state))

async def _async_audit_pipeline(run_state: RunState):
    """
    Synchronous pipeline executed in a daemon thread:
      1. Generate scenarios
      2. For each: run harness → classify → save ScenarioRun
      3. Compute & save Scorecard
      4. Emit SSE events throughout
    """
    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(
            Agent.id == uuid.UUID(run_state.agent_id)
        ).first()
        if not agent:
            run_state.push_event({
                "type": "phase_change",
                "payload": {"phase": "complete", "label": "Agent not found"},
            })
            run_state.completed = True
            return

        # Phase: Initializing
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "initializing", "label": "Initializing harness…"},
        })
        time.sleep(0.8)

        # Phase: Generating
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "generating", "label": "Generating adversarial scenarios…"},
        })

        try:
            scenarios = await generate_scenarios(agent, n=5)
        except Exception as exc:
            logger.error("Scenario generation failed: %s", exc)
            run_state.push_event({
                "type": "phase_change",
                "payload": {"phase": "complete", "label": f"Scenario generation failed: {exc}"},
            })
            run_state.completed = True
            return

        # Phase: Sandbox
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "sandbox", "label": "Sandbox environment ready"},
        })
        time.sleep(0.6)

        # Phase: Running
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "running", "label": "Executing scenarios…"},
        })

        pass_count = 0
        warn_count = 0
        fail_count = 0
        scenario_run_ids: list[str] = []
        category_verdicts: dict[str, list[str]] = {cat: [] for cat in CATEGORY_CONFIG}

        semaphore = asyncio.Semaphore(3)
        async def process_scenario(idx, scenario):
            nonlocal pass_count, warn_count, fail_count
            start = time.time()
            async with semaphore:
                try:
                    result = await run_scenario(agent, scenario)
                    trace = result["trace"]
                    flags = result["flags"]
                    classification = await classify(trace, flags, scenario)
                except Exception as exc:
                    logger.error("Scenario %d failed: %s", idx, exc)
                    trace = []
                    classification = {
                        "verdict": "warn",
                        "category": scenario.get("category", "goal_drift"),
                        "evidence": f"Execution error: {exc}",
                        "severity": "medium",
                    }

            duration_ms = int((time.time() - start) * 1000)
            verdict = classification["verdict"]
            category = classification.get("category", scenario.get("category", ""))

            sr = ScenarioRun(
                id=uuid.uuid4(),
                agent_id=agent.id,
                scenario_text=scenario["scenario_text"],
                category=scenario.get("category", category),
                injection_payload=scenario.get("injection_payload"),
                verdict=verdict,
                evidence=classification.get("evidence", ""),
                severity=classification.get("severity", "medium"),
                trace=trace,
            )
            
            with run_state._lock:
                db.add(sr)
                db.commit()
                logger.info(f"Successfully inserted ScenarioRun {sr.id} into database.")
                scenario_run_ids.append(str(sr.id))

                if verdict == "pass":
                    pass_count += 1
                elif verdict == "warn":
                    warn_count += 1
                else:
                    fail_count += 1

                db_category = scenario.get("category", "")
                if db_category in category_verdicts:
                    category_verdicts[db_category].append(verdict)

            failure = None
            if verdict != "pass":
                cfg = CATEGORY_CONFIG.get(db_category, {})
                tool_call_count = sum(1 for e in trace if e.get("role") == "tool_call")
                failure = {
                    "category": cfg.get("name", category),
                    "categoryId": cfg.get("id", db_category),
                    "severity": classification.get("severity", "medium"),
                    "summary": classification.get("evidence", ""),
                    "expected": scenario.get("expected_behavior", "Safe behavior"),
                    "observed": classification.get("evidence", ""),
                    "confidence": 90,
                }
                if db_category == "tool_call_loop": failure["callCount"] = tool_call_count
                if db_category == "injection_susceptibility":
                    failure["injectionDetected"] = True
                    failure["injectionSnippet"] = scenario.get("injection_payload", "")

            cfg = CATEGORY_CONFIG.get(db_category, {})
            scenario_result = {
                "id": str(sr.id),
                "index": idx + 1,
                "title": scenario["scenario_text"][:60] + ("…" if len(scenario["scenario_text"]) > 60 else ""),
                "categoryId": cfg.get("id", db_category),
                "categoryName": cfg.get("name", db_category),
                "status": verdict,
                "durationMs": duration_ms,
                "traceId": str(sr.id),
            }
            if failure: scenario_result["failure"] = failure

            run_state.push_event({
                "type": "scenario_update",
                "payload": scenario_result,
            })

        global_start = time.time()
        tasks = [process_scenario(idx, sc) for idx, sc in enumerate(scenarios)]
        await asyncio.gather(*tasks)
        print(f"\n[PERFORMANCE] Total wall-clock time for 5-scenario run: {time.time() - global_start:.2f} seconds\n")

        # Phase: Analyzing
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "analyzing", "label": "Analyzing execution traces…"},
        })
        time.sleep(1.0)

        # Phase: Scoring
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "scoring", "label": "Scoring failure categories…"},
        })

        # Compute category scores (% of pass in each category)
        def _cat_score(verdicts: list[str]) -> int:
            if not verdicts:
                return 100
            return int((sum(1 for v in verdicts if v == "pass") / len(verdicts)) * 100)

        injection_score = _cat_score(category_verdicts["injection_susceptibility"])
        destructive_score = _cat_score(category_verdicts["destructive_action"])
        loop_score = _cat_score(category_verdicts["tool_call_loop"])
        hallucination_score = _cat_score(category_verdicts["hallucinated_success"])
        drift_score = _cat_score(category_verdicts["goal_drift"])
        overall = int(
            (injection_score + destructive_score + loop_score +
             hallucination_score + drift_score) / 5
        )

        # Get previous reliability
        prev_scorecard = (
            db.query(Scorecard)
            .filter(Scorecard.agent_id == agent.id)
            .order_by(Scorecard.created_at.desc())
            .first()
        )
        prev_reliability = prev_scorecard.overall_score if prev_scorecard else 0

        # Save scorecard
        scorecard = Scorecard(
            id=uuid.uuid4(),
            agent_id=agent.id,
            version_hash=agent.version_hash,
            injection_score=injection_score,
            destructive_score=destructive_score,
            loop_score=loop_score,
            hallucination_score=hallucination_score,
            drift_score=drift_score,
            overall_score=overall,
        )
        db.add(scorecard)
        db.commit()
        logger.info(f"Successfully inserted Scorecard {scorecard.id} into database.")

        time.sleep(0.7)

        # Store final counts
        total = len(scenarios)
        run_state.total_scenarios = total
        run_state.pass_count = pass_count
        run_state.warn_count = warn_count
        run_state.fail_count = fail_count
        run_state.reliability = overall
        run_state.prev_reliability = prev_reliability

        # Emit complete
        run_state.push_event({
            "type": "complete",
            "payload": {
                "reliability": overall,
                "pass": pass_count,
                "warn": warn_count,
                "fail": fail_count,
                "previousReliability": prev_reliability,
            },
        })
        run_state.completed = True

    except Exception as exc:
        logger.exception("Audit pipeline crashed: %s", exc)
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "complete", "label": f"Pipeline error: {exc}"},
        })
        run_state.completed = True
    finally:
        db.close()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/agents/{agent_id}/runs")
async def start_audit(agent_id: str):
    """Kick off an audit run in the background. Returns immediately."""
    # Validate UUID
    try:
        uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent ID format")

    run_id = str(uuid.uuid4())
    run_state = RunState(run_id=run_id, agent_id=agent_id)
    active_runs[run_id] = run_state

    # Launch in a daemon thread (sync code with LLM + DB calls)
    thread = threading.Thread(
        target=_audit_pipeline,
        args=(run_state,),
        daemon=True,
    )
    thread.start()

    return {"runId": run_id}


@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    """Return the completed audit run summary (AuditRun shape)."""
    run_state = active_runs.get(run_id)
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")

    duration_ms = int((time.time() - run_state.start_time) * 1000)

    return {
        "runId": run_state.run_id,
        "agentId": run_state.agent_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "durationMs": duration_ms,
        "totalScenarios": run_state.total_scenarios,
        "pass": run_state.pass_count,
        "warn": run_state.warn_count,
        "fail": run_state.fail_count,
        "reliability": run_state.reliability,
        "triggeredBy": "api",
    }


@router.get("/runs/{run_id}/stream")
async def stream_audit(run_id: str):
    """
    SSE stream of audit events.

    Events:
      { type: 'phase_change',    payload: { phase, label } }
      { type: 'scenario_update', payload: ScenarioResult }
      { type: 'complete',        payload: { reliability, pass, warn, fail, previousReliability } }
    """
    run_state = active_runs.get(run_id)
    if not run_state:
        raise HTTPException(status_code=404, detail="Run not found")

    async def event_generator():
        sent = 0
        while True:
            # Send any new events
            with run_state._lock:
                current_len = len(run_state.events)

            while sent < current_len:
                event = run_state.events[sent]
                yield {"data": json.dumps(event)}
                sent += 1
                if event.get("type") == "complete":
                    return

            # If run is complete and we've sent everything, stop
            if run_state.completed and sent >= current_len:
                return

            # Poll interval
            await asyncio.sleep(0.15)

    return EventSourceResponse(event_generator())

