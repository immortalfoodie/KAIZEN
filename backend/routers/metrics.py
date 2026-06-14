"""
Router: Governance Metrics  —  GET /api/v1/governance-metrics
Aggregated statistics for the dashboard.
"""

from fastapi import APIRouter
from models import GovernanceMetrics

router = APIRouter(prefix="/api/v1", tags=["metrics"])

# Injected by main.py
audit_logger = None


@router.get("/governance-metrics", response_model=GovernanceMetrics)
async def get_governance_metrics():
    """
    Get aggregated governance metrics.
    
    Returns total decisions, block rate, escalation rate, average risk,
    and estimated loss prevented.
    """
    if audit_logger is None:
        return GovernanceMetrics(
            total_decisions=0, approved=0, blocked=0, escalated=0,
            block_rate="0%", escalation_rate="0%", avg_risk_score="0",
            max_risk_score=0, estimated_loss_prevented=0,
        )

    metrics = await audit_logger.get_metrics()
    return GovernanceMetrics(**metrics)
