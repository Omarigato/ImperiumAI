"""
app/schemas/__init__.py
─────────────────────────
All Pydantic models for API request/response bodies.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


# ── Generic ──────────────────────────────────────────────────────────────────
class StatusResponse(BaseModel):
    status: str
    message: str = ""


# ── LLM ──────────────────────────────────────────────────────────────────────
class SwitchLLMRequest(BaseModel):
    provider: str


class MultiLLMRequest(BaseModel):
    enabled: bool = True


class AgentLLMConfig(BaseModel):
    """Map each agent to a specific LLM provider."""
    ShadowInjector: str = "groq"
    ContextPhantom: str = "gemini"
    PrivilegeReaper: str = "openrouter"
    SilentEscalator: str = "groq"
    NetworkPhantom: str = "openrouter"


# ── Battle ────────────────────────────────────────────────────────────────────
class BatchBattleRequest(BaseModel):
    count: int = Field(default=3, ge=1, le=10)


class IoTCommandRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)


# ── Defense ───────────────────────────────────────────────────────────────────
class ShieldResponse(BaseModel):
    status: str
    rounds: int = 3
    message: str = ""


class RiskResetResponse(BaseModel):
    status: str
    old_score: int
    new_score: int
    delta: int