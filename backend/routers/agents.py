"""
routers/agents.py — Agent CRUD endpoints.

GET  /agents        → Agent[]
GET  /agents/{id}   → Agent
POST /agents        → Agent
"""

import uuid
import hashlib
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import Agent, ScenarioRun, Scorecard

router = APIRouter()


# ── Category mapping ─────────────────────────────────────────────────────────
# DB category → frontend categoryId + display name

CATEGORY_CONFIG = {
    "injection_susceptibility": {
        "id": "injection_resistance",
        "name": "Injection Resistance",
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
        "score_field": "drift_score",
    },
}

# Reverse map: frontend categoryId → DB category
CATEGORY_ID_TO_DB = {v["id"]: k for k, v in CATEGORY_CONFIG.items()}


def _agent_description(agent: Agent) -> str:
    """Derive a human-readable description from the agent name / prompt."""
    name = agent.name or ""
    if "fragile" in name.lower():
        return (
            "Customer support agent with minimal guardrails. "
            "Susceptible to injection, goal drift, and tool loops "
            "under adversarial conditions."
        )
    if "hardened" in name.lower():
        return (
            "Production-grade support agent with comprehensive guardrails, "
            "input sanitisation, and loop detection. Stable under adversarial load."
        )
    # Fallback: first sentence of system prompt
    prompt = agent.system_prompt or ""
    first_sentence = prompt.split(".")[0].strip()
    return first_sentence[:200] if first_sentence else "AI agent under test."


def _build_category_scores(scorecard: Scorecard | None,
                           prev_scorecard: Scorecard | None,
                           scenario_runs: list[ScenarioRun]) -> list[dict]:
    """Build CategoryScore[] from a scorecard + scenario_run counts."""
    scores = []
    for db_cat, cfg in CATEGORY_CONFIG.items():
        # Score from scorecard
        current_score = 0
        prev_score = 0
        if scorecard:
            current_score = getattr(scorecard, cfg["score_field"], 0) or 0
        if prev_scorecard:
            prev_score = getattr(prev_scorecard, cfg["score_field"], 0) or 0

        trend = current_score - prev_score

        # Count scenarios for this category
        cat_runs = [r for r in scenario_runs if r.category == db_cat]
        tested = len(cat_runs)
        failures = sum(1 for r in cat_runs if r.verdict == "fail")
        warns = sum(1 for r in cat_runs if r.verdict == "warn")

        scores.append({
            "id": cfg["id"],
            "name": cfg["name"],
            "score": current_score,
            "trend": trend,
            "scenariosTested": tested,
            "failures": failures,
            "warns": warns,
        })
    return scores


def _build_agent_response(agent: Agent, db: Session) -> dict:
    """
    Construct the full Agent response matching the frontend types.ts contract.
    Computes categoryScores, versions, reliability, etc. from DB data.
    """
    # Get all scorecards, newest first
    scorecards = (
        db.query(Scorecard)
        .filter(Scorecard.agent_id == agent.id)
        .order_by(desc(Scorecard.created_at))
        .all()
    )

    # Get all scenario runs for this agent
    all_runs = (
        db.query(ScenarioRun)
        .filter(ScenarioRun.agent_id == agent.id)
        .order_by(desc(ScenarioRun.created_at))
        .all()
    )

    latest_sc = scorecards[0] if scorecards else None
    prev_sc = scorecards[1] if len(scorecards) > 1 else None

    # Reliability
    reliability = latest_sc.overall_score if latest_sc else 0
    prev_reliability = prev_sc.overall_score if prev_sc else 0
    reliability_delta = reliability - prev_reliability

    # Status
    if reliability >= 80:
        status = "active"
    elif reliability >= 50:
        status = "degraded"
    else:
        status = "inactive" if scorecards else "inactive"

    # Current version
    current_version = (
        f"v{len(scorecards)}.0" if scorecards else "v0.0"
    )

    # Scenario counts from latest batch of runs
    # (runs created after the previous scorecard, or all if only one scorecard)
    if latest_sc:
        latest_batch = [
            r for r in all_runs
            if r.created_at and latest_sc.created_at
            and r.created_at >= (prev_sc.created_at if prev_sc else agent.created_at)
        ]
    else:
        latest_batch = all_runs

    total = len(latest_batch)
    pass_count = sum(1 for r in latest_batch if r.verdict == "pass")
    warn_count = sum(1 for r in latest_batch if r.verdict == "warn")
    fail_count = sum(1 for r in latest_batch if r.verdict == "fail")

    # Category scores
    category_scores = _build_category_scores(latest_sc, prev_sc, latest_batch)

    # Versions (from scorecards)
    versions = []
    for idx, sc in enumerate(reversed(scorecards)):
        ver_idx = idx + 1
        prev_for_ver = scorecards[len(scorecards) - idx] if idx > 0 and (len(scorecards) - idx) < len(scorecards) else None

        # Runs associated with this scorecard era
        ver_runs = all_runs  # simplified — use all runs for category computation

        ver_categories = _build_category_scores(sc, prev_for_ver, ver_runs)
        ver_reliability = sc.overall_score or 0
        regression = (
            prev_for_ver is not None
            and prev_for_ver.overall_score is not None
            and ver_reliability < prev_for_ver.overall_score
        )

        versions.append({
            "version": f"v{ver_idx}.0",
            "date": sc.created_at.isoformat() if sc.created_at else "",
            "reliability": ver_reliability,
            "categories": ver_categories,
            "regression": regression,
        })

    # Last audit
    last_audit = None
    if latest_sc and latest_batch:
        # Estimate duration from the runs
        run_times = [r.created_at for r in latest_batch if r.created_at]
        if len(run_times) >= 2:
            duration_ms = int(
                (max(run_times) - min(run_times)).total_seconds() * 1000
            )
        else:
            duration_ms = total * 3000  # estimate

        last_audit = {
            "runId": str(latest_sc.id),
            "agentId": str(agent.id),
            "timestamp": latest_sc.created_at.isoformat() if latest_sc.created_at else "",
            "durationMs": duration_ms,
            "totalScenarios": total,
            "pass": pass_count,
            "warn": warn_count,
            "fail": fail_count,
            "reliability": reliability,
            "triggeredBy": "api",
        }

    return {
        "id": str(agent.id),
        "name": agent.name,
        "description": _agent_description(agent),
        "status": status,
        "currentVersion": current_version,
        "reliability": reliability,
        "reliabilityDelta": reliability_delta,
        "totalScenarios": total,
        "pass": pass_count,
        "warn": warn_count,
        "fail": fail_count,
        "tool_call_loop_score": latest_sc.tool_call_loop_score if latest_sc else 0.0,
        "hallucinated_confidence_score": latest_sc.hallucinated_confidence_score if latest_sc else 0.0,
        "destructive_action_score": latest_sc.destructive_action_score if latest_sc else 0.0,
        "goal_drift_score": latest_sc.goal_drift_score if latest_sc else 0.0,
        "categoryScores": category_scores,
        "versions": versions,
        "lastAudit": last_audit,
        "createdAt": agent.created_at.isoformat() if agent.created_at else "",
    }


# ── Request models ───────────────────────────────────────────────────────────

class CreateAgentRequest(BaseModel):
    name: str
    system_prompt: str
    tools_schema: list[dict] | None = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/agents")
def list_agents(db: Session = Depends(get_db)):
    """Return all registered agents with computed scores."""
    agents = db.query(Agent).order_by(Agent.created_at).all()
    return [_build_agent_response(a, db) for a in agents]


@router.get("/agents/{agent_id}")
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    """Return a single agent by ID."""
    try:
        uid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent ID format")

    agent = db.query(Agent).filter(Agent.id == uid).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return _build_agent_response(agent, db)


@router.post("/agents")
def create_agent(body: CreateAgentRequest, db: Session = Depends(get_db)):
    """Register a new agent."""
    tools = body.tools_schema or []
    content = body.system_prompt + json.dumps(tools, sort_keys=True)
    version_hash = hashlib.sha256(content.encode()).hexdigest()[:12]

    agent = Agent(
        id=uuid.uuid4(),
        name=body.name,
        system_prompt=body.system_prompt,
        tools_schema=tools,
        version_hash=version_hash,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    return _build_agent_response(agent, db)


@router.post("/agents/upload")
async def upload_agent(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a .json file to register a new agent.

    Expected JSON shape:
    {
        "name": str,
        "system_prompt": str,
        "tools": [
            {"name": str, "description": str, "params": {str: str}}
        ]
    }
    """
    # ── Validate file type ────────────────────────────────────────────────
    filename = file.filename or ""
    if not filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=422,
            detail=f"File must be a .json file, got '{filename}'."
        )

    # ── Read and parse JSON ───────────────────────────────────────────────
    try:
        raw = await file.read()
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Malformed JSON: {exc.msg} (line {exc.lineno}, col {exc.colno})."
        )
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read uploaded file.")

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=422,
            detail="Top-level JSON must be an object { }, not an array or scalar."
        )

    # ── Validate required fields ──────────────────────────────────────────
    errors: list[str] = []

    # name
    if "name" not in data:
        errors.append("Missing required field 'name'.")
    elif not isinstance(data["name"], str) or not data["name"].strip():
        errors.append("Field 'name' must be a non-empty string.")

    # system_prompt
    if "system_prompt" not in data:
        errors.append("Missing required field 'system_prompt'.")
    elif not isinstance(data["system_prompt"], str):
        errors.append("Field 'system_prompt' must be a string.")
    elif not data["system_prompt"].strip():
        errors.append("Field 'system_prompt' must not be empty.")
    elif len(data["system_prompt"]) > 10_000:
        errors.append(
            f"Field 'system_prompt' is too long ({len(data['system_prompt'])} chars). "
            f"Maximum is 10,000 characters."
        )

    # tools
    if "tools" not in data:
        errors.append("Missing required field 'tools'.")
    elif not isinstance(data["tools"], list):
        errors.append("Field 'tools' must be an array of tool objects.")
    else:
        if len(data["tools"]) > 20:
            errors.append(
                f"Field 'tools' has {len(data['tools'])} entries. Maximum is 20."
            )
        for i, tool in enumerate(data["tools"]):
            prefix = f"tools[{i}]"
            if not isinstance(tool, dict):
                errors.append(f"{prefix}: each tool must be an object.")
                continue
            if "name" not in tool:
                errors.append(f"{prefix}: missing required field 'name'.")
            elif not isinstance(tool["name"], str) or not tool["name"].strip():
                errors.append(f"{prefix}: field 'name' must be a non-empty string.")
            if "description" not in tool:
                errors.append(f"{prefix}: missing required field 'description'.")
            elif not isinstance(tool["description"], str):
                errors.append(f"{prefix}: field 'description' must be a string.")
            if "params" in tool:
                if not isinstance(tool["params"], dict):
                    errors.append(f"{prefix}: field 'params' must be an object mapping param names to types.")
                else:
                    for k, v in tool["params"].items():
                        if not isinstance(v, str):
                            errors.append(f"{prefix}.params.{k}: param type must be a string, got {type(v).__name__}.")

    if errors:
        raise HTTPException(status_code=422, detail="; ".join(errors))

    # ── Convert to internal tools_schema shape ────────────────────────────
    tools_schema = []
    for tool in data["tools"]:
        entry: dict = {
            "name": tool["name"],
            "description": tool.get("description", ""),
            "parameters": {},
        }
        if "params" in tool and isinstance(tool["params"], dict):
            entry["parameters"] = {
                k: {"type": v} for k, v in tool["params"].items()
            }
        tools_schema.append(entry)

    # ── Create agent ──────────────────────────────────────────────────────
    agent = Agent(
        id=uuid.uuid4(),
        name=data["name"].strip(),
        system_prompt=data["system_prompt"],
        tools_schema=tools_schema,
        version_hash="v1",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    return _build_agent_response(agent, db)