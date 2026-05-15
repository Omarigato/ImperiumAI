"""
app/core/container.py
─────────────────────
Application-wide singletons.  Everything is initialised once at startup
and shared through FastAPI's dependency injection system.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.agents.context_agent import ContextPhantom
from app.agents.injection_agent import ShadowInjector
from app.agents.network_agent import NetworkPhantom
from app.agents.strategy_agent import PrivilegeReaper, SilentEscalator
from app.iot.simulator import IoTSimulator
from app.llm.router import LLMRouter
from app.memory.attack_memory import AttackMemory
from app.scoring.risk_engine import RiskEngine
from app.security.policy_engine import PolicyEngine
from app.websocket_manager import WebSocketManager


@dataclass
class AppContainer:
    """Holds all singleton services. Created once in lifespan."""

    # Core services
    memory: AttackMemory = field(default_factory=AttackMemory)
    llm_router: LLMRouter = field(default_factory=LLMRouter)
    iot: IoTSimulator = field(default_factory=IoTSimulator)
    policy: PolicyEngine = field(default_factory=PolicyEngine)
    risk: RiskEngine = field(default_factory=RiskEngine)
    ws_manager: WebSocketManager = field(default_factory=WebSocketManager)

    # Red-team agents (instantiated once, reused every round)
    agents: list = field(default_factory=lambda: [
        ShadowInjector(),
        ContextPhantom(),
        PrivilegeReaper(),
        SilentEscalator(),
        NetworkPhantom(),
    ])

    @property
    def all_targets(self) -> list[str]:
        return list(self.iot.devices.keys())


# Module-level singleton — set during FastAPI lifespan
_container: AppContainer | None = None


def init_container() -> AppContainer:
    global _container
    _container = AppContainer()
    return _container


def get_container() -> AppContainer:
    if _container is None:
        raise RuntimeError("Container not initialised — call init_container() first")
    return _container