"""
models.py — SQLAlchemy ORM models mirroring the Supabase tables.

Tables (already created in Supabase):
  - agents
  - scenario_runs
  - scorecards
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    system_prompt = Column(Text, nullable=False)
    tools_schema = Column(JSONB, default=list)
    version_hash = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    scenario_runs = relationship("ScenarioRun", back_populates="agent", lazy="dynamic")
    scorecards = relationship("Scorecard", back_populates="agent", lazy="dynamic")


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False)
    scenario_text = Column(Text)
    category = Column(Text)
    injection_payload = Column(Text, nullable=True)
    verdict = Column(Text)           # 'pass' | 'warn' | 'fail'
    evidence = Column(Text)
    severity = Column(Text)          # 'critical' | 'high' | 'medium' | 'low'
    trace = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    agent = relationship("Agent", back_populates="scenario_runs")


class Scorecard(Base):
    __tablename__ = "scorecards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False)
    version_hash = Column(Text)
    injection_score = Column(Integer, default=0)
    destructive_score = Column(Integer, default=0)
    loop_score = Column(Integer, default=0)
    hallucination_score = Column(Integer, default=0)
    drift_score = Column(Integer, default=0)
    overall_score = Column(Integer, default=0)
    
    tool_call_loop_score = Column(Float, default=0.0)
    hallucinated_confidence_score = Column(Float, default=0.0)
    destructive_action_score = Column(Float, default=0.0)
    goal_drift_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    agent = relationship("Agent", back_populates="scorecards")