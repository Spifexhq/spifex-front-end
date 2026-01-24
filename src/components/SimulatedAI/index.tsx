/* -------------------------------------------------------------------------- */
/* File: src\components\SimulatedAI                                           */
/* -------------------------------------------------------------------------- */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Copy,
  Volume2,
  VolumeX,
  Pause,
  Play,
  FastForward,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Input from "@/shared/ui/Input";

export interface SimulatedAIProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Optional: overrides the i18n FAQs list */
  qaList?: Array<{ id: string; question: string; answer: string; tags?: string[] }>;
}

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const ttsLangFrom = (lang?: string) => {
  const l = (lang || "").toLowerCase();
  if (l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("en")) return "en-US";
  if (l.startsWith("fr")) return "fr-FR";
  if (l.startsWith("de")) return "de-DE";
  return "en-US";
};

const SimulatedAI: React.FC<SimulatedAIProps> = ({
  isOpen,
  onClose,
  title,
  qaList,
}) => {
  const { t, i18n } = useTranslation("simulatedAI");

  /* -------------------------------- State -------------------------------- */
  const [search, setSearch] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [typedResponse, setTypedResponse] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [speedMs, setSpeedMs] = useState(20);
  const [recentQs, setRecentQs] = useState<string[]>([]);
  const [speakOn, setSpeakOn] = useState(false);
  const [copied, setCopied] = useState(false);

  /* -------------------------------- Refs --------------------------------- */
  const intervalRef = useRef<number | null>(null);
  const indexRef = useRef<number>(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  /* --------------------------- Data (from i18n) --------------------------- */
  type FAQ = { id: string; question: string; answer: string; tags?: string[] };

  // Prefer prop override; fallback to i18n JSON (namespace: simulatedAI, key: faqs)
  const i18nFaqs = t("faqs", { returnObjects: true }) as unknown as FAQ[] | undefined;
  const faqs: FAQ[] = useMemo(() => {
    if (qaList?.length) return qaList;
    return Array.isArray(i18nFaqs) ? i18nFaqs : [];
  }, [qaList, i18nFaqs]);

  const qaPairs = useMemo(
    () => faqs.map(({ question, answer }) => [question, answer] as const),
    [faqs]
  );

  const filteredQuestions = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = qaPairs.map(([q]) => q);
    if (!s) return list;
    return list.filter((q) => q.toLowerCase().includes(s));
  }, [qaPairs, search]);

  const progress = response.length
    ? Math.min(100, Math.round((typedResponse.length / response.length) * 100))
    : 0;

  /* ----------------------------- Helpers -------------------------------- */
  const clearTicker = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore TTS absence
    }
  }, []);

  const speakText = useCallback(
    (text: string) => {
      try {
        if (!("speechSynthesis" in window)) return;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = ttsLangFrom(i18n.language);
        window.speechSynthesis.speak(utter);
      } catch {
        // non-critical
      }
    },
    [i18n.language]
  );

  const startTyping = useCallback(
    (text: string) => {
      clearTicker();
      stopSpeaking();
      setIsTyping(true);
      setTypedResponse("");
      indexRef.current = 0;

      intervalRef.current = window.setInterval(() => {
        indexRef.current += 1;
        setTypedResponse(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) {
          clearTicker();
          setIsTyping(false);
          if (speakOn) speakText(text);
        }
      }, Math.max(5, speedMs));
    },
    [clearTicker, stopSpeaking, speakOn, speakText, speedMs]
  );

  const pauseTyping = useCallback(() => {
    clearTicker();
    setIsTyping(false);
  }, [clearTicker]);

  const resumeTyping = useCallback(() => {
    if (!response || isTyping) return;
    setIsTyping(true);
    clearTicker();
    intervalRef.current = window.setInterval(() => {
      indexRef.current += 1;
      setTypedResponse(response.slice(0, indexRef.current));
      if (indexRef.current >= response.length) {
        clearTicker();
        setIsTyping(false);
        if (speakOn) speakText(response);
      }
    }, Math.max(5, speedMs));
  }, [response, isTyping, clearTicker, speakOn, speakText, speedMs]);

  const skipToEnd = useCallback(() => {
    clearTicker();
    setTypedResponse(response);
    setIsTyping(false);
    if (speakOn && response) speakText(response);
  }, [clearTicker, response, speakOn, speakText]);

  /* ----------------------------- Lifecycle ------------------------------ */
  useEffect(() => {
    return () => {
      clearTicker();
      stopSpeaking();
    };
  }, [clearTicker, stopSpeaking]);

  useEffect(() => {
    if (isTyping && response) {
      clearTicker();
      intervalRef.current = window.setInterval(() => {
        indexRef.current += 1;
        setTypedResponse(response.slice(0, indexRef.current));
        if (indexRef.current >= response.length) {
          clearTicker();
          setIsTyping(false);
          if (speakOn) speakText(response);
        }
      }, Math.max(5, speedMs));
    }
  }, [isTyping, response, speedMs, clearTicker, speakOn, speakText]);

  /* ------------------------------ Handlers ------------------------------ */
  const handlePickQuestion = useCallback(
    (q: string) => {
      setSelectedQuestion(q);
      const ans = qaPairs.find(([qq]) => qq === q)?.[1] ?? "";
      setResponse(ans);
      setTypedResponse("");
      indexRef.current = 0;
      setRecentQs((prev) => {
        const arr = [q, ...prev.filter((p) => p !== q)];
        return arr.slice(0, 2);
      });
      startTyping(ans);
    },
    [qaPairs, startTyping]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(typedResponse || response || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard may be blocked
    }
  }, [typedResponse, response]);

  const handleClose = useCallback(() => {
    clearTicker();
    stopSpeaking();
    setSearch("");
    setSelectedQuestion("");
    setResponse("");
    setTypedResponse("");
    setIsTyping(false);
    onClose();
  }, [clearTicker, stopSpeaking, onClose]);

  /* -------------------------- Focus + Shortcuts -------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Enter" && document.activeElement === searchInputRef.current) {
        if (filteredQuestions[0]) handlePickQuestion(filteredQuestions[0]);
      }
      // focus trap
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>(
          'a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, filteredQuestions, handleClose, handlePickQuestion]);

  window.useGlobalEsc(isOpen, onClose);

  if (!isOpen) return null;

  const heading = title ?? t("title");

  /* --------------------------------- UI --------------------------------- */
  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-label={t("aria.backdrop")}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-ai-title"
        className="absolute inset-0 grid place-items-center px-4"
      >
        <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white/80">
            <div className="flex items-center gap-3">
              <div
                className={cls(
                  "h-9 w-9 rounded-xl grid place-items-center border",
                  "text-[color:var(--accentPrimary)]"
                )}
                style={{ borderColor: "var(--accentPrimary)", background: "var(--color3)" }}
              >
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="sim-ai-title" className="text-[12px] font-semibold text-gray-900">
                  {heading}
                </h2>
                <p className="text-[12px] text-gray-500">{t("shortcuts.hint")}</p>
              </div>
            </div>
            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
              onClick={handleClose}
              aria-label={t("actions.close")}
              title={t("actions.close") || ""}
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="grid md:grid-cols-2 gap-4 p-5">
            {/* Answer panel */}
            <section className="order-2 md:order-1">
              {/* Progress */}
              <div className="mb-3">
                <div className="h-1 w-full rounded bg-gray-100 overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full transition-all bg-[color:var(--accentPrimary)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    {isTyping
                      ? t("status.typing")
                      : typedResponse
                      ? t("status.done")
                      : t("status.waiting")}
                  </span>
                  <span>{progress}%</span>
                </div>
              </div>

              {/* Output */}
              <div
                className={cls(
                  "rounded-xl border p-3 min-h-[160px] max-h-[280px] overflow-y-auto",
                  "bg-gradient-to-b from-white to-gray-50",
                  "border-gray-200"
                )}
                aria-live="polite"
              >
                {typedResponse ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-[12px] text-gray-900">
                    {typedResponse}
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-500">
                    {t("empty.pickOnRight")}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={isTyping ? pauseTyping : resumeTyping}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-[12px] hover:bg-gray-50"
                >
                  {isTyping ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isTyping ? t("actions.pause") : t("actions.resume")}
                </button>
                <button
                  onClick={skipToEnd}
                  disabled={!response || typedResponse === response}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-[12px] hover:bg-gray-50",
                    (!response || typedResponse === response) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <FastForward className="h-4 w-4" />
                  {t("actions.skip")}
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!typedResponse && !response}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-[12px] hover:bg-gray-50",
                    (!typedResponse && !response) && "opacity-60 cursor-not-allowed"
                  )}
                  aria-live="polite"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--accentSuccess)]" /> {t("actions.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> {t("actions.copy")}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSpeakOn((s) => !s)}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] hover:bg-gray-50",
                    speakOn
                      ? "border-[color:var(--accentPrimary)] text-[color:var(--accentPrimary)] bg-[color:var(--accentCancel)]"
                      : "border-gray-200"
                  )}
                  title={t("tts.tooltip") || ""}
                >
                  {speakOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {speakOn ? t("tts.on") : t("tts.off")}
                </button>
                <div className="ml-auto flex items-center gap-2 text-[12px] text-gray-600">
                  <span>{t("speed.label")}</span>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={speedMs}
                    onChange={(e) => setSpeedMs(Number(e.target.value))}
                    className="accent-[color:var(--accentPrimary)]"
                    aria-label={t("speed.aria") || ""}
                  />
                </div>
              </div>

              {recentQs.length > 0 && (
                <div className="mt-3">
                  <div className="text-[12px] text-gray-600 mb-1">{t("recent.title")}</div>
                  <div className="flex flex-wrap gap-2">
                    {recentQs.map((q) => (
                      <button
                        key={q}
                        onClick={() => handlePickQuestion(q)}
                        className="px-2.5 py-1.5 rounded-full border text-[12px] hover:bg-[color:var(--color3)] border-gray-300"
                        title={q}
                      >
                        {q.length > 36 ? q.slice(0, 36) + "…" : q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Questions / Search panel */}
            <aside className="order-1 md:order-2">
              <div className="mb-2">
                <label className="text-[12px] text-gray-600">{t("search.label")}</label>
                <div className="mt-1 relative">
                  <Input
                    kind="text"
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("search.placeholder") || ""}
                    aria-label={t("search.aria") || ""}
                  />
                </div>
              </div>

              <div className="max-h-[230px] overflow-y-auto rounded-md border border-gray-200">
                {filteredQuestions.length ? (
                  filteredQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handlePickQuestion(q)}
                      className={cls(
                        "w-full text-left p-3 text-[12px] hover:bg-[color:var(--color3)]",
                        selectedQuestion === q && "bg-[color:var(--color3)]"
                      )}
                    >
                      {q}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-[12px] text-gray-500">{t("search.empty")}</div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="mr-4 text-[12px] text-gray-500">
                  {selectedQuestion ? t("selection.has") : t("selection.none")}
                  {selectedQuestion && (
                    <span className="block text-gray-700 mt-0.5 line-clamp-2">
                      {selectedQuestion}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedQuestion("");
                    setResponse("");
                    setTypedResponse("");
                    setIsTyping(false);
                    indexRef.current = 0;
                  }}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] hover:bg-gray-50 border-gray-200"
                >
                  <RotateCcw className="h-4 w-4" /> {t("actions.clear")}
                </button>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-[12px] text-gray-600">
              {typedResponse ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--accentSuccess)]" />
                  {t("footer.ready")}
                </span>
              ) : (
                <span>{t("footer.pickQuestion")}</span>
              )}
            </div>
            <button
              onClick={handleClose}
              className={cls(
                "rounded-md text-white text-[12px] px-4 py-2 hover:opacity-95 focus:outline-none focus:ring-2",
                "bg-[color:var(--accentPrimary)] hover:bg-[color:var(--accentPrimaryHover)] ring-[color:var(--accentPrimary)]"
              )}
            >
              {t("actions.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulatedAI;
