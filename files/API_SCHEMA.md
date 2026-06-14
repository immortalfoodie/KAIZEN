# API SCHEMA & CONTRACT
## Exact JSON Formats for Frontend-Backend Communication

---

## ENDPOINT 1: Evaluate Action (POST)
**URL:** `POST http://localhost:8000/evaluate-action`

### Request (Frontend sends this)
```json
{
  "action_id": "action_20260409_001",
  "agent_name": "support_bot_v2.1",
  "action_type": "refund",
  "amount": 500.0,
  "customer_id": "cust_123",
  "customer_tier": "bronze",
  "timestamp": "2026-04-09T19:30:00Z",
  "context": {
    "reason": "customer complaint",
    "prior_attempts": 1
  }
}
```

### Response (Backend sends this)
```json
{
  "action_id": "action_20260409_001",
  "decision": "APPROVE",
  "risk_score": 12.5,
  "reasoning": "Action passes all checks. Safe to proceed.",
  "rule_violations": [],
  "memory_warnings": [],
  "anomaly_score": 0.15,
  "recommendation": "APPROVE"
}
```

### Example cURL
```bash
curl -X POST http://localhost:8000/evaluate-action \
  -H "Content-Type: application/json" \
  -d '{
    "action_id": "action_20260409_001",
    "agent_name": "support_bot_v2.1",
    "action_type": "refund",
    "amount": 500,
    "customer_id": "cust_123",
    "customer_tier": "bronze",
    "timestamp": "2026-04-09T19:30:00Z",
    "context": {}
  }'
```

---

## ENDPOINT 2: Get Audit Log (GET)
**URL:** `GET http://localhost:8000/audit-log`

### Response (List of last N decisions)
```json
[
  {
    "timestamp": "2026-04-09T19:35:22Z",
    "action_id": "action_20260409_001",
    "decision": "APPROVE",
    "risk_score": 12.5
  },
  {
    "timestamp": "2026-04-09T19:36:15Z",
    "action_id": "action_20260409_002",
    "decision": "BLOCK",
    "risk_score": 89.3
  },
  {
    "timestamp": "2026-04-09T19:37:02Z",
    "action_id": "action_20260409_003",
    "decision": "ESCALATE",
    "risk_score": 65.8
  }
]
```

### Usage (Frontend)
```javascript
const response = await fetch('http://localhost:8000/audit-log');
const decisions = await response.json();
decisions.forEach(d => console.log(d.decision, d.risk_score));
```

---

## ENDPOINT 3: Get Metrics (GET)
**URL:** `GET http://localhost:8000/governance-metrics`

### Response (Summary stats)
```json
{
  "total_decisions": 1247,
  "approved": 1124,
  "blocked": 34,
  "escalated": 89,
  "block_rate": "2.7%",
  "avg_risk_score": "28.5",
  "estimated_loss_prevented": 4230000
}
```

### Usage (Frontend)
```javascript
const response = await fetch('http://localhost:8000/governance-metrics');
const metrics = await response.json();
console.log(`Block Rate: ${metrics.block_rate}`);
console.log(`Loss Prevented: ₹${metrics.estimated_loss_prevented / 100000}L`);
```

---

## ENDPOINT 4: Health Check (GET)
**URL:** `GET http://localhost:8000/health`

### Response
```json
{
  "status": "healthy",
  "timestamp": "2026-04-09T19:38:00Z"
}
```

---

## DATA TYPES

### AgentAction (Request body for /evaluate-action)
```typescript
{
  action_id: string;           // Unique ID (e.g., "action_20260409_001")
  agent_name: string;          // Name of agent (e.g., "support_bot_v2.1")
  action_type: string;         // "refund" | "approve_contract" | "close_account" | ...
  amount: float;               // Amount in rupees
  customer_id: string;         // Unique customer ID
  customer_tier: string;       // "bronze" | "silver" | "gold"
  timestamp: string;           // ISO 8601 format (e.g., "2026-04-09T19:30:00Z")
  context?: object;            // Optional extra context
}
```

### DecisionResult (Response from /evaluate-action)
```typescript
{
  action_id: string;           // Same as request
  decision: string;            // "APPROVE" | "BLOCK" | "ESCALATE"
  risk_score: float;           // 0-100
  reasoning: string;           // Human-readable explanation
  rule_violations: string[];   // List of violated rule names
  memory_warnings: object[];   // Warnings from memory lookup
  anomaly_score: float;        // 0-100 (how anomalous is this?)
  recommendation: string;      // Same as decision (for clarity)
}
```

### AuditLogEntry (Item in /audit-log response)
```typescript
{
  timestamp: string;           // When the decision was made
  action_id: string;           // Reference to the action
  decision: string;            // "APPROVE" | "BLOCK" | "ESCALATE"
  risk_score: float;           // The calculated risk score
}
```

### GovernanceMetrics (Response from /governance-metrics)
```typescript
{
  total_decisions: int;
  approved: int;
  blocked: int;
  escalated: int;
  block_rate: string;          // Percentage (e.g., "2.7%")
  avg_risk_score: string;      // Average risk score (e.g., "28.5")
  estimated_loss_prevented: int; // Amount in rupees
}
```

---

## FRONTEND INTEGRATION CHECKLIST

### Step 1: Set Up API Module
Create `src/api.js`:
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function evaluateAction(action) {
  const response = await fetch(`${API_BASE}/evaluate-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action)
  });
  return response.json();
}

export async function getAuditLog() {
  const response = await fetch(`${API_BASE}/audit-log`);
  return response.json();
}

export async function getMetrics() {
  const response = await fetch(`${API_BASE}/governance-metrics`);
  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
```

### Step 2: Use in Components
```javascript
import { evaluateAction, getAuditLog, getMetrics } from './api';

// In ActionFlowPanel.jsx
const handleSubmitAction = async (action) => {
  try {
    const decision = await evaluateAction(action);
    console.log('Decision:', decision.decision);
    // Update UI to show decision
  } catch (err) {
    console.error('Failed:', err);
  }
};

// In Dashboard.jsx
useEffect(() => {
  const loadData = async () => {
    const audit = await getAuditLog();
    const metrics = await getMetrics();
    setActions(audit);
    setMetrics(metrics);
  };
  loadData();
  const interval = setInterval(loadData, 5000);
  return () => clearInterval(interval);
}, []);
```

---

## DEMO SCENARIO DATA

### Scenario 1: Safe Refund (Should → APPROVE)
```json
{
  "action_id": "demo_1_safe",
  "agent_name": "support_bot_v2.1",
  "action_type": "refund",
  "amount": 500,
  "customer_id": "cust_loyal_123",
  "customer_tier": "bronze",
  "timestamp": "2026-04-09T14:30:00Z",
  "context": {"reason": "customer satisfaction"}
}
```

**Expected Response:**
- Decision: `APPROVE`
- Risk Score: 15-25%
- Reasoning: "Action passes all checks..."

---

### Scenario 2: Policy Violation (Should → BLOCK)
```json
{
  "action_id": "demo_2_violation",
  "agent_name": "support_bot_v2.1",
  "action_type": "refund",
  "amount": 100000,
  "customer_id": "cust_456",
  "customer_tier": "bronze",
  "timestamp": "2026-04-09T14:35:00Z",
  "context": {}
}
```

**Expected Response:**
- Decision: `BLOCK`
- Risk Score: 95%+
- Reasoning: "Refund exceeds policy limit..."
- Rule Violations: `["refund_limit"]`

---

### Scenario 3: Memory + Anomaly (Should → ESCALATE)
```json
{
  "action_id": "demo_3_anomaly",
  "agent_name": "support_bot_v2.1",
  "action_type": "refund",
  "amount": 5000,
  "customer_id": "cust_fraud_456",
  "customer_tier": "bronze",
  "timestamp": "2026-04-09T03:15:00Z",
  "context": {}
}
```

**Expected Response:**
- Decision: `ESCALATE`
- Risk Score: 82-88%
- Reasoning: "Similar past action resulted in losses. Flag for escalation..."
- Memory Warnings: `[{"type": "fraud_pattern", "message": "..."}]`
- Anomaly Score: 0.78+

---

## TESTING (Before Demo)

### Test 1: Health Check
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy", "timestamp": "..."}
```

### Test 2: Evaluate Action
```bash
curl -X POST http://localhost:8000/evaluate-action \
  -H "Content-Type: application/json" \
  -d '{"action_id": "test_1", "agent_name": "test", "action_type": "refund", "amount": 500, "customer_id": "cust_123", "customer_tier": "bronze", "timestamp": "2026-04-09T14:30:00Z", "context": {}}'
# Should return decision with all fields populated
```

### Test 3: Metrics
```bash
curl http://localhost:8000/governance-metrics
# Should return total_decisions, approved, blocked, etc.
```

### Test 4: Full Demo Flow
```bash
# 1. Call /health (verify backend is up)
# 2. Call /evaluate-action 3 times (with 3 scenarios)
# 3. Call /audit-log (should see 3 entries)
# 4. Call /governance-metrics (should see updated counts)
```

---

## ERROR HANDLING

### If Backend is Down
Frontend should:
1. Show error message: "Cannot reach governance server"
2. Disable demo buttons
3. Show retry button
4. Console: `console.error('Backend unavailable')`

### If Request Fails (e.g., 500 error)
```javascript
try {
  const decision = await evaluateAction(action);
} catch (err) {
  console.error('Failed to evaluate:', err);
  alert('Error evaluating action. Check backend logs.');
}
```

### If Response Missing Fields
```javascript
const decision = await evaluateAction(action);
if (!decision.decision) {
  console.error('Invalid response: missing decision field');
  // Fall back to showing error UI
}
```

---

## PERFORMANCE REQUIREMENTS

- **Latency:** <2 seconds per action evaluation
- **Throughput:** 10+ concurrent requests
- **Dashboard refresh:** Every 5 seconds
- **Chart update:** Smooth animation

---

## ENVIRONMENT VARIABLES

### Backend (.env)
```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:pass@localhost/governance
ENVIRONMENT=development
```

### Frontend (.env.local)
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

---

## DEPLOYMENT URLS (After Railway + Vercel)

**Backend (Example):**
```
https://agent-governance-backend.railway.app
```

**Frontend (Example):**
```
https://agent-governance.vercel.app
```

Update `REACT_APP_API_URL` to point to deployed backend.

---

That's it. Copy these formats exactly and your frontend and backend will talk perfectly.
