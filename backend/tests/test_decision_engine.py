"""
Tests for the full Decision Engine pipeline
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import asyncio
from decision_engine import DecisionEngine
from rules_engine import RulesEngine
from memory_validator import MemoryValidator
from risk_scorer import RiskScorer
from audit_logger import AuditLogger
from models import AgentAction
from database import init_db, DATABASE_PATH

# Use test database
os.environ["DATABASE_PATH"] = "data/test_governance.db"
import config
config.settings.DATABASE_PATH = "data/test_governance.db"


def make_action(**overrides) -> AgentAction:
    defaults = {
        "action_id": "test_eng_001",
        "agent_name": "test_bot",
        "action_type": "refund",
        "amount": 1000,
        "customer_id": "cust_test",
        "customer_tier": "bronze",
        "timestamp": "2026-04-09T14:00:00Z",
        "context": {},
    }
    defaults.update(overrides)
    return AgentAction(**defaults)


FRAUD_HISTORY = [
    {"id": "fh1", "action_type": "refund", "amount": 5000, "customer_id": "cust_bad", "customer_tier": "bronze", "outcome": "fraud", "loss": 5000, "timestamp": "2025-12-01T10:00:00Z"},
    {"id": "fh2", "action_type": "refund", "amount": 8000, "customer_id": "cust_bad", "customer_tier": "bronze", "outcome": "fraud", "loss": 8000, "timestamp": "2025-12-10T10:00:00Z"},
]


@pytest.fixture
def engine():
    """Create a full decision engine for testing."""
    asyncio.get_event_loop().run_until_complete(init_db())

    rules = RulesEngine()
    memory = MemoryValidator()
    memory.load_historical_data(FRAUD_HISTORY)
    risk = RiskScorer()
    audit = AuditLogger()

    return DecisionEngine(rules, memory, risk, audit)


class TestDecisionEngine:
    @pytest.mark.asyncio
    async def test_approve_normal_action(self, engine):
        """Normal low-risk action should be approved."""
        action = make_action(
            action_id="approve_test_001",
            amount=500,
            action_type="refund",
            timestamp="2026-04-09T14:00:00Z",
        )
        result = await engine.evaluate(action)
        assert result.decision in ("APPROVE", "ESCALATE")
        assert result.risk_score < 70

    @pytest.mark.asyncio
    async def test_block_high_refund(self, engine):
        """Refund >50k should be blocked."""
        action = make_action(
            action_id="block_test_001",
            amount=75000,
            action_type="refund",
        )
        result = await engine.evaluate(action)
        assert result.decision == "BLOCK"
        assert result.risk_score > 30

    @pytest.mark.asyncio
    async def test_escalate_fraud_customer(self, engine):
        """Action from customer with fraud history should escalate or block."""
        action = make_action(
            action_id="fraud_test_001",
            customer_id="cust_bad",
            amount=3000,
            action_type="refund",
        )
        result = await engine.evaluate(action)
        assert result.decision in ("ESCALATE", "BLOCK")
        assert len(result.memory_warnings) > 0

    @pytest.mark.asyncio
    async def test_decision_has_all_fields(self, engine):
        """Decision result should have all required fields populated."""
        action = make_action(action_id="fields_test_001", amount=1000)
        result = await engine.evaluate(action)
        assert result.action_id == "fields_test_001"
        assert result.reasoning is not None and len(result.reasoning) > 0
        assert result.evaluated_at is not None
        assert 0 <= result.risk_score <= 100
        assert 0 <= result.anomaly_score
