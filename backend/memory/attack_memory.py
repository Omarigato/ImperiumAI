from datetime import datetime
from collections import defaultdict
from typing import Optional


class AttackMemory:
    def __init__(self):
        self.history: list[dict] = []
        # tactic_failures[agent][tactic] = count
        self.tactic_failures: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        # tactic_successes[agent][tactic] = count
        self.tactic_successes: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        # target_hits[target] = count of successful attacks
        self.target_hits: dict[str, int] = defaultdict(int)
        # target_attempts[target] = total attempts
        self.target_attempts: dict[str, int] = defaultdict(int)

    def record_attack(
        self,
        agent: str,
        target: str,
        tactic: str,
        success: bool,
        risk_delta: int,
    ) -> None:
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "agent": agent,
            "target": target,
            "tactic": tactic,
            "success": success,
            "risk_delta": risk_delta,
        }
        self.history.append(entry)
        self.target_attempts[target] += 1

        if success:
            self.tactic_successes[agent][tactic] += 1
            self.target_hits[target] += 1
        else:
            self.tactic_failures[agent][tactic] += 1

    def get_recommended_tactic(self, agent: str, available_tactics: list[str]) -> Optional[str]:
        """Return a tactic for the agent, avoiding tactics that failed 3+ times in a row."""
        if not available_tactics:
            return None

        # Count consecutive failures per tactic (look at last N entries for this agent)
        recent_consecutive: dict[str, int] = defaultdict(int)
        agent_history = [e for e in reversed(self.history) if e["agent"] == agent]

        # Walk backwards and count consecutive failures per tactic
        for entry in agent_history:
            tactic = entry["tactic"]
            if not entry["success"]:
                recent_consecutive[tactic] += 1
            else:
                # Reset on success
                recent_consecutive[tactic] = 0

        # Filter out tactics with 3+ consecutive failures
        blocked = {t for t, c in recent_consecutive.items() if c >= 3}
        preferred = [t for t in available_tactics if t not in blocked]

        candidates = preferred if preferred else available_tactics

        # Among candidates, prefer the one with highest success rate
        def success_rate(t: str) -> float:
            wins = self.tactic_successes[agent][t]
            losses = self.tactic_failures[agent][t]
            total = wins + losses
            return wins / total if total > 0 else 0.5  # unknown tactics get neutral score

        candidates.sort(key=success_rate, reverse=True)
        return candidates[0]

    def most_vulnerable_targets(self) -> list[dict]:
        result = []
        for target, attempts in self.target_attempts.items():
            hits = self.target_hits[target]
            result.append(
                {
                    "target": target,
                    "attempts": attempts,
                    "hits": hits,
                    "vulnerability": round(hits / attempts, 2) if attempts else 0.0,
                }
            )
        result.sort(key=lambda x: x["vulnerability"], reverse=True)
        return result

    def most_successful_tactics(self) -> list[dict]:
        tactic_stats: dict[str, dict] = defaultdict(lambda: {"wins": 0, "losses": 0})
        for entry in self.history:
            t = entry["tactic"]
            if entry["success"]:
                tactic_stats[t]["wins"] += 1
            else:
                tactic_stats[t]["losses"] += 1

        result = []
        for tactic, stats in tactic_stats.items():
            total = stats["wins"] + stats["losses"]
            result.append(
                {
                    "tactic": tactic,
                    "wins": stats["wins"],
                    "losses": stats["losses"],
                    "rate": round(stats["wins"] / total, 2) if total else 0.0,
                }
            )
        result.sort(key=lambda x: x["rate"], reverse=True)
        return result

    def get_summary(self) -> dict:
        total = len(self.history)
        successes = sum(1 for e in self.history if e["success"])
        return {
            "total_attacks": total,
            "successful_attacks": successes,
            "blocked_attacks": total - successes,
            "success_rate": round(successes / total, 2) if total else 0.0,
            "most_vulnerable_targets": self.most_vulnerable_targets(),
            "most_successful_tactics": self.most_successful_tactics(),
            "history": self.history[-20:],  # return last 20 for UI
        }

    def reset(self) -> None:
        self.history.clear()
        self.tactic_failures.clear()
        self.tactic_successes.clear()
        self.target_hits.clear()
        self.target_attempts.clear()
