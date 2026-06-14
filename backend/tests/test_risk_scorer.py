"""
Tests for the Risk Scorer (Pillar 3)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from risk_scorer import RiskScorer
from models import AgentAction, RuleViolation, MemoryWarning


def make_action(**overrides) -> AgentAction:
    defaults = {
        "action_id": "test_risk_001",
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


class TestRiskScorer:
    def setup_method(self):
        self.scorer = RiskScorer()

    def test_normal_action_low_anomaly(self):
        """Normal business-hours, low-amount action should have low anomaly score."""
        action = make_action(amount=500, timestamp="2026-04-09T14:00:00Z")
        result = self.scorer.detect_anomaly(action)
        assert result["anomaly_score"] < 50
        assert result["is_anomaly"] is False

    def test_high_amount_high_anomaly(self):
        """Very high amount should trigger anomaly detection."""
        action = make_action(amount=200000, timestamp="2026-04-09T03:00:00Z")
        result = self.scorer.detect_anomaly(action)
        assert result["anomaly_score"] > 30

    def test_final_score_no_violations(self):
        """With no violations, final score should be low."""
        action = make_action(amount=500)
        anomaly = self.scorer.detect_anomaly(action)
        result = self.scorer.calculate_final_score(action, [], [], anomaly)
        assert result["score"] < 40
        assert result["recommendation"] == "APPROVE"

    def test_final_score_with_rule_violation(self):
        """Rule violations should push score above escalation threshold."""
        action = make_action(amount=60000)
        violations = [RuleViolation(rule="refund_limit", message="Over limit", severity="HIGH")]
        anomaly = self.scorer.detect_anomaly(action)
        result = self.scorer.calculate_final_score(action, violations, [], anomaly)
        assert result["score"] >= 40  # At least ESCALATE

    def test_final_score_with_all_signals(self):
        """All signals combined should produce very high risk."""
        action = make_action(amount=100000, timestamp="2026-04-09T02:00:00Z")
        violations = [RuleViolation(rule="test_rule", message="Violation", severity="HIGH")]
        warnings = [MemoryWarning(type="fraud_pattern", message="Fraud detected", severity="CRITICAL")]
        anomaly = self.scorer.detect_anomaly(action)
        result = self.scorer.calculate_final_score(action, violations, warnings, anomaly)
        assert result["score"] > 60
        assert result["recommendation"] in ("BLOCK", "ESCALATE")

    def test_explanation_generation(self):
        """Explanation should be non-empty and describe the situation."""
        action = make_action(amount=60000)
        violations = [RuleViolation(rule="refund_limit", message="Over limit", severity="HIGH")]
        anomaly = {"is_anomaly": True, "anomaly_score": 65, "confidence": 0.9, "raw_score": -0.3}
        explanation = self.scorer.generate_explanation(action, violations, [], anomaly, 75)
        assert len(explanation) > 20
        assert "refund_limit" in explanation

    def test_explanation_clean_action(self):
        """Clean action should get a positive explanation."""
        action = make_action(amount=100)
        explanation = self.scorer.generate_explanation(action, [], [], {"is_anomaly": False, "anomaly_score": 5}, 5)
        assert "Safe to proceed" in explanation or "passes" in explanation.lower()

    def test_feature_extraction(self):
        """Feature extraction should produce correct shape."""
        action = make_action(amount=5000, timestamp="2026-04-09T15:30:00Z")
        features = self.scorer.extract_features(action)
        assert features.shape == (1, 6)
        assert features[0][0] == 5000  # amount
