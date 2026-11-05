import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Download, Loader2, Plus } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import { SkeletonLine } from "@/shared/ui/DataTable/DataTableSkeleton";
import { api } from "@/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import UploadStatement from "./UploadStatement";
import ImportHistory from "./ImportHistory";
import ImportReview from "./ImportReview";
import { useImportProcess } from "./useImportProcess";

export default function BankImports() {
  const { t } = useTranslation("statements"), auth = useAuthContext();
  const navigate = useNavigate(), { statementId } = useParams(), [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const can = (permission: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
  const newImport = params.get("new") === "1";
  useEffect(() => { document.title = t("workspace.title"); }, [t]);
  return <div className="flex min-h-0 min-w-0 flex-1"><main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10">
    <div key={auth.organization?.organization?.id} className="mx-auto max-w-[1440px] space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div>{(statementId || newImport) && <button onClick={() => navigate("/bank-imports")} className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={14} />{t("workspace.history")}</button>}<h1 className="text-xl font-semibold tracking-tight text-slate-900">{t(newImport ? "workspace.newImport" : "workspace.title")}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{t("workspace.descriptionText")}</p></div>{!statementId && !newImport && can("add_statement") && <Button variant="primary" onClick={() => navigate("/bank-imports?new=1")}><Plus size={15} />{t("workspace.newImport")}</Button>}</header>
      {statementId ? <ImportDetail key={statementId} id={statementId} canEdit={can("change_statement")} onError={cause => setMessage(apiErrorMessage(cause, t("workspace.error")))} /> : newImport ? can("add_statement") ? <UploadStatement onUploaded={id => navigate(`/bank-imports/${id}`, { replace: true })} /> : <p role="alert" className="text-sm text-slate-600">{t("workspace.noPermission")}</p> : <ImportHistory organization={auth.organization?.organization?.id || ""} canDelete={can("delete_statement")} canViewBanks={can("view_bank")} onError={cause => setMessage(apiErrorMessage(cause, t("workspace.error")))} />}
    </div>
  </main><Snackbar open={!!message} message={message} severity="error" onClose={() => setMessage("")} /></div>;
}

function ImportDetail({ id, canEdit, onError }: { id: string; canEdit: boolean; onError(cause: unknown): void }) {
  const { t } = useTranslation("statements");
  const process = useImportProcess(id, canEdit);
  const steps = ["reading", "matching", "review"] as const;
  const current = steps.indexOf(process.phase);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"><div className="min-w-0"><p className="break-all text-sm font-medium text-slate-800">{process.statement?.original_filename || t("workspace.loading")}</p><p className="mt-1 text-xs text-slate-500">{process.statement?.bank_account_label}</p></div><Button variant="outline" size="sm" onClick={() => void api.downloadStatement(id).catch(onError)}><Download size={14} />{t("workspace.download")}</Button></div>
    <ol className="grid grid-cols-3 gap-2" aria-label={t("workspace.progress")}>{steps.map((step, index) => <li key={step} aria-current={current === index ? "step" : undefined} className={`flex items-center gap-2 border-t-2 py-3 text-xs font-medium sm:text-sm ${index <= current ? "border-indigo-500 text-slate-800" : "border-slate-200 text-slate-400"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${index < current ? "bg-indigo-50 text-indigo-600" : "bg-slate-100"}`}>{index < current ? <Check size={12} /> : index + 1}</span>{t(`workspace.phases.${step}`)}</li>)}</ol>
    {process.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{process.error}</p><Button className="mt-3" variant="outline" onClick={process.retry}>{t("workspace.retry")}</Button></div> : process.sessionId ? <ImportReview sessionId={process.sessionId} canEdit={canEdit} /> : <div role="status" className="rounded-xl border border-slate-200 bg-white p-6"><div className="mb-6 flex items-center gap-3 text-sm text-slate-600"><Loader2 className="animate-spin motion-reduce:animate-none" size={17} />{t(process.phase === "matching" ? "workspace.matchingHelp" : "workspace.readingHelp")}</div><div aria-hidden="true" className="space-y-5">{[100, 85, 93, 70].map(width => <div key={width} style={{ width: `${width}%` }}><SkeletonLine className="h-4" /></div>)}</div><p className="mt-6 text-xs text-slate-400">{t("workspace.resumeHelp")}</p></div>}
  </div>;
}
