import { useEffect, useState } from "react";
import { type GovernanceMetrics, type GovernanceDecision } from "../types";
import { ShieldCheck, Target, Activity, TrendingUp, X, Info, Bot, AlertTriangle, Key, GitCommit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../i18n/useTranslation";
import { API_BASE_URL } from "../config";

interface RiskMetricsProps {
  metrics: GovernanceMetrics | null;
  recentLogs: GovernanceDecision[];
}

interface ROIData {
  damage_prevented: number;
  governance_cost: number;
  roi_multiplier: number;
}

interface Agent {
  id: string;
  name: string;
  trustScore: number;
  warnings: number;
  status: "active" | "idle";
  details: {
    permissions: string;
    version: string;
    last_active: string;
  };
}

const MOCK_AGENTS: Agent[] = [
  {
    id: "1", name: "Support Bot", trustScore: 92, warnings: 0, status: "active",
    details: { permissions: "Zendesk, Postgres(Read)", version: "v2.1.0", last_active: "12s ago" }
  },
  {
    id: "2", name: "Finance Bot", trustScore: 84, warnings: 1, status: "active",
    details: { permissions: "Stripe, Plaid(R/W)", version: "v1.4.3", last_active: "4m ago" }
  },
  {
    id: "3", name: "DevOps Agent", trustScore: 76, warnings: 2, status: "idle",
    details: { permissions: "AWS, GitHub, Vercel", version: "v3.0.1", last_active: "2h ago" }
  },
  {
    id: "4", name: "Inventory Bot", trustScore: 45, warnings: 5, status: "active",
    details: { permissions: "Shopify(Admin), DB(W)", version: "v1.0.9", last_active: "Active Now" }
  },
];

export function RiskMetrics({ metrics, recentLogs }: RiskMetricsProps) {
  const { t } = useTranslation();
  const [roi, setRoi] = useState<ROIData | null>(null);
  const [selectedCell, setSelectedCell] = useState<GovernanceDecision | null>(null);
  const [explainingMetric, setExplainingMetric] = useState<"block_rate" | "avg_risk" | "governed" | "roi" | null>(null);
  const [activeTab, setActiveTab] = useState<"metrics" | "agents">("metrics");
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  const toggleExpandAgent = (id: string) => {
    setExpandedAgentId(expandedAgentId === id ? null : id);
  };

  const getTrustColor = (score: number) => {
    if (score > 80) return "from-success/80 to-success/40";
    if (score > 50) return "from-warning/80 to-warning/40";
    return "from-danger/80 to-danger/40";
  };

  const getTrustGlow = (score: number) => {
    if (score > 80) return "shadow-success/20";
    if (score > 50) return "shadow-warning/20";
    return "shadow-danger/20";
  };


  useEffect(() => {
    const fetchRoi = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/roi-summary`);
        if (resp.ok) {
          setRoi(await resp.json());
        }
      } catch { /* silent */ }
    };
    fetchRoi();
    const interval = setInterval(fetchRoi, 10000);
    return () => clearInterval(interval);
  }, []);

  // Generate heatmap grid
  const gridSize = 35;
  const gridData: (GovernanceDecision | null)[] = Array(gridSize).fill(null);

  recentLogs.slice(0, gridSize).forEach((log, i) => {
    gridData[i] = log;
  });

  const getHeatmapColor = (cell: GovernanceDecision | null) => {
    if (!cell) return "bg-white/5 border-white/5";
    switch (cell.decision) {
      case "APPROVE": return "bg-success/70 border-success/30 shadow-sm shadow-success/20";
      case "BLOCK": return "bg-danger/70 border-danger/30 shadow-sm shadow-danger/20";
      case "ESCALATE": return "bg-warning/70 border-warning/30 shadow-sm shadow-warning/20";
      default: return "bg-white/5 border-white/5";
    }
  };

  return (
    <div className="kaizen-card p-5 flex flex-col h-full relative overflow-y-auto">
      {/* Decorative kanji */}
      <span className="kanji-watermark right-2 bottom-2 text-[5rem] opacity-[0.02]">危</span>

      {/* Tab Switcher Header */}
      <div className="flex border-b border-accent/15 mb-4 relative z-10 font-mono text-xs font-bold shrink-0">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex-1 pb-3 text-center transition-all border-b-2 cursor-pointer ${activeTab === "metrics" ? "border-accent text-accent" : "border-transparent text-charcoal/40 hover:text-charcoal"}`}
        >
          {t("risk_metrics")}
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          className={`flex-1 pb-3 text-center transition-all border-b-2 cursor-pointer ${activeTab === "agents" ? "border-accent text-accent" : "border-transparent text-charcoal/40 hover:text-charcoal"}`}
        >
          {t("agent_radar")}
        </button>
      </div>

      {activeTab === "metrics" ? (
        <div className="flex flex-col gap-5 flex-grow">
          {/* Metrics 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2.5 relative z-10 shrink-0">
            <button
              onClick={() => setExplainingMetric("block_rate")}
              className="p-3 rounded-lg border border-white/5 bg-white/[0.03] hover:border-danger/20 hover:bg-danger/5 transition-all text-left group"
            >
              <div className="text-[10px] font-semibold text-charcoal/40 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><Target size={12} /> {t("block_rate")}</span>
                <Info size={10} className="opacity-0 group-hover:opacity-100 text-danger transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-danger">
                {metrics ? metrics.block_rate : "0.0%"}
              </div>
            </button>
            <button
              onClick={() => setExplainingMetric("avg_risk")}
              className="p-3 rounded-lg border border-white/5 bg-white/[0.03] hover:border-warning/20 hover:bg-warning/5 transition-all text-left group"
            >
              <div className="text-[10px] font-semibold text-charcoal/40 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><Activity size={12} /> {t("avg_risk")}</span>
                <Info size={10} className="opacity-0 group-hover:opacity-100 text-warning transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-warning">
                {metrics ? metrics.avg_risk_score : "0.0"}
              </div>
            </button>
            <button
              onClick={() => setExplainingMetric("governed")}
              className="p-3 rounded-lg border border-white/5 bg-white/[0.03] hover:border-primary/20 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="text-[10px] font-semibold text-charcoal/40 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> {t("governed")}</span>
                <Info size={10} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-primary">
                {metrics ? metrics.total_decisions : 0}
              </div>
            </button>
            <button
              onClick={() => setExplainingMetric("roi")}
              className="p-3 rounded-lg border border-success/10 bg-success/5 hover:border-success/25 transition-all text-left group flex flex-col justify-center"
            >
              <div className="text-[10px] font-semibold text-charcoal/40 mb-0.5 flex items-center justify-between w-full">
                <span className="flex items-center gap-1"><TrendingUp size={12} /> {t("roi")}</span>
                <Info size={10} className="opacity-0 group-hover:opacity-100 text-success transition-opacity" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-success">
                  {roi ? `${roi.roi_multiplier.toLocaleString()}×` : "—"}
                </span>
              </div>
              {roi && roi.damage_prevented > 0 && (
                <div className="text-[10px] font-semibold text-charcoal/40 mt-1 -mb-1 leading-tight">
                  ₹{roi.damage_prevented.toLocaleString()} {t("saved")}
                </div>
              )}
            </button>
          </div>

          {/* Clickable Heatmap */}
          <div className="relative z-10 flex flex-col gap-2 shrink-0">
            <h3 className="text-xs font-semibold text-charcoal/50">{t("heatmap_title")}</h3>
            <div className="grid grid-cols-7 gap-1">
              {gridData.map((cell, i) => (
                <motion.div
                  key={i}
                  whileHover={cell ? { scale: 1.3, zIndex: 10 } : {}}
                  whileTap={cell ? { scale: 0.95 } : {}}
                  onClick={() => cell && setSelectedCell(cell)}
                  className={`aspect-square border rounded-[4px] transition-colors duration-500 ${getHeatmapColor(cell)} ${cell ? "cursor-pointer" : ""}`}
                  title={cell ? `${cell.decision} — ${cell.agent_name}` : ""}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-1 text-[10px] font-semibold text-charcoal/40">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-success/70 rounded-sm" />{t("approved")}</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-danger/70 rounded-sm" />{t("blocked")}</div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-warning/70 rounded-sm" />{t("escalated")}</div>
            </div>
            <p className="text-[10px] text-charcoal/25 mt-0.5">{t("heatmap_click")}</p>
          </div>
        </div>
      ) : (
        /* Consolidated Agent List Panel */
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 relative z-10 mt-1">
          {MOCK_AGENTS.map((agent) => (
            <div
              key={agent.id}
              onClick={() => toggleExpandAgent(agent.id)}
              className={`p-3 rounded-lg border border-accent/10 bg-surface/60 backdrop-blur-sm cursor-pointer
                hover:border-accent/25 hover:bg-surface-elevated/80 transition-all duration-300
                ${expandedAgentId === agent.id ? "border-accent/30 bg-surface-elevated/80" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-white/90">
                  <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
                    <Bot size={14} className="text-primary" />
                  </div>
                  {agent.name}
                </div>
                {agent.warnings > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-md border border-danger/20">
                    <AlertTriangle size={10} />
                    {agent.warnings}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                  <span className="text-charcoal/50">{t("trust_score")}</span>
                  <span className={agent.trustScore < 50 ? "text-danger" : "text-success"}>
                    {agent.trustScore}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${agent.trustScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${getTrustColor(agent.trustScore)} shadow-sm ${getTrustGlow(agent.trustScore)}`}
                  />
                </div>
              </div>

              <AnimatePresence>
                {expandedAgentId === agent.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: "0.75rem" }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-accent/10 pt-3 flex flex-col gap-2 text-[11px] font-mono text-charcoal/60">
                      <div className="flex items-start gap-2">
                        <Key size={12} className="text-accent/50 mt-0.5 shrink-0" />
                        <span className="break-all"><strong className="text-accent/80">ACCESS:</strong> {agent.details.permissions}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          <GitCommit size={12} className="text-accent/50 shrink-0" />
                          <span><strong className="text-accent/80">VER:</strong> {agent.details.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity size={12} className="text-accent/50 shrink-0" />
                          <span className="text-right"><strong className="text-accent/80">LST_ACT:</strong> {agent.details.last_active}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap Cell Detail Modal */}
      <AnimatePresence>
        {selectedCell && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-surface/95 backdrop-blur-xl z-20 p-4 flex flex-col rounded-xl border border-accent/15"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-white/80">
                {t("decision_detail")}
              </h3>
              <button onClick={() => setSelectedCell(null)} className="hover:bg-white/10 p-1 rounded-md text-charcoal/50 hover:text-charcoal">
                <X size={16} />
              </button>
            </div>

            <div className={`p-3 rounded-lg border mb-3 ${selectedCell.decision === "BLOCK" ? "bg-danger/10 border-danger/20 border-l-2 border-l-danger" :
                selectedCell.decision === "APPROVE" ? "bg-success/10 border-success/20 border-l-2 border-l-success" :
                  "bg-warning/10 border-warning/20 border-l-2 border-l-warning"
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-white/90">{selectedCell.decision}</span>
                <span className="text-[10px] text-charcoal/40">{new Date(selectedCell.evaluated_at || (selectedCell as any).created_at || Date.now()).toLocaleTimeString()}</span>
              </div>
              <div className="text-xs mb-1 text-charcoal/70">
                <strong className="text-white/80">{selectedCell.agent_name}</strong> → {selectedCell.action_type?.toUpperCase()} ₹{selectedCell.amount?.toLocaleString()}
              </div>
              <div className="text-xs text-charcoal/50">
                Customer: <strong className="text-charcoal/70">{selectedCell.customer_id}</strong>
              </div>
              <div className="text-xs mt-1 text-charcoal/50">
                Risk Score: <strong className={selectedCell.risk_score > 50 ? "text-danger" : "text-success"}>{selectedCell.risk_score?.toFixed(1)}</strong>/100
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="text-xs font-semibold text-primary mb-1 uppercase">Plain English:</div>
              <p className="text-xs text-charcoal/70 leading-relaxed mb-3">
                {selectedCell.simple_explanation || selectedCell.reasoning}
              </p>

              {selectedCell.rule_violations?.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-danger mb-1">Rule Violations:</div>
                  {selectedCell.rule_violations.map((v, i) => (
                    <div key={i} className="text-xs text-charcoal/60">• {v.message}</div>
                  ))}
                </div>
              )}
              {selectedCell.memory_warnings?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-warning mb-1">Memory Warnings:</div>
                  {selectedCell.memory_warnings.map((v, i) => (
                    <div key={i} className="text-xs text-charcoal/60">• {v.message}</div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metric Explanation Modal */}
      <AnimatePresence>
        {explainingMetric && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-surface/95 backdrop-blur-xl z-30 p-5 flex flex-col rounded-xl border border-accent/15"
          >
            <div className="flex items-center justify-between mb-4 border-b border-accent/15 pb-2">
              <h3 className="font-black text-base uppercase flex items-center gap-2 text-white/90">
                <Info size={16} className="text-accent" />
                {explainingMetric === "block_rate" && t("block_rate")}
                {explainingMetric === "avg_risk" && t("avg_risk")}
                {explainingMetric === "governed" && t("governed")}
                {explainingMetric === "roi" && t("roi")}
              </h3>
              <button onClick={() => setExplainingMetric(null)} className="hover:bg-white/10 p-1 rounded-md text-charcoal/50">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {explainingMetric === "block_rate" && (
                <div className="space-y-3 font-mono text-xs text-charcoal/70">
                  <p className="font-bold text-charcoal/90">Calculation:</p>
                  <p className="bg-white/5 p-2 border border-white/10 rounded-md italic">
                    (Total Blocked Actions / Total Governed Actions) * 100
                  </p>
                  <p className="font-bold text-charcoal/90 mt-4">Why it matters:</p>
                  <p>
                    Indicates how aggressive the system is currently being. A sudden spike might mean an active threat campaign or rules being too restrictive.
                  </p>
                </div>
              )}

              {explainingMetric === "avg_risk" && (
                <div className="space-y-3 font-mono text-xs text-charcoal/70">
                  <p className="font-bold text-charcoal/90">Calculation:</p>
                  <p className="bg-white/5 p-2 border border-white/10 rounded-md italic">
                    Sum(Action Risk Scores) / Total Governed Actions
                  </p>
                  <p className="font-bold text-charcoal/90 mt-4">Why it matters:</p>
                  <p>
                    Tracks the average baseline danger of agent activities. A value below 20 indicates normal operation. Anything approaching 50+ means agents are attempting high-risk operations regularly.
                  </p>
                </div>
              )}

              {explainingMetric === "governed" && (
                <div className="space-y-3 font-mono text-xs text-charcoal/70">
                  <p className="font-bold text-charcoal/90">Calculation:</p>
                  <p className="bg-white/5 p-2 border border-white/10 rounded-md italic">
                    Count(All intercepted API requests)
                  </p>
                  <p className="font-bold text-charcoal/90 mt-4">Why it matters:</p>
                  <p>
                    Shows the sheer volume of AI-driven actions that KAIZEN has audited in real-time. This confirms the interceptor is successfully placed between your agents and your external tools.
                  </p>
                </div>
              )}

              {explainingMetric === "roi" && (
                <div className="space-y-3 font-mono text-xs text-charcoal/70">
                  <p className="font-bold text-charcoal/90">Calculation:</p>
                  <p className="bg-success/10 p-2 border border-success/20 rounded-md mt-1">
                    <span className="font-bold">Damage Prevented:</span> Sum of financial value from all BLOCKED malicious intents.
                  </p>
                  <p className="bg-white/5 p-2 border border-white/10 rounded-md">
                    <span className="font-bold">Governance Cost:</span> Baseline Infra Cost + (₹45.0 * Total Governed Actions)
                  </p>
                  <p className="bg-white/5 p-2 border border-white/10 rounded-md font-bold text-center mt-2">
                    ROI = Damage Prevented / Governance Cost
                  </p>
                  <p className="font-bold text-charcoal/90 mt-4">Why it matters:</p>
                  <p>
                    Proves that spending computational power to audit AI actions pays for itself by preventing catastrophic financial loss from hallucinating or compromised agents.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-accent/15">
              <button
                onClick={() => setExplainingMetric(null)}
                className="w-full kaizen-button bg-gradient-to-r from-accent/80 to-accent/60 text-background py-2 font-bold text-sm rounded-lg"
              >
                GOT IT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
