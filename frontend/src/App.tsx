import { useEffect, useState } from "react";
import { Sidebar } from "./components/GlobalHeader";
import { API_BASE_URL } from "./config";
import { DecisionPipeline } from "./components/DecisionPipeline";
import { RiskMetrics } from "./components/RiskMetrics";
import { DecisionTimeline } from "./components/DecisionTimeline";
import { RogueAgentSimulator } from "./components/RogueAgentSimulator";
import { MemoryExplorer } from "./components/MemoryExplorer";
import { HitlInbox } from "./components/HitlInbox";
import { type GovernanceDecision, type GovernanceMetrics } from "./types";
import { narrateDecision } from "./lib/narrator";
import "./App.css";

function HudPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full w-full group">
      {/* L-shaped corner frames */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent/40 rounded-tl-sm pointer-events-none group-hover:border-accent/80 transition-colors duration-300 z-20" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent/40 rounded-tr-sm pointer-events-none group-hover:border-accent/80 transition-colors duration-300 z-20" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent/40 rounded-bl-sm pointer-events-none group-hover:border-accent/80 transition-colors duration-300 z-20" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent/40 rounded-br-sm pointer-events-none group-hover:border-accent/80 transition-colors duration-300 z-20" />
      {children}
    </div>
  );
}

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [resolvedInboxIds, setResolvedInboxIds] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState<GovernanceMetrics | null>(null);
  const [logs, setLogs] = useState<GovernanceDecision[]>([]);
  const [currentDecision, setCurrentDecision] = useState<GovernanceDecision | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [topHeight, setTopHeight] = useState(380);
  const [bottomLeftWidth, setBottomLeftWidth] = useState(58.33); // in percent (7/12 * 100)
  const [isXl, setIsXl] = useState(window.innerWidth >= 1280);

  useEffect(() => {
    const handleResize = () => {
      setIsXl(window.innerWidth >= 1280);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startHorizontalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = topHeight;

    const doDrag = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
      setTopHeight(newHeight);
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const startVerticalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startWidthPercent = bottomLeftWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerRect.width) * 100;
      const newWidth = Math.max(25, Math.min(75, startWidthPercent + deltaPercent));
      setBottomLeftWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const pendingEscalationsCount = logs.filter(l => l.decision === "ESCALATE" && !resolvedInboxIds.has(l.action_id)).length;

  // Clear the current decision after 15 seconds of inactivity
  useEffect(() => {
    if (currentDecision) {
      const timer = setTimeout(() => {
        setCurrentDecision(null);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [currentDecision]);

  // Initial Data Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const metricsRes = await fetch(`${API_BASE_URL}/api/v1/governance-metrics`);
        if (metricsRes.ok) setMetrics(await metricsRes.json());

        const logsRes = await fetch(`${API_BASE_URL}/api/v1/audit-log?limit=20`);
        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.items);
        }

      } catch (err) {
        console.error("Failed to fetch initial data", err);
      }
    };
    fetchInitialData();

    // Preload speech synthesis voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // SSE Subscription for real-time events
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/v1/events/stream`);

    eventSource.addEventListener("connected", (e) => {
      console.log("SSE Connected:", e.data);
    });

    eventSource.addEventListener("decision", (e) => {
      const payload = JSON.parse(e.data);
      console.log("SSE Decision payload:", payload);

      const newDecision: GovernanceDecision = payload.data;

      // Update central pipeline animation
      setCurrentDecision(newDecision);

      // Prepend to logs
      setLogs((prevLogs) => [newDecision, ...prevLogs].slice(0, 50));

      // Voice narration for BLOCK/ESCALATE
      narrateDecision(newDecision);

      // Optimistically update metrics
      setMetrics((prev) => {
        if (!prev) return prev;
        const total = prev.total_decisions + 1;
        const blocked = prev.blocked + (newDecision.decision === "BLOCK" ? 1 : 0);
        const approved = prev.approved + (newDecision.decision === "APPROVE" ? 1 : 0);
        const escalated = prev.escalated + (newDecision.decision === "ESCALATE" ? 1 : 0);

        return {
          ...prev,
          total_decisions: total,
          blocked,
          approved,
          escalated,
          block_rate: ((blocked / total) * 100).toFixed(1) + "%",
          avg_risk_score: prev.avg_risk_score
        };
      });
    });

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans relative overflow-x-hidden bg-radial from-[#0c1224] via-[#050810] to-[#020408] text-charcoal">
      {/* Floating sakura particles */}
      <div className="sakura-particle" />
      <div className="sakura-particle" />
      <div className="sakura-particle" />
      <div className="sakura-particle" />
      <div className="sakura-particle" />
      <div className="sakura-particle" />

      <Sidebar
        onDemoTrigger={() => setShowDemo(true)}
        onMemoryTrigger={() => setShowMemory(!showMemory)}
        onInboxTrigger={() => setShowInbox(true)}
        pendingEscalationsCount={pendingEscalationsCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Pane */}
      <main className="flex-1 p-4 xl:p-6 flex flex-col h-screen overflow-y-auto z-10">
        {/* Top Section - Live Decision Pipeline (Full width) */}
        <div style={{ height: `${topHeight}px` }} className="shrink-0">
          <HudPanel>
            <DecisionPipeline currentDecision={currentDecision} />
          </HudPanel>
        </div>

        {/* Horizontal Gutter */}
        <div
          onMouseDown={startHorizontalResize}
          className="group h-6 flex items-center justify-center cursor-row-resize relative select-none shrink-0"
        >
          <div className="w-full h-[1px] bg-accent/15 group-hover:bg-accent/40 group-hover:shadow-[0_0_8px_rgba(212,168,83,0.5)] transition-all duration-300" />
          <div className="absolute w-12 h-1.5 rounded-full bg-white/10 border border-white/5 group-hover:bg-accent group-hover:border-accent/50 transition-all duration-300" />
        </div>

        {/* Bottom Section - 2 Column Split (Timeline & Metrics/Agents) */}
        <div className="flex-grow flex flex-col xl:flex-row gap-6 xl:gap-0 items-stretch min-h-[400px] pb-4">
          {/* Left Side: Timeline / Audit trail */}
          <div style={{ width: isXl ? `${bottomLeftWidth}%` : "100%" }} className="h-full relative">
            <HudPanel>
              <DecisionTimeline logs={logs} />
            </HudPanel>
          </div>

          {/* Vertical Gutter */}
          <div
            onMouseDown={startVerticalResize}
            className="hidden xl:flex group w-6 h-full items-center justify-center cursor-col-resize relative select-none shrink-0"
          >
            <div className="h-full w-[1px] bg-accent/15 group-hover:bg-accent/40 group-hover:shadow-[0_0_8px_rgba(212,168,83,0.5)] transition-all duration-300" />
            <div className="absolute h-12 w-1.5 rounded-full bg-white/10 border border-white/5 group-hover:bg-accent group-hover:border-accent/50 transition-all duration-300" />
          </div>

          {/* Right Side: Risk Metrics & Agent Tabs */}
          <div style={{ width: isXl ? `${100 - bottomLeftWidth}%` : "100%" }} className="h-full relative">
            <HudPanel>
              <RiskMetrics metrics={metrics} recentLogs={logs} />
            </HudPanel>
          </div>
        </div>
      </main>

      {showDemo && <RogueAgentSimulator onClose={() => setShowDemo(false)} />}

      {showMemory && <MemoryExplorer onClose={() => setShowMemory(false)} />}

      {showInbox && (
        <HitlInbox
          logs={logs}
          resolvedIds={resolvedInboxIds}
          onResolve={(id) => setResolvedInboxIds(prev => new Set(prev).add(id))}
          onClose={() => setShowInbox(false)}
        />
      )}
    </div>
  );
}

export default App;
