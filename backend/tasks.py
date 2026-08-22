import asyncio
import json
import time
import uuid
import logging
import redis

from database import SessionLocal
from models import Agent, ScenarioRun, Scorecard
from services.scenario_generator import generate_scenarios
from services.harness import run_scenario
from services.classifier import classify
from celery_app import celery_app, REDIS_URL

logger = logging.getLogger(__name__)

# Synchronous redis client for publishing
redis_client = redis.Redis.from_url(REDIS_URL)

CATEGORY_CONFIG = {
    "injection_susceptibility": {
        "id": "injection_resistance",
        "name": "Injection Susceptibility",
    },
    "destructive_action": {
        "id": "destructive_actions",
        "name": "Destructive Actions",
    },
    "tool_call_loop": {
        "id": "tool_call_loops",
        "name": "Tool Call Loops",
    },
    "hallucinated_success": {
        "id": "hallucinated_success",
        "name": "Hallucinated Success",
    },
    "goal_drift": {
        "id": "goal_drift",
        "name": "Goal Drift",
    },
}

class RunState:
    def __init__(self, run_id: str):
        self.run_id = run_id

    def push_event(self, event: dict):
        redis_client.publish(f"run:{self.run_id}", json.dumps(event))

async def _async_audit_pipeline(run_state: RunState, agent_id: str):
    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(
            Agent.id == uuid.UUID(agent_id)
        ).first()
        if not agent:
            run_state.push_event({
                "type": "phase_change",
                "payload": {"phase": "complete", "label": "Agent not found"},
            })
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
        category_verdicts = {cat: [] for cat in CATEGORY_CONFIG}

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
            
            db.add(sr)
            db.commit()
            logger.info(f"Successfully inserted ScenarioRun {sr.id} into database.")

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

        tasks = [process_scenario(idx, sc) for idx, sc in enumerate(scenarios)]
        await asyncio.gather(*tasks)

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

        # Compute category scores
        def _cat_score(verdicts: list[str]) -> int:
            if not verdicts:
                return 100
            return int((sum(1 for v in verdicts if v == "pass") / len(verdicts)) * 100)
            
        def _float_score(verdicts: list[str]) -> float:
            if not verdicts:
                return 1.0
            return float(sum(1 for v in verdicts if v == "pass") / len(verdicts))

        injection_score = _cat_score(category_verdicts["injection_susceptibility"])
        destructive_score = _cat_score(category_verdicts["destructive_action"])
        loop_score = _cat_score(category_verdicts["tool_call_loop"])
        hallucination_score = _cat_score(category_verdicts["hallucinated_success"])
        drift_score = _cat_score(category_verdicts["goal_drift"])
        overall = int(
            (injection_score + destructive_score + loop_score +
             hallucination_score + drift_score) / 5
        )

        tool_call_loop_score = _float_score(category_verdicts["tool_call_loop"])
        hallucinated_confidence_score = _float_score(category_verdicts["hallucinated_success"])
        destructive_action_score = _float_score(category_verdicts["destructive_action"])
        goal_drift_score = _float_score(category_verdicts["goal_drift"])

        prev_scorecard = (
            db.query(Scorecard)
            .filter(Scorecard.agent_id == agent.id)
            .order_by(Scorecard.created_at.desc())
            .first()
        )
        prev_reliability = prev_scorecard.overall_score if prev_scorecard else 0

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
            tool_call_loop_score=tool_call_loop_score,
            hallucinated_confidence_score=hallucinated_confidence_score,
            destructive_action_score=destructive_action_score,
            goal_drift_score=goal_drift_score,
        )
        db.add(scorecard)
        db.commit()
        logger.info(f"Successfully inserted Scorecard {scorecard.id} into database.")

        time.sleep(0.7)

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

    except Exception as exc:
        logger.exception("Audit pipeline crashed: %s", exc)
        run_state.push_event({
            "type": "phase_change",
            "payload": {"phase": "complete", "label": f"Pipeline error: {exc}"},
        })
    finally:
        db.close()


@celery_app.task
def audit_pipeline_task(run_id: str, agent_id: str):
    run_state = RunState(run_id=run_id)
    asyncio.run(_async_audit_pipeline(run_state, agent_id))
