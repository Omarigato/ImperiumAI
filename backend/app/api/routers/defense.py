"""
app/api/routers/defense.py
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.routers.battle import _state
from app.core.container import get_container

router = APIRouter(prefix="/api/defense", tags=["defense"])


@router.post("/shield")
async def activate_shield() -> dict:
    if not _state["running"]:
        return {"status": "not_running", "message": "No battle in progress"}
    _state["shield_active"] = True
    _state["shield_rounds_left"] = 3
    c = get_container()
    await c.ws_manager.broadcast({
        "event": "shield_activated",
        "rounds_left": 3,
        "message": "🛡 Defense shield raised! Next 3 attacks will be blocked.",
    })
    await c.ws_manager.emit_log("Defense", "🛡 SHIELD RAISED — blocking next 3 attacks", "warning")
    return {"status": "shield_activated", "rounds": 3}


@router.post("/reset-risk")
async def reset_risk() -> dict:
    if not _state["running"]:
        return {"status": "not_running", "message": "No battle in progress"}
    c = get_container()
    old = c.risk.get_score()
    c.risk._score = max(0, c.risk._score - 20)
    new = c.risk.get_score()
    delta = new - old
    level = "safe" if new <= 30 else "elevated" if new <= 60 else "critical"
    await c.ws_manager.broadcast({
        "event": "risk_update",
        "score": new,
        "delta": delta,
        "level": level,
        "message": f"Emergency countermeasures deployed — risk reduced by {abs(delta)}",
    })
    await c.ws_manager.emit_log("Defense", f"🔄 COUNTERMEASURES — risk ↓ {abs(delta)} pts", "warning")
    return {"status": "risk_reduced", "old_score": old, "new_score": new, "delta": delta}