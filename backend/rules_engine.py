"""
Agent Conscience — Rules Engine (Pillar 1)
Deterministic policy evaluation against configurable business rules
"""

import json
import logging
from typing import List, Dict, Any
from models import AgentAction, RuleViolation

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Built-in Rules (always active, loaded at startup)
# ═══════════════════════════════════════════════════════════════════════════════

BUILTIN_RULES = [
    {
        "name": "refund_limit",
        "description": "Refund exceeds maximum policy limit (₹50,000)",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "50000",
        "action_on_match": "BLOCK",
        "severity": "HIGH",
        "applies_to": ["refund"],
    },
    {
        "name": "gold_customer_protection",
        "description": "Gold-tier customers require manager approval for account closure",
        "condition_field": "customer_tier",
        "operator": "eq",
        "threshold": "gold",
        "action_on_match": "ESCALATE",
        "severity": "HIGH",
        "applies_to": ["close_account", "account_close"],
    },
    {
        "name": "contract_approval_limit",
        "description": "Contract >₹10 lakhs requires CFO approval",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "1000000",
        "action_on_match": "BLOCK",
        "severity": "CRITICAL",
        "applies_to": ["approve_contract"],
    },
    {
        "name": "high_refund_new_customer",
        "description": "Refund >₹10,000 to bronze-tier customer requires review",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "10000",
        "action_on_match": "ESCALATE",
        "severity": "MEDIUM",
        "applies_to": ["refund"],
        "extra_condition": {"field": "customer_tier", "operator": "eq", "value": "bronze"},
    },
    {
        "name": "off_hours_high_value",
        "description": "Actions >₹25,000 outside business hours (before 9 AM or after 6 PM) require review",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "25000",
        "action_on_match": "ESCALATE",
        "severity": "MEDIUM",
        "applies_to": None,  # All action types
        "extra_condition": {"field": "hour", "operator": "not_between", "value": "9,18"},
    },
]


class RulesEngine:
    """
    Evaluates agent actions against deterministic business policy rules.
    
    Rules can come from:
      1. Built-in rules (BUILTIN_RULES above)
      2. Database rules (created via API)
    """

    def __init__(self):
        self.builtin_rules = BUILTIN_RULES
        logger.info(f"RulesEngine initialized with {len(self.builtin_rules)} built-in rules")

    def evaluate(self, action: AgentAction, db_rules: List[Dict] = None) -> Dict[str, Any]:
        """
        Check action against all active rules.
        
        Returns:
            {
                "violations": [RuleViolation, ...],
                "passed": bool,
                "violation_count": int,
                "rules_checked": int
            }
        """
        violations: List[RuleViolation] = []
        rules_checked = 0

        # ── Check built-in rules ────────────────────────────────────────
        for rule in self.builtin_rules:
            rules_checked += 1
            if self._check_builtin_rule(action, rule):
                violations.append(RuleViolation(
                    rule=rule["name"],
                    message=rule["description"],
                    severity=rule["severity"],
                ))

        # ── Check database rules ────────────────────────────────────────
        if db_rules:
            for rule in db_rules:
                rules_checked += 1
                if self._check_db_rule(action, rule):
                    violations.append(RuleViolation(
                        rule=rule["name"],
                        message=rule.get("description", f"Rule '{rule['name']}' violated"),
                        severity=rule.get("severity", "HIGH"),
                    ))

        return {
            "violations": violations,
            "passed": len(violations) == 0,
            "violation_count": len(violations),
            "rules_checked": rules_checked,
        }

    def _check_builtin_rule(self, action: AgentAction, rule: Dict) -> bool:
        """Evaluate a single built-in rule against the action."""

        # Check if rule applies to this action type
        applies_to = rule.get("applies_to")
        if applies_to is not None and action.action_type not in applies_to:
            return False

        # Primary condition
        field_value = self._get_field_value(action, rule["condition_field"])
        threshold = rule["threshold"]
        if not self._compare(field_value, rule["operator"], threshold):
            return False

        # Extra condition (compound rule)
        extra = rule.get("extra_condition")
        if extra:
            extra_value = self._get_field_value(action, extra["field"])
            if not self._compare(extra_value, extra["operator"], extra.get("value", "")):
                return False

        return True

    def _check_db_rule(self, action: AgentAction, rule: Dict) -> bool:
        """Evaluate a database-stored rule against the action."""
        field_value = self._get_field_value(action, rule["condition_field"])
        return self._compare(field_value, rule["operator"], rule["threshold"])

    def _get_field_value(self, action: AgentAction, field: str) -> Any:
        """Extract a field value from the action, including derived fields."""
        if field == "hour":
            try:
                from datetime import datetime
                ts = datetime.fromisoformat(action.timestamp.replace("Z", "+00:00"))
                return ts.hour
            except Exception:
                return 12  # Default to noon
        elif field == "day_of_week":
            try:
                from datetime import datetime
                ts = datetime.fromisoformat(action.timestamp.replace("Z", "+00:00"))
                return ts.weekday()
            except Exception:
                return 2  # Default to Wednesday
        elif hasattr(action, field):
            return getattr(action, field)
        elif field in action.context:
            return action.context[field]
        return None

    def _compare(self, value: Any, operator: str, threshold: str) -> bool:
        """Compare a value against a threshold using the specified operator."""
        if value is None:
            return False

        try:
            if operator == "gt":
                return float(value) > float(threshold)
            elif operator == "lt":
                return float(value) < float(threshold)
            elif operator == "eq":
                return str(value).lower() == str(threshold).lower()
            elif operator == "neq":
                return str(value).lower() != str(threshold).lower()
            elif operator == "in":
                allowed = [v.strip().lower() for v in str(threshold).split(",")]
                return str(value).lower() in allowed
            elif operator == "not_in":
                disallowed = [v.strip().lower() for v in str(threshold).split(",")]
                return str(value).lower() not in disallowed
            elif operator == "not_between":
                parts = str(threshold).split(",")
                low, high = float(parts[0]), float(parts[1])
                return float(value) < low or float(value) > high
        except (ValueError, TypeError, IndexError) as e:
            logger.warning(f"Rule comparison error: {e}")
            return False

        return False
