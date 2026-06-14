"""
Router: Governance  —  POST /api/v1/evaluate-action
The primary endpoint that AI agents call before executing actions.
Includes Discord webhook alerts for BLOCK/ESCALATE decisions.
"""

import os
import json
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models import AgentAction, DecisionResult
from database import get_db

router = APIRouter(prefix="/api/v1", tags=["governance"])

logger = logging.getLogger(__name__)

# These will be injected by main.py at startup
decision_engine = None


async def send_discord_alert(action: AgentAction, result: DecisionResult):
    """Send a real-time alert to Discord when a dangerous action is detected."""
    from config import settings

    webhook_url = settings.DISCORD_WEBHOOK_URL
    if not webhook_url:
        return

    try:
        import httpx

        emoji = "🛑" if result.decision == "BLOCK" else "⚠️"
        color_word = "BLOCKED" if result.decision == "BLOCK" else "ESCALATED"

        message = (
            f"{emoji} **NETRA Alert** {emoji}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"**Agent**: {action.agent_name}\n"
            f"**Action**: {action.action_type} ₹{action.amount:,.0f}\n"
            f"**Customer**: {action.customer_id} ({action.customer_tier})\n"
            f"**Risk Score**: {result.risk_score:.0f}/100\n"
            f"**Decision**: **{color_word}**\n"
            f"**Reason**: {result.reasoning[:200]}\n"
            f"**Time**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )

        async with httpx.AsyncClient() as client:
            await client.post(
                webhook_url,
                json={"content": message},
                timeout=5.0,
            )
        logger.info(f"Discord alert sent for {result.decision} decision")

    except Exception as e:
        logger.warning(f"Discord alert failed (non-fatal): {e}")


@router.post("/evaluate-action", response_model=DecisionResult)
async def evaluate_action(action: AgentAction):
    """
    Evaluate an agent action through the 3-pillar governance pipeline.
    
    Returns APPROVE, BLOCK, or ESCALATE with full reasoning.
    """
    if decision_engine is None:
        raise HTTPException(status_code=503, detail="Decision engine not initialized")

    # Load dynamic rules from database
    db_rules = []
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT name, description, condition_field, operator, threshold, "
            "action_on_match, severity FROM policy_rules WHERE is_active = 1"
        )
        rows = await cursor.fetchall()
        for row in rows:
            db_rules.append({
                "name": row[0],
                "description": row[1],
                "condition_field": row[2],
                "operator": row[3],
                "threshold": row[4],
                "action_on_match": row[5],
                "severity": row[6],
            })

    result = await decision_engine.evaluate(action, db_rules=db_rules)

    # Broadcast to SSE subscribers
    from routers.events import broadcast_event
    from fastapi.encoders import jsonable_encoder
    
    payload = jsonable_encoder(result)
    payload.update({
        "agent_name": action.agent_name,
        "action_type": action.action_type,
        "amount": action.amount,
        "customer_id": action.customer_id,
    })
    
    await broadcast_event("decision", payload)

    # Fire Discord alert for BLOCK or ESCALATE
    if result.decision in ("BLOCK", "ESCALATE"):
        await send_discord_alert(action, result)

    return result

