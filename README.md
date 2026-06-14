# NETRA: Network for Ethical Tool-use Risk Regulation Architecture

<div align="center">
  <img src="frontend/src/assets/hero.png" alt="NETRA Radar" width="600" />
</div>

**NETRA** is a pre-execution governance platform designed to serve as the "ethical brain" for autonomous AI agent systems. 

As enterprises increasingly deploy autonomous agents (powered by Groq, OpenAI, LangChain, etc.) capable of taking real-world actions like modifying databases or executing payments, the risk of "rogue" executions—driven by hallucination, prompt injection, or logic flaws—has skyrocketed. NETRA introduces a **middleware tollbooth** that dynamically intercepts, evaluates, and deterministically governs every agent tool call **before** it executes.

---

## 🚀 Key Features

*   **Pre-Execution Interception:** Integrates directly with native Groq SDK and any LLM function-calling mechanisms. We evaluate the tool payload, not just the chat history.
*   **Three-Pillar Governance API:**
    1.  **Deterministic Rules Engine:** Hard policies explicitly blocking specific parameters (e.g., stopping any refund > ₹50,000).
    2.  **Organizational Memory Validator:** Persistent Vector-based memory (ChromaDB) checking for semantic similarity to historically flagged anomalies.
    3.  **Risk Scorer (Anomaly Detection):** Isolation Forest unsupervised ML model scoring the risk based on statistical variables like customer tenure, hour, frequency, and amount.
*   **Dynamic Outcomes (`APPROVE` | `ESCALATE` | `BLOCK`):** Fails closed. Block events immediately pause the execution loop by injecting a `GovernanceException` back into the LLVM context.
*   **Agent Conscience Dashboard (Live Simulator):** Real-time React dashboard with an "Agent Radar" and "Decision Timeline" powered by Server-Sent Events (SSE) stream.
*   **Immutable Audit Trail:** Persistent SQLite logs generate automated executive CIO Briefs detailing prevented financial losses.

---

## 🏗️ Architecture

NETRA relies on a decoupled, high-performance architecture optimized for sub-second latency:

1.  **Frontend (React/Vite/Tailwind):** High-refresh dashboard for Risk metrics, HITL (Human-In-The-Loop) Inbox, and the Rogue Agent Simulator.
2.  **Middle-Tier Agent (LangChain / Groq):** Runs a `llama-3.3-70b-versatile` base agent capable of calling sensitive finance or email tools.
3.  **Governance Interception (Middleware):** The wrapper around `agent_tools.py` automatically routes requests payload variables (amount, customer, time) through NETRA before local execution.
4.  **NETRA Evaluate API (FastAPI):** Combines the Vector Memory + Rules Engine + Sklearn ML outputs to issue the definitive `DecisionResult`.

---

## 🛠️ Tech Stack
| Component | Technology | 
| --------- | -------- | 
| **Agent Core** | Python 3.14, Groq SDK (`llama-3.3.70b-versatile`) |
| **Backend / API** | FastAPI, Pydantic, Uvicorn |
| **Risk / ML** | Scikit-Learn (Isolation Forest), Numpy |
| **Vector DB** | ChromaDB (In-memory persistent) |
| **Relational DB** | SQLite, aiosqlite |
| **Frontend** | React, Vite, TailwindCSS, Lucide-React, Recharts |
| **Notifications**| Discord Webhooks Integration |

---

## 🏁 Getting Started

This repo contains both the Frontend and the Backend platforms. Follow these steps to run the complete environment locally.

### 1. Backend Setup
1. Open terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Virtual Environment (Python 3.14 required):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Variables: Copy `.env.example` to `.env` and fill in your actual variables:
   ```env
   GROQ_API_KEY="gsk_YOURKEY"
   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your/hook"
   ```
5. Run the Server:
   ```bash
   python main.py
   ```
   *The backend natively runs on `http://localhost:8000`.*

### 2. Frontend Setup
1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard runs on `http://localhost:5173`.*

---

## 🧪 Running the "Live Demo" Simulation

Once both systems are running, you can demonstrate the Agent Governance Interception:

1. Open the UI at `http://localhost:5173`.
2. Scroll to the **Rogue Agent Simulator** tab.
3. Click **🟢 Safe Refund Request**. You will see the pipeline evaluate, score it low (e.g., `< 20/100`), and process it.
4. Click **🔴 Dangerous High-Value Refund**. You will watch the `amount` flag a deterministic `rule_limit` exception, spike the Anomaly detector, push the Risk Score over the `>70%` threshold, and trigger a `BLOCK` intervention.
5. In your Discord channel, you will receive a Live Alert!

---

## 📁 Repository Structure
```text
.
├── backend/
│   ├── main.py                => FastAPI entry point
│   ├── config.py              => Base settings and rule thresholds
│   ├── agent_tools.py         => Simulated real-world agent tools & interception boundaries
│   ├── decision_engine.py     => Combines Rules + Memory + Anomaly scores
│   ├── risk_scorer.py         => Sklearn Isolation Forest metrics
│   ├── rules_engine.py        => Deterministic boundary validations
│   ├── memory_validator.py    => ChromaDB retrieval for flagged history
│   └── routers/               => API Endpoints (agent loop, events, governance)
│       └── agent.py           => Native Groq SDK loop
└── frontend/
    ├── src/
    │   ├── components/        => UI dashboards (Radar, Timeline, Pipeline)
    │   ├── App.tsx            => Navigation & Routing layout
    │   └── lib/               => Utilities and SSE hooks
```

## 🤝 Project Credits
Built for SunHacks. Netra enables the ethical scaling of enterprise AI.
