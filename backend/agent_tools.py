"""
Agent Conscience — Real Agent Tools with Governance Interception
Tools that perform REAL actions (file writes, DB queries) but are
intercepted by the governance pipeline before execution.

Written in pure Python to bypass LangChain/Pydantic v1 bugs on Python 3.14.
"""

import os
import json
import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Governance Exception
# ═══════════════════════════════════════════════════════════════════════════════

class GovernanceException(Exception):
    """Raised when NETRA blocks an action."""
    pass


# ═══════════════════════════════════════════════════════════════════════════════
# Interception Middleware
# ═══════════════════════════════════════════════════════════════════════════════

def evaluate_via_governance(
    action_type: str,
    amount: float,
    customer_id: str,
    agent_name: str = "Finance Bot",
    customer_tier: str = "bronze",
    extra_context: dict = None,
) -> dict:
    """
    Calls POST /api/v1/evaluate-action on the local governance server.
    If the decision is BLOCK, raises GovernanceException.
    """
    payload = {
        "action_id": f"groq_agent_{int(datetime.now().timestamp() * 1000)}",
        "agent_name": agent_name,
        "action_type": action_type,
        "amount": amount,
        "customer_id": customer_id,
        "customer_tier": customer_tier,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "context": {
            "source": "live_groq_agent",
            **(extra_context or {}),
        },
    }

    try:
        resp = requests.post(
            "http://localhost:8000/api/v1/evaluate-action",
            json=payload,
            timeout=10,
        )
        if resp.status_code == 200:
            result = resp.json()
            decision = result.get("decision")
            risk_score = result.get("risk_score", 0)
            reasoning = result.get("reasoning", "")

            if decision == "BLOCK":
                raise GovernanceException(
                    f"🛑 BLOCKED by Agent Conscience | Risk Score: {risk_score}/100 | Reason: {reasoning}"
                )

            return result
        else:
            return {"decision": "APPROVE", "risk_score": 0}

    except GovernanceException:
        raise
    except Exception as e:
        raise GovernanceException(f"🛑 BLOCKED (fail-closed) — Governance system unreachable: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# Mutation Log
# ═══════════════════════════════════════════════════════════════════════════════

MUTATIONS_LOG = os.path.join(
    os.path.dirname(__file__), "data", "agent_mutations.log"
)

def _log_mutation(tool_name: str, details: str):
    os.makedirs(os.path.dirname(MUTATIONS_LOG), exist_ok=True)
    timestamp = datetime.utcnow().isoformat() + "Z"
    with open(MUTATIONS_LOG, "a") as f:
        f.write(f"[{timestamp}] {tool_name}: {details}\n")


# ═══════════════════════════════════════════════════════════════════════════════
# Tools Collection (Pure Python + Groq schemas)
# ═══════════════════════════════════════════════════════════════════════════════

def refund_tool(amount: str, customer_id: str) -> str:
    try:
        amt = float(amount)
    except (ValueError, TypeError):
        return f"Error: Invalid amount '{amount}'"
    evaluate_via_governance("refund", amt, customer_id)
    _log_mutation("RefundTool", f"₹{amt} refunded to {customer_id}")
    return f"✅ Successfully processed ₹{amt:,.0f} refund to {customer_id}"

def email_tool(recipient: str, subject: str, body: str) -> str:
    evaluate_via_governance(
        "send_email", 0, recipient,
        extra_context={"subject": subject, "body_preview": body[:100]},
    )
    _log_mutation("EmailTool", f"Email to {recipient}: {subject}")
    return f"✅ Email sent to {recipient} — Subject: {subject}"

def database_tool(query: str, database: str = "production") -> str:
    query_upper = query.upper()
    is_write = any(kw in query_upper for kw in ["DELETE", "DROP", "UPDATE", "INSERT", "ALTER"])
    amount = 100000 if is_write else 0
    evaluate_via_governance(
        "database_query", amount, f"db_{database}",
        extra_context={"query_preview": query[:200], "is_write_operation": is_write},
    )
    _log_mutation("DatabaseTool", f"[{database}] {query[:100]}")
    return f"✅ Query executed on {database}: {query[:80]}..."

# Map of python functions for direct execution
TOOL_FUNCTIONS = {
    "RefundTool": refund_tool,
    "EmailTool": email_tool,
    "DatabaseTool": database_tool,
}

# Groq tool schema
GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "RefundTool",
            "description": "Process a financial refund for a customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {"type": "string", "description": "The refund amount in rupees (numeric string)"},
                    "customer_id": {"type": "string", "description": "The customer identifier (e.g. cust_456)"}
                },
                "required": ["amount", "customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "EmailTool",
            "description": "Send an email notification to a customer or internal team.",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient": {"type": "string", "description": "Email address of the recipient"},
                    "subject": {"type": "string", "description": "Email subject line"},
                    "body": {"type": "string", "description": "Email body content"}
                },
                "required": ["recipient", "subject", "body"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "DatabaseTool",
            "description": "Execute a database query against the specified database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The SQL query to execute"},
                    "database": {"type": "string", "description": "Target database name (default: production)"}
                },
                "required": ["query"]
            }
        }
    }
]
