"""
Tests for the Memory Validator (Pillar 2)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from memory_validator import MemoryValidator
from models import AgentAction


def make_action(**overrides) -> AgentAction:
    defaults = {
        "action_id": "test_mem_001",
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


MOCK_HISTORY = [
    {"id": "h1", "action_type": "refund", "amount": 2000, "customer_id": "cust_456", "customer_tier": "bronze", "outcome": "fraud", "loss": 2000, "timestamp": "2025-12-01T10:00:00Z"},
    {"id": "h2", "action_type": "refund", "amount": 3000, "customer_id": "cust_456", "customer_tier": "bronze", "outcome": "fraud", "loss": 3000, "timestamp": "2025-12-05T10:00:00Z"},
    {"id": "h3", "action_type": "refund", "amount": 500, "customer_id": "cust_456", "customer_tier": "bronze", "outcome": "success", "loss": 0, "timestamp": "2025-12-10T10:00:00Z"},
    {"id": "h4", "action_type": "refund", "amount": 800, "customer_id": "cust_clean", "customer_tier": "gold", "outcome": "success", "loss": 0, "timestamp": "2025-12-15T10:00:00Z"},
]


class TestMemoryValidator:
    def setup_method(self):
        self.validator = MemoryValidator()
        self.validator.load_historical_data(MOCK_HISTORY)

    def test_deduplication(self):
        """Loading same data twice should not create duplicates."""
        initial_count = self.validator.collection.count()
        self.validator.load_historical_data(MOCK_HISTORY)
        assert self.validator.collection.count() == initial_count

    def test_query_fraud_customer(self):
        """Querying a customer with fraud history should return warnings."""
        action = make_action(customer_id="cust_456")
        result = self.validator.query(action)
        assert result["similar_actions"] > 0
        assert len(result["warnings"]) > 0
        assert result["total_loss_in_similar"] > 0
        assert result["risk_elevation"] == "HIGH"

    def test_query_clean_customer(self):
        """Querying a clean customer should return no fraud warnings."""
        action = make_action(customer_id="cust_clean")
        result = self.validator.query(action)
        fraud_warnings = [w for w in result["warnings"] if w.type == "fraud_pattern"]
        assert len(fraud_warnings) == 0

    def test_store_and_query_new_action(self):
        """Storing a new action should make it queryable."""
        action = make_action(
            action_id="new_action_001",
            customer_id="cust_new",
        )
        self.validator.store_action(action, "success")
        result = self.validator.query(action)
        assert result["similar_actions"] >= 1

    def test_customer_insights(self):
        """Customer insights should aggregate correctly."""
        insights = self.validator.get_customer_insights("cust_456")
        assert insights["customer_id"] == "cust_456"
        assert insights["total_past_actions"] >= 3
        assert insights["fraud_incidents"] >= 2
        assert insights["total_loss"] >= 5000

    def test_unknown_customer_insights(self):
        """Unknown customer should return empty insights."""
        insights = self.validator.get_customer_insights("cust_none")
        assert insights["total_past_actions"] == 0
        assert insights["risk_elevation"] == "LOW"
