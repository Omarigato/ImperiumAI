from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ─────────────────────────────────────────────────────────────────
    app_name: str = "AegisAI"
    app_version: str = "2.0.0"
    debug: bool = False

    # ── Server ──────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False

    # ── CORS ────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # ── LLM API Keys (all optional — falls back to simulation) ──────────────
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")

    # ── Database ─────────────────────────────────────────────────────────────
    db_path: Path = Path("data/attack_memory.db")

    # ── Battle Tuning ────────────────────────────────────────────────────────
    max_rounds: int = 10
    risk_win_threshold: int = 95
    consecutive_success_win: int = 3
    consecutive_block_win: int = 4
    round_delay_s: float = 1.0

    # ── WebSocket ────────────────────────────────────────────────────────────
    ws_max_connections: int = 50


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()