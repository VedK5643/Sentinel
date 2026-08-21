"""
routers/runs.py — Audit run endpoints.

POST /agents/{agent_id}/runs     → { runId }     (kicks off async pipeline via Celery)
GET  /runs/{run_id}/stream       → SSE stream     (live scenario updates via Redis)
"""

import asyncio
import json
import uuid
import logging
import os
import redis.asyncio as aioredis
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from tasks import audit_pipeline_task
from celery_app import REDIS_URL

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/agents/{agent_id}/runs")
async def start_audit(agent_id: str):
    """Kick off an audit run via Celery. Returns immediately."""
    try:
        uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent ID format")

    run_id = str(uuid.uuid4())
    # Launch via Celery
    audit_pipeline_task.delay(run_id, agent_id)

    return {"runId": run_id}


@router.get("/runs/{run_id}/stream")
async def stream_audit(run_id: str):
    """
    SSE stream of audit events from Redis Pub/Sub.
    """
    redis_async_client = aioredis.from_url(REDIS_URL)

    async def event_generator():
        pubsub = redis_async_client.pubsub()
        await pubsub.subscribe(f"run:{run_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data_str = message["data"].decode("utf-8")
                    yield {"data": data_str}
                    data = json.loads(data_str)
                    
                    # Stop streaming if complete
                    if data.get("type") == "complete" or (
                        data.get("type") == "phase_change" and 
                        data.get("payload", {}).get("phase") == "complete"
                    ):
                        break
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(f"run:{run_id}")
            await redis_async_client.aclose()

    return EventSourceResponse(event_generator())
