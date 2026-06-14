"""
Tests for the Rules Engine (Pillar 1)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from rules_engine import RulesEngine
from models import AgentAction


def make_action(**overrides) -> AgentAction:
    """Helper to create test actions."""
    defaults = {
        "action_id": "test_001",
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


class TestRulesEngine:
    def setup_method(self):
        self.engine = RulesEngine()

    def test_low_refund_passes(self):
        """Small refund should pass all rules."""
        action = make_action(amount=500, action_type="refund")
        result = self.engine.evaluate(action)
        assert result["passed"] is True
        assert result["violation_count"] == 0

    def test_high_refund_blocked(self):
        """Refund >50k should trigger refund_limit rule."""
        action = make_action(amount=75000, action_type="refund")
        result = self.engine.evaluate(action)
        assert result["passed"] is False
        violations = [v.rule for v in result["violations"]]
        assert "refund_limit" in violations

    def test_gold_account_closure_escalated(self):
        """Gold-tier account closure should trigger escalation."""
        action = make_action(
            action_type="close_account", customer_tier="gold", amount=0
        )
        result = self.engine.evaluate(action)
        assert result["passed"] is False
        violations = [v.rule for v in result["violations"]]
        assert "gold_customer_protection" in violations

    def test_bronze_account_closure_passes(self):
        """Bronze-tier account closure should pass."""
        action = make_action(
            action_type="close_account", customer_tier="bronze", amount=0
        )
        result = self.engine.evaluate(action)
        # Should not trigger gold_customer_protection
        violations = [v.rule for v in result["violations"]]
        assert "gold_customer_protection" not in violations

    def test_large_contract_blocked(self):
        """Contract >10L should trigger contract_approval_limit."""
        action = make_action(
            action_type="approve_contract", amount=1500000
        )
        result = self.engine.evaluate(action)
        assert result["passed"] is False
        violations = [v.rule for v in result["violations"]]
        assert "contract_approval_limit" in violations

    def test_high_refund_bronze_escalated(self):
        """Refund >10k for bronze customer should escalate."""
        action = make_action(
            amount=15000, action_type="refund", customer_tier="bronze"
        )
        result = self.engine.evaluate(action)
        violations = [v.rule for v in result["violations"]]
        assert "high_refund_new_customer" in violations

    def test_off_hours_high_value_escalated(self):
        """High-value action at 3 AM should escalate."""
        action = make_action(
            amount=30000, action_type="refund",
            timestamp="2026-04-09T03:00:00Z"
        )
        result = self.engine.evaluate(action)
        violations = [v.rule for v in result["violations"]]
        assert "off_hours_high_value" in violations

    def test_db_rules_evaluated(self):
        """Database rules should also be evaluated."""
        action = make_action(amount=5000, action_type="refund")
        db_rules = [{
            "name": "custom_limit",
            "description": "Custom low limit",
            "condition_field": "amount",
            "operator": "gt",
            "threshold": "3000",
            "action_on_match": "ESCALATE",
            "severity": "MEDIUM",
        }]
        result = self.engine.evaluate(action, db_rules=db_rules)
        violations = [v.rule for v in result["violations"]]
        assert "custom_limit" in violations

    def test_rules_checked_count(self):
        """Should report how many rules were checked."""
        action = make_action(amount=100)
        result = self.engine.evaluate(action)
        assert result["rules_checked"] > 0
