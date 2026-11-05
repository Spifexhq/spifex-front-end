import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { Statement } from "@/models/finance/imports";

/** Persisted server jobs and sessions make navigation/refresh safe; no AI calls in the browser. */
export function useImportProcess(id: string, canEdit: boolean) {
  const { t } = useTranslation("statements");
  const [statement, setStatement] = useState<Statement>();
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"reading" | "matching" | "review">("reading");
  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    setError(""); setSessionId(""); setStatement(undefined); setPhase("reading");
    const fail = (cause: unknown) => { if (alive) setError(apiErrorMessage(cause, t("workspace.error"))); };
    const prepare = async (source: Statement) => {
      if (!alive) return;
      setPhase("matching");
      const session = source.import_session_id ? { session_id: source.import_session_id } : await api.prepareStatementImport(id);
      if (alive) { setSessionId(session.session_id); setPhase("review"); }
    };
    const started = Date.now();
    const poll = async () => {
      try {
        if (Date.now() - started > 20 * 60 * 1000) throw new Error(t("workspace.processingDelay"));
        const job = await api.getLatestStatementAnalysis(id);
        if (!alive) return;
        if (job.status === "failed") throw new Error(job.error_message || t("workspace.error"));
        if (job.status === "ready") { const source = await api.getStatement(id); if (alive) { setStatement(source); await prepare(source); } }
        else timer = setTimeout(() => { void poll(); }, 2000);
      } catch (cause) { fail(cause); }
    };
    void (async () => {
      try {
        const source = await api.getStatement(id);
        if (!alive) return;
        setStatement(source);
        if (!source.import_session_id && !canEdit) { setError(t("workspace.noPermission")); return; }
        if (source.import_session_id || source.status === "ready") await prepare(source);
        else {
          if (source.status !== "processing" || attempt > 0) {
            try { await api.triggerStatementAnalysis(id); }
            catch (cause) {
              // A timed-out trigger may still have queued the job. Verify instead of submitting twice.
              const job = await api.getLatestStatementAnalysis(id);
              if (!["processing", "ready"].includes(job.status)) throw cause;
            }
          }
          if (alive) await poll();
        }
      } catch (cause) { fail(cause); }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, [id, attempt, t, canEdit]);
  return { statement, sessionId, phase, error, retry: () => setAttempt(value => value + 1) };
}
