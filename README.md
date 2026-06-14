<div align="center">

```
██╗  ██╗ █████╗ ██╗███████╗███████╗███╗   ██╗
██║ ██╔╝██╔══██╗██║╚══███╔╝██╔════╝████╗  ██║
█████╔╝ ███████║██║  ███╔╝ █████╗  ██╔██╗ ██║
██╔═██╗ ██╔══██║██║ ███╔╝  ██╔══╝  ██║╚██╗██║
██║  ██╗██║  ██║██║███████╗███████╗██║ ╚████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝
Netra — Continuous AI Governance
```

**The Autonomous AI Safety Layer That Never Sleeps**

*Pre-execution governance middleware for enterprise AI agent systems*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_DB-FF6B35?style=for-the-badge)](https://trychroma.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-gold?style=for-the-badge)](LICENSE)

<br/>

> *"What if your AI agents could never go rogue — no matter what?"*

</div>

---

## 🔴 The Problem

Enterprise AI agents powered by LLMs (GPT-4, Llama, Gemini) are being deployed to autonomously execute high-stakes business actions — **refunding payments, closing accounts, approving contracts, transferring funds**.

These agents can **hallucinate**, get **prompt-injected**, or simply act on **flawed logic** — and the damage happens in milliseconds, before any human can intervene.

**Netra is the last line of defence.**

---

## ⚡ What is Netra?

**Netra** (Netra — *continuous improvement*) is a real-time **AI Governance Middleware** — an invisible tollbooth that intercepts every AI agent tool call **before it executes**, evaluates it through a three-pillar governance engine, and deterministically returns:

| Decision | Meaning |
|----------|---------|
| ✅ `APPROVE` | Safe to proceed. Action executed. |
| ⚠️ `ESCALATE` | Borderline. Routed to human HITL inbox. |
| 🛑 `BLOCK` | Dangerous. Action halted. Alert fired. |

All decisions are logged to an immutable audit trail and summarized in auto-generated **CIO Governance Briefs**.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI AGENT (LLM)                        │
│           Groq · OpenAI · LangChain · CrewAI             │
└──────────────────────┬──────────────────────────────────┘
                       │ Tool Call Payload
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Netra GOVERNANCE MIDDLEWARE                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  🔒 Rules   │  │  🧠 Memory   │  │  📊 Risk Score │  │
│  │   Engine    │  │  Validator   │  │  (ML Anomaly)  │  │
│  │ Deterministic│  │  ChromaDB    │  │ Isolation Forest│ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         └────────────────┼──────────────────┘           │
│                          ▼                               │
│               ┌──────────────────┐                       │
│               │  Decision Engine  │                       │
│               │  APPROVE/BLOCK/   │                       │
│               │    ESCALATE       │                       │
│               └──────────────────┘                       │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ✅ Execute    ⚠️ HITL Inbox  🛑 Block +
                                  Alert
```

---

## 🔬 The Three Governance Pillars

### 🔒 Pillar 1 — Deterministic Rules Engine
Hard-coded, zero-hallucination policy checks that run first. Examples:
- Block any refund **> ₹50,000**
- Escalate account closures for **Gold-tier customers**
- Block contract approvals **> ₹10 Lakhs** without CFO sign-off
- Escalate high-value transactions **outside business hours**

### 🧠 Pillar 2 — Organizational Memory Validator
Semantic similarity search over **ChromaDB** (vector database) to detect:
- Customer IDs associated with **historical fraud patterns**
- Action types matching **previously flagged behaviours**
- Unusual frequency of **repeated high-risk requests**

### 📊 Pillar 3 — ML Risk Scorer (Anomaly Detection)
An **Isolation Forest** model trained on transaction features:
- `amount`, `hour`, `day_of_week`, `customer_tenure`, `frequency`
- Returns a **0–100 risk score** — anything above 70 triggers a BLOCK

> All three scores are combined with configurable weights into a final governance decision.

---

## 🖥️ Live Dashboard

<div align="center">

| Feature | Description |
|---------|-------------|
| 🎯 **Decision Pipeline** | Real-time animated view of every governance decision |
| 🗂️ **Audit Timeline** | Scrollable log of all APPROVE / BLOCK / ESCALATE events |
| 📈 **Risk Heatmap** | Clickable grid showing the risk distribution of recent actions |
| 🤖 **Agent Radar** | Trust scores and permission levels for each deployed agent |
| 📬 **HITL Inbox** | Human-in-the-loop queue for escalated decisions |
| 🧠 **Memory Vault** | Query ChromaDB to inspect any customer's fraud history |
| 🔴 **Rogue Agent Simulator** | Fire test scenarios and watch Netra intercept live |
| 📄 **CIO Brief** | Auto-generated PDF governance report for executive review |
| 🌐 **Multi-language UI** | English, Japanese, Hindi, Spanish, Marathi |

</div>

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone the Repository
```bash
git clone https://github.com/immortalfoodie/Netra.git
cd Netra
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env and add your keys (GROQ_API_KEY etc.)

python main.py
```
> Backend runs at **http://localhost:8000** · Docs at **http://localhost:8000/docs**

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
> Dashboard runs at **http://localhost:5173**

---

## 🎮 Running the Live Demo

Once both servers are running, open **http://localhost:5173** and:

1. **Click the red `ROGUE AGENT DEMO` button** in the sidebar
2. Switch between tabs:
   - **🤖 Live Agent** — Launch a real Groq LLM agent and watch Netra intercept its tool calls in real-time
   - **⚡ Manual Scenarios** — Fire pre-built safe / suspicious / dangerous transactions
   - **🧪 What-If Playground** — Build any custom scenario and test the governance outcome
3. **Watch the Decision Pipeline** light up with APPROVE / ESCALATE / BLOCK in real-time
4. **Download the CIO Brief** from the sidebar — a professionally generated PDF report

---

## ⚙️ Configuration

All settings are managed via `backend/.env`:

```env
# Core
APP_NAME=Netra
ENVIRONMENT=development

# LLM (for live agent demo)
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Risk Thresholds (0-100)
RISK_BLOCK_THRESHOLD=70.0
RISK_ESCALATE_THRESHOLD=40.0

# Score Weights (must sum to 1.0)
WEIGHT_RULES=0.4
WEIGHT_MEMORY=0.3
WEIGHT_ANOMALY=0.3

# Alerts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TWILIO_ACCOUNT_SID=your_sid
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+91XXXXXXXXXX
```

---

## 🌐 Deployment

### Frontend → Vercel
1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Set environment variable: `VITE_API_BASE_URL` = your Render backend URL
4. Deploy ✅

### Backend → Render
1. Create a new **Web Service** on [Render](https://render.com)
2. Set **Root Directory** to `backend`
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add a **Persistent Disk** mounted at `/app/data` (keeps your SQLite DB alive)
6. Add your environment variables (GROQ_API_KEY, etc.)
7. Deploy ✅

---

## 📁 Project Structure

```
Netra/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Settings & thresholds
│   ├── database.py              # SQLite async layer
│   ├── decision_engine.py       # Governance orchestrator
│   ├── rules_engine.py          # Deterministic policy checker
│   ├── memory_validator.py      # ChromaDB vector search
│   ├── risk_scorer.py           # Isolation Forest ML model
│   ├── audit_logger.py          # Persistent audit trail
│   ├── agent_tools.py           # Simulated agent tools
│   ├── models.py                # Pydantic data models
│   ├── seed_data.py             # Initial data seeder
│   ├── Dockerfile               # Container config
│   └── routers/
│       ├── governance.py        # POST /evaluate-action
│       ├── audit.py             # GET /audit-log
│       ├── metrics.py           # GET /governance-metrics
│       ├── report.py            # GET /cio-brief (PDF)
│       ├── agent.py             # POST /run-live-agent
│       ├── events.py            # GET /events/stream (SSE)
│       └── ...
└── frontend/
    └── src/
        ├── App.tsx              # Root layout
        ├── config.ts            # API base URL config
        ├── components/
        │   ├── DecisionPipeline.tsx   # Live pipeline view
        │   ├── DecisionTimeline.tsx   # Audit log feed
        │   ├── RiskMetrics.tsx        # Metrics + heatmap
        │   ├── RogueAgentSimulator.tsx # Demo scenarios
        │   ├── MemoryExplorer.tsx     # ChromaDB explorer
        │   ├── HitlInbox.tsx          # Human review queue
        │   └── GlobalHeader.tsx       # Sidebar + nav
        └── i18n/
            └── translations.ts        # Multi-language strings
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Agent Core** | Groq SDK (`llama-3.3-70b-versatile`) |
| **Backend API** | FastAPI + Uvicorn |
| **Data Models** | Pydantic v2 |
| **Relational DB** | SQLite + aiosqlite |
| **Vector DB** | ChromaDB |
| **ML Engine** | Scikit-Learn (Isolation Forest) + NumPy |
| **PDF Generation** | fpdf2 |
| **Alerts** | Discord Webhooks + Twilio WhatsApp |
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | TailwindCSS + custom CSS |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Real-time** | Server-Sent Events (SSE) |

---

## 📊 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/evaluate-action` | Submit an agent action for governance |
| `POST` | `/api/v1/run-live-agent` | Launch a real Groq LLM agent |
| `GET` | `/api/v1/audit-log` | Retrieve paginated audit history |
| `GET` | `/api/v1/governance-metrics` | Aggregated risk statistics |
| `GET` | `/api/v1/roi-summary` | ROI and damage-prevented metrics |
| `GET` | `/api/v1/cio-brief` | Download executive PDF report |
| `GET` | `/api/v1/events/stream` | Real-time SSE decision stream |
| `GET` | `/api/v1/memory-insights` | Query customer fraud history |
| `GET` | `/api/v1/rules` | List all active governance rules |
| `GET` | `/api/v1/health` | Service health check |
