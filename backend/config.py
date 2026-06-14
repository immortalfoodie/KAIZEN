"""
Agent Conscience — Configuration
Loads settings from environment / .env file
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # ── Application ──────────────────────────────────────────────────────
    APP_NAME: str = "NETRA"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # ── Database ─────────────────────────────────────────────────────────
    DATABASE_PATH: str = "data/governance.db"

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "*"  # Comma-separated origins, or "*" for dev

    # ── OpenAI (optional — system works without it) ──────────────────────
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # ── Groq LLM (for real CrewAI agent) ─────────────────────────────────
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama3-70b-8192"

    # ── Discord Webhook (alerts on BLOCK/ESCALATE) ───────────────────────
    DISCORD_WEBHOOK_URL: Optional[str] = None

    # ── Twilio (WhatsApp alerts on BLOCK) ────────────────────────────────
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_FROM: Optional[str] = None  # e.g. "whatsapp:+14155238886"
    TWILIO_WHATSAPP_TO: Optional[str] = None

    # ── Risk Scoring Thresholds ──────────────────────────────────────────
    RISK_BLOCK_THRESHOLD: float = 70.0
    RISK_ESCALATE_THRESHOLD: float = 40.0

    # ── Weights for final score combination ──────────────────────────────
    WEIGHT_RULES: float = 0.4
    WEIGHT_MEMORY: float = 0.3
    WEIGHT_ANOMALY: float = 0.3

    # ── Server ───────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origin_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Singleton instance
settings = Settings()
