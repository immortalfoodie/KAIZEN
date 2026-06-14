"""
Agent Conscience — Main Application
FastAPI server with all routers, CORS, and lifecycle management
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings

# ── Configure logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("agent_conscience")

# ── Engine singletons (initialized during lifespan) ─────────────────────────
_rules_engine = None
_memory_validator = None
_risk_scorer = None
_audit_logger = None
_decision_engine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — initialize engines and seed data on startup."""
    global _rules_engine, _memory_validator, _risk_scorer
    global _audit_logger, _decision_engine

    logger.info("=" * 60)
    logger.info(f"  {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"  Environment: {settings.ENVIRONMENT}")
    logger.info("=" * 60)

    # ── Initialize database ─────────────────────────────────────────────
    from database import init_db
    await init_db()
    logger.info("✓ Database initialized")

    # ── Initialize engine components ────────────────────────────────────
    from rules_engine import RulesEngine
    from memory_validator import MemoryValidator
    from risk_scorer import RiskScorer
    from audit_logger import AuditLogger
    from decision_engine import DecisionEngine

    _rules_engine = RulesEngine()
    _memory_validator = MemoryValidator()
    _risk_scorer = RiskScorer()
    _audit_logger = AuditLogger()
    _decision_engine = DecisionEngine(
        rules_engine=_rules_engine,
        memory_validator=_memory_validator,
        risk_scorer=_risk_scorer,
        audit_logger=_audit_logger,
    )
    logger.info("✓ All 3 governance pillars initialized")

    # ── Seed data ───────────────────────────────────────────────────────
    from seed_data import seed_all
    await seed_all(_memory_validator)
    logger.info("✓ Data seeded (database + ChromaDB)")

    # ── Inject engines into routers ─────────────────────────────────────
    from routers import governance, audit, metrics, memory

    governance.decision_engine = _decision_engine
    audit.audit_logger = _audit_logger
    metrics.audit_logger = _audit_logger
    memory.memory_validator = _memory_validator
    logger.info("✓ Engines injected into routers")

    logger.info("=" * 60)
    logger.info(f"  Server ready at http://{settings.HOST}:{settings.PORT}")
    logger.info(f"  Docs at http://{settings.HOST}:{settings.PORT}/docs")
    logger.info("=" * 60)

    yield

    # ── Shutdown ────────────────────────────────────────────────────────
    logger.info("Shutting down Agent Conscience...")


# ── Create FastAPI app ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "AI Governance Middleware — an invisible observability layer that intercepts "
        "AI agent actions in real-time, validates them through 3 pillars "
        "(Rules Engine, Memory Validator, Risk Scorer), and returns a governance "
        "decision: APPROVE, BLOCK, or ESCALATE."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if settings.ENVIRONMENT == "development" else "An unexpected error occurred",
            "status_code": 500,
        },
    )


# ── Register routers ────────────────────────────────────────────────────────
from routers import health, governance, audit, metrics, rules, memory, events
from routers import agent as agent_router
from routers import roi as roi_router
from routers import report as report_router

app.include_router(health.router)
app.include_router(governance.router)
app.include_router(audit.router)
app.include_router(metrics.router)
app.include_router(rules.router)
app.include_router(memory.router)
app.include_router(events.router)
app.include_router(agent_router.router)
app.include_router(roi_router.router)
app.include_router(report_router.router)


# ── Root endpoint ────────────────────────────────────────────────────────────
@app.get("/", tags=["root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "evaluate_action": "POST /api/v1/evaluate-action",
            "run_live_agent": "POST /api/v1/run-live-agent",
            "roi_summary": "GET /api/v1/roi-summary",
            "cio_brief": "GET /api/v1/cio-brief",
            "audit_log": "GET /api/v1/audit-log",
            "metrics": "GET /api/v1/governance-metrics",
            "rules": "GET /api/v1/rules",
            "memory_insights": "GET /api/v1/memory-insights?customer_id=X",
            "events": "GET /api/v1/events/stream",
            "health": "GET /api/v1/health",
        },
    }


# ── CLI entry point ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
