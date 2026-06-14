"""
API integration tests — tests all endpoints via httpx TestClient
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Use test database
os.environ["DATABASE_PATH"] = "data/test_api.db"

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    """Create an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "components" in data

    @pytest.mark.asyncio
    async def test_root_returns_endpoints(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data


class TestGovernanceEndpoint:
    @pytest.mark.asyncio
    async def test_evaluate_approve(self, client):
        """Low-risk action should be approved."""
        payload = {
            "action_id": "api_test_001",
            "agent_name": "test_bot",
            "action_type": "refund",
            "amount": 500,
            "customer_id": "cust_clean",
            "customer_tier": "silver",
            "timestamp": "2026-04-09T14:00:00Z",
            "context": {},
        }
        response = await client.post("/api/v1/evaluate-action", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["action_id"] == "api_test_001"
        assert data["decision"] in ("APPROVE", "ESCALATE", "BLOCK")
        assert "risk_score" in data
        assert "reasoning" in data

    @pytest.mark.asyncio
    async def test_evaluate_block(self, client):
        """High-value refund should be blocked."""
        payload = {
            "action_id": "api_test_002",
            "agent_name": "test_bot",
            "action_type": "refund",
            "amount": 80000,
            "customer_id": "cust_test",
            "customer_tier": "bronze",
            "timestamp": "2026-04-09T14:00:00Z",
            "context": {},
        }
        response = await client.post("/api/v1/evaluate-action", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["decision"] == "BLOCK"

    @pytest.mark.asyncio
    async def test_evaluate_validation_error(self, client):
        """Missing required fields should return 422."""
        response = await client.post("/api/v1/evaluate-action", json={"amount": 100})
        assert response.status_code == 422


class TestAuditEndpoint:
    @pytest.mark.asyncio
    async def test_audit_log_returns_paginated(self, client):
        """Audit log should return paginated response."""
        response = await client.get("/api/v1/audit-log?limit=5&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert "limit" in data


class TestMetricsEndpoint:
    @pytest.mark.asyncio
    async def test_metrics_returns_stats(self, client):
        response = await client.get("/api/v1/governance-metrics")
        assert response.status_code == 200
        data = response.json()
        assert "total_decisions" in data
        assert "block_rate" in data


class TestRulesEndpoint:
    @pytest.mark.asyncio
    async def test_list_rules(self, client):
        response = await client.get("/api/v1/rules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_create_and_delete_rule(self, client):
        """Create a rule, verify it exists, delete it."""
        payload = {
            "name": "test_rule_api",
            "description": "Test rule",
            "condition_field": "amount",
            "operator": "gt",
            "threshold": "999",
            "action_on_match": "ESCALATE",
            "severity": "LOW",
        }
        # Create
        response = await client.post("/api/v1/rules", json=payload)
        assert response.status_code == 201
        rule = response.json()
        rule_id = rule["id"]

        # List and verify
        response = await client.get("/api/v1/rules")
        names = [r["name"] for r in response.json()]
        assert "test_rule_api" in names

        # Delete
        response = await client.delete(f"/api/v1/rules/{rule_id}")
        assert response.status_code == 204


class TestMemoryEndpoint:
    @pytest.mark.asyncio
    async def test_memory_insights(self, client):
        response = await client.get("/api/v1/memory-insights?customer_id=cust_456")
        assert response.status_code == 200
        data = response.json()
        assert data["customer_id"] == "cust_456"
        assert "total_past_actions" in data
