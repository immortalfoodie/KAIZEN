"""
Router: CIO Brief — GET /api/v1/cio-brief
Generates a downloadable PDF governance report.
"""

import io
import logging
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database import get_db

router = APIRouter(prefix="/api/v1", tags=["report"])

logger = logging.getLogger(__name__)


def sanitize_for_pdf(text: str) -> str:
    """
    Sanitize text to prevent FPDF UnicodeEncodeError when using core fonts.
    Replaces common non-latin-1 characters with equivalents and removes the rest.
    """
    if not text:
        return ""
    # Map common non-latin-1 characters to latin-1 or ASCII equivalents
    replacements = {
        "\u2013": "-",      # en dash
        "\u2014": "-",      # em dash
        "\u2018": "'",      # left single quote
        "\u2019": "'",      # right single quote
        "\u201c": '"',      # left double quote
        "\u201d": '"',      # right double quote
        "\u20b9": "Rs.",    # Rupee symbol
        "\u2122": "TM",     # Trademark symbol
        "\u2713": "Check",  # checkmark
        "\u2714": "Check",
        "\u274c": "X",      # cross
        "\u26a0": "Warning",# warning
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    # Encode as latin-1, ignoring any remaining unmappable characters, and decode back to string
    return text.encode("latin-1", errors="ignore").decode("latin-1")


@router.get("/cio-brief")
async def generate_cio_brief():
    """
    Generate a PDF governance brief for CIO/executive review.
    Returns a downloadable PDF file.
    """
    from fpdf import FPDF

    # ── Gather data ──────────────────────────────────────────────────────
    async with get_db() as db:
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN decision = 'APPROVE' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN decision = 'ESCALATE' THEN 1 ELSE 0 END) as escalated,
                AVG(risk_score) as avg_risk,
                MAX(risk_score) as max_risk,
                SUM(CASE WHEN decision = 'BLOCK' THEN amount ELSE 0 END) as loss_prevented
            FROM audit_logs
        """)
        row = await cursor.fetchone()

        total = row[0] or 0
        approved = row[1] or 0
        blocked = row[2] or 0
        escalated = row[3] or 0
        avg_risk = row[4] or 0
        max_risk = row[5] or 0
        loss_prevented = row[6] or 0

        # Top 5 riskiest
        cursor = await db.execute(
            """SELECT agent_name, action_type, amount, risk_score, customer_id, reasoning
               FROM audit_logs ORDER BY risk_score DESC LIMIT 5"""
        )
        top_risks = await cursor.fetchall()

    governance_cost = 25000 + (total * 45)
    roi_multiplier = round(loss_prevented / governance_cost, 2) if governance_cost > 0 else 0
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    # ── Build PDF ────────────────────────────────────────────────────────
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 24)
    pdf.cell(0, 15, "NETRA", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, "Weekly Governance Brief", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated: {now}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(10)

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "What This Means (Plain English)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    if total > 0:
        plain = (
            f"In simple terms: NETRA reviewed {total} actions that AI agents tried to perform. "
            f"Of these, {blocked} were dangerous and were automatically stopped before they could cause harm. "
        )
        if loss_prevented > 0:
            plain += f"This saved the organization an estimated Rs.{loss_prevented:,.0f}. "
        if escalated > 0:
            plain += f"{escalated} actions needed a human to make the final call. "
        plain += "The system is working as intended - catching risky AI behavior before it happens."
    else:
        plain = "No AI agent actions have been processed yet. The system is standing by."
    pdf.multi_cell(0, 5, sanitize_for_pdf(plain))
    pdf.ln(8)

    # Executive Summary (Technical)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Executive Summary (Technical)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    block_rate = f"{(blocked / total * 100):.1f}" if total > 0 else "0"
    summary = (
        f"NETRA processed {total} AI agent actions this period. "
        f"{blocked} actions were blocked ({block_rate}% block rate), "
        f"preventing an estimated Rs.{loss_prevented:,.0f} in potential damage. "
        f"{escalated} actions were escalated for human review. "
        f"The governance system delivered a {roi_multiplier}x return on investment."
    )
    pdf.multi_cell(0, 5, sanitize_for_pdf(summary))
    pdf.ln(8)

    # Key Metrics Table
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Key Metrics", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 9)
    col_w = 47.5
    headers = ["Metric", "Value", "Metric", "Value"]
    for h in headers:
        pdf.cell(col_w, 8, h, border=1, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    metrics = [
        ("Total Actions", str(total)),
        ("Blocked", str(blocked)),
        ("Approved", str(approved)),
        ("Escalated", str(escalated)),
        ("Avg Risk Score", f"{avg_risk:.1f}"),
        ("Max Risk Score", f"{max_risk:.1f}"),
        ("Damage Prevented", f"Rs.{loss_prevented:,.0f}"),
        ("ROI Multiplier", f"{roi_multiplier}x"),
    ]

    for i in range(0, len(metrics), 2):
        m1 = metrics[i]
        m2 = metrics[i + 1] if i + 1 < len(metrics) else ("", "")
        pdf.cell(col_w, 7, m1[0], border=1)
        pdf.cell(col_w, 7, m1[1], border=1, align="C")
        pdf.cell(col_w, 7, m2[0], border=1)
        pdf.cell(col_w, 7, m2[1], border=1, align="C")
        pdf.ln()

    pdf.ln(8)

    # Top Risks
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Top 5 Highest Risk Actions", new_x="LMARGIN", new_y="NEXT")

    if top_risks:
        pdf.set_font("Helvetica", "B", 8)
        widths = [30, 25, 25, 20, 25, 65]
        risk_headers = ["Agent", "Action", "Amount", "Risk", "Customer", "Reasoning"]
        for w, h in zip(widths, risk_headers):
            pdf.cell(w, 7, h, border=1, align="C")
        pdf.ln()

        pdf.set_font("Helvetica", "", 7)
        for r in top_risks:
            pdf.cell(widths[0], 6, sanitize_for_pdf(str(r[0]))[:15], border=1)
            pdf.cell(widths[1], 6, sanitize_for_pdf(str(r[1]))[:12], border=1)
            pdf.cell(widths[2], 6, f"Rs.{r[2]:,.0f}", border=1, align="R")
            pdf.cell(widths[3], 6, f"{r[3]:.0f}", border=1, align="C")
            pdf.cell(widths[4], 6, sanitize_for_pdf(str(r[4]))[:12], border=1)
            pdf.cell(widths[5], 6, sanitize_for_pdf(str(r[5]))[:40], border=1)
            pdf.ln()
    else:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 8, "No actions recorded yet.", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)

    # Recommendations
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Recommendations", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)

    recs = []
    if avg_risk > 50:
        recs.append("- HIGH AVG RISK: Review agent permissions and tighten policy thresholds.")
    if blocked > total * 0.3 and total > 0:
        recs.append("- HIGH BLOCK RATE: Consider retraining agents or refining tool access.")
    if escalated > total * 0.2 and total > 0:
        recs.append("- HIGH ESCALATION: Add more deterministic rules to reduce manual review load.")
    if not recs:
        recs.append("- System operating within normal parameters. Continue monitoring.")
    recs.append("- Schedule quarterly governance policy review with stakeholders.")
    recs.append("- Expand agent coverage to include Customer Service and HR bots.")

    for rec in recs:
        pdf.multi_cell(0, 5, sanitize_for_pdf(rec))
        pdf.ln(2)

    # Footer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(
        0, 5,
        "This report was auto-generated by the NETRA Governance Platform.",
        new_x="LMARGIN", new_y="NEXT", align="C",
    )

    # ── Return PDF ───────────────────────────────────────────────────────
    pdf_bytes = pdf.output()
    buffer = io.BytesIO(pdf_bytes)
    buffer.seek(0)

    filename = f"netra_brief_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
