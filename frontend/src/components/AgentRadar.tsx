import { useState } from "react";
import { Bot, AlertTriangle, Key, Activity, GitCommit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../i18n/useTranslation";

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

export function AgentRadar() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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

  return (
    <div className="netra-card p-5 flex flex-col h-full relative overflow-hidden">
      {/* Decorative kanji */}
      <span className="kanji-watermark right-2 bottom-2 text-[5rem] opacity-[0.02]">監</span>

      <h2 className="text-lg font-bold pb-3 mb-4 flex items-center justify-between border-b border-accent/15 relative z-10">
        <span className="flex items-center gap-2">
          {t("agent_radar")}
          <span className="text-[10px] text-charcoal/30 font-normal">エージェント</span>
        </span>
        <span className="netra-badge bg-primary/15 text-primary border-primary/30">{MOCK_AGENTS.length} {t("active")}</span>
      </h2>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 relative z-10">
        {MOCK_AGENTS.map((agent) => (
          <div
            key={agent.id}
            onClick={() => toggleExpand(agent.id)}
            className={`p-3 rounded-lg border border-accent/10 bg-surface/60 backdrop-blur-sm cursor-pointer
              hover:border-accent/25 hover:bg-surface-elevated/80 transition-all duration-300
              ${expandedId === agent.id ? "border-accent/30 bg-surface-elevated/80" : ""}`}
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
              {expandedId === agent.id && (
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
    </div>
  );
}
