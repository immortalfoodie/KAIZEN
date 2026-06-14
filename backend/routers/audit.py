"""
Router: Audit Log  —  GET /api/v1/audit-log
Paginated, filtered audit trail of all governance decisions.
"""

from fastapi import APIRouter, Query
from typing import Optional
from models import AuditLogResponse

router = APIRouter(prefix="/api/v1", tags=["audit"])

# Injected by main.py
audit_logger = None


@router.get("/audit-log", response_model=AuditLogResponse)
async def get_audit_log(
    limit: int = Query(20, ge=1, le=100, description="Number of items per page"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    decision: Optional[str] = Query(None, description="Filter by decision: APPROVE, BLOCK, ESCALATE"),
    min_risk: Optional[float] = Query(None, ge=0, le=100, description="Minimum risk score"),
    agent: Optional[str] = Query(None, description="Filter by agent name"),
    customer: Optional[str] = Query(None, description="Filter by customer ID"),
):
    """
    Get paginated audit log with optional filters.
    
    Supports filtering by decision type, minimum risk score, agent, and customer.
    """
    if audit_logger is None:
        return AuditLogResponse(total=0, limit=limit, offset=offset, items=[])

    result = await audit_logger.get_logs(
        limit=limit,
        offset=offset,
        decision_filter=decision,
        min_risk=min_risk,
        agent_filter=agent,
        customer_filter=customer,
    )

    return AuditLogResponse(**result)
