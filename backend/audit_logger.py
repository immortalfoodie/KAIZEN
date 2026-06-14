"""
Agent Conscience — Audit Logger
Persistent audit trail for all governance decisions
"""

import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from models import AgentAction, DecisionResult, AuditLogEntry
from config import settings

logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Writes every governance decision to SQLite for compliance and analytics.
    Supports filtered queries for the API layer.
    """

    def __init__(self):
        logger.info("AuditLogger initialized")

    async def log_decision(self, action: AgentAction, decision: DecisionResult):
        """Persist a governance decision to the database."""
        from database import get_db

        async with get_db() as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO audit_logs
                    (action_id, agent_name, action_type, amount, customer_id,
                     customer_tier, decision, risk_score, reasoning,
                     rule_violations, memory_warnings, anomaly_score, context)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    action.action_id,
                    action.agent_name,
                    action.action_type,
                    action.amount,
                    action.customer_id,
                    action.customer_tier,
                    decision.decision.value if hasattr(decision.decision, 'value') else decision.decision,
                    decision.risk_score,
                    decision.reasoning,
                    json.dumps([v.model_dump() for v in decision.rule_violations]),
                    json.dumps([w.model_dump() for w in decision.memory_warnings]),
                    decision.anomaly_score,
                    json.dumps(action.context),
                ),
            )
            await db.commit()

        # If it's a BLOCK or ESCALATE, potentially send a WhatsApp alert
        if decision.decision in ("BLOCK", "ESCALATE"):
            asyncio.create_task(self._send_whatsapp_alert(action, decision))

    async def _send_whatsapp_alert(self, action: AgentAction, decision: DecisionResult):
        """Send a WhatsApp alert via Twilio if configured."""
        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_WHATSAPP_FROM, settings.TWILIO_WHATSAPP_TO]):
            return

        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            emoji = "🛑" if decision.decision == "BLOCK" else "⚠️"
            message_body = (
                f"{emoji} *NETRA GOVERNANCE ALERT* {emoji}\n\n"
                f"*Action:* {action.action_type.upper()}\n"
                f"*Agent:* {action.agent_name}\n"
                f"*Amount:* ₹{action.amount:,.0f}\n"
                f"*Risk Score:* {decision.risk_score:.1f}/100\n"
                f"*Decision:* {decision.decision}\n\n"
                f"*Explanation:*\n{getattr(decision, 'simple_explanation', decision.reasoning)}"
            )

            client.messages.create(
                from_=settings.TWILIO_WHATSAPP_FROM,
                body=message_body,
                to=settings.TWILIO_WHATSAPP_TO
            )
            logger.info("Sent WhatsApp alert successfully")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp alert: {e}")

    async def get_logs(
        self,
        limit: int = 20,
        offset: int = 0,
        decision_filter: Optional[str] = None,
        min_risk: Optional[float] = None,
        agent_filter: Optional[str] = None,
        customer_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Query audit logs with optional filters and pagination.
        
        Returns:
            {"total": int, "limit": int, "offset": int, "items": [...]}
        """
        from database import get_db

        conditions = []
        params = []

        if decision_filter:
            conditions.append("decision = ?")
            params.append(decision_filter)
        if min_risk is not None:
            conditions.append("risk_score >= ?")
            params.append(min_risk)
        if agent_filter:
            conditions.append("agent_name = ?")
            params.append(agent_filter)
        if customer_filter:
            conditions.append("customer_id = ?")
            params.append(customer_filter)

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        async with get_db() as db:
            # Get total count
            cursor = await db.execute(
                f"SELECT COUNT(*) FROM audit_logs {where_clause}", params
            )
            row = await cursor.fetchone()
            total = row[0] if row else 0

            # Get paginated results
            cursor = await db.execute(
                f"""
                SELECT id, action_id, agent_name, action_type, amount,
                       customer_id, customer_tier, decision, risk_score,
                       reasoning, rule_violations, memory_warnings,
                       anomaly_score, context, created_at
                FROM audit_logs
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                params + [limit, offset],
            )
            rows = await cursor.fetchall()

        items = []
        for row in rows:
            items.append(AuditLogEntry(
                id=row[0],
                action_id=row[1],
                agent_name=row[2],
                action_type=row[3],
                amount=row[4],
                customer_id=row[5],
                customer_tier=row[6],
                decision=row[7],
                risk_score=row[8],
                reasoning=row[9],
                rule_violations=json.loads(row[10]) if row[10] else [],
                memory_warnings=json.loads(row[11]) if row[11] else [],
                anomaly_score=row[12],
                context=json.loads(row[13]) if row[13] else {},
                created_at=row[14],
            ))

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": items,
        }

    async def get_metrics(self) -> Dict[str, Any]:
        """Calculate aggregated governance metrics from the audit log."""
        from database import get_db

        async with get_db() as db:
            cursor = await db.execute("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN decision = 'APPROVE' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked,
                    SUM(CASE WHEN decision = 'ESCALATE' THEN 1 ELSE 0 END) as escalated,
                    AVG(risk_score) as avg_risk,
                    MAX(risk_score) as max_risk,
                    SUM(CASE WHEN decision = 'BLOCK' THEN amount ELSE 0 END) as loss_prevented
                FROM audit_logs
            """)
            row = await cursor.fetchone()

        if not row or row[0] == 0:
            return {
                "total_decisions": 0,
                "approved": 0,
                "blocked": 0,
                "escalated": 0,
                "block_rate": "0%",
                "escalation_rate": "0%",
                "avg_risk_score": "0",
                "max_risk_score": 0,
                "estimated_loss_prevented": 0,
                "period": "all_time",
            }

        total = row[0]
        approved = row[1] or 0
        blocked = row[2] or 0
        escalated = row[3] or 0
        avg_risk = row[4] or 0
        max_risk = row[5] or 0
        loss_prevented = row[6] or 0

        return {
            "total_decisions": total,
            "approved": approved,
            "blocked": blocked,
            "escalated": escalated,
            "block_rate": f"{(blocked / total * 100):.1f}%",
            "escalation_rate": f"{(escalated / total * 100):.1f}%",
            "avg_risk_score": f"{avg_risk:.1f}",
            "max_risk_score": round(max_risk, 1),
            "estimated_loss_prevented": round(loss_prevented, 2),
            "period": "all_time",
        }
