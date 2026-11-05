import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { UploadCloud, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { BankAccount } from "@/models/settings/banking";
import Button from "@/shared/ui/Button";
import LookupSelect from "./LookupSelect";

export default function UploadStatement({ onUploaded }: { onUploaded(id: string): void }) {
  const { t } = useTranslation("statements");
  const [banks, setBanks] = useState<BankAccount[]>([]), [bank, setBank] = useState("");
  const [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [retry, setRetry] = useState(0), [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null), inFlight = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    void fetchAllCursor<BankAccount>(params => api.getBanks({ cursor: params.cursor, active: "true" }))
      .then(items => { if (alive) setBanks(items); }).catch(cause => { if (alive) setError(apiErrorMessage(cause, t("workspace.bankError"))); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [retry, t]);
  const choose = (next?: File) => {
    if (!next || busy) return;
    if (!/\.(pdf|png|jpe?g|webp|csv|ofx|xml)$/i.test(next.name) || next.size > (/\.(png|jpe?g|webp)$/i.test(next.name) ? 10 : 20) * 1024 * 1024) { setError(t("workspace.fileError")); return; }
    setError(""); setFile(next);
  };
  const upload = async () => {
    if (!file || !bank || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const data = new FormData(); data.append("file", file); data.append("bank_account_id", bank);
      const result = await api.uploadStatement(data, value => { if (mounted.current) setProgress(value); });
      if (mounted.current) onUploaded(result.id);
    } catch (cause) { if (mounted.current) setError(apiErrorMessage(cause, t("workspace.error"))); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  return <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-base font-semibold text-slate-900">{t("workspace.uploadTitle")}</h2><p className="mb-6 mt-1 text-sm leading-6 text-slate-500">{t("workspace.uploadDescription")}</p>
      <LookupSelect label={t("workspace.bank")} items={banks.map(item => ({ id: item.id, label: `${item.institution} · ${item.account_number || item.iban || item.currency}` }))} value={bank} onChange={setBank} disabled={busy || loading} />
      {!loading && !banks.length && <p className="mt-2 text-sm text-amber-700">{t("workspace.noBanks")}</p>}
      <input ref={picker} type="file" className="sr-only" tabIndex={-1} accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.ofx,.xml" onChange={event => choose(event.target.files?.[0])} disabled={busy} />
      <button type="button" disabled={busy} onClick={() => picker.current?.click()} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }} className={`mt-6 flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 ${dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50/60 hover:border-indigo-300 hover:bg-slate-50"}`}>
        <UploadCloud size={25} className="text-slate-400" /><span className="max-w-full break-all text-sm font-medium text-slate-800">{file?.name || t("workspace.drop")}</span><span className="text-xs text-slate-500">{file ? `${(file.size / 1024).toFixed(0)} KB · ${t("workspace.replace")}` : t("workspace.formats")}</span>
      </button>
      {busy && <div className="mt-4" role="status"><p className="mb-2 text-xs text-slate-500">{t("workspace.uploading", { progress })}</p><progress max={100} value={progress} className="h-1 w-full accent-indigo-600" /></div>}
      {error && <div role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}<button className="ml-2 underline" onClick={() => setRetry(value => value + 1)} disabled={busy}>{t("workspace.retry")}</button></div>}
      <div className="mt-6 flex justify-end"><Button variant="primary" onClick={() => void upload()} disabled={!file || !bank || busy || loading} isLoading={busy}>{t("workspace.read")}</Button></div>
    </section>
    <aside className="space-y-6 py-2 text-sm leading-6 text-slate-500">{[{ Icon: FileSpreadsheet, title: "structuredTitle", text: "structuredText" }, { Icon: ShieldCheck, title: "reviewTitle", text: "reviewText" }].map(({ Icon, title, text }) => <div key={title}><Icon size={19} className="mb-3 text-slate-400" /><h3 className="font-medium text-slate-800">{t(`workspace.${title}`)}</h3><p className="mt-1">{t(`workspace.${text}`)}</p></div>)}</aside>
  </div>;
}
