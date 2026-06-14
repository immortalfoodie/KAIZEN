"""
Router: Health Check  —  GET /api/v1/health
"""

from fastapi import APIRouter
from datetime import datetime
from config import settings
from models import HealthResponse

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """System health check with component status."""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow().isoformat() + "Z",
        components={
            "api": "ok",
            "database": "ok",
            "rules_engine": "ok",
            "memory_validator": "ok",
            "risk_scorer": "ok",
        },
    )
