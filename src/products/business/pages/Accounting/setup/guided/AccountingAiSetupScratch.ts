import type { AiSetupLanguage, AiSetupLevel } from "@/models/settings/accountingAiSetup";

export type AiSetupScratch = {
  level: AiSetupLevel;
  language: AiSetupLanguage;
  answers: Record<string, string | string[] | boolean>;
  step: number;
};

const KEY = "spifex.accounting.ai-setup.scratch.v1";

export function readAiSetupScratch(): AiSetupScratch | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AiSetupScratch>;
    if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
    return {
      level: parsed.level === "none" || parsed.level === "average" || parsed.level === "accountant" ? parsed.level : "basic",
      language: parsed.language === "pt" || parsed.language === "fr" || parsed.language === "de" ? parsed.language : "en",
      answers: parsed.answers,
      step: typeof parsed.step === "number" ? Math.max(0, Math.min(3, parsed.step)) : 1,
    };
  } catch {
    return null;
  }
}

export function hasAiSetupScratch(): boolean {
  return readAiSetupScratch() !== null;
}

export function writeAiSetupScratch(value: AiSetupScratch): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { /* optional scratch storage */ }
}

export function clearAiSetupScratch(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* optional scratch storage */ }
}
