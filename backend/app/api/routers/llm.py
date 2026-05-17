"""
app/api/routers/llm.py
"""
from __future__ import annotations

from fastapi import APIRouter

from app.core.container import get_container
from app.llm.router import LLMProvider
from app.schemas import MultiLLMRequest, SwitchLLMRequest

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.post("/switch")
async def switch_llm(body: SwitchLLMRequest) -> dict:
    c = get_container()
    try:
        p = LLMProvider(body.provider)
    except ValueError:
        return {"error": f"Unknown provider: {body.provider}"}
    result = c.llm_router.set_provider(p)
    await c.ws_manager.broadcast({"event": "llm_switched", **result})
    return result


@router.post("/multi")
async def toggle_multi_llm(body: MultiLLMRequest) -> dict:
    c = get_container()
    result = c.llm_router.set_multi_llm(body.enabled)
    await c.ws_manager.broadcast({"event": "multi_llm_toggled", **result})
    return result


@router.post("/agent-provider")
async def set_agent_provider(body: dict) -> dict:
    """Set LLM provider for a specific agent at runtime."""
    c = get_container()
    agent = body.get("agent", "")
    provider = body.get("provider", "simulation")
    return c.llm_router.set_agent_provider(agent, provider)


@router.get("/status")
async def llm_status() -> dict:
    return get_container().llm_router.get_status()