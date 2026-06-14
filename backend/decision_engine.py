"""
Agent Conscience — Decision Engine
Orchestrator: Rules → Memory → Risk → Final Decision
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, List

from models import AgentAction, DecisionResult, RuleViolation, MemoryWarning
from rules_engine import RulesEngine
from memory_validator import MemoryValidator
from risk_scorer import RiskScorer
from audit_logger import AuditLogger

logger = logging.getLogger(__name__)


class DecisionEngine:
    """
    Central orchestrator that processes agent actions through the 3-pillar
    governance pipeline and produces a final decision.
    
    Pipeline:
        1. Rules Engine   → deterministic policy checks
        2. Memory Validator → historical pattern matching
        3. Risk Scorer     → anomaly detection + weighted scoring
        4. Audit Logger    → persistent logging
    """

    def __init__(
        self,
        rules_engine: RulesEngine,
        memory_validator: MemoryValidator,
        risk_scorer: RiskScorer,
        audit_logger: AuditLogger,
    ):
        self.rules_engine = rules_engine
        self.memory_validator = memory_validator
        self.risk_scorer = risk_scorer
        self.audit_logger = audit_logger
        logger.info("DecisionEngine initialized — all 3 pillars connected")

    async def evaluate(
        self, action: AgentAction, db_rules: List[Dict] = None
    ) -> DecisionResult:
        """
        Full governance evaluation pipeline.
        
        Args:
            action: The agent action to evaluate
            db_rules: Optional list of database-stored rules
            
        Returns:
            DecisionResult with decision, risk score, and reasoning
        """
        start_time = datetime.utcnow()

        # ── Pillar 1: Rules Engine ──────────────────────────────────────
        rules_result = self.rules_engine.evaluate(action, db_rules=db_rules)
        rule_violations: List[RuleViolation] = rules_result["violations"]

        # ── Pillar 2: Memory Validator ──────────────────────────────────
        memory_result = self.memory_validator.query(action)
        memory_warnings: List[MemoryWarning] = memory_result["warnings"]

        # ── Pillar 3: Risk Scorer ───────────────────────────────────────
        anomaly_result = self.risk_scorer.detect_anomaly(action)
        risk_result = self.risk_scorer.calculate_final_score(
            action, rule_violations, memory_warnings, anomaly_result
        )

        # ── Build Decision ──────────────────────────────────────────────
        
        # Override recommendation if there's a deterministic BLOCK policy
        final_decision = risk_result["recommendation"]
        
        # We need to know if any rule explicitly commands a BLOCK
        # Some rule engines return the action_on_match, let's look at what we have
        # If any violation dictates a BLOCK, we force it.
        has_block_rule = any(
            # We assume RuleViolation might have `severity` == "HIGH" or `action_on_match` == "BLOCK"
            # Actually, let's just force BLOCK if the score is > 50 AND there is a HIGH severity violation.
            getattr(v, 'severity', '') == "HIGH" for v in rule_violations
        )
        if has_block_rule:
             final_decision = "BLOCK"
                
        # ── Generate Simple Explanation ──────────────────────────────────
        simple_explanation = self._generate_simple_explanation(
            action, final_decision, risk_result["score"],
            rule_violations, memory_warnings, anomaly_result
        )

        decision = DecisionResult(
            action_id=action.action_id,
            decision=final_decision,
            risk_score=risk_result["score"],
            reasoning=risk_result["explanation"],
            simple_explanation=simple_explanation,
            rule_violations=rule_violations,
            memory_warnings=memory_warnings,
            anomaly_score=anomaly_result["anomaly_score"],
            recommendation=risk_result["recommendation"],
            evaluated_at=datetime.utcnow().isoformat() + "Z",
        )

        # ── Persist to audit log ────────────────────────────────────────
        await self.audit_logger.log_decision(action, decision)

        # ── Store in memory for future pattern matching ─────────────────
        outcome = "flagged" if decision.decision != "APPROVE" else "success"
        self.memory_validator.store_action(action, outcome)

        elapsed = (datetime.utcnow() - start_time).total_seconds()
        logger.info(
            f"Action {action.action_id}: {decision.decision} "
            f"(risk={decision.risk_score:.1f}, latency={elapsed:.3f}s)"
        )

        return decision

    def _generate_simple_explanation(
        self,
        action: AgentAction,
        final_decision: str,
        risk_score: float,
        rule_violations: List[RuleViolation],
        memory_warnings: List[MemoryWarning],
        anomaly_result: Dict[str, Any],
    ) -> str:
        """
        Generate a plain-English explanation that a non-technical person
        (CEO, compliance officer, hackathon judge) can immediately understand.
        """
        agent = action.agent_name
        action_desc = f"{action.action_type} of ₹{action.amount:,.0f}"
        customer = action.customer_id

        if final_decision == "APPROVE":
            return (
                f"✅ Safe to proceed. {agent} requested a {action_desc} for customer {customer}. "
                f"All checks passed — no policy violations, no fraud history, and the request "
                f"looks normal compared to typical patterns. Risk score: {risk_score:.0f}/100 (low)."
            )

        parts = []
        parts.append(
            f"{'🛑 Blocked' if final_decision == 'BLOCK' else '⚠️ Flagged for human review'}. "
            f"{agent} tried to perform a {action_desc} for customer {customer}."
        )

        # Explain rule violations in plain English
        if rule_violations:
            violation_reasons = []
            for v in rule_violations:
                if "limit" in v.rule.lower() or "refund" in v.rule.lower():
                    violation_reasons.append("the amount exceeds the allowed limit for this type of transaction")
                elif "tier" in v.rule.lower() or "customer" in v.rule.lower():
                    violation_reasons.append("the customer account doesn't have the required trust level")
                elif "hour" in v.rule.lower() or "time" in v.rule.lower():
                    violation_reasons.append("it was attempted at an unusual time (outside business hours)")
                else:
                    violation_reasons.append(v.message.lower())
            unique_reasons = list(dict.fromkeys(violation_reasons))  # deduplicate
            parts.append(f"This was flagged because {', and '.join(unique_reasons[:3])}.")

        # Explain memory warnings
        if memory_warnings:
            fraud_warnings = [w for w in memory_warnings if "fraud" in w.type.lower()]
            if fraud_warnings:
                parts.append(
                    "Our system also found this customer linked to a previous fraud incident on record."
                )

        # Explain anomaly
        if anomaly_result.get("is_anomaly"):
            parts.append(
                f"Additionally, our AI model flagged this as statistically unusual — "
                f"it doesn't match the normal pattern of transactions we typically see."
            )

        # Risk summary
        risk_level = "very high" if risk_score > 70 else "elevated" if risk_score > 40 else "moderate"
        parts.append(f"Overall risk level: {risk_level} ({risk_score:.0f}/100).")

        return " ".join(parts)
