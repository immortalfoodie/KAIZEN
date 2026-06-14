"""
Agent Conscience — Seed Data Loader
Seeds the database and ChromaDB with historical data on first run
"""

import json
import logging
import os
from typing import List, Dict

logger = logging.getLogger(__name__)

MOCK_DATA_PATH = os.path.join(os.path.dirname(__file__), "mock_data", "historical_decisions.json")

# Default policy rules to seed into the database
DEFAULT_RULES = [
    {
        "name": "refund_limit_50k",
        "description": "Block refunds exceeding ₹50,000",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "50000",
        "action_on_match": "BLOCK",
        "severity": "HIGH",
    },
    {
        "name": "gold_account_closure",
        "description": "Escalate account closure for gold-tier customers",
        "condition_field": "customer_tier",
        "operator": "eq",
        "threshold": "gold",
        "action_on_match": "ESCALATE",
        "severity": "HIGH",
    },
    {
        "name": "large_contract",
        "description": "Block contract approvals exceeding ₹10,00,000",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "1000000",
        "action_on_match": "BLOCK",
        "severity": "CRITICAL",
    },
    {
        "name": "high_value_refund_new_customer",
        "description": "Escalate refunds >₹10,000 for bronze-tier customers",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "10000",
        "action_on_match": "ESCALATE",
        "severity": "MEDIUM",
    },
    {
        "name": "very_high_refund",
        "description": "Escalate any refund exceeding ₹25,000",
        "condition_field": "amount",
        "operator": "gt",
        "threshold": "25000",
        "action_on_match": "ESCALATE",
        "severity": "HIGH",
    },
]


def load_historical_data() -> List[Dict]:
    """Load historical decisions from JSON file."""
    if not os.path.exists(MOCK_DATA_PATH):
        logger.warning(f"Mock data file not found: {MOCK_DATA_PATH}")
        return []

    with open(MOCK_DATA_PATH, "r") as f:
        data = json.load(f)

    logger.info(f"Loaded {len(data)} historical decisions from {MOCK_DATA_PATH}")
    return data


async def seed_database():
    """Seed policy rules into the database if empty."""
    from database import get_db

    async with get_db() as db:
        cursor = await db.execute("SELECT COUNT(*) FROM policy_rules")
        row = await cursor.fetchone()

        if row and row[0] > 0:
            logger.info(f"Database already has {row[0]} policy rules — skipping seed")
            return

        for rule in DEFAULT_RULES:
            await db.execute(
                """
                INSERT OR IGNORE INTO policy_rules
                    (name, description, condition_field, operator, threshold,
                     action_on_match, severity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rule["name"],
                    rule["description"],
                    rule["condition_field"],
                    rule["operator"],
                    rule["threshold"],
                    rule["action_on_match"],
                    rule["severity"],
                ),
            )
        await db.commit()
        logger.info(f"Seeded {len(DEFAULT_RULES)} policy rules into database")


async def seed_all(memory_validator):
    """Full seed operation: database + ChromaDB."""
    await seed_database()

    history = load_historical_data()
    if history:
        memory_validator.load_historical_data(history)
