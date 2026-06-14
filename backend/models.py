"""
Agent Conscience — Pydantic Models
Request/response schemas for all API endpoints
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════

class Decision(str, Enum):
    APPROVE = "APPROVE"
    BLOCK = "BLOCK"
    ESCALATE = "ESCALATE"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RuleOperator(str, Enum):
    GT = "gt"
    LT = "lt"
    EQ = "eq"
    NEQ = "neq"
    IN = "in"
    NOT_IN = "not_in"
    AND = "and"


# ═══════════════════════════════════════════════════════════════════════════════
# Request Models
# ═══════════════════════════════════════════════════════════════════════════════

class AgentAction(BaseModel):
    """An action an agent wants to execute — sent to POST /evaluate-action."""
    action_id: str = Field(..., description="Unique action identifier", examples=["action_20260409_001"])
    agent_name: str = Field(..., description="Name of the agent", examples=["support_bot_v2.1"])
    action_type: str = Field(..., description="Type of action", examples=["refund", "approve_contract", "close_account"])
    amount: float = Field(0.0, description="Monetary amount in rupees", ge=0)
    customer_id: str = Field(..., description="Customer identifier", examples=["cust_123"])
    customer_tier: str = Field("bronze", description="Customer tier", examples=["bronze", "silver", "gold"])
    timestamp: str = Field(..., description="ISO 8601 timestamp", examples=["2026-04-09T19:30:00Z"])
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")


class PolicyRuleCreate(BaseModel):
    """Create a new policy rule."""
    name: str = Field(..., description="Unique rule name", examples=["refund_limit"])
    description: str = Field("", description="Human-readable description")
    condition_field: str = Field(..., description="Field to evaluate", examples=["amount", "action_type", "customer_tier"])
    operator: RuleOperator = Field(..., description="Comparison operator")
    threshold: str = Field(..., description="Value to compare against", examples=["50000", "gold", "refund"])
    action_on_match: Decision = Field(Decision.BLOCK, description="Action when rule matches")
    severity: Severity = Field(Severity.HIGH)


# ═══════════════════════════════════════════════════════════════════════════════
# Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class RuleViolation(BaseModel):
    """A single rule violation."""
    rule: str
    message: str
    severity: str


class MemoryWarning(BaseModel):
    """A warning from the memory validator."""
    type: str
    message: str
    severity: str


class DecisionResult(BaseModel):
    """The governance decision — returned from POST /evaluate-action."""
    action_id: str
    decision: Decision
    risk_score: float = Field(..., ge=0, le=100)
    reasoning: str
    simple_explanation: str = Field("", description="Plain-English explanation for non-technical stakeholders")
    rule_violations: List[RuleViolation]
    memory_warnings: List[MemoryWarning]
    anomaly_score: float = Field(..., ge=0)
    recommendation: Decision
    evaluated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class AuditLogEntry(BaseModel):
    """A single entry in the audit log."""
    id: int
    action_id: str
    agent_name: str
    action_type: str
    amount: float
    customer_id: str
    customer_tier: str
    decision: str
    risk_score: float
    reasoning: str
    rule_violations: List[Any]
    memory_warnings: List[Any]
    anomaly_score: float
    context: Dict[str, Any]
    created_at: str


class AuditLogResponse(BaseModel):
    """Paginated audit log response."""
    total: int
    limit: int
    offset: int
    items: List[AuditLogEntry]


class GovernanceMetrics(BaseModel):
    """Summary governance metrics."""
    total_decisions: int
    approved: int
    blocked: int
    escalated: int
    block_rate: str
    escalation_rate: str
    avg_risk_score: str
    max_risk_score: float
    estimated_loss_prevented: float
    period: str = "all_time"


class PolicyRuleResponse(BaseModel):
    """A policy rule."""
    id: int
    name: str
    description: str
    condition_field: str
    operator: str
    threshold: str
    action_on_match: str
    severity: str
    is_active: bool
    created_at: str


class MemoryInsight(BaseModel):
    """Historical pattern insight for a customer/action."""
    customer_id: str
    total_past_actions: int
    fraud_incidents: int
    total_loss: float
    risk_elevation: str
    recent_actions: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    """System health check response."""
    status: str
    version: str
    timestamp: str
    components: Dict[str, str]


class ErrorResponse(BaseModel):
    """Standard error response envelope."""
    error: str
    detail: str
    status_code: int
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class SSEEvent(BaseModel):
    """Server-Sent Event payload."""
    event: str  # "decision", "alert", "heartbeat"
    data: Dict[str, Any]
