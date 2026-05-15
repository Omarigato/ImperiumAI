"""
app/memory/attack_memory.py
────────────────────────────
SQLite-backed adaptive memory for red-team agents.
Agents learn which tactics work and avoid ones blocked 3+ times in a row.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Optional

from app.core.config import get_settings


class AttackMemory:
    def __init__(self, db_path: Optional[Path] = None) -> None:
        settings = get_settings()
        self._path = db_path or settings.db_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._init_db()

    # ── Internal ──────────────────────────────────────────────────────────
    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS attacks (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp  TEXT    NOT NULL,
                    agent      TEXT    NOT NULL,
                    target     TEXT    NOT NULL,
                    tactic     TEXT    NOT NULL,
                    success    INTEGER NOT NULL,
                    risk_delta INTEGER NOT NULL
                )
            """)
            conn.commit()

    # ── Write ─────────────────────────────────────────────────────────────
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
                "INSERT INTO attacks(timestamp,agent,target,tactic,success,risk_delta) VALUES(?,?,?,?,?,?)",
                (datetime.utcnow().isoformat(), agent, target, tactic, int(success), int(risk_delta)),
            )
            conn.commit()

    # ── Tactic selection logic ────────────────────────────────────────────
    def get_recommended_tactic(
        self,
        agent: str,
        available_tactics: list[str],
    ) -> Optional[str]:
        if not available_tactics:
            return None

        # Count consecutive blocks per tactic (recent 200 rows, newest first)
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT tactic, success FROM attacks WHERE agent=? ORDER BY id DESC LIMIT 200",
                (agent,),
            ).fetchall()

        consecutive_blocks: dict[str, int] = {}
        for row in rows:
            t = row["tactic"]
            if t not in consecutive_blocks:
                consecutive_blocks[t] = 0
            if not row["success"]:
                consecutive_blocks[t] += 1
            else:
                consecutive_blocks[t] = 0

        blocked = {t for t, c in consecutive_blocks.items() if c >= 3}
        candidates = [t for t in available_tactics if t not in blocked] or available_tactics

        # Sort by historical win rate
        with self._connect() as conn:
            rows2 = conn.execute(
                """SELECT tactic,
                          SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS wins,
                          COUNT(*) AS total
                   FROM attacks WHERE agent=? GROUP BY tactic""",
                (agent,),
            ).fetchall()
        stats = {r["tactic"]: (r["wins"] or 0, r["total"] or 0) for r in rows2}

        def score(t: str) -> float:
            wins, total = stats.get(t, (0, 0))
            return wins / total if total else 0.5

        candidates.sort(key=score, reverse=True)
        return candidates[0]

    # ── Analytics ─────────────────────────────────────────────────────────
    def most_vulnerable_targets(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute("""
                SELECT target,
                       COUNT(*)                                          AS attempts,
                       SUM(CASE WHEN success=1 THEN 1 ELSE 0 END)       AS hits
                FROM attacks GROUP BY target
                ORDER BY CAST(SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS FLOAT)/COUNT(*) DESC
            """).fetchall()
        return [
            {
                "target": r["target"],
                "attempts": r["attempts"],
                "hits": r["hits"] or 0,
                "vulnerability": round((r["hits"] or 0) / r["attempts"], 2) if r["attempts"] else 0.0,
            }
            for r in rows
        ]

    def most_successful_tactics(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute("""
                SELECT tactic,
                       SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS wins,
                       SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) AS losses
                FROM attacks GROUP BY tactic
                ORDER BY
                  CAST(SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS FLOAT) /
                  (SUM(CASE WHEN success=1 THEN 1 ELSE 0 END)+SUM(CASE WHEN success=0 THEN 1 ELSE 0 END))
                  DESC
            """).fetchall()
        result = []
        for r in rows:
            wins = r["wins"] or 0
            losses = r["losses"] or 0
            total = wins + losses
            result.append({
                "tactic": r["tactic"],
                "wins": wins,
                "losses": losses,
                "rate": round(wins / total, 2) if total else 0.0,
            })
        return result

    def get_summary(self) -> dict:
        with self._connect() as conn:
            totals = conn.execute(
                "SELECT COUNT(*) AS total, SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS successes FROM attacks"
            ).fetchone()
            history_rows = conn.execute(
                "SELECT timestamp,agent,target,tactic,success,risk_delta FROM attacks ORDER BY id DESC LIMIT 20"
            ).fetchall()

        total = totals["total"] or 0
        successes = totals["successes"] or 0
        history = [
            {
                "timestamp": r["timestamp"],
                "agent": r["agent"],
                "target": r["target"],
                "tactic": r["tactic"],
                "success": bool(r["success"]),
                "risk_delta": r["risk_delta"],
            }
            for r in reversed(history_rows)
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