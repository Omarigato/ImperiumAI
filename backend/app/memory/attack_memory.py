"""
app/memory/attack_memory.py
────────────────────────────
Adaptive memory for red-team agents — backed by SQLAlchemy so the same
code path works with either a local SQLite file or a remote PostgreSQL
server (driven by the DATABASE_URL env var, see app/core/config.py).

Agents learn which tactics work and avoid ones blocked 3+ times in a row.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, MetaData, String, Table,
    case, create_engine, func, select, text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Schema (works on both SQLite + PostgreSQL) ──────────────────────────────
metadata = MetaData()

attacks_table = Table(
    "attacks", metadata,
    Column("id",         Integer, primary_key=True, autoincrement=True),
    Column("timestamp",  DateTime(timezone=True), nullable=False),
    Column("agent",      String(64),  nullable=False, index=True),
    Column("target",     String(64),  nullable=False, index=True),
    Column("tactic",     String(64),  nullable=False, index=True),
    Column("success",    Boolean,     nullable=False),
    Column("risk_delta", Integer,     nullable=False),
)


def _build_engine(url: str) -> Engine:
    """Create a SQLAlchemy engine with sensible defaults per backend."""
    kwargs: dict = {"future": True, "pool_pre_ping": True}
    if url.startswith("sqlite"):
        # SQLite + multi-threaded FastAPI worker → must allow cross-thread.
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        # Postgres / other servers — fail fast on unreachable hosts so the
        # backend doesn't sit on a 30-second DNS / TCP timeout at startup.
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
        kwargs["pool_timeout"] = 10
        kwargs["connect_args"] = {"connect_timeout": 5}
    return create_engine(url, **kwargs)


class AttackMemory:
    """Stores every attack attempt and surfaces aggregate analytics.

    Resiliency: if the configured DATABASE_URL can't be reached at
    construction time (bad hostname, dead Postgres, etc.) we automatically
    fall back to a local SQLite file so the rest of the application keeps
    working while the user fixes their .env.
    """

    def __init__(self, database_url: Optional[str] = None) -> None:
        settings = get_settings()
        primary = (database_url or settings.resolved_database_url).strip()
        self._url, self._engine = self._connect_or_fallback(primary, settings)
        self._lock = Lock()  # Protects writes; SELECTs use a fresh connection.
        self._init_db()
        logger.info("AttackMemory bound to: %s", self._safe_url(self._url))

    # ── Connection bootstrap ─────────────────────────────────────────────
    @staticmethod
    def _probe(engine: Engine) -> None:
        """Cheap round-trip to verify the DB is actually reachable."""
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

    def _connect_or_fallback(self, url: str, settings) -> tuple[str, Engine]:
        engine = _build_engine(url)
        try:
            self._probe(engine)
            return url, engine
        except (SQLAlchemyError, OSError) as exc:
            engine.dispose()
            # SQLite is the fallback target — if SQLite itself is failing
            # there's nothing left to fall back to, so re-raise.
            if url.startswith("sqlite"):
                raise

            settings.db_path.parent.mkdir(parents=True, exist_ok=True)
            fallback_url = f"sqlite:///{settings.db_path.as_posix()}"
            logger.error(
                "❌ DATABASE_URL '%s' is unreachable: %s",
                self._safe_url(url),
                _short_err(exc),
            )
            logger.error(
                "→ Falling back to local SQLite at %s. "
                "Check host / port / credentials / sslmode in backend/.env.",
                settings.db_path,
            )
            fallback_engine = _build_engine(fallback_url)
            self._probe(fallback_engine)
            return fallback_url, fallback_engine

    # ── Helpers ──────────────────────────────────────────────────────────
    @staticmethod
    def _safe_url(url: str) -> str:
        """Hide credentials when logging the URL."""
        if "://" not in url:
            return url
        scheme, rest = url.split("://", 1)
        if "@" in rest:
            _, host = rest.split("@", 1)
            return f"{scheme}://***@{host}"
        return url

    def _init_db(self) -> None:
        metadata.create_all(self._engine)

    # ── Write ────────────────────────────────────────────────────────────
    def record_attack(
        self,
        agent: str,
        target: str,
        tactic: str,
        success: bool,
        risk_delta: int,
    ) -> None:
        with self._lock, self._engine.begin() as conn:
            conn.execute(
                attacks_table.insert().values(
                    timestamp=datetime.now(timezone.utc),
                    agent=agent,
                    target=target,
                    tactic=tactic,
                    success=bool(success),
                    risk_delta=int(risk_delta),
                )
            )

    # ── Tactic selection ─────────────────────────────────────────────────
    def get_recommended_tactic(
        self,
        agent: str,
        available_tactics: list[str],
    ) -> Optional[str]:
        if not available_tactics:
            return None

        # Walk the latest 200 attempts to compute consecutive-block streaks.
        with self._engine.connect() as conn:
            rows = conn.execute(
                select(attacks_table.c.tactic, attacks_table.c.success)
                .where(attacks_table.c.agent == agent)
                .order_by(attacks_table.c.id.desc())
                .limit(200)
            ).all()

        consecutive_blocks: dict[str, int] = {}
        for tactic, success in rows:
            consecutive_blocks.setdefault(tactic, 0)
            if not success:
                consecutive_blocks[tactic] += 1
            else:
                consecutive_blocks[tactic] = 0

        blocked = {t for t, c in consecutive_blocks.items() if c >= 3}
        candidates = [t for t in available_tactics if t not in blocked] or available_tactics

        # Sort remaining candidates by historical win-rate.
        with self._engine.connect() as conn:
            rows2 = conn.execute(
                select(
                    attacks_table.c.tactic,
                    func.sum(_to_int(attacks_table.c.success)).label("wins"),
                    func.count().label("total"),
                )
                .where(attacks_table.c.agent == agent)
                .group_by(attacks_table.c.tactic)
            ).all()
        stats = {r.tactic: ((r.wins or 0), (r.total or 0)) for r in rows2}

        def score(t: str) -> float:
            wins, total = stats.get(t, (0, 0))
            return (wins / total) if total else 0.5

        candidates.sort(key=score, reverse=True)
        return candidates[0]

    # ── Analytics ────────────────────────────────────────────────────────
    def most_vulnerable_targets(self) -> list[dict]:
        with self._engine.connect() as conn:
            rows = conn.execute(
                select(
                    attacks_table.c.target,
                    func.count().label("attempts"),
                    func.sum(_to_int(attacks_table.c.success)).label("hits"),
                )
                .group_by(attacks_table.c.target)
            ).all()
        out = []
        for r in rows:
            attempts = r.attempts or 0
            hits = r.hits or 0
            out.append({
                "target": r.target,
                "attempts": attempts,
                "hits": hits,
                "vulnerability": round(hits / attempts, 2) if attempts else 0.0,
            })
        out.sort(key=lambda x: x["vulnerability"], reverse=True)
        return out

    def most_successful_tactics(self) -> list[dict]:
        with self._engine.connect() as conn:
            rows = conn.execute(
                select(
                    attacks_table.c.tactic,
                    func.sum(_to_int(attacks_table.c.success)).label("wins"),
                    func.sum(_to_int_negated(attacks_table.c.success)).label("losses"),
                )
                .group_by(attacks_table.c.tactic)
            ).all()
        out = []
        for r in rows:
            wins = r.wins or 0
            losses = r.losses or 0
            total = wins + losses
            out.append({
                "tactic": r.tactic,
                "wins": wins,
                "losses": losses,
                "rate": round(wins / total, 2) if total else 0.0,
            })
        out.sort(key=lambda x: x["rate"], reverse=True)
        return out

    def get_summary(self) -> dict:
        with self._engine.connect() as conn:
            totals_row = conn.execute(
                select(
                    func.count().label("total"),
                    func.sum(_to_int(attacks_table.c.success)).label("successes"),
                )
            ).one()
            history_rows = conn.execute(
                select(attacks_table)
                .order_by(attacks_table.c.id.desc())
                .limit(20)
            ).all()

        total = totals_row.total or 0
        successes = totals_row.successes or 0
        history = [
            {
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "agent": r.agent,
                "target": r.target,
                "tactic": r.tactic,
                "success": bool(r.success),
                "risk_delta": r.risk_delta,
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
        with self._lock, self._engine.begin() as conn:
            conn.execute(attacks_table.delete())


# ── Portable boolean → int helpers ──────────────────────────────────────────
# SQLite stores Booleans as 0/1, PostgreSQL stores them as real booleans.
# Wrapping the column in a CASE expression gives us a numeric column SUM()
# can aggregate identically on both backends.
def _to_int(col):
    return case((col.is_(True), 1), else_=0)


def _to_int_negated(col):
    return case((col.is_(False), 1), else_=0)


def _short_err(exc: BaseException) -> str:
    """Strip stacktraces and verbose chained-cause noise from a DB error."""
    msg = str(exc)
    # Pull out the first useful line (psycopg + SQLAlchemy wrap each other).
    first = msg.splitlines()[0] if msg else exc.__class__.__name__
    return first.strip()
