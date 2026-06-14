# Agent Conscience — UI Integration Guide

> **For Frontend Developers**: This document is your complete reference for integrating with the Agent Conscience backend. Every API endpoint, payload format, and event type is documented here with `curl` examples.

---

## Base URL

```
Development: http://localhost:8000
Production:  https://your-domain.com
```

All endpoints are versioned under `/api/v1/`.

---

## Authentication

Currently no authentication is required (add JWT/API key as needed for production).

---

## 1. Evaluate Action — `POST /api/v1/evaluate-action`

The primary endpoint. Call this before any AI agent executes an action.

### Request

```bash
curl -X POST http://localhost:8000/api/v1/evaluate-action \
  -H "Content-Type: application/json" \
  -d '{
    "action_id": "action_20260409_001",
    "agent_name": "support_bot_v2.1",
    "action_type": "refund",
    "amount": 75000,
    "customer_id": "cust_456",
    "customer_tier": "bronze",
    "timestamp": "2026-04-09T19:30:00Z",
    "context": {}
  }'
```

### Response (BLOCK example)

```json
{
  "action_id": "action_20260409_001",
  "decision": "BLOCK",
  "risk_score": 82.5,
  "reasoning": "Policy violations detected: refund_limit. Historical fraud pattern found for this customer. Statistical anomaly detected (score: 65%). Overall risk level: HIGH. Recommended action: BLOCK.",
  "rule_violations": [
    {
      "rule": "refund_limit",
      "message": "Refund exceeds maximum policy limit (₹50,000)",
      "severity": "HIGH"
    }
  ],
  "memory_warnings": [
    {
      "type": "fraud_pattern",
      "message": "Similar past action resulted in fraud loss of ₹5,000",
      "severity": "CRITICAL"
    }
  ],
  "anomaly_score": 65.0,
  "recommendation": "BLOCK",
  "evaluated_at": "2026-04-09T19:30:01Z"
}
```

### Response (APPROVE example)

```json
{
  "action_id": "action_20260409_002",
  "decision": "APPROVE",
  "risk_score": 8.2,
  "reasoning": "Action passes all governance checks. No policy violations, historical warnings, or statistical anomalies detected. Safe to proceed.",
  "rule_violations": [],
  "memory_warnings": [],
  "anomaly_score": 8.2,
  "recommendation": "APPROVE",
  "evaluated_at": "2026-04-09T19:30:01Z"
}
```

### Three Possible Decisions

| Decision | Meaning | UI Treatment |
|----------|---------|--------------|
| `APPROVE` | ✅ Safe to execute | Green indicator |
| `BLOCK` | 🛑 Do not execute | Red alert, show violations |
| `ESCALATE` | ⚠️ Needs human review | Yellow/amber, show queue |

---

## 2. Audit Log — `GET /api/v1/audit-log`

Paginated history of all governance decisions.

### Request

```bash
# Basic pagination
curl "http://localhost:8000/api/v1/audit-log?limit=20&offset=0"

# Filter by decision type
curl "http://localhost:8000/api/v1/audit-log?decision=BLOCK&limit=10"

# Filter by minimum risk score
curl "http://localhost:8000/api/v1/audit-log?min_risk=50"

# Filter by customer
curl "http://localhost:8000/api/v1/audit-log?customer=cust_456"
```

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | Items per page (1-100) |
| `offset` | int | 0 | Pagination offset |
| `decision` | string | - | Filter: APPROVE, BLOCK, ESCALATE |
| `min_risk` | float | - | Minimum risk score (0-100) |
| `agent` | string | - | Filter by agent name |
| `customer` | string | - | Filter by customer ID |

### Response

```json
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": 1,
      "action_id": "action_001",
      "agent_name": "support_bot_v2.1",
      "action_type": "refund",
      "amount": 75000,
      "customer_id": "cust_456",
      "customer_tier": "bronze",
      "decision": "BLOCK",
      "risk_score": 82.5,
      "reasoning": "...",
      "rule_violations": [...],
      "memory_warnings": [...],
      "anomaly_score": 65.0,
      "context": {},
      "created_at": "2026-04-09T19:30:01"
    }
  ]
}
```

---

## 3. Governance Metrics — `GET /api/v1/governance-metrics`

Dashboard-ready aggregated statistics.

```bash
curl http://localhost:8000/api/v1/governance-metrics
```

### Response

```json
{
  "total_decisions": 150,
  "approved": 120,
  "blocked": 18,
  "escalated": 12,
  "block_rate": "12.0%",
  "escalation_rate": "8.0%",
  "avg_risk_score": "23.4",
  "max_risk_score": 95.2,
  "estimated_loss_prevented": 485000.00,
  "period": "all_time"
}
```

### Recommended UI Widget Mapping

| Metric | Widget Type |
|--------|-------------|
| `block_rate` | Donut chart |
| `avg_risk_score` | Gauge / speedometer |
| `total_decisions` | Counter card |
| `estimated_loss_prevented` | Value card (₹) |
| Decision breakdown | Stacked bar / pie chart |

---

## 4. Policy Rules — `GET/POST/DELETE /api/v1/rules`

### List All Rules

```bash
curl http://localhost:8000/api/v1/rules
```

### Create a Rule

```bash
curl -X POST http://localhost:8000/api/v1/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "weekend_restriction",
    "description": "Block all refunds on weekends",
    "condition_field": "amount",
    "operator": "gt",
    "threshold": "0",
    "action_on_match": "BLOCK",
    "severity": "MEDIUM"
  }'
```

### Delete a Rule

```bash
curl -X DELETE http://localhost:8000/api/v1/rules/3
```

### Operators Available

| Operator | Meaning | Example |
|----------|---------|---------|
| `gt` | Greater than | amount > 50000 |
| `lt` | Less than | amount < 100 |
| `eq` | Equal to | customer_tier = gold |
| `neq` | Not equal to | action_type ≠ refund |
| `in` | In list | tier in gold,silver |
| `not_in` | Not in list | tier not in bronze |

---

## 5. Memory Insights — `GET /api/v1/memory-insights`

Historical pattern data for a specific customer.

```bash
curl "http://localhost:8000/api/v1/memory-insights?customer_id=cust_456"
```

### Response

```json
{
  "customer_id": "cust_456",
  "total_past_actions": 6,
  "fraud_incidents": 4,
  "total_loss": 18700,
  "risk_elevation": "HIGH",
  "recent_actions": [
    {
      "customer_id": "cust_456",
      "action_type": "refund",
      "amount": 6500,
      "outcome": "fraud",
      "loss": 6500,
      "timestamp": "2025-12-22T01:45:00Z"
    }
  ]
}
```

---

## 6. Real-Time Events — `GET /api/v1/events/stream` (SSE)

Server-Sent Events stream for live dashboard updates.

### JavaScript Client

```javascript
const source = new EventSource('http://localhost:8000/api/v1/events/stream');

// Connection established
source.addEventListener('connected', (e) => {
  console.log('Connected to governance stream');
});

// New governance decision
source.addEventListener('decision', (e) => {
  const data = JSON.parse(e.data);
  console.log(`${data.data.decision}: ${data.data.action_type} ₹${data.data.amount}`);
  // Update dashboard UI here
});

// Keep-alive heartbeat (every 15s)
source.addEventListener('heartbeat', (e) => {
  // Connection is alive — no action needed
});

source.onerror = (e) => {
  console.error('SSE connection lost, reconnecting...');
};
```

### Event Types

| Event | Payload | Use |
|-------|---------|-----|
| `connected` | `{message}` | Initial confirmation |
| `decision` | `{action_id, decision, risk_score, agent_name, action_type, amount, customer_id}` | Live decision feed |
| `heartbeat` | `{status: "alive"}` | Keep-alive (15s) |

---

## 7. Health Check — `GET /api/v1/health`

```bash
curl http://localhost:8000/api/v1/health
```

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-04-09T19:30:00Z",
  "components": {
    "api": "ok",
    "database": "ok",
    "rules_engine": "ok",
    "memory_validator": "ok",
    "risk_scorer": "ok"
  }
}
```

---

## Error Handling

All errors follow a consistent envelope:

```json
{
  "error": "Validation Error",
  "detail": "field required: action_id",
  "status_code": 422,
  "timestamp": "2026-04-09T19:30:00Z"
}
```

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created (new rule) |
| `204` | Deleted (no content) |
| `404` | Resource not found |
| `409` | Conflict (duplicate rule name) |
| `422` | Validation error |
| `500` | Internal server error |
| `503` | Engine not initialized |

---

## Recommended Polling Intervals

| Endpoint | Method | Interval |
|----------|--------|----------|
| `/governance-metrics` | Poll | Every 10 seconds |
| `/audit-log` | Poll | Every 5 seconds |
| `/events/stream` | SSE | Real-time (auto) |
| `/health` | Poll | Every 30 seconds |
| `/rules` | On-demand | User action only |

---

## Demo Scenarios (Test with curl)

### Scenario 1: APPROVE — Normal refund
```bash
curl -X POST http://localhost:8000/api/v1/evaluate-action \
  -H "Content-Type: application/json" \
  -d '{"action_id":"demo_approve_001","agent_name":"support_bot_v2.1","action_type":"refund","amount":500,"customer_id":"cust_clean_001","customer_tier":"silver","timestamp":"2026-04-09T14:00:00Z","context":{}}'
```

### Scenario 2: BLOCK — High refund + fraud history
```bash
curl -X POST http://localhost:8000/api/v1/evaluate-action \
  -H "Content-Type: application/json" \
  -d '{"action_id":"demo_block_001","agent_name":"support_bot_v2.1","action_type":"refund","amount":75000,"customer_id":"cust_456","customer_tier":"bronze","timestamp":"2026-04-09T03:00:00Z","context":{}}'
```

### Scenario 3: ESCALATE — Gold customer account closure
```bash
curl -X POST http://localhost:8000/api/v1/evaluate-action \
  -H "Content-Type: application/json" \
  -d '{"action_id":"demo_escalate_001","agent_name":"support_bot_v2.1","action_type":"close_account","amount":0,"customer_id":"cust_789","customer_tier":"gold","timestamp":"2026-04-09T14:00:00Z","context":{}}'
```
