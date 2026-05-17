"""
app/api/routers/memory.py
"""
from __future__ import annotations

from fastapi import APIRouter

from app.core.container import get_container

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("")
async def get_memory() -> dict:
    return get_container().memory.get_summary()


@router.post("/clear")
async def clear_memory() -> dict:
    get_container().memory.reset()
    return {"status": "cleared"}