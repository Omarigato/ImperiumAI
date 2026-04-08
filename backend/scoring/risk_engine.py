_LEVELS = [
    (30, "safe"),
    (60, "elevated"),
    (80, "critical"),
    (100, "breach"),
]

_SEVERITY_DELTA = {
    "none": 0,
    "low": 3,
    "medium": 8,
    "high": 15,
    "critical": 25,
}

_BLOCK_RECOVERY = {
    "none": 2,
    "low": 3,
    "medium": 5,
    "high": 8,
    "critical": 10,
}


def _level_for(score: int) -> str:
    for threshold, label in _LEVELS:
        if score <= threshold:
            return label
    return "breach"


class RiskEngine:
    def __init__(self):
        self._score: int = 0

    def get_score(self) -> int:
        return self._score

    def reset(self) -> None:
        self._score = 0

    def update_score(self, policy_result: dict, iot_result: dict, attack_success: bool) -> dict:
        severity = policy_result.get("severity", "none")
        allowed = policy_result.get("allowed", False)
        iot_success = iot_result.get("success", False)

        old_score = self._score

        if attack_success and allowed and iot_success:
            # Attack succeeded — big risk increase
            delta = _SEVERITY_DELTA.get(severity, 5) + 10
            self._score = min(100, self._score + delta)
            message = f"Attack succeeded — risk increased by {delta}"
        elif not allowed:
            # Policy blocked the attack — reduce risk slightly
            delta = -_BLOCK_RECOVERY.get(severity, 3)
            self._score = max(0, self._score + delta)
            delta = abs(delta)
            message = f"Attack blocked — risk reduced by {delta}"
        else:
            # Allowed but IoT didn't execute (e.g. unknown action)
            delta = 2
            self._score = min(100, self._score + delta)
            message = f"Partial execution — minor risk increase of {delta}"

        actual_delta = self._score - old_score
        level = _level_for(self._score)

        return {
            "score": self._score,
            "delta": actual_delta,
            "level": level,
            "message": message,
        }
