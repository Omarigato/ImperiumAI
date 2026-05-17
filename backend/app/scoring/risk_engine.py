"""
app/scoring/risk_engine.py
───────────────────────────
0–100 risk score with severity-driven delta calculation.
"""
from __future__ import annotations

_LEVELS = [(30, "safe"), (60, "elevated"), (80, "critical"), (100, "breach")]

_SEVERITY_DELTA = {"none": 0, "low": 3, "medium": 8, "high": 15, "critical": 25}
_BLOCK_RECOVERY = {"none": 2, "low": 3, "medium": 5, "high": 8, "critical": 10}


def level_for(score: int) -> str:
    for threshold, label in _LEVELS:
        if score <= threshold:
            return label
    return "breach"


# Backwards-compatible alias used inside this module.
_level = level_for


class RiskEngine:
    def __init__(self) -> None:
        self._score: int = 0

    def get_score(self) -> int:
        return self._score

    def reset(self) -> None:
        self._score = 0

    def reduce_score(self, amount: int) -> int:
        """Subtract `amount` from the current risk score (floored at 0).
        Returns the actual delta (negative or zero)."""
        old = self._score
        self._score = max(0, self._score - max(0, int(amount)))
        return self._score - old

    def update_score(
        self,
        policy_result: dict,
        iot_result: dict,
        attack_success: bool,
    ) -> dict:
        severity = policy_result.get("severity", "none")
        allowed = policy_result.get("allowed", False)
        iot_ok = iot_result.get("success", False)
        old = self._score

        if attack_success and allowed and iot_ok:
            delta = _SEVERITY_DELTA.get(severity, 5) + 10
            self._score = min(100, self._score + delta)
            msg = f"Attack succeeded — risk +{delta}"
        elif not allowed:
            delta = _BLOCK_RECOVERY.get(severity, 3)
            self._score = max(0, self._score - delta)
            msg = f"Attack blocked — risk -{delta}"
        else:
            delta = 2
            self._score = min(100, self._score + delta)
            msg = f"Partial execution — risk +{delta}"

        actual = self._score - old
        return {
            "score": self._score,
            "delta": actual,
            "level": _level(self._score),
            "message": msg,
        }