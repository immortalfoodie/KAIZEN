import { useEffect, useState } from "react";
import { t, getLanguage, onLanguageChange, type Language } from "./translations";

/**
 * React hook that re-renders components when the language changes.
 * Returns the `t()` translation function.
 */
export function useTranslation() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = onLanguageChange(() => setTick((t) => t + 1));
    return () => { unsubscribe(); };
  }, []);

  return { t, lang: getLanguage() };
}

export type { Language };
export { setLanguage, getLanguage, LANGUAGE_NAMES } from "./translations";
