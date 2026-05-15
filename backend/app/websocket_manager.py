"""
app/websocket_manager.py
─────────────────────────
Thread-safe WebSocket broadcast manager.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    # ── Lifecycle ─────────────────────────────────────────────────────────
    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.debug("WS connected  total=%d", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections = [c for c in self._connections if c is not ws]
        logger.debug("WS disconnected  total=%d", len(self._connections))

    # ── Broadcast ─────────────────────────────────────────────────────────
    async def broadcast(self, payload: dict[str, Any]) -> None:
        if not self._connections:
            return
        data = json.dumps(payload, ensure_ascii=False)
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(data)
            except Exception as exc:
                logger.warning("WS send failed: %s", exc)
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def emit_log(
        self,
        source: str,
        message: str,
        level: str = "info",
    ) -> None:
        await self.broadcast(
            {"event": "log", "level": level, "source": source, "message": message}
        )

    @property
    def connection_count(self) -> int:
        return len(self._connections)