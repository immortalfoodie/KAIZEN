"""
Router: Memory Insights  —  GET /api/v1/memory-insights
Historical pattern insights for customers.
"""

from fastapi import APIRouter, Query
from models import MemoryInsight

router = APIRouter(prefix="/api/v1", tags=["memory"])

# Injected by main.py
memory_validator = None


@router.get("/memory-insights", response_model=MemoryInsight)
async def get_memory_insights(
    customer_id: str = Query(..., description="Customer ID to lookup"),
):
    """
    Get historical pattern insights for a specific customer.
    
    Returns past action count, fraud incidents, total loss, and risk elevation.
    """
    if memory_validator is None:
        return MemoryInsight(
            customer_id=customer_id, total_past_actions=0,
            fraud_incidents=0, total_loss=0,
            risk_elevation="LOW", recent_actions=[],
        )

    insights = memory_validator.get_customer_insights(customer_id)
    return MemoryInsight(**insights)
