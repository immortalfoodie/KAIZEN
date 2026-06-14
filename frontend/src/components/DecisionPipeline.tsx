import { motion, AnimatePresence } from "framer-motion";
import { type GovernanceDecision } from "../types";
import { Server, Database, BrainCircuit, ActivitySquare, CheckCircle, OctagonAlert, Eye, Code, ChevronRight, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "../i18n/useTranslation";

interface DecisionPipelineProps {
  currentDecision: GovernanceDecision | null;
}

export function DecisionPipeline({ currentDecision }: DecisionPipelineProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"simple" | "technical">("simple");
  const [showTransmitStatus, setShowTransmitStatus] = useState(false);
  const isIdle = !currentDecision;

  const isBlock = currentDecision?.decision === "BLOCK";
  const isApprove = currentDecision?.decision === "APPROVE";
  const isEscalate = currentDecision?.decision === "ESCALATE";

  useEffect(() => {
    if (isBlock || isEscalate) {
      setShowTransmitStatus(true);
      const timer = setTimeout(() => setShowTransmitStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentDecision?.action_id, isBlock, isEscalate]);

  const getNodeColor = (isActive: boolean, hasFailed: boolean = false) => {
    if (hasFailed) return "border-danger/60 bg-danger/10 text-danger shadow-[0_0_20px_rgba(217,64,64,0.3)]";
    if (isActive) return "border-primary/60 bg-primary/10 text-primary shadow-[0_0_20px_rgba(232,160,191,0.3)]";
    return "border-white/10 bg-white/5 text-charcoal/30";
  };

  const ruleCount = currentDecision?.rule_violations?.length ?? 0;
  const memoryCount = currentDecision?.memory_warnings?.length ?? 0;

  const pipelineNodes = [
    {
      icon: ActivitySquare,
      label: "Agent\nIntent",
      sublabel: currentDecision ? `${currentDecision.action_type?.toUpperCase()}` : "",
      isActive: !isIdle,
      hasFailed: false,
      delay: 0,
    },
    {
      icon: Server,
      label: "Rules\nEngine",
      sublabel: currentDecision ? (ruleCount > 0 ? `${ruleCount} violation${ruleCount > 1 ? 's' : ''}` : "✓ Passed") : "",
      isActive: !isIdle,
      hasFailed: ruleCount > 0,
      delay: 0.15,
    },
    {
      icon: Database,
      label: "Memory\nValidator",
      sublabel: currentDecision ? (memoryCount > 0 ? `${memoryCount} warning${memoryCount > 1 ? 's' : ''}` : "✓ Clear") : "",
      isActive: !isIdle,
      hasFailed: memoryCount > 0,
      delay: 0.3,
    },
    {
      icon: BrainCircuit,
      label: "Anomaly\nScorer",
      sublabel: currentDecision ? `Score: ${currentDecision.anomaly_score?.toFixed(0)}%` : "",
      isActive: !isIdle,
      hasFailed: (currentDecision?.anomaly_score ?? 0) > 50,
      delay: 0.45,
    },
  ];

  return (
    <div className="netra-card p-6 flex flex-col h-full relative overflow-hidden">
      {/* Decorative kanji watermark */}
      <span className="kanji-watermark right-4 top-4 text-[7rem] opacity-[0.02]">判</span>

      <div className="flex items-center justify-between pb-3 mb-6 border-b border-accent/15 relative z-10">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {t("live_pipeline")}
          <span className="text-[10px] text-charcoal/30 font-normal">パイプライン</span>
        </h2>
        {currentDecision && (
          <div className="flex rounded-lg overflow-hidden border border-accent/20 text-xs font-semibold">
            <button
              onClick={() => setViewMode("simple")}
              className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${viewMode === "simple" ? "bg-primary/20 text-primary" : "bg-transparent text-charcoal/50 hover:text-charcoal"}`}
            >
              <Eye size={12} /> {t("simple")}
            </button>
            <button
              onClick={() => setViewMode("technical")}
              className={`px-3 py-1.5 flex items-center gap-1 border-l border-accent/20 transition-colors ${viewMode === "technical" ? "bg-surface text-success" : "bg-transparent text-charcoal/50 hover:text-charcoal"}`}
            >
              <Code size={12} /> {t("technical")}
            </button>
          </div>
        )}
      </div>

      {/* Pipeline Nodes */}
      <div className="w-full relative z-10 mb-4 flex-1 flex flex-col justify-center">
        <div className="max-w-3xl mx-auto w-full relative flex items-start justify-between px-2">
          {/* Connecting line */}
          <div className="absolute top-8 left-12 right-24 h-px bg-white/5 z-0" />
          {!isIdle && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className={`absolute top-8 left-12 h-px z-0 ${isBlock ? "bg-gradient-to-r from-danger/80 to-danger/20" : isApprove ? "bg-gradient-to-r from-success/80 to-success/20" : "bg-gradient-to-r from-warning/80 to-warning/20"}`}
              style={{ maxWidth: "calc(100% - 6rem)" }}
            />
          )}

          {pipelineNodes.map((node, i) => (
            <div key={i} className="flex flex-col items-center max-w-[110px] z-10">
              <motion.div
                animate={!isIdle ? {
                  scale: [1, 1.15, 1],
                  transition: { delay: node.delay, duration: 0.4 }
                } : {}}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-500 backdrop-blur-sm ${getNodeColor(node.isActive, node.hasFailed)}`}
              >
                <node.icon size={24} />
              </motion.div>
              <div className="mt-2 text-center font-semibold text-[11px] whitespace-pre-line leading-tight h-8 text-charcoal/60">{node.label}</div>
              {node.sublabel && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: node.delay + 0.3 }}
                  className={`text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-md border ${node.hasFailed ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
                    }`}
                >
                  {node.sublabel}
                </motion.div>
              )}
            </div>
          ))}

          {/* Connector arrow to verdict */}
          {!isIdle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center self-center z-10 mt-1"
            >
              <ChevronRight size={20} className="text-accent/40" />
            </motion.div>
          )}

          {/* Final Verdict Node */}
          <div className="flex flex-col items-center z-10">
            <AnimatePresence mode="wait">
              {!isIdle ? (
                <motion.div
                  key="verdict"
                  initial={{ scale: 0, opacity: 0, rotate: -10 }}
                  animate={{
                    scale: 1, opacity: 1, rotate: 0,
                    x: isBlock ? [-4, 4, -4, 4, 0] : 0
                  }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                  className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-white font-black text-xl ${isBlock ? "bg-danger/90 border-danger/60 shadow-lg shadow-danger/30" :
                      isApprove ? "bg-success/90 border-success/60 shadow-lg shadow-success/30" : "bg-warning/90 border-warning/60 shadow-lg shadow-warning/30"
                    }`}
                >
                  {isBlock ? <OctagonAlert size={32} /> : isApprove ? <CheckCircle size={32} /> : "ESC"}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  className="w-16 h-16 flex items-center justify-center"
                >
                  {/* Ensō (Zen circle) idle animation */}
                  <svg width="64" height="64" viewBox="0 0 200 200">
                    <circle
                      className="enso-circle"
                      cx="100"
                      cy="100"
                      r="90"
                    />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-2 text-center font-bold text-xs uppercase tracking-widest text-charcoal/50">
              {isIdle ? t("waiting") : currentDecision.decision === "BLOCK" ? t("blocked") : currentDecision.decision === "APPROVE" ? t("approved") : t("escalated")}
            </div>

            <AnimatePresence>
              {showTransmitStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-10 flex items-center gap-2 bg-surface-elevated text-charcoal px-3 py-1.5 rounded-lg border border-accent/20 text-[10px] font-semibold z-20 whitespace-nowrap shadow-xl"
                >
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <Share2 size={12} className="animate-bounce text-accent" />
                  TRANSMITTING WHATSAPP ALERT...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Explanation Panel */}
      <AnimatePresence mode="wait">
        {currentDecision && viewMode === "simple" && (
          <motion.div
            key="simple"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`mt-4 p-4 rounded-lg border backdrop-blur-sm ${isBlock ? "bg-danger/5 border-danger/20" : isApprove ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"
              }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Eye size={14} className="text-primary" />
              <span className="font-semibold text-xs text-primary uppercase tracking-wider">{t("plain_english_summary")}</span>
            </div>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              {currentDecision.simple_explanation || currentDecision.reasoning}
            </p>
          </motion.div>
        )}

        {currentDecision && viewMode === "technical" && (
          <motion.div
            key="technical"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mt-4 rounded-lg p-4 bg-[#0A0E14] border border-success/10 font-mono text-xs max-h-52 overflow-y-auto"
          >
            <div className="flex border-b border-white/10 pb-2 mb-2 items-center justify-between font-bold">
              <span className="text-success flex items-center gap-1"><Code size={12} /> FORENSIC_ANALYSIS</span>
              <span className={isBlock ? "text-danger" : isEscalate ? "text-warning" : "text-success"}>
                [{currentDecision.decision}]
              </span>
            </div>
            <div className="space-y-1.5 text-charcoal/70">
              <div><span className="text-charcoal/40">ACTION_ID:</span> {currentDecision.action_id}</div>
              <div><span className="text-charcoal/40">AGENT:</span> {currentDecision.agent_name}</div>
              <div><span className="text-charcoal/40">INTENT:</span> {currentDecision.action_type?.toUpperCase()} — Rs.{currentDecision.amount?.toLocaleString()}</div>
              <div><span className="text-charcoal/40">RISK_SCORE:</span> {currentDecision.risk_score?.toFixed(2)}</div>
              <div><span className="text-charcoal/40">ANOMALY_SCORE:</span> {currentDecision.anomaly_score?.toFixed(2)}</div>

              {ruleCount > 0 && (
                <div className="mt-2 text-danger">
                  <span className="font-bold border-b border-danger/30 inline-block mb-1">VIOLATIONS ({ruleCount}):</span>
                  {currentDecision.rule_violations.map((v, i) => (
                    <div key={i}>! {v.message} <span className="text-charcoal/30">({v.rule})</span></div>
                  ))}
                </div>
              )}

              {memoryCount > 0 && (
                <div className="mt-2 text-warning">
                  <span className="font-bold border-b border-warning/30 inline-block mb-1">MEMORY_WARNINGS ({memoryCount}):</span>
                  {currentDecision.memory_warnings.map((v, i) => (
                    <div key={i}>* {v.message}</div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle state — Zen monitoring */}
      {isIdle && (
        <div className="flex-1 flex items-center justify-center relative">
          {/* Zen Ripple Concentric Circles */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer pulse circle 3 */}
            <motion.div
              animate={{
                scale: [0.6, 1.4],
                opacity: [0.6, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeOut",
                delay: 2
              }}
              className="absolute w-full h-full rounded-full border border-accent/10"
            />
            {/* Middle pulse circle 2 */}
            <motion.div
              animate={{
                scale: [0.6, 1.4],
                opacity: [0.8, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeOut",
                delay: 1
              }}
              className="absolute w-3/4 h-3/4 rounded-full border border-accent/15"
            />
            {/* Inner pulse circle 1 */}
            <motion.div
              animate={{
                scale: [0.6, 1.4],
                opacity: [1, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0
              }}
              className="absolute w-1/2 h-1/2 rounded-full border border-accent/25"
            />

            {/* Central Zen Stone/Lotus Motif */}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 10px rgba(212, 168, 83, 0.15)",
                  "0 0 20px rgba(212, 168, 83, 0.35)",
                  "0 0 10px rgba(212, 168, 83, 0.15)"
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative w-14 h-14 rounded-full bg-surface-elevated border-2 border-accent/50 flex items-center justify-center z-10"
            >
              {/* Beautiful custom gold lotus outline SVG */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent">
                {/* Lotus petal paths */}
                <path d="M12 2C12 2 9 7 9 11C9 14 10.5 17 12 19C13.5 17 15 14 15 11C15 7 12 2 12 2Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 8C12 8 6 10 5 14C4 18 8 20 12 21C16 20 20 18 19 14C18 10 12 8 12 8Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 11C12 11 8.5 13 8 16C7.5 19 10 20.5 12 21C14 20.5 16.5 19 16 16C15.5 13 12 11 12 11Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </div>
          <div className="absolute text-charcoal/30 font-semibold tracking-[0.3em] uppercase text-[10px] mt-52 animate-pulse font-mono">
            {t("monitoring")}
          </div>
        </div>
      )}

      {/* Aesthetic scan line overlay */}
      {!isIdle && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-xl">
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className={`w-full h-24 bg-gradient-to-b from-transparent ${isBlock ? "via-danger/5" : isApprove ? "via-success/5" : "via-warning/5"
              } to-transparent opacity-50`}
          />
        </div>
      )}

      {/* Block ink-drop effect */}
      {isBlock && (
        <motion.div
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 0.15, repeat: 4 }}
          className="absolute inset-0 bg-danger pointer-events-none z-30 rounded-xl"
        />
      )}
    </div>
  );
}
