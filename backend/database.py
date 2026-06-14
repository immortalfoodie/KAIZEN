"""
Agent Conscience — Database Layer
SQLite via aiosqlite for zero-config persistent storage
"""

import aiosqlite
import os
from contextlib import asynccontextmanager
from config import settings

DATABASE_PATH = settings.DATABASE_PATH


async def init_db():
    """Create database directory and tables if they don't exist."""
    os.makedirs(os.path.dirname(DATABASE_PATH) or ".", exist_ok=True)

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.executescript(SCHEMA_SQL)
        await db.commit()


SCHEMA_SQL = """
-- ============================================================================
-- Audit Logs: every governance decision
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    action_id       TEXT NOT NULL UNIQUE,
    agent_name      TEXT NOT NULL,
    action_type     TEXT NOT NULL,
    amount          REAL NOT NULL DEFAULT 0,
    customer_id     TEXT NOT NULL,
    customer_tier   TEXT NOT NULL DEFAULT 'bronze',
    decision        TEXT NOT NULL CHECK (decision IN ('APPROVE','BLOCK','ESCALATE')),
    risk_score      REAL NOT NULL DEFAULT 0,
    reasoning       TEXT NOT NULL DEFAULT '',
    rule_violations TEXT NOT NULL DEFAULT '[]',       -- JSON array
    memory_warnings TEXT NOT NULL DEFAULT '[]',       -- JSON array
    anomaly_score   REAL NOT NULL DEFAULT 0,
    context         TEXT NOT NULL DEFAULT '{}',       -- JSON object
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_decision   ON audit_logs(decision);
CREATE INDEX IF NOT EXISTS idx_audit_risk       ON audit_logs(risk_score);
CREATE INDEX IF NOT EXISTS idx_audit_agent      ON audit_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_customer   ON audit_logs(customer_id);

-- ============================================================================
-- Policy Rules: configurable governance rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS policy_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    description     TEXT NOT NULL DEFAULT '',
    condition_field TEXT NOT NULL,      -- 'amount', 'action_type', 'customer_tier', etc.
    operator        TEXT NOT NULL,      -- 'gt', 'lt', 'eq', 'neq', 'in', 'not_in', 'and'
    threshold       TEXT NOT NULL,      -- value to compare (stored as text, parsed at runtime)
    action_on_match TEXT NOT NULL DEFAULT 'BLOCK' CHECK (action_on_match IN ('BLOCK','ESCALATE')),
    severity        TEXT NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- Risk Score History: track scoring over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_scores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    action_id       TEXT NOT NULL,
    rule_score      REAL NOT NULL DEFAULT 0,
    memory_score    REAL NOT NULL DEFAULT 0,
    anomaly_raw     REAL NOT NULL DEFAULT 0,
    final_score     REAL NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (action_id) REFERENCES audit_logs(action_id)
);
"""


@asynccontextmanager
async def get_db():
    """Async context manager for database connections."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
