import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Database, Fingerprint, ShieldAlert, BadgeDollarSign } from "lucide-react";
import type { MemoryInsight } from "../types";
import { useTranslation } from "../i18n/useTranslation";
import { API_BASE_URL } from "../config";

export function MemoryExplorer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState("");
  const [insight, setInsight] = useState<MemoryInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async (idToSearch: string) => {
    if (!idToSearch.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/memory-insights?customer_id=${idToSearch}`);
      if (response.ok) {
        const data = await response.json();
        setInsight(data);
      } else {
        setInsight(null);
      }
    } catch (error) {
      console.error("Failed to fetch memory insight:", error);
      setInsight(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="fixed top-0 right-0 bottom-0 w-[450px] bg-surface border-l border-accent/15 z-[9999] shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-surface-elevated to-surface flex items-center justify-between border-b border-accent/15">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
              <Database size={20} className="text-accent" />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-wider text-white/90">{t("memory_vault")}</h2>
              <span className="text-[10px] text-charcoal/30">記憶保管庫</span>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-lg text-charcoal/50 hover:text-danger transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto font-mono text-sm space-y-6">
          <div className="space-y-2">
            <label className="block font-semibold text-charcoal/50 text-xs">CUSTOMER ID LOOKUP</label>
            <div className="flex gap-1">
                <input
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="e.g. cust_789"
                  className="netra-input flex-1 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && fetchInsight(customerId)}
                />
                <button onClick={() => fetchInsight(customerId)} className="netra-button bg-gradient-to-r from-primary to-primary/70 text-white p-3 flex items-center justify-center rounded-lg">
                  <Search size={18} />
                </button>
            </div>
          </div>

          {loading && <div className="text-center p-10 uppercase tracking-[0.3em] text-primary/60 animate-pulse text-xs">Scanning Vector DB...</div>}

          {!loading && insight && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="rounded-xl border border-accent/15 p-4 bg-surface-elevated/50">
                <div className="flex items-center gap-2 border-b border-accent/10 pb-2 mb-3">
                  <Fingerprint className="text-primary" size={18} />
                  <span className="font-bold text-base text-white/90">{insight.customer_id}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="flex flex-col bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
                    <span className="text-charcoal/30 text-[10px] font-semibold uppercase">Total Actions</span>
                    <span className="text-xl font-black text-white/80">{insight.total_past_actions}</span>
                  </div>
                  <div className="flex flex-col bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
                    <span className="text-charcoal/30 text-[10px] font-semibold uppercase">Fraud Incidents</span>
                    <span className="text-xl font-black text-danger">{insight.fraud_incidents}</span>
                  </div>
                  <div className="flex flex-col bg-white/[0.03] p-2.5 rounded-lg border border-white/5 col-span-2">
                    <span className="flex items-center justify-center gap-1 text-charcoal/30 text-[10px] font-semibold uppercase">
                      <BadgeDollarSign size={12} /> Total Loss Hist.
                    </span>
                    <span className="text-xl font-black text-warning">₹{insight.total_loss}</span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg border flex items-center justify-between"
                  style={{
                    backgroundColor: 
                      insight.risk_elevation === 'CRITICAL' ? 'rgba(217,64,64,0.1)' : 
                      insight.risk_elevation === 'HIGH' ? 'rgba(230,169,35,0.1)' : 
                      insight.risk_elevation === 'MEDIUM' ? 'rgba(232,160,191,0.1)' : 'rgba(126,200,160,0.1)',
                    borderColor:
                      insight.risk_elevation === 'CRITICAL' ? 'rgba(217,64,64,0.25)' : 
                      insight.risk_elevation === 'HIGH' ? 'rgba(230,169,35,0.25)' : 
                      'rgba(255,255,255,0.1)'
                  }}
                >
                  <span className="font-semibold flex items-center gap-2 text-xs text-white/80">
                    <ShieldAlert size={14} className={insight.risk_elevation === 'CRITICAL' ? 'text-danger' : 'text-warning'}/>
                    RISK ELEVATION
                  </span>
                  <span className={`px-2 py-0.5 font-bold uppercase text-[10px] rounded-md border
                    ${insight.risk_elevation === 'CRITICAL' ? 'bg-danger/20 text-danger border-danger/30' : 
                      insight.risk_elevation === 'HIGH' ? 'bg-warning/20 text-warning border-warning/30' : 'bg-success/20 text-success border-success/30'}`}>
                    {insight.risk_elevation}
                  </span>
                </div>
              </div>

              {insight.recent_actions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 uppercase text-xs border-b border-accent/10 pb-1 text-charcoal/50">Retrieved Context</h3>
                  <div className="space-y-2">
                    {insight.recent_actions.map((act, i) => (
                      <div key={i} className="text-[11px] bg-white/[0.03] border border-white/5 p-2.5 rounded-lg border-l-2 border-l-primary/40 flex flex-col gap-1 break-words">
                        <div className="font-semibold border-b border-white/5 pb-1 flex justify-between">
                          <span className="uppercase text-primary/80">{act.action_type || "action"}</span>
                          <span className="text-charcoal/25">{act.timestamp ? new Date(act.timestamp).toLocaleString() : ""}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-charcoal/50">Amount: ₹{act.amount}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${act.outcome === 'success' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                            {act.outcome}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {!loading && !insight && (
            <div className="mt-6">
              <div className="text-center p-6 text-charcoal/30 border-b border-white/5 mb-6">
                <Database size={40} className="mx-auto mb-4 opacity-30 text-accent" />
                <p className="uppercase font-semibold tracking-[0.2em] text-charcoal/40 text-xs">Search to query the vector database</p>
              </div>
              
              <h3 className="font-semibold mb-3 uppercase tracking-wider text-charcoal/30 text-xs">Suggested Queries</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    setCustomerId("cust_789");
                    fetchInsight("cust_789");
                  }}
                  className="w-full text-left netra-btn p-3 flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-sm group-hover:text-primary transition-colors text-white/80">cust_789</div>
                    <div className="text-[10px] text-charcoal/30">High-risk profile with recent refunds</div>
                  </div>
                  <Search size={14} className="text-charcoal/20 group-hover:text-primary" />
                </button>

                <button 
                  onClick={() => {
                    setCustomerId("cust_123");
                    fetchInsight("cust_123");
                  }}
                  className="w-full text-left netra-btn p-3 flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-sm group-hover:text-primary transition-colors text-white/80">cust_123</div>
                    <div className="text-[10px] text-charcoal/30">Standard profile, normal activity</div>
                  </div>
                  <Search size={14} className="text-charcoal/20 group-hover:text-primary" />
                </button>

                <button 
                  onClick={() => {
                    setCustomerId("cust_456");
                    fetchInsight("cust_456");
                  }}
                  className="w-full text-left netra-btn p-3 flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-sm group-hover:text-danger transition-colors text-white/80">cust_456</div>
                    <div className="text-[10px] text-danger/50">Known fraudulent actor with multiple violations</div>
                  </div>
                  <Search size={14} className="text-charcoal/20 group-hover:text-danger" />
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
