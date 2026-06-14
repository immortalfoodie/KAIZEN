"""
Router: Policy Rules  —  CRUD for /api/v1/rules
Manage governance policy rules dynamically.
"""

from fastapi import APIRouter, HTTPException
from typing import List
from models import PolicyRuleCreate, PolicyRuleResponse
from database import get_db

router = APIRouter(prefix="/api/v1", tags=["rules"])


@router.get("/rules", response_model=List[PolicyRuleResponse])
async def list_rules():
    """List all policy rules."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, name, description, condition_field, operator, threshold, "
            "action_on_match, severity, is_active, created_at FROM policy_rules ORDER BY id"
        )
        rows = await cursor.fetchall()

    return [
        PolicyRuleResponse(
            id=row[0], name=row[1], description=row[2],
            condition_field=row[3], operator=row[4], threshold=row[5],
            action_on_match=row[6], severity=row[7],
            is_active=bool(row[8]), created_at=row[9],
        )
        for row in rows
    ]


@router.post("/rules", response_model=PolicyRuleResponse, status_code=201)
async def create_rule(rule: PolicyRuleCreate):
    """Create a new policy rule."""
    async with get_db() as db:
        # Check for duplicate name
        cursor = await db.execute(
            "SELECT id FROM policy_rules WHERE name = ?", (rule.name,)
        )
        if await cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail=f"Rule with name '{rule.name}' already exists",
            )

        cursor = await db.execute(
            """
            INSERT INTO policy_rules
                (name, description, condition_field, operator, threshold,
                 action_on_match, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rule.name, rule.description, rule.condition_field,
                rule.operator.value, rule.threshold,
                rule.action_on_match.value if hasattr(rule.action_on_match, 'value') else rule.action_on_match,
                rule.severity.value if hasattr(rule.severity, 'value') else rule.severity,
            ),
        )
        await db.commit()
        rule_id = cursor.lastrowid

        # Fetch the created rule
        cursor = await db.execute(
            "SELECT id, name, description, condition_field, operator, threshold, "
            "action_on_match, severity, is_active, created_at "
            "FROM policy_rules WHERE id = ?",
            (rule_id,),
        )
        row = await cursor.fetchone()

    return PolicyRuleResponse(
        id=row[0], name=row[1], description=row[2],
        condition_field=row[3], operator=row[4], threshold=row[5],
        action_on_match=row[6], severity=row[7],
        is_active=bool(row[8]), created_at=row[9],
    )


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: int):
    """Delete a policy rule by ID."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id FROM policy_rules WHERE id = ?", (rule_id,)
        )
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")

        await db.execute("DELETE FROM policy_rules WHERE id = ?", (rule_id,))
        await db.commit()
