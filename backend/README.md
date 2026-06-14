# Agent Conscience — Backend

AI Governance Middleware: an invisible observability layer that intercepts AI agent actions in real-time, validates them through 3 pillars (Rules Engine, Memory Validator, Risk Scorer), and returns a decision: **APPROVE**, **BLOCK**, or **ESCALATE**.

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy environment config
cp .env.example .env

# 4. Run the server
python main.py
```

Server starts at **http://localhost:8000**  
Interactive API docs at **http://localhost:8000/docs**

## Architecture

```
Agent Action → POST /api/v1/evaluate-action
                     │
              ┌──────┼──────┐
              ▼      ▼      ▼
          Rules   Memory   Risk
          Engine  Validator Scorer
              │      │      │
              └──────┼──────┘
                     ▼
              Decision Engine
              (APPROVE/BLOCK/ESCALATE)
                     │
              ┌──────┼──────┐
              ▼      ▼      ▼
          Audit   SSE      Response
          Log     Stream   to Agent
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | System health check |
| `POST` | `/api/v1/evaluate-action` | Evaluate an agent action |
| `GET` | `/api/v1/audit-log` | Paginated audit trail |
| `GET` | `/api/v1/governance-metrics` | Aggregated statistics |
| `GET` | `/api/v1/rules` | List policy rules |
| `POST` | `/api/v1/rules` | Create a rule |
| `DELETE` | `/api/v1/rules/{id}` | Delete a rule |
| `GET` | `/api/v1/memory-insights` | Customer history |
| `GET` | `/api/v1/events/stream` | SSE real-time feed |

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_rules_engine.py -v
```

## Docker

```bash
docker build -t agent-conscience .
docker run -p 8000:8000 agent-conscience
```
