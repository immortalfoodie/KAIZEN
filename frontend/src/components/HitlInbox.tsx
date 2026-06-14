import { useMemo } from "react";
import { motion } from "framer-motion";
import { Inbox, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { GovernanceDecision } from "../types";
import { useTranslation } from "../i18n/useTranslation";

export function HitlInbox({ 
  logs, 
  resolvedIds, 
  onResolve, 
  onClose 
}: { 
  logs: GovernanceDecision[], 
  resolvedIds: Set<string>,
  onResolve: (id: string) => void,
  onClose: () => void 
}) {
  const { t } = useTranslation();
  const escalations = useMemo(() => logs.filter(l => l.decision === "ESCALATE"), [logs]);
  const activeEscalations = escalations.filter(e => !resolvedIds.has(e.action_id));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-accent/15 shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden max-h-[85vh] rounded-xl"
      >
        {/* Warning amber header */}
        <div className="bg-gradient-to-r from-warning/90 to-warning/70 text-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Inbox size={24} />
            <h2 className="font-black text-xl tracking-wider uppercase">{t("queue") || "Supervisory Review Queue"}</h2>
            <span className="text-[10px] text-background/50 font-normal ml-1">審査キュー</span>
            {activeEscalations.length > 0 && (
              <span className="bg-danger text-white px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ml-2">
                {activeEscalations.length} PENDING
              </span>
            )}
          </div>
          <button onClick={onClose} className="kaizen-button bg-background/20 hover:bg-background/30 text-background px-3 py-1 text-xs font-bold rounded-lg">CLOSE</button>
        </div>

        <div className="p-6 overflow-y-auto bg-surface-elevated/50 flex-1 space-y-4">
          {activeEscalations.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle size={56} className="mx-auto mb-4 text-success/30" />
              <h3 className="text-lg font-bold font-mono text-charcoal/30">QUEUE IS EMPTY</h3>
              <p className="text-xs font-mono text-charcoal/20 mt-2">All agent escalations have been resolved.</p>
            </div>
          ) : (
            activeEscalations.map((esc) => (
              <div key={esc.action_id} className="bg-surface border border-white/5 p-4 rounded-xl flex flex-col font-mono text-sm relative">
                <div className="absolute top-0 right-0 bg-warning/20 text-warning font-semibold px-2.5 py-0.5 rounded-bl-lg text-[10px]">
                  AWAITING REVIEW
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-danger/10 border border-danger/20 p-3 rounded-xl mt-1">
                    <AlertTriangle size={22} className="text-danger" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-base mb-1 text-white/90">{esc.agent_name}</h4>
                    <div className="mb-2">
                      <span className="bg-white/5 px-2 py-0.5 border border-white/10 font-semibold rounded-md text-xs text-charcoal/60">
                        ACTION: {esc.action_type} - ₹{esc.amount}
                      </span>
                    </div>
                    <div className="text-charcoal/40 mb-3 break-words bg-white/[0.03] p-3 border border-white/5 rounded-lg border-l-2 border-l-warning/40 text-xs">
                      <strong className="text-charcoal/60">AI REASONING:</strong> {esc.reasoning}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                      <button 
                        onClick={() => onResolve(esc.action_id)}
                        className="kaizen-button bg-gradient-to-r from-success to-success/70 text-white flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs"
                      >
                        <CheckCircle size={16} /> APPROVE ACTION
                      </button>
                      <button 
                        onClick={() => onResolve(esc.action_id)}
                        className="kaizen-button bg-gradient-to-r from-danger to-danger/70 text-white flex-[0.5] py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs"
                      >
                        <XCircle size={16} /> REJECT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
