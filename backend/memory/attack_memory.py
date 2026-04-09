from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Optional


class AttackMemory:
    def __init__(self, db_path: Optional[str] = None):
        default_path = Path(__file__).resolve().parents[1] / "data" / "attack_memory.db"
        self.db_path = Path(db_path) if db_path else default_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS attacks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    agent TEXT NOT NULL,
                    target TEXT NOT NULL,
                    tactic TEXT NOT NULL,
                    success INTEGER NOT NULL,
                    risk_delta INTEGER NOT NULL
                )
                """
            )
            conn.commit()

    def record_attack(
        self,
        agent: str,
        target: str,
        tactic: str,
        success: bool,
        risk_delta: int,
    ) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO attacks (timestamp, agent, target, tactic, success, risk_delta)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (datetime.utcnow().isoformat(), agent, target, tactic, int(success), int(risk_delta)),
            )
            conn.commit()

    def _fetch_agent_history(self, agent: str) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT tactic, success
                FROM attacks
                WHERE agent = ?
                ORDER BY id DESC
                """,
                (agent,),
            ).fetchall()
        return [{"tactic": row["tactic"], "success": bool(row["success"])} for row in rows]

    def _tactic_stats_for_agent(self, agent: str) -> dict[str, tuple[int, int]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT tactic,
                       SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as wins,
                       SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as losses
                FROM attacks
                WHERE agent = ?
                GROUP BY tactic
                """,
                (agent,),
            ).fetchall()
        return {row["tactic"]: (row["wins"] or 0, row["losses"] or 0) for row in rows}

    def get_recommended_tactic(self, agent: str, available_tactics: list[str]) -> Optional[str]:
        if not available_tactics:
            return None

        recent_consecutive: dict[str, int] = {}
        for entry in self._fetch_agent_history(agent):
            tactic = entry["tactic"]
            if tactic not in recent_consecutive:
                recent_consecutive[tactic] = 0
            if not entry["success"]:
                recent_consecutive[tactic] += 1
            else:
                recent_consecutive[tactic] = 0

        blocked = {t for t, c in recent_consecutive.items() if c >= 3}
        candidates = [t for t in available_tactics if t not in blocked] or available_tactics
        stats = self._tactic_stats_for_agent(agent)

        def score(tactic: str) -> float:
            wins, losses = stats.get(tactic, (0, 0))
            total = wins + losses
            return wins / total if total else 0.5

        candidates.sort(key=score, reverse=True)
        return candidates[0]

    def most_vulnerable_targets(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT target,
                       COUNT(*) as attempts,
                       SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as hits
                FROM attacks
                GROUP BY target
                ORDER BY CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) DESC
                """
            ).fetchall()
        return [
            {
                "target": row["target"],
                "attempts": row["attempts"],
                "hits": row["hits"] or 0,
                "vulnerability": round((row["hits"] or 0) / row["attempts"], 2) if row["attempts"] else 0.0,
            }
            for row in rows
        ]

    def most_successful_tactics(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT tactic,
                       SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as wins,
                       SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as losses
                FROM attacks
                GROUP BY tactic
                ORDER BY CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) /
                         (SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) + SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END)) DESC
                """
            ).fetchall()
        output = []
        for row in rows:
            wins = row["wins"] or 0
            losses = row["losses"] or 0
            total = wins + losses
            output.append(
                {
                    "tactic": row["tactic"],
                    "wins": wins,
                    "losses": losses,
                    "rate": round(wins / total, 2) if total else 0.0,
                }
            )
        return output

    def get_summary(self) -> dict:
        with self._connect() as conn:
            totals = conn.execute(
                """
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes
                FROM attacks
                """
            ).fetchone()
            history_rows = conn.execute(
                """
                SELECT timestamp, agent, target, tactic, success, risk_delta
                FROM attacks
                ORDER BY id DESC
                LIMIT 20
                """
            ).fetchall()

        total = totals["total"] or 0
        successes = totals["successes"] or 0
        history = [
            {
                "timestamp": row["timestamp"],
                "agent": row["agent"],
                "target": row["target"],
                "tactic": row["tactic"],
                "success": bool(row["success"]),
                "risk_delta": row["risk_delta"],
            }
            for row in reversed(history_rows)
        ]
        return {
            "total_attacks": total,
            "successful_attacks": successes,
            "blocked_attacks": total - successes,
            "success_rate": round(successes / total, 2) if total else 0.0,
            "most_vulnerable_targets": self.most_vulnerable_targets(),
            "most_successful_tactics": self.most_successful_tactics(),
            "history": history,
        }

    def reset(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM attacks")
            conn.commit()
