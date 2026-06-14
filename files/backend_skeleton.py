"""
Autonomous Agent Governance Platform - Backend
Combines Rules Engine + Memory Validator + Risk Scorer
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
from datetime import datetime
import chromadb
from sklearn.ensemble import IsolationForest
import numpy as np
import openai
import os

# ============================================================================
# 1. PYDANTIC MODELS (Request/Response Schemas)
# ============================================================================

class AgentAction(BaseModel):
    """An action an agent wants to take"""
    action_id: str
    agent_name: str
    action_type: str  # "refund", "approve_contract", "close_account", etc.
    amount: float
    customer_id: str
    customer_tier: str  # "bronze", "silver", "gold"
    timestamp: str
    context: Dict = {}  # Additional context


class DecisionResult(BaseModel):
    """The decision returned by the governance system"""
    action_id: str
    decision: str  # "APPROVE", "BLOCK", "ESCALATE"
    risk_score: float  # 0-100
    reasoning: str
    rule_violations: List[str]
    memory_warnings: List[Dict]
    anomaly_score: float
    recommendation: str


# ============================================================================
# 2. RULES ENGINE (Pillar 1)
# ============================================================================

class RulesEngine:
    """Evaluates actions against hardcoded business policies"""
    
    def __init__(self):
        self.rules = {
            "refund_limit": {
                "condition": lambda action: action.action_type == "refund" and action.amount > 50000,
                "message": "Refund exceeds policy limit (max ₹50,000)"
            },
            "gold_customer_protection": {
                "condition": lambda action: action.customer_tier == "gold" and action.action_type == "account_close",
                "message": "Gold-tier customers require manager approval for account closure"
            },
            "contract_approval_limit": {
                "condition": lambda action: action.action_type == "approve_contract" and action.amount > 1000000,
                "message": "Contract >₹10 lakhs requires CFO approval"
            },
        }
    
    def evaluate(self, action: AgentAction) -> Dict:
        """Check action against all rules"""
        violations = []
        for rule_name, rule_config in self.rules.items():
            if rule_config["condition"](action):
                violations.append({
                    "rule": rule_name,
                    "message": rule_config["message"],
                    "severity": "HIGH"
                })
        
        return {
            "violations": violations,
            "passed": len(violations) == 0,
            "violation_count": len(violations)
        }


# ============================================================================
# 3. MEMORY VALIDATOR (Pillar 2)
# ============================================================================

class MemoryValidator:
    """Queries organizational history for similar actions"""
    
    def __init__(self):
        # Initialize ChromaDB
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection("agent_decisions")
        
        # Embed historical data (mock)
        self.load_mock_history()
    
    def load_mock_history(self):
        """Load mock historical decisions"""
        # In real world: embed and store past actions
        # For hackathon: simplified, just store metadata
        mock_history = [
            {
                "id": "hist_001",
                "customer_id": "cust_456",
                "action_type": "refund",
                "amount": 5000,
                "outcome": "fraud",
                "loss": 5000,
                "timestamp": "2024-12-20"
            },
            {
                "id": "hist_002",
                "customer_id": "cust_456",
                "action_type": "refund",
                "amount": 3000,
                "outcome": "fraud",
                "loss": 3000,
                "timestamp": "2024-12-22"
            },
            {
                "id": "hist_003",
                "customer_id": "cust_789",
                "action_type": "close_account",
                "outcome": "success",
                "loss": 0,
                "timestamp": "2025-01-15"
            },
        ]
        
        # Store in ChromaDB
        for item in mock_history:
            self.collection.add(
                ids=[item["id"]],
                metadatas=[item],
                documents=[f"{item['action_type']} by {item['customer_id']}"]
            )
    
    def query(self, action: AgentAction) -> Dict:
        """Find similar historical actions"""
        # Query: find actions by same customer with same action type
        results = self.collection.get(
            where={
                "$and": [
                    {"customer_id": action.customer_id},
                    {"action_type": action.action_type}
                ]
            }
        )
        
        warnings = []
        total_loss = 0
        
        if results["ids"]:
            for meta in results["metadatas"]:
                if meta.get("outcome") == "fraud":
                    warnings.append({
                        "type": "fraud_pattern",
                        "message": f"Similar action resulted in fraud loss of ₹{meta.get('loss', 0)}",
                        "severity": "CRITICAL"
                    })
                    total_loss += meta.get("loss", 0)
        
        return {
            "similar_actions": len(results["ids"]) if results["ids"] else 0,
            "warnings": warnings,
            "total_loss_in_similar": total_loss,
            "risk_elevation": "HIGH" if total_loss > 0 else "LOW"
        }


# ============================================================================
# 4. RISK SCORER (Pillar 3)
# ============================================================================

class RiskScorer:
    """Combines Isolation Forest + LLM reasoning"""
    
    def __init__(self):
        self.iso_forest = IsolationForest(contamination=0.1, random_state=42)
        
        # Setup OpenAI
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        openai.api_key = self.openai_api_key
        
        # Train with mock data
        self.train_isolation_forest()
    
    def train_isolation_forest(self):
        """Train anomaly detector with mock data"""
        # Create mock training data
        X_train = np.array([
            [500, 1, 10, 3, 30, 1],      # Normal refund: low amount, low freq, normal hour, weekday
            [800, 1, 14, 2, 45, 1],      # Normal
            [1200, 2, 9, 1, 20, 1],      # Normal
            [300, 0, 15, 4, 60, 1],      # Normal
            [100000, 5, 3, 0, 5, 3],     # Anomaly: huge amount, high freq, 3 AM, Sunday
            [50000, 4, 2, 5, 10, 2],     # Anomaly
        ])
        
        self.iso_forest.fit(X_train)
    
    def extract_features(self, action: AgentAction) -> np.ndarray:
        """Convert action to numerical features"""
        # Mock feature extraction
        timestamp = datetime.fromisoformat(action.timestamp)
        hour = timestamp.hour
        day = timestamp.weekday()
        
        # Simulate frequency data (in real: query from DB)
        frequency_this_week = 1  # Simplified
        
        features = np.array([
            action.amount,
            frequency_this_week,
            hour,
            day,
            30,  # Customer tenure in days (mock)
            1,   # Tool chain length (mock)
        ])
        
        return features.reshape(1, -1)
    
    def detect_anomaly(self, action: AgentAction) -> Dict:
        """Detect if action is anomalous"""
        features = self.extract_features(action)
        anomaly_score = self.iso_forest.decision_function(features)[0]
        is_anomaly = self.iso_forest.predict(features)[0] == -1
        
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": abs(anomaly_score) * 10,  # Scale to 0-100 range
            "confidence": 0.85
        }
    
    def generate_explanation(self, action: AgentAction, 
                            rule_violations: List, 
                            memory_warnings: List,
                            anomaly_score: Dict) -> str:
        """Use LLM to generate human-readable explanation"""
        
        # For hackathon: skip API call and use templates
        # In production: call OpenAI
        
        if rule_violations:
            return f"Action violates {len(rule_violations)} policy rules. Requires human review."
        
        if memory_warnings:
            return f"Similar past action resulted in losses. Flag for escalation."
        
        if anomaly_score["is_anomaly"]:
            return f"Action pattern is unusual (anomaly score: {anomaly_score['anomaly_score']:.0f}). Recommend escalation."
        
        return "Action passes all checks. Safe to proceed."
    
    def final_risk_score(self, action: AgentAction,
                        rule_violations: List,
                        memory_warnings: List,
                        anomaly_score: Dict) -> Dict:
        """Combine all signals into final risk score"""
        
        rule_weight = 0.4
        memory_weight = 0.3
        anomaly_weight = 0.3
        
        rule_score = 100 if rule_violations else 0
        memory_score = 80 if memory_warnings else 0
        anomaly_score_val = anomaly_score.get("anomaly_score", 0)
        
        final_score = (
            rule_weight * rule_score +
            memory_weight * memory_score +
            anomaly_weight * anomaly_score_val
        )
        
        # Determine recommendation
        if final_score > 70:
            recommendation = "BLOCK"
        elif final_score > 40:
            recommendation = "ESCALATE"
        else:
            recommendation = "APPROVE"
        
        explanation = self.generate_explanation(
            action, rule_violations, memory_warnings, anomaly_score
        )
        
        return {
            "score": min(100, final_score),
            "recommendation": recommendation,
            "explanation": explanation
        }


# ============================================================================
# 5. MAIN APP & ENDPOINTS
# ============================================================================

app = FastAPI(title="Agent Governance Platform")

# Initialize components
rules_engine = RulesEngine()
memory_validator = MemoryValidator()
risk_scorer = RiskScorer()

# In-memory audit log (in production: PostgreSQL)
audit_log = []


@app.post("/evaluate-action", response_model=DecisionResult)
async def evaluate_action(action: AgentAction) -> DecisionResult:
    """
    Main endpoint: Evaluate an agent action against governance rules
    
    Flow:
    1. Check rules
    2. Check memory
    3. Calculate risk score
    4. Return decision
    """
    
    try:
        # Pillar 1: Rules
        rules_result = rules_engine.evaluate(action)
        
        # Pillar 2: Memory
        memory_result = memory_validator.query(action)
        
        # Pillar 3: Risk Score
        anomaly_result = risk_scorer.detect_anomaly(action)
        risk_result = risk_scorer.final_risk_score(
            action,
            rules_result["violations"],
            memory_result["warnings"],
            anomaly_result
        )
        
        # Create decision
        decision = DecisionResult(
            action_id=action.action_id,
            decision=risk_result["recommendation"],
            risk_score=risk_result["score"],
            reasoning=risk_result["explanation"],
            rule_violations=[v["rule"] for v in rules_result["violations"]],
            memory_warnings=memory_result["warnings"],
            anomaly_score=anomaly_result["anomaly_score"],
            recommendation=risk_result["recommendation"]
        )
        
        # Log to audit trail
        audit_log.append({
            "timestamp": datetime.now().isoformat(),
            "action_id": action.action_id,
            "decision": decision.decision,
            "risk_score": decision.risk_score
        })
        
        return decision
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audit-log")
async def get_audit_log() -> List[Dict]:
    """Get recent decisions for dashboard"""
    return audit_log[-20:]  # Return last 20 decisions


@app.get("/governance-metrics")
async def get_governance_metrics() -> Dict:
    """Get summary metrics for weekly brief"""
    
    total = len(audit_log)
    blocked = len([d for d in audit_log if d["decision"] == "BLOCK"])
    escalated = len([d for d in audit_log if d["decision"] == "ESCALATE"])
    approved = len([d for d in audit_log if d["decision"] == "APPROVE"])
    
    avg_risk = np.mean([d["risk_score"] for d in audit_log]) if audit_log else 0
    
    return {
        "total_decisions": total,
        "approved": approved,
        "blocked": blocked,
        "escalated": escalated,
        "block_rate": f"{(blocked/total*100):.1f}%" if total > 0 else "0%",
        "avg_risk_score": f"{avg_risk:.1f}",
        "estimated_loss_prevented": 4230000  # Mock
    }


@app.get("/health")
async def health() -> Dict:
    """Health check"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
