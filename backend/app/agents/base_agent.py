"""
app/agents/base_agent.py
─────────────────────────
Abstract base for all red-team agents.
"""
from __future__ import annotations

import random
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.memory.attack_memory import AttackMemory


class BaseAgent(ABC):
    name: str = ""
    description: str = ""
    avatar_color: str = "#FFFFFF"
    tactics: list[str] = []
    target_preference: list[str] = []

    # ── Target / tactic selection ─────────────────────────────────────────
    def select_target(self, available_targets: list[str]) -> str:
        preferred = [t for t in self.target_preference if t in available_targets]
        return random.choice(preferred) if preferred else random.choice(available_targets)

    def select_tactic(self, memory: "AttackMemory") -> str:
        recommended = memory.get_recommended_tactic(self.name, self.tactics)
        return recommended if recommended else random.choice(self.tactics)

    @abstractmethod
    def generate_prompt(self, target: str, tactic: str, memory: "AttackMemory") -> str:
        """Return an adversarial prompt string."""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "avatar_color": self.avatar_color,
            "tactics": self.tactics,
            "target_preference": self.target_preference,
        }