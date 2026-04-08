import random
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from memory.attack_memory import AttackMemory


class BaseAgent(ABC):
    name: str = ""
    description: str = ""
    avatar_color: str = "#FFFFFF"
    tactics: list[str] = []
    target_preference: list[str] = []

    def select_target(self, available_targets: list[str]) -> str:
        preferred = [t for t in self.target_preference if t in available_targets]
        if preferred:
            return random.choice(preferred)
        return random.choice(available_targets)

    def select_tactic(self, memory: "AttackMemory") -> str:
        recommended = memory.get_recommended_tactic(self.name, self.tactics)
        return recommended if recommended else random.choice(self.tactics)

    @abstractmethod
    def generate_prompt(self, target: str, tactic: str, memory: "AttackMemory") -> str:
        """Generate an adversarial prompt for the given target and tactic."""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "avatar_color": self.avatar_color,
            "tactics": self.tactics,
            "target_preference": self.target_preference,
        }
