import { useState } from "react";
import { type GovernanceDecision } from "../types";
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Eye, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../i18n/useTranslation";

interface DecisionTimelineProps {
  logs: GovernanceDecision[];
}

export function DecisionTimeline({ logs }: DecisionTimelineProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedViewMode, setExpandedViewMode] = useState<"simple" | "technical">("simple");
  const [showAll, setShowAll] = useState(false);

  const displayedLogs = showAll ? logs : logs.slice(0, 6);

  const getIcon = (decision: string) => {
    switch (decision) {
      case "APPROVE": return <CheckCircle size={14} className="text-success" />;
      case "BLOCK": return <XCircle size={14} className="text-danger" />;
      case "ESCALATE": return <AlertTriangle size={14} className="text-warning" />;
      default: return <Clock size={14} className="text-charcoal/30" />;
    }
  };

  const getStyle = (decision: string) => {
    switch (decision) {
      case "APPROVE": return "border-l-success/60 bg-success/5";
      case "BLOCK": return "border-l-danger/60 bg-danger/5";
      case "ESCALATE": return "border-l-warning/60 bg-warning/5";
      default: return "border-l-charcoal/20";
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setExpandedViewMode("simple");
  };

  return (
    <div className="netra-card p-4 h-full flex flex-col">
      <h2 className="text-base font-bold pb-2 mb-3 border-b border-accent/15 flex items-center gap-2">
        {t("decision_log")}
        <span className="text-[10px] text-charcoal/30 font-normal">監査</span>
      </h2>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {displayedLogs.map((log) => (
          <div key={log.action_id}>
            <div
              onClick={() => toggleExpand(log.action_id)}
              className={`border border-white/5 border-l-2 p-3 flex items-start justify-between font-mono text-xs rounded-lg cursor-pointer 
                hover:bg-white/[0.03] hover:border-white/10 transition-all ${getStyle(log.decision)}`}
            >
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  {getIcon(log.decision)}
                  <span className="font-bold text-white/80">
                    {log.decision === "APPROVE" ? t("approved") : log.decision === "BLOCK" ? t("blocked") : log.decision === "ESCALATE" ? t("escalated") : log.decision}
                  </span>
                  <span className="text-charcoal/30 text-[10px]">
                    {new Date(log.evaluated_at || (log as any).created_at || Date.now()).toLocaleTimeString()}
                  </span>
                  <span className="bg-white/10 text-charcoal/60 px-1.5 py-0.5 ml-1 text-[10px] rounded-md">
                    {log.agent_name}
                  </span>
                </div>
                <div className="text-charcoal/50 font-sans text-xs">
                  Requested <span className="font-semibold text-charcoal/70">{log.action_type?.toUpperCase()}</span> (₹{log.amount?.toLocaleString()}) for {log.customer_id}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] font-semibold font-sans text-charcoal/30">{t("risk")}</div>
                  <div className={`font-bold ${log.risk_score > 50 ? 'text-danger' : 'text-charcoal/60'}`}>
                    {log.risk_score?.toFixed(1)}
                  </div>
                </div>
                {expandedId === log.action_id ? <ChevronUp size={14} className="text-charcoal/30" /> : <ChevronDown size={14} className="text-charcoal/30" />}
              </div>
            </div>

            {/* Expanded Detail */}
            <AnimatePresence>
              {expandedId === log.action_id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border border-white/5 border-t-0 p-4 bg-surface-elevated/50 rounded-b-lg">
                    {/* Simple/Technical Toggle */}
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedViewMode("simple"); }}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${expandedViewMode === "simple" ? "bg-primary/20 text-primary border-primary/30" : "bg-transparent border-white/10 text-charcoal/40"
                          }`}
                      >
                        <Eye size={10} /> {t("simple")}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedViewMode("technical"); }}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${expandedViewMode === "technical" ? "bg-surface text-success border-success/30" : "bg-transparent border-white/10 text-charcoal/40"
                          }`}
                      >
                        <Code size={10} /> {t("technical")}
                      </button>
                    </div>

                    {expandedViewMode === "simple" ? (
                      <div className="text-xs text-charcoal/60 leading-relaxed">
                        {log.simple_explanation || log.reasoning}
                      </div>
                    ) : (
                      <div className="font-mono text-[11px] space-y-1 bg-[#0A0E14] text-charcoal/70 p-3 rounded-lg border border-white/5">
                        <div><span className="text-charcoal/30">ACTION_ID:</span> {log.action_id}</div>
                        <div><span className="text-charcoal/30">RISK_SCORE:</span> {log.risk_score?.toFixed(2)}</div>
                        <div><span className="text-charcoal/30">ANOMALY_SCORE:</span> {log.anomaly_score?.toFixed(2)}</div>
                        <div><span className="text-charcoal/30">REASONING:</span> {log.reasoning}</div>
                        {log.rule_violations?.length > 0 && (
                          <div className="text-danger mt-1">
                            <div className="font-bold">VIOLATIONS:</div>
                            {log.rule_violations.map((v, i) => (
                              <div key={i}>  ! {v.rule}: {v.message} [{v.severity}]</div>
                            ))}
                          </div>
                        )}
                        {log.memory_warnings?.length > 0 && (
                          <div className="text-warning mt-1">
                            <div className="font-bold">MEMORY_WARNINGS:</div>
                            {log.memory_warnings.map((v, i) => (
                              <div key={i}>  * {v.type}: {v.message}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center text-charcoal/30 font-mono py-4 text-sm">Waiting for agent actions...</div>
        )}
      </div>
      {logs.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full py-2.5 border border-dashed border-accent/20 hover:border-accent/50 hover:bg-accent/5 text-accent rounded-lg text-[10px] font-bold tracking-widest font-mono uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          {showAll ? (
            <>
              {t("show_less") || "SHOW LESS"} <ChevronUp size={12} />
            </>
          ) : (
            <>
              {t("see_more") || "SEE MORE"} ({logs.length - 6} MORE) <ChevronDown size={12} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
