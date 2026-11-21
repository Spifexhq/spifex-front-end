import { useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Plus } from "lucide-react";
import { api } from "@/core/api/requests";
import { fetchAllCursor } from "@/lib/list";
import { useAuthContext } from "@/hooks/useAuth";
import type { BankAccount } from "@/models/settings/banking";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import { ErrorState } from "@/shared/ui/State";
import UploadStatement from "./UploadStatement";
import ImportHistory from "./ImportHistory";
import ImportReview from "./ImportReview";
import { ImportStatus } from "./ImportHistory";
import { useImportProcess } from "./useImportProcess";
import type { BankImportsPermissions, BankLoader } from "./types";

export type { BankImportsPermissions, BankLoader } from "./types";

type BankImportsProps = {
  product?: "business" | "personal";
  basePath?: string;
  permissions?: BankImportsPermissions;
  loadBanks?: BankLoader;
};

export default function BankImports({ product = "business", basePath = "/b/bank-imports", permissions, loadBanks }: BankImportsProps) {
  const { t } = useTranslation("statements"), auth = useAuthContext();
  const navigate = useNavigate(), { statementId } = useParams(), [params] = useSearchParams();
  const personal = product === "personal";
  const can = (permission: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
  const allowed = permissions ?? {
    add: can("add_statement"),
    change: can("add_statement") || can("change_statement"),
    delete: can("delete_statement"),
    viewBanks: can("view_bank"),
  };
  const newImport = params.get("new") === "1";
  const defaultLoadBanks = useCallback<BankLoader>(async activeOnly => {
    const items = await fetchAllCursor<BankAccount>(params => api.getBanks({
      cursor: params.cursor,
      ...(activeOnly ? { active: "true" as const } : {}),
    }));
    return items.map(item => ({
      id: item.id,
      institution: item.institution,
      account_number: item.account_number,
      iban: item.iban,
      currency: item.currency,
    }));
  }, []);
  const bankLoader = loadBanks ?? defaultLoadBanks;
  useEffect(() => { document.title = t("workspace.title"); }, [t]);
  return <div className="flex min-h-0 min-w-0 flex-1"><main className={`min-w-0 flex-1 ${personal ? "" : "overflow-y-auto px-4 py-6 sm:px-7"}`}>
    <div key={auth.organization?.organization?.id} className="mx-auto max-w-[1440px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {(statementId || newImport) && <button type="button" onClick={() => navigate(basePath)} className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={15} aria-hidden="true" />{t("workspace.history")}</button>}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t(statementId ? "workspace.reviewTitle" : newImport ? "workspace.newImport" : "workspace.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{t("workspace.descriptionText")}</p>
        </div>
        {!statementId && !newImport && allowed.add && <Button variant="primary" className="gap-2" onClick={() => navigate(`${basePath}?new=1`)}><Plus size={15} aria-hidden="true" />{t("workspace.newImport")}</Button>}
      </header>
      {statementId
        ? <ImportDetail key={statementId} id={statementId} canEdit={allowed.change} personal={personal} />
        : newImport
          ? allowed.add
            ? <UploadStatement loadBanks={bankLoader} onUploaded={id => navigate(`${basePath}/${id}`, { replace: true })} />
            : <p role="alert" className="text-sm text-slate-600">{t("workspace.noPermission")}</p>
          : <ImportHistory
              organization={auth.organization?.organization?.id || ""}
              canDelete={allowed.delete}
              canViewBanks={allowed.viewBanks}
              basePath={basePath}
              loadBanks={bankLoader}
            />}
    </div>
  </main></div>;
}

function ImportDetail({ id, canEdit, personal }: { id: string; canEdit: boolean; personal: boolean }) {
  const { t } = useTranslation("statements");
  const reduced = useReducedMotion();
  const process = useImportProcess(id, canEdit);
  const steps = ["reading", "matching", "review"] as const;
  const current = steps.indexOf(process.phase);
  return <div className="space-y-5">
    <Card as="section" radius="xl" tone="slate" padding="compact">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="break-all text-sm font-medium text-slate-800">{process.statement?.original_filename || t("workspace.loading")}</p>
          <p className="mt-1 text-xs text-slate-500">{process.statement?.bank_account_label}</p>
        </div>
        {process.statement && <ImportStatus status={process.statement.status || "processing"} />}
      </div>
    </Card>
    <Card as="section" radius="xl" tone="slate" padding="compact">
      <ol className="grid grid-cols-3 gap-2" aria-label={t("workspace.progress")}>{steps.map((step, index) => <li key={step} aria-current={current === index ? "step" : undefined} className={`flex items-center gap-2 border-t-2 py-2 text-xs font-medium sm:text-sm ${index <= current ? "border-indigo-500 text-slate-800" : "border-slate-200 text-slate-400"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${index < current ? "bg-indigo-50 text-indigo-600" : "bg-slate-100"}`}>{index < current ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{t(`workspace.phases.${step}`)}</li>)}</ol>
    </Card>
    {process.error ? <ErrorState message={process.error} action={<Button variant="secondary" onClick={process.retry}>{t("workspace.retry")}</Button>} /> : process.sessionId ? <ImportReview sessionId={process.sessionId} canEdit={canEdit} personal={personal} /> : <Card as="section" radius="xl" tone="slate" padding="spacious">
      <div role="status" aria-live="polite" aria-busy="true" className="flex items-center gap-2 text-sm font-medium text-gray-700"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{t(process.phase === "matching" ? "workspace.matchingHelp" : "workspace.readingHelp")}</div>
      <div aria-hidden="true" className="mt-5 space-y-3">{[92, 78, 86].map((width, index) => <motion.div key={width} initial={{ opacity: 0.35, x: reduced ? 0 : -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : index * 0.08 }} className="h-3 rounded-full bg-gray-100"><div className="h-3 rounded-full bg-gray-200" style={{ width: `${width}%` }} /></motion.div>)}</div>
      <p className="mt-5 text-xs text-slate-400">{t("workspace.resumeHelp")}</p>
    </Card>}
  </div>;
}
