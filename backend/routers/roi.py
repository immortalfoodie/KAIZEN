"""
Router: ROI Calculator — GET /api/v1/roi-summary
Calculates real return-on-investment from governance decisions.
"""

import logging
from fastapi import APIRouter
from database import get_db

router = APIRouter(prefix="/api/v1", tags=["roi"])

logger = logging.getLogger(__name__)

# Cost per governance evaluation (simulated operational cost)
COST_PER_EVALUATION = 45.0  # ₹45 per evaluation
BASELINE_INFRA_COST = 25000.0  # Baseline monthly infra cost


@router.get("/roi-summary")
async def roi_summary():
    """
    Calculate ROI from actual audit log data.

    Returns:
        - Total damage prevented (sum of amounts for BLOCK decisions)
        - Governance operational cost
        - ROI multiplier
        - Breakdown by action type
    """
    async with get_db() as db:
        # Total evaluations
        cursor = await db.execute("SELECT COUNT(*) FROM audit_logs")
        row = await cursor.fetchone()
        total_evaluations = row[0] if row else 0

        # Blocked actions and their total amounts
        cursor = await db.execute(
            "SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM audit_logs WHERE decision = 'BLOCK'"
        )
        row = await cursor.fetchone()
        blocked_count = row[0] if row else 0
        damage_prevented = row[1] if row else 0

        # Escalated actions
        cursor = await db.execute(
            "SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM audit_logs WHERE decision = 'ESCALATE'"
        )
        row = await cursor.fetchone()
        escalated_count = row[0] if row else 0
        escalated_amount = row[1] if row else 0

        # Approved actions
        cursor = await db.execute(
            "SELECT COUNT(*) FROM audit_logs WHERE decision = 'APPROVE'"
        )
        row = await cursor.fetchone()
        approved_count = row[0] if row else 0

        # Top 5 riskiest blocked actions
        cursor = await db.execute(
            """SELECT agent_name, action_type, amount, risk_score, customer_id, created_at
               FROM audit_logs WHERE decision = 'BLOCK'
               ORDER BY risk_score DESC LIMIT 5"""
        )
        top_risks = []
        for row in await cursor.fetchall():
            top_risks.append({
                "agent": row[0],
                "action": row[1],
                "amount": row[2],
                "risk_score": row[3],
                "customer": row[4],
                "time": row[5],
            })

    # Calculate ROI with realistic enterprise costs
    governance_cost = BASELINE_INFRA_COST + (total_evaluations * COST_PER_EVALUATION)
    roi_multiplier = (
        round(damage_prevented / governance_cost, 1)
        if governance_cost > 0
        else 0
    )

    return {
        "total_evaluations": total_evaluations,
        "damage_prevented": round(damage_prevented, 2),
        "governance_cost": round(governance_cost, 2),
        "roi_multiplier": roi_multiplier,
        "blocked_actions": blocked_count,
        "escalated_actions": escalated_count,
        "approved_actions": approved_count,
        "escalated_amount": round(escalated_amount, 2),
        "top_risks": top_risks,
        "cost_per_eval": COST_PER_EVALUATION,
    }
