/**
 * Netra Voice Narrator
 * Uses the browser's free SpeechSynthesis API to announce BLOCK events aloud.
 * Zero dependencies, zero cost.
 */

import { getLanguage } from "../i18n/translations";

let isEnabled = true;
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function setNarratorEnabled(enabled: boolean) {
  isEnabled = enabled;
  if (!enabled && currentUtterance) {
    window.speechSynthesis.cancel();
  }
}

export function isNarratorEnabled() {
  return isEnabled;
}

export function narrateDecision(decision: {
  decision: string;
  agent_name: string;
  action_type: string;
  amount: number;
  customer_id: string;
  risk_score: number;
}) {
  if (!isEnabled || !window.speechSynthesis) return;

  // Only narrate BLOCK and ESCALATE
  if (decision.decision === "APPROVE") return;

  const lang = getLanguage();
  const amountText = formatAmountForSpeech(decision.amount, lang);

  let text = "";
  if (decision.decision === "BLOCK") {
    if (lang === "ja") {
      text = `警告！Netraが${decision.agent_name}による${amountText}の不審な${decision.action_type}をブロックしました。リスクスコアは100点中${Math.round(decision.risk_score)}点です。`;
    } else if (lang === "hi") {
      text = `अलर्ट! Netra ने ${decision.agent_name} द्वारा ${amountText} की संदिग्ध ${decision.action_type} को रोक दिया है। जोखिम स्कोर 100 में से ${Math.round(decision.risk_score)} है।`;
    } else if (lang === "mr") {
      text = `सावधान! Netra ने ${decision.agent_name} द्वारे ${amountText} ची संशयास्पद ${decision.action_type} थांबवली आहे. जोखीम स्कोअर 100 पैकी ${Math.round(decision.risk_score)} आहे.`;
    } else if (lang === "es") {
      text = `¡Alerta! Netra ha bloqueado ${decision.action_type} sospechoso de ${amountText} por ${decision.agent_name}. Puntaje de riesgo: ${Math.round(decision.risk_score)} de 100.`;
    } else {
      text = `Alert! Netra has blocked a suspicious ${decision.action_type} of ${amountText} by ${decision.agent_name}. Risk score: ${Math.round(decision.risk_score)} out of 100. The action has been halted.`;
    }
  } else if (decision.decision === "ESCALATE") {
    if (lang === "ja") {
      text = `警告。Netraが${amountText}の${decision.action_type}を人間のレビューにエスカレーションしました。リスクスコアは${Math.round(decision.risk_score)}点です。`;
    } else if (lang === "hi") {
      text = `चेतावनी! Netra ने मानव समीक्षा के लिए ${amountText} की ${decision.action_type} को एस्केलेट किया है। जोखिम स्कोर ${Math.round(decision.risk_score)} है।`;
    } else if (lang === "mr") {
      text = `चेतावणी! Netra ने मानवी पुनरावलोकनासाठी ${amountText} ची ${decision.action_type} वाढवली आहे. जोखीम स्कोअर ${Math.round(decision.risk_score)} आहे.`;
    } else if (lang === "es") {
      text = `Advertencia. Netra ha reportado ${decision.action_type} de ${amountText} para revisión humana. Puntaje de riesgo: ${Math.round(decision.risk_score)} de 100.`;
    } else {
      text = `Warning. Netra has flagged a ${decision.action_type} of ${amountText} for human review. Risk score: ${Math.round(decision.risk_score)} out of 100.`;
    }
  }

  if (!text) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 0.9;
  utterance.volume = 0.8;

  // Set the voice language dynamically
  utterance.lang = lang === "ja" ? "ja-JP" : lang === "hi" ? "hi-IN" : lang === "es" ? "es-ES" : lang === "mr" ? "mr-IN" : "en-US";

  // Try to use a more robotic/professional voice matching the language if possible
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith(lang) && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel")));
  if (preferred) utterance.voice = preferred;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function formatAmountForSpeech(amount: number, lang: string): string {
  if (lang === "ja") {
    if (amount >= 100000) {
      const man = amount / 10000;
      return `${man.toFixed(man % 1 === 0 ? 0 : 1)}万ルピー`;
    } else if (amount >= 1000) {
      const sen = amount / 1000;
      return `${sen.toFixed(sen % 1 === 0 ? 0 : 1)}千ルピー`;
    }
    return `${amount}ルピー`;
  } else if (lang === "hi" || lang === "mr") {
    if (amount >= 100000) {
      const lakhs = amount / 100000;
      return `${lakhs.toFixed(lakhs % 1 === 0 ? 0 : 1)} लाख रुपये`;
    } else if (amount >= 1000) {
      const thousands = amount / 1000;
      return `${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)} हज़ार रुपये`;
    }
    return `${amount} रुपये`;
  } else if (lang === "es") {
    return `${amount} rupias`;
  } else {
    if (amount >= 100000) {
      const lakhs = amount / 100000;
      return `${lakhs.toFixed(lakhs % 1 === 0 ? 0 : 1)} lakh rupees`;
    } else if (amount >= 1000) {
      const thousands = amount / 1000;
      return `${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)} thousand rupees`;
    }
    return `${amount} rupees`;
  }
}
