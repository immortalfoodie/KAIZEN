import { useState } from "react";
import { ShieldAlert, Database, Inbox, FileText, Volume2, VolumeX, Globe, ChevronDown, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation, setLanguage, getLanguage, LANGUAGE_NAMES, type Language } from "../i18n/useTranslation";
import { isNarratorEnabled, setNarratorEnabled } from "../lib/narrator";
import { API_BASE_URL } from "../config";

interface SidebarProps {
  onDemoTrigger: () => void;
  onMemoryTrigger: () => void;
  onInboxTrigger: () => void;
  pendingEscalationsCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  onDemoTrigger,
  onMemoryTrigger,
  onInboxTrigger,
  pendingEscalationsCount,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useTranslation();
  const [voiceOn, setVoiceOn] = useState(isNarratorEnabled());
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleVoice = () => {
    const newState = !voiceOn;
    setVoiceOn(newState);
    setNarratorEnabled(newState);
  };

  const downloadCIOBrief = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/cio-brief`);
      if (!response.ok) throw new Error("Failed to generate brief");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kaizen_brief_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("CIO Brief download failed:", e);
    }
  };

  return (
    <>
      {/* Mobile Top Header (hidden on desktop) */}
      <header className="lg:hidden w-full bg-surface-elevated/80 border-b border-accent/15 px-4 py-3 flex items-center justify-between shrink-0 relative z-30 backdrop-blur-xl">
        <span className="kanji-watermark -left-2 -top-4 text-[4rem]">改善</span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-base font-black tracking-wider text-gradient-gold font-mono">{t("app_name")}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onInboxTrigger}
            className="p-2 text-charcoal hover:text-accent relative"
          >
            <Inbox size={18} className="text-warning" />
            {pendingEscalationsCount > 0 && (
              <span className="absolute top-0 right-0 bg-danger text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {pendingEscalationsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-charcoal hover:text-accent"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[53px] bg-background/95 backdrop-blur-xl z-20 flex flex-col p-6 border-b border-accent/15 gap-4 overflow-y-auto">
          <button
            onClick={() => { onMemoryTrigger(); setMobileMenuOpen(false); }}
            className="kaizen-btn flex items-center gap-3 text-sm px-4 py-3 text-charcoal w-full"
          >
            <Database size={16} className="text-primary" />
            <span>{t("memory_vault")}</span>
          </button>

          <button
            onClick={() => { onInboxTrigger(); setMobileMenuOpen(false); }}
            className="kaizen-btn flex items-center gap-3 text-sm px-4 py-3 text-charcoal w-full relative"
          >
            <Inbox size={16} className="text-warning" />
            <span>{t("queue")}</span>
            {pendingEscalationsCount > 0 && (
              <span className="absolute right-4 bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingEscalationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { downloadCIOBrief(); setMobileMenuOpen(false); }}
            className="kaizen-btn flex items-center gap-3 text-sm px-4 py-3 text-charcoal w-full"
          >
            <FileText size={16} className="text-success" />
            <span>{t("cio_brief")}</span>
          </button>

          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={toggleVoice}
              className={`kaizen-btn flex-1 flex items-center justify-center gap-2 text-xs py-2.5 ${voiceOn ? "border-accent/40 bg-accent/10" : "text-charcoal/50"}`}
            >
              {voiceOn ? <Volume2 size={16} className="text-accent" /> : <VolumeX size={16} />}
              <span>{voiceOn ? t("voice_on") : t("voice_off")}</span>
            </button>

            {/* Language Toggle */}
            <div className="relative flex-1">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="kaizen-btn w-full flex items-center justify-center gap-2 text-xs py-2.5 text-charcoal"
              >
                <Globe size={16} className="text-accent" />
                <span>Lang</span>
                <ChevronDown size={12} />
              </button>
              {langOpen && (
                <div className="absolute right-0 bottom-full mb-2 bg-surface-elevated border border-accent/20 shadow-xl z-[100] rounded-lg overflow-hidden w-full backdrop-blur-xl">
                  {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => { setLanguage(code); setLangOpen(false); setMobileMenuOpen(false); }}
                      className="block w-full text-center py-2.5 text-xs font-semibold text-charcoal hover:bg-accent/10 hover:text-accent transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => { onDemoTrigger(); setMobileMenuOpen(false); }}
            className="kaizen-button bg-gradient-to-r from-danger to-danger/80 text-white w-full py-3 flex items-center justify-center gap-2 text-sm mt-4"
          >
            <ShieldAlert size={16} />
            <span>{t("rogue_demo")}</span>
          </button>
        </div>
      )}

      {/* Desktop Vertical Sidebar (hidden on mobile) */}
      <aside className={`hidden lg:flex bg-surface-elevated/40 border-r border-accent/15 flex-col shrink-0 z-20 backdrop-blur-xl h-screen relative sticky top-0 justify-between transition-all duration-300 ${isCollapsed ? "w-20 px-3 py-4" : "w-64 p-6"}`}>
        {/* Kanji watermark */}
        {!isCollapsed && (
          <span className="kanji-watermark -left-4 -top-6 text-[7rem] opacity-[0.02] select-none pointer-events-none">改善</span>
        )}

        <div className="flex flex-col gap-6 relative z-10 w-full">
          {/* Logo & Header */}
          <div className="flex flex-col relative">
            {!isCollapsed ? (
              <div className="flex flex-col">
                <span className="text-[26px] font-black tracking-[0.08em] text-gradient-gold font-mono mb-0.5">
                  {t("app_name")}
                </span>
                <span className="text-[9px] text-charcoal/40 tracking-[0.1em] uppercase font-semibold">
                  {t("app_subtitle")}
                </span>
              </div>
            ) : (
              <span className="text-[26px] font-black text-gradient-gold font-mono mx-auto">
                K
              </span>
            )}
            {!isCollapsed && (
              <button
                onClick={onToggleCollapse}
                className="absolute top-[34px] right-0 p-1 rounded-md bg-white/5 border border-white/10 hover:border-accent/30 text-charcoal/50 hover:text-accent cursor-pointer transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="mx-auto p-1.5 mt-2 rounded-md bg-white/5 border border-white/10 hover:border-accent/30 text-charcoal/50 hover:text-accent cursor-pointer transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}

          {/* Torii line accent */}
          {!isCollapsed && (
            <div className="w-full h-px bg-gradient-to-r from-accent/30 via-accent/10 to-transparent" />
          )}

          {/* System status HUD */}
          {!isCollapsed && (
            <div className="p-3 rounded-lg bg-surface/60 border border-accent/10 flex flex-col gap-2 text-[10px] font-mono leading-relaxed">
              <div className="flex items-center justify-between">
                <span className="text-charcoal/40">SYSTEM_GOV:</span>
                <span className="text-success flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-charcoal/40">AUDIT_INTERCEPT:</span>
                <span className="text-success font-bold">ONLINE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-charcoal/40">ZEN_PIPS:</span>
                <span className="text-accent font-bold">STABLE</span>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex flex-col gap-2.5">
            <button
              onClick={onMemoryTrigger}
              className={`kaizen-btn flex items-center text-charcoal w-full hover:text-white cursor-pointer hover:border-primary/40 ${isCollapsed ? "justify-center p-3" : "gap-3 text-xs px-3.5 py-3 justify-start"}`}
              title={isCollapsed ? t("memory_vault") : ""}
            >
              <Database size={isCollapsed ? 16 : 14} className="text-primary shrink-0" />
              {!isCollapsed && <span>{t("memory_vault")}</span>}
            </button>

            <button
              onClick={onInboxTrigger}
              className={`kaizen-btn flex items-center text-charcoal w-full hover:text-white relative cursor-pointer hover:border-warning/40 ${isCollapsed ? "justify-center p-3" : "gap-3 text-xs px-3.5 py-3 justify-start"}`}
              title={isCollapsed ? t("queue") : ""}
            >
              <Inbox size={isCollapsed ? 16 : 14} className="text-warning shrink-0" />
              {!isCollapsed && <span>{t("queue")}</span>}
              {pendingEscalationsCount > 0 && (
                <span className={`bg-danger text-white font-bold rounded-full border border-danger/40 ${isCollapsed ? "absolute -top-1 -right-1 text-[8px] px-1.5 py-0.5" : "absolute right-3.5 text-[9px] px-2 py-0.5"}`}>
                  {pendingEscalationsCount}
                </span>
              )}
            </button>

            <button
              onClick={downloadCIOBrief}
              className={`kaizen-btn flex items-center text-charcoal w-full hover:text-white cursor-pointer hover:border-success/40 ${isCollapsed ? "justify-center p-3" : "gap-3 text-xs px-3.5 py-3 justify-start"}`}
              title={isCollapsed ? t("cio_brief") : ""}
            >
              <FileText size={isCollapsed ? 16 : 14} className="text-success shrink-0" />
              {!isCollapsed && <span>{t("cio_brief")}</span>}
            </button>
          </nav>
        </div>

        {/* Footer controls */}
        <div className="flex flex-col gap-4 relative z-10 w-full">
          {/* Divider */}
          {!isCollapsed && (
            <div className="w-full h-px bg-gradient-to-r from-accent/30 via-accent/10 to-transparent" />
          )}

          {/* Voice Mode Toggle */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-charcoal/40">VOICE_NARRATION:</span>
              <button
                onClick={toggleVoice}
                className={`kaizen-btn p-2 rounded-lg cursor-pointer ${voiceOn ? "border-accent/40 bg-accent/15" : "text-charcoal/40"}`}
                title={voiceOn ? t("voice_on") : t("voice_off")}
              >
                {voiceOn ? <Volume2 size={15} className="text-accent" /> : <VolumeX size={15} className="text-charcoal/40" />}
              </button>
            </div>
          ) : (
            <button
              onClick={toggleVoice}
              className={`kaizen-btn p-3 rounded-lg cursor-pointer flex justify-center w-full ${voiceOn ? "border-accent/40 bg-accent/15" : "text-charcoal/40"}`}
              title={voiceOn ? t("voice_on") : t("voice_off")}
            >
              {voiceOn ? <Volume2 size={16} className="text-accent" /> : <VolumeX size={16} className="text-charcoal/40" />}
            </button>
          )}

          {/* Language dropdown */}
          <div className="relative w-full flex justify-center">
            {!isCollapsed ? (
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="kaizen-btn flex items-center justify-between text-xs px-3.5 py-2.5 text-charcoal w-full cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Globe size={14} className="text-accent" />
                  <span>{LANGUAGE_NAMES[getLanguage() as Language] || "Language"}</span>
                </span>
                <ChevronDown size={12} className="text-charcoal/40" />
              </button>
            ) : (
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="kaizen-btn flex items-center justify-center p-3 text-charcoal w-full cursor-pointer"
                title="Language"
              >
                <Globe size={16} className="text-accent" />
              </button>
            )}
            {langOpen && (
              <div className={`absolute bottom-full mb-2 bg-surface-elevated border border-accent/20 shadow-2xl z-[100] rounded-lg overflow-hidden w-40 backdrop-blur-xl ${isCollapsed ? "left-16" : "left-0"}`}>
                {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => { setLanguage(code); setLangOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rogue Agent Demo Trigger */}
          <button
            onClick={onDemoTrigger}
            className={`kaizen-button bg-gradient-to-r from-danger to-danger/80 hover:from-danger hover:to-danger/75 text-white py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-danger/10 border-danger/30 ${isCollapsed ? "p-3 w-full" : "text-xs px-3.5"}`}
            title={isCollapsed ? t("rogue_demo") : ""}
          >
            <ShieldAlert size={isCollapsed ? 16 : 14} />
            {!isCollapsed && <span>{t("rogue_demo")}</span>}
          </button>

          {/* Version banner */}
          {!isCollapsed && (
            <div className="text-center text-[9px] font-mono text-charcoal/30">
              KAIZEN v1.2.0 • CONTINUOUS AI GOVERNANCE
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
