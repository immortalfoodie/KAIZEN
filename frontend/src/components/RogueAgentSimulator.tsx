import { useState } from "react";
import { X, AlertOctagon, Terminal, Cpu, Zap, Play, FlaskConical } from "lucide-react";
import { useTranslation } from "../i18n/useTranslation";
import { API_BASE_URL } from "../config";

interface RogueAgentSimulatorProps {
  onClose: () => void;
}

export function RogueAgentSimulator({ onClose }: RogueAgentSimulatorProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentLogs, setAgentLogs] = useState<
    { step: string; message: string; timestamp: string }[]
  >([]);
  const [agentResult, setAgentResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "manual" | "whatif">("live");

  // What-If state
  const [wifAmount, setWifAmount] = useState("50000");
  const [wifCustomer, setWifCustomer] = useState("cust_test_123");
  const [wifAction, setWifAction] = useState("refund");
  const [wifTier, setWifTier] = useState("bronze");
  const [wifResult, setWifResult] = useState<any>(null);
  const [wifLoading, setWifLoading] = useState(false);

  const simulateAction = async (
    actionType: string,
    amount: number,
    customerId: string
  ) => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/v1/evaluate-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: `demo_${Date.now()}`,
          agent_name: "Inventory Bot",
          action_type: actionType,
          amount: amount,
          customer_id: customerId,
          customer_tier: "bronze",
          timestamp: new Date().toISOString(),
          context: { source: "rogue_demo" },
        }),
      });
      onClose();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const runLiveAgent = async (scenario: string) => {
    setAgentRunning(true);
    setAgentResult(null);
    setAgentLogs([
      {
        step: "boot",
        message: "🚀 Booting Finance Bot [Model: llama-3.3-70b-versatile via Groq]...",
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/run-live-agent?scenario=${scenario}`,
        { method: "POST" }
      );
      const data = await response.json();

      if (data.steps) {
        setAgentLogs(data.steps);
      }

      const statusEmoji =
        data.status === "blocked"
          ? "🛑"
          : data.status === "completed"
          ? "✅"
          : "❌";
      setAgentResult(
        `${statusEmoji} ${data.status?.toUpperCase()}: ${data.result || data.error || "Unknown"}`
      );
    } catch (e) {
      setAgentResult(`❌ CONNECTION ERROR: ${e}`);
    } finally {
      setAgentRunning(false);
    }
  };

  const runWhatIf = async () => {
    setWifLoading(true);
    setWifResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/evaluate-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: `whatif_${Date.now()}`,
          agent_name: "What-If Simulator",
          action_type: wifAction,
          amount: parseFloat(wifAmount) || 0,
          customer_id: wifCustomer,
          customer_tier: wifTier,
          timestamp: new Date().toISOString(),
          context: { source: "whatif_playground" },
        }),
      });
      const data = await response.json();
      setWifResult(data);
    } catch (e) {
      setWifResult({ error: `Connection failed: ${e}` });
    } finally {
      setWifLoading(false);
    }
  };

  const tabStyles = (tab: string) =>
    `px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-charcoal/30 hover:text-charcoal/60"
    }`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="netra-card bg-surface w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col border-accent/15">
        {/* Header with torii-red accent */}
        <div className="torii-bar" />
        <div className="bg-gradient-to-r from-danger/90 to-danger/70 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 font-bold text-lg uppercase tracking-[0.15em]">
            <AlertOctagon />
            {t("rogue_demo")}
            <span className="text-white/40 text-xs font-normal ml-1">侵入テスト</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 px-4 bg-surface-elevated/50">
          <button className={tabStyles("live")} onClick={() => setActiveTab("live")}>
            <span className="flex items-center gap-1"><Cpu size={13} /> {t("live_agent")}</span>
          </button>
          <button className={tabStyles("manual")} onClick={() => setActiveTab("manual")}>
            <span className="flex items-center gap-1"><Terminal size={13} /> {t("manual_scenarios")}</span>
          </button>
          <button className={tabStyles("whatif")} onClick={() => setActiveTab("whatif")}>
            <span className="flex items-center gap-1"><FlaskConical size={13} /> {t("what_if_title")}</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-charcoal/40 mb-4 text-xs">
            Select a scenario to launch an autonomous AI Agent. Its actions will be intercepted and evaluated live by the
            Netra governance layer.
          </p>

          {/* ── Live Agent Tab ──────────────────────────────────────── */}
          {activeTab === "live" && (
            <div className="border border-primary/20 bg-primary/5 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={18} className="text-primary" />
                <h3 className="font-bold text-base uppercase tracking-wider text-white/90">
                  Live AI Agent
                </h3>
                <span className="text-[10px] bg-primary/30 text-primary px-2 py-0.5 font-semibold rounded-md ml-auto">
                  REAL LLM
                </span>
              </div>
              <p className="text-xs text-charcoal/50 mb-3">
                Launch a <strong className="text-charcoal/70">real AI agent</strong> powered by Groq
                llama-3.3-70b-versatile. The agent autonomously decides to use tools — and Netra
                intercepts each tool call in real-time.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  disabled={agentRunning}
                  onClick={() => runLiveAgent("dangerous_refund")}
                  className="netra-button bg-gradient-to-br from-danger to-danger/70 text-white p-3 text-left rounded-lg disabled:opacity-50"
                >
                  <div className="font-bold text-xs flex items-center gap-2">
                    <Zap size={12} /> DANGEROUS
                  </div>
                  <div className="text-[10px] mt-1 opacity-70">
                    ₹1,00,000 → unverified user
                  </div>
                </button>
                <button
                  disabled={agentRunning}
                  onClick={() => runLiveAgent("fraud_refund")}
                  className="netra-button bg-gradient-to-br from-warning to-warning/70 text-background p-3 text-left rounded-lg disabled:opacity-50"
                >
                  <div className="font-bold text-xs flex items-center gap-2">
                    <Zap size={12} /> FRAUD TARGET
                  </div>
                  <div className="text-[10px] mt-1">₹75,000 → known bad actor</div>
                </button>
                <button
                  disabled={agentRunning}
                  onClick={() => runLiveAgent("safe_refund")}
                  className="netra-button bg-gradient-to-br from-success to-success/70 text-white p-3 text-left rounded-lg disabled:opacity-50"
                >
                  <div className="font-bold text-xs flex items-center gap-2">
                    <Play size={12} /> SAFE
                  </div>
                  <div className="text-[10px] mt-1 opacity-70">
                    ₹500 → verified gold user
                  </div>
                </button>
              </div>

              {/* Terminal Output */}
              {agentLogs.length > 0 && (
                <div className="mt-4 bg-[#0A0E14] text-success/80 font-mono text-[11px] p-4 border border-success/10 max-h-48 overflow-y-auto rounded-lg">
                  <div className="text-charcoal/30 mb-2">
                    ── AGENT EXECUTION LOG ──
                  </div>
                  {agentLogs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-charcoal/30">
                        [{log.step?.toUpperCase()}]
                      </span>{" "}
                      <span
                        className={
                          log.step === "governance_block"
                            ? "text-danger font-bold"
                            : log.step === "execution_complete"
                            ? "text-success"
                            : ""
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                  {agentRunning && (
                    <div className="text-warning animate-pulse mt-1">
                      ▌ Agent executing...
                    </div>
                  )}
                  {agentResult && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-white font-bold">
                      {agentResult}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Manual Scenarios Tab ────────────────────────────────── */}
          {activeTab === "manual" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                disabled={loading}
                onClick={() => simulateAction("refund", 500, "cust_clean_123")}
                className="netra-btn p-4 text-left group border-white/5 hover:border-success/20"
              >
                <div className="font-bold text-success text-xs mb-1 flex items-center justify-between">
                  {t("safe_action")}
                  <Terminal size={14} className="text-charcoal/20" />
                </div>
                <div className="text-xs font-mono text-charcoal/50">
                  Normal ₹500 support refund.
                </div>
                <div className="mt-2 text-[10px] font-semibold bg-success/10 text-success border border-success/20 inline-block px-2 py-0.5 rounded-md">
                  EXPECTED: APPROVE
                </div>
              </button>

              <button
                disabled={loading}
                onClick={() => simulateAction("refund", 15000, "cust_789")}
                className="netra-btn p-4 text-left group border-white/5 hover:border-warning/20"
              >
                <div className="font-bold text-warning text-xs mb-1 flex items-center justify-between">
                  {t("suspicious_action")}
                  <Terminal size={14} className="text-charcoal/20" />
                </div>
                <div className="text-xs font-mono text-charcoal/50">
                  High value refund for a new bronze user.
                </div>
                <div className="mt-2 text-[10px] font-semibold bg-warning/10 text-warning border border-warning/20 inline-block px-2 py-0.5 rounded-md">
                  EXPECTED: ESCALATE
                </div>
              </button>

              <button
                disabled={loading}
                onClick={() => simulateAction("refund", 75000, "cust_456")}
                className="netra-btn p-4 text-left group border-warning/15 bg-warning/5 hover:border-warning/30"
              >
                <div className="font-bold text-danger text-xs mb-1 flex items-center justify-between">
                  {t("fraud_historical")}
                  <Terminal size={14} className="text-charcoal/20" />
                </div>
                <div className="text-xs font-mono text-charcoal/50">
                  Large refund to known bad actor.
                </div>
                <div className="mt-2 text-[10px] font-semibold bg-danger/10 text-danger border border-danger/20 inline-block px-2 py-0.5 rounded-md">
                  EXPECTED: BLOCK (Memory)
                </div>
              </button>

              <button
                disabled={loading}
                onClick={() =>
                  simulateAction(
                    "unauthorized_transfer",
                    1000000,
                    "hacker_99"
                  )
                }
                className="netra-btn p-4 text-left group bg-danger/10 border-danger/20 hover:border-danger/40"
              >
                <div className="font-bold text-danger text-xs mb-1 flex items-center justify-between">
                  {t("critical_breach")}
                  <Terminal size={14} className="text-danger/40" />
                </div>
                <div className="text-xs font-mono text-charcoal/50">
                  Agent hallucination dumping ₹10L.
                </div>
                <div className="mt-2 text-[10px] font-bold bg-danger text-white inline-block px-2 py-0.5 rounded-md">
                  EXPECTED: INSTANT BLOCK
                </div>
              </button>
            </div>
          )}

          {/* ── What-If Playground Tab ──────────────────────────────── */}
          {activeTab === "whatif" && (
            <div className="border border-accent/20 bg-accent/5 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical size={18} className="text-accent" />
                <h3 className="font-bold text-base uppercase tracking-wider text-white/90">
                  {t("what_if_title")}
                </h3>
              </div>
              <p className="text-xs text-charcoal/50 mb-4">
                {t("what_if_desc")}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-semibold text-charcoal/40 block mb-1">{t("action_type")}</label>
                  <select
                    value={wifAction}
                    onChange={(e) => setWifAction(e.target.value)}
                    className="netra-select w-full text-xs"
                  >
                    <option value="refund">Refund</option>
                    <option value="transfer">Transfer</option>
                    <option value="approve_contract">Approve Contract</option>
                    <option value="close_account">Close Account</option>
                    <option value="unauthorized_transfer">Unauthorized Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-charcoal/40 block mb-1">{t("amount")} (₹)</label>
                  <input
                    type="number"
                    value={wifAmount}
                    onChange={(e) => setWifAmount(e.target.value)}
                    className="netra-input w-full text-xs"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-charcoal/40 block mb-1">{t("customer_id")}</label>
                  <input
                    type="text"
                    value={wifCustomer}
                    onChange={(e) => setWifCustomer(e.target.value)}
                    className="netra-input w-full text-xs"
                    placeholder="cust_test_123"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-charcoal/40 block mb-1">Customer Tier</label>
                  <select
                    value={wifTier}
                    onChange={(e) => setWifTier(e.target.value)}
                    className="netra-select w-full text-xs"
                  >
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>
              </div>

              <button
                disabled={wifLoading}
                onClick={runWhatIf}
                className="netra-button bg-gradient-to-r from-accent to-accent/70 text-background px-6 py-2.5 w-full flex items-center justify-center gap-2 rounded-lg text-sm disabled:opacity-50"
              >
                <FlaskConical size={14} />
                {wifLoading ? t("waiting") : t("run_scenario")}
              </button>

              {/* What-If Result */}
              {wifResult && !wifResult.error && (
                <div className={`mt-4 p-4 rounded-xl border ${
                  wifResult.decision === "BLOCK" ? "bg-danger/10 border-danger/20" :
                  wifResult.decision === "APPROVE" ? "bg-success/10 border-success/20" :
                  "bg-warning/10 border-warning/20"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-black text-lg ${
                      wifResult.decision === "BLOCK" ? "text-danger" :
                      wifResult.decision === "APPROVE" ? "text-success" :
                      "text-warning"
                    }`}>
                      {wifResult.decision === "BLOCK" ? "🛑" : wifResult.decision === "APPROVE" ? "✅" : "⚠️"} {wifResult.decision}
                    </span>
                    <span className="font-semibold text-xs text-charcoal/50">Risk: {wifResult.risk_score?.toFixed(1)}/100</span>
                  </div>
                  <p className="text-xs text-charcoal/60 leading-relaxed">
                    {wifResult.simple_explanation || wifResult.reasoning}
                  </p>
                  {wifResult.rule_violations?.length > 0 && (
                    <div className="mt-2 text-[11px] text-danger font-mono">
                      {wifResult.rule_violations.map((v: any, i: number) => (
                        <div key={i}>! {v.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {wifResult?.error && (
                <div className="mt-4 p-3 bg-danger/10 border border-danger/20 text-danger text-xs font-mono rounded-lg">
                  {wifResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
