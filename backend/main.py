"""
main.py — FastAPI application entry point for Sentinel.

Wires all routers, configures CORS, and seeds demo agents on startup.
"""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load environment variables BEFORE any other app imports
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal
from demo_agents import seed_demo_agents
from routers import agents, runs, traces, scorecards

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
)
logger = logging.getLogger("sentinel")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed demo agents on startup."""
    logger.info("Starting Sentinel backend…")
    db = SessionLocal()
    try:
        seed_demo_agents(db)
        logger.info("Demo agent seeding complete.")
    except Exception as exc:
        logger.error("Failed to seed demo agents: %s", exc)
    finally:
        db.close()
    yield
    logger.info("Sentinel backend shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Sentinel — CI/CD for AI Agents",
    description="Backend API for adversarial safety testing of AI agents.",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS — allow all origins ─────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(agents.router)
app.include_router(runs.router)
app.include_router(traces.router)
app.include_router(scorecards.router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "sentinel-backend"}