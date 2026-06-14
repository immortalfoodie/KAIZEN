"""
Agent Conscience — Risk Scorer (Pillar 3)
Isolation Forest anomaly detection + weighted score combination
"""

import logging
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest
from models import AgentAction, RuleViolation, MemoryWarning
from config import settings

logger = logging.getLogger(__name__)


class RiskScorer:
    """
    Combines:
      - Isolation Forest anomaly detection (statistical)
      - Rules score (deterministic)
      - Memory score (contextual)
    
    Into a single 0-100 risk score with a decision recommendation.
    """

    def __init__(self):
        self.iso_forest = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100,
        )
        self._is_trained = False
        self._train_with_seed_data()
        logger.info("RiskScorer initialized with Isolation Forest")

    def _train_with_seed_data(self):
        """Train anomaly detector with realistic synthetic data."""
        # Generate 100 realistic training samples
        np.random.seed(42)
        n_normal = 90
        n_anomalous = 10

        # Normal transactions: low-medium amounts, business hours, weekdays
        normal_data = np.column_stack([
            np.random.lognormal(mean=6, sigma=1.2, size=n_normal).clip(50, 45000),  # amount
            np.random.poisson(lam=1.5, size=n_normal).clip(0, 5),                  # frequency
            np.random.normal(loc=13, scale=2.5, size=n_normal).clip(8, 18),        # hour
            np.random.choice([0, 1, 2, 3, 4], size=n_normal),                      # day (Mon-Fri)
            np.random.normal(loc=180, scale=90, size=n_normal).clip(5, 1000),       # tenure_days
            np.random.choice([1, 2], size=n_normal, p=[0.8, 0.2]),                 # tool_chain_len
        ])

        # Anomalous transactions: high amounts, odd hours, weekends
        anomalous_data = np.column_stack([
            np.random.lognormal(mean=10, sigma=1.5, size=n_anomalous).clip(50000, 500000),
            np.random.poisson(lam=5, size=n_anomalous).clip(3, 10),
            np.random.choice([0, 1, 2, 3, 4, 22, 23], size=n_anomalous),
            np.random.choice([5, 6], size=n_anomalous),
            np.random.uniform(1, 30, size=n_anomalous),
            np.random.choice([3, 4, 5], size=n_anomalous),
        ])

        X_train = np.vstack([normal_data, anomalous_data])
        self.iso_forest.fit(X_train)
        self._is_trained = True
        logger.info(f"Isolation Forest trained on {len(X_train)} samples")

    def extract_features(self, action: AgentAction) -> np.ndarray:
        """Convert an action into a numerical feature vector."""
        try:
            ts = datetime.fromisoformat(action.timestamp.replace("Z", "+00:00"))
            hour = ts.hour
            day = ts.weekday()
        except Exception:
            hour = 12
            day = 2

        # Estimate frequency from context (default: 1)
        frequency = action.context.get("prior_attempts", 1)

        # Customer tenure (default: 30 days)
        tenure = action.context.get("customer_tenure_days", 30)

        features = np.array([
            action.amount,
            frequency,
            hour,
            day,
            tenure,
            1,  # tool chain length (simplified)
        ]).reshape(1, -1)

        return features

    def detect_anomaly(self, action: AgentAction) -> Dict[str, Any]:
        """
        Run Isolation Forest on the action features.
        
        Returns:
            {
                "is_anomaly": bool,
                "anomaly_score": float (0-100 scale),
                "confidence": float (0-1),
                "raw_score": float
            }
        """
        if not self._is_trained:
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "confidence": 0.0,
                "raw_score": 0.0,
            }

        features = self.extract_features(action)
        raw_score = self.iso_forest.decision_function(features)[0]
        prediction = self.iso_forest.predict(features)[0]

        # Convert raw score to 0-100 scale
        # Isolation Forest: more negative = more anomalous
        # Typical range: -0.5 (very anomalous) to 0.5 (normal)
        anomaly_score = max(0, min(100, (0.5 - raw_score) * 100))

        return {
            "is_anomaly": prediction == -1,
            "anomaly_score": round(anomaly_score, 2),
            "confidence": 0.85 if prediction == -1 else 0.95,
            "raw_score": round(float(raw_score), 4),
        }

    def generate_explanation(
        self,
        action: AgentAction,
        rule_violations: List[RuleViolation],
        memory_warnings: List[MemoryWarning],
        anomaly_result: Dict[str, Any],
        final_score: float,
    ) -> str:
        """
        Generate a human-readable explanation of the risk assessment.
        Uses template-based generation (no external API needed).
        """
        parts = []

        if rule_violations:
            rule_names = ", ".join(v.rule for v in rule_violations)
            parts.append(f"Policy violations detected: {rule_names}.")

        if memory_warnings:
            fraud_warnings = [w for w in memory_warnings if w.type == "fraud_pattern"]
            freq_warnings = [w for w in memory_warnings if w.type == "frequency_pattern"]
            if fraud_warnings:
                parts.append(f"Historical fraud pattern found for this customer.")
            if freq_warnings:
                parts.append(f"Unusual frequency of similar actions detected.")

        if anomaly_result.get("is_anomaly"):
            score = anomaly_result.get("anomaly_score", 0)
            parts.append(f"Statistical anomaly detected (score: {score:.0f}%).")

            # Add time-based context
            try:
                ts = datetime.fromisoformat(action.timestamp.replace("Z", "+00:00"))
                if ts.hour < 6 or ts.hour > 22:
                    parts.append(f"Action attempted at unusual hour ({ts.hour}:00).")
                if ts.weekday() >= 5:
                    parts.append("Action attempted on weekend.")
            except Exception:
                pass

        if not parts:
            return "Action passes all governance checks. No policy violations, historical warnings, or statistical anomalies detected. Safe to proceed."

        # Add risk level summary
        if final_score > 70:
            parts.append("Overall risk level: HIGH. Recommended action: BLOCK.")
        elif final_score > 40:
            parts.append("Overall risk level: MODERATE. Recommended action: ESCALATE for human review.")

        return " ".join(parts)

    def calculate_final_score(
        self,
        action: AgentAction,
        rule_violations: List[RuleViolation],
        memory_warnings: List[MemoryWarning],
        anomaly_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Combine all scoring pillars into a final risk score and recommendation.
        
        Returns:
            {
                "score": float (0-100),
                "recommendation": "APPROVE" | "BLOCK" | "ESCALATE",
                "explanation": str,
                "breakdown": { rule_score, memory_score, anomaly_score }
            }
        """
        # Individual pillar scores (0-100 each)
        rule_score = 100.0 if rule_violations else 0.0
        memory_score = 80.0 if memory_warnings else 0.0
        anomaly_score_val = anomaly_result.get("anomaly_score", 0.0)

        # Boost memory score if fraud detected
        fraud_count = sum(1 for w in memory_warnings if w.type == "fraud_pattern")
        if fraud_count > 0:
            memory_score = min(100, 80 + fraud_count * 10)

        # Weighted combination
        final_score = (
            settings.WEIGHT_RULES * rule_score
            + settings.WEIGHT_MEMORY * memory_score
            + settings.WEIGHT_ANOMALY * anomaly_score_val
        )
        final_score = min(100, max(0, final_score))

        # Determine recommendation
        if final_score > settings.RISK_BLOCK_THRESHOLD:
            recommendation = "BLOCK"
        elif final_score > settings.RISK_ESCALATE_THRESHOLD:
            recommendation = "ESCALATE"
        else:
            recommendation = "APPROVE"

        # Generate explanation
        explanation = self.generate_explanation(
            action, rule_violations, memory_warnings, anomaly_result, final_score
        )

        return {
            "score": round(final_score, 2),
            "recommendation": recommendation,
            "explanation": explanation,
            "breakdown": {
                "rule_score": round(rule_score, 2),
                "memory_score": round(memory_score, 2),
                "anomaly_score": round(anomaly_score_val, 2),
            },
        }
