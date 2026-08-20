"""
routers/scorecards.py — Scorecard retrieval endpoint.

GET /scorecards/{agent_id} → latest scorecard + version history
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import Agent, Scorecard, ScenarioRun

router = APIRouter()

CATEGORY_CONFIG = {
    "injection_score": {"id": "injection_resistance", "name": "Injection Resistance"},
    "destructive_score": {"id": "destructive_actions", "name": "Destructive Actions"},
    "loop_score": {"id": "tool_call_loops", "name": "Tool Call Loops"},
    "hallucination_score": {"id": "hallucinated_success", "name": "Hallucinated Success"},
    "drift_score": {"id": "goal_drift", "name": "Goal Drift"},
}


def _scorecard_to_category_scores(sc: Scorecard, prev: Scorecard | None) -> list[dict]:
    """Convert scorecard fields to CategoryScore[] for the frontend."""
    scores = []
    for field, cfg in CATEGORY_CONFIG.items():
        current = getattr(sc, field, 0) or 0
        previous = getattr(prev, field, 0) if prev else 0
        scores.append({
            "id": cfg["id"],
            "name": cfg["name"],
            "score": current,
            "trend": current - (previous or 0),
            "scenariosTested": 0,
            "failures": 0,
            "warns": 0,
        })
    return scores


@router.get("/scorecards/{agent_id}")
def get_scorecard(agent_id: str, db: Session = Depends(get_db)):
    """Return the latest scorecard and version history for an agent."""
    try:
        uid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent ID format")

    agent = db.query(Agent).filter(Agent.id == uid).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    scorecards = (
        db.query(Scorecard)
        .filter(Scorecard.agent_id == uid)
        .order_by(desc(Scorecard.created_at))
        .all()
    )

    if not scorecards:
        return {
            "agentId": str(agent.id),
            "agentName": agent.name,
            "latest": None,
            "history": [],
        }

    latest = scorecards[0]
    prev = scorecards[1] if len(scorecards) > 1 else None

    # Build latest scorecard response
    latest_response = {
        "id": str(latest.id),
        "agentId": str(agent.id),
        "versionHash": latest.version_hash,
        "overallScore": latest.overall_score or 0,
        "categoryScores": _scorecard_to_category_scores(latest, prev),
        "createdAt": latest.created_at.isoformat() if latest.created_at else "",
    }

    # Build version history
    history = []
    for idx, sc in enumerate(reversed(scorecards)):
        prev_for_ver = (
            scorecards[len(scorecards) - idx]
            if idx > 0 and (len(scorecards) - idx) < len(scorecards)
            else None
        )
        ver_reliability = sc.overall_score or 0
        regression = (
            prev_for_ver is not None
            and prev_for_ver.overall_score is not None
            and ver_reliability < prev_for_ver.overall_score
        )

        history.append({
            "version": f"v{idx + 1}.0",
            "date": sc.created_at.isoformat() if sc.created_at else "",
            "reliability": ver_reliability,
            "categories": _scorecard_to_category_scores(sc, prev_for_ver),
            "regression": regression,
        })

    return {
        "agentId": str(agent.id),
        "agentName": agent.name,
        "latest": latest_response,
        "history": history,
    }