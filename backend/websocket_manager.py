import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict) -> None:
        if not self.active_connections:
            return
        data = json.dumps(message)
        dead: list[WebSocket] = []
        for ws in self.active_connections:
            try:
                await ws.send_text(data)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
