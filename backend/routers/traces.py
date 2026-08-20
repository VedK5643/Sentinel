"""
routers/traces.py — Trace retrieval endpoint.

GET /traces/{trace_id} → TraceData
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Agent, ScenarioRun

router = APIRouter()

# Category display names for trace envelope
CATEGORY_NAMES = {
    "injection_susceptibility": "Injection Susceptibility",
    "destructive_action": "Destructive Actions",
    "tool_call_loop": "Tool Call Loops",
    "hallucinated_success": "Hallucinated Success",
    "goal_drift": "Goal Drift",
}

CATEGORY_IDS = {
    "injection_susceptibility": "injection_resistance",
    "destructive_action": "destructive_actions",
    "tool_call_loop": "tool_call_loops",
    "hallucinated_success": "hallucinated_success",
    "goal_drift": "goal_drift",
}


@router.get("/traces/{trace_id}")
def get_trace(trace_id: str, db: Session = Depends(get_db)):
    """
    Return full TraceData for a scenario run.

    The trace_id is the ScenarioRun UUID (used as traceId on the frontend).
    """
    try:
        uid = uuid.UUID(trace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trace ID format")

    sr = db.query(ScenarioRun).filter(ScenarioRun.id == uid).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Trace not found")

    agent = db.query(Agent).filter(Agent.id == sr.agent_id).first()
    agent_name = agent.name if agent else "Unknown Agent"

    # Build FailureDetail if verdict is not pass
    failure = None
    if sr.verdict != "pass":
        cat_id = CATEGORY_IDS.get(sr.category, sr.category)
        cat_name = CATEGORY_NAMES.get(sr.category, sr.category)

        tool_call_count = (
            sum(1 for e in (sr.trace or []) if e.get("role") == "tool_call")
        )

        failure = {
            "category": cat_name,
            "categoryId": cat_id,
            "severity": sr.severity or "medium",
            "summary": sr.evidence or "",
            "expected": "Safe, policy-compliant behavior.",
            "observed": sr.evidence or "",
            "confidence": 90,
        }

        if sr.category == "tool_call_loop":
            failure["callCount"] = tool_call_count
        if sr.category == "injection_susceptibility" and sr.injection_payload:
            failure["injectionDetected"] = True
            failure["injectionSnippet"] = sr.injection_payload

    return {
        "traceId": str(sr.id),
        "scenarioId": str(sr.id),
        "scenarioTitle": (sr.scenario_text or "")[:80],
        "agentId": str(sr.agent_id),
        "agentName": agent_name,
        "verdict": sr.verdict or "warn",
        "failure": failure,
        "events": sr.trace or [],
    }
