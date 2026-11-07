import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/core/api/requests";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { useAccountingSetup } from "./useAccountingSetup";

export default function ProfileConfiguration() {
  const { t } = useTranslation("accountingSettings");
  const { status, refresh, canManage } = useAccountingSetup();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"personal" | "organizational">(status?.profile.mode ?? "organizational");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = (["personal", "organizational"] as const).map(value => ({ value, label: t(`setupFlow.modes.${value}`) }));
  return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs md:p-5 space-y-5">
    <dl className="grid gap-6 sm:grid-cols-2"><div><dt>{t("setupFlow.profileMode")}</dt><dd>{t(`setupFlow.modes.${status?.profile.mode}`)}</dd></div><div><dt>{t("setupFlow.functionalCurrency")}</dt><dd>{status?.profile.currency || "—"}</dd></div></dl>
    <p className="text-xs leading-6 text-gray-500">{t("setupFlow.profileGuidance")}</p><div className="flex flex-wrap items-center gap-4">{canManage && <Button variant="outline" onClick={() => { setMode(status?.profile.mode ?? "organizational"); setOpen(true); }}>{t("setupFlow.editProfile")}</Button>}<Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4" to="/settings/manage-currency">{t("setupFlow.editCurrency")}</Link></div>
    <SidePanel isOpen={open} onClose={() => { if (!busy) { setOpen(false); setPassword(""); } }} title={t("setupFlow.editProfile")}>
      <SidePanelForm className="space-y-5" onSubmit={async event => {
        event.preventDefault(); if (busy) return;
        setBusy(true); setError(null);
        try { await api.updateOrgLedgerProfile({ mode, current_password: password }); setOpen(false); setPassword(""); await refresh(); }
        catch (cause) { setError(apiErrorMessage(cause, t("setupFlow.actionError"))); }
        finally { setBusy(false); }
      }}>
        <Select label={t("setupFlow.profileMode")} items={options} selected={options.filter(option => option.value === mode)} onChange={selected => setMode(selected[0]?.value ?? "organizational")} getItemKey={option => option.value} getItemLabel={option => option.label} singleSelect hideCheckboxes />
        <p className="text-xs leading-6 text-gray-500">{t("setupFlow.profileGuidance")}</p>
        <Input kind="text" type="password" autoComplete="current-password" label={t("setupFlow.currentPassword")} value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="cancel" disabled={busy} onClick={() => { setOpen(false); setPassword(""); }}>{t("common.cancel")}</Button><Button type="submit" disabled={busy}>{t("common.save")}</Button></div>
      </SidePanelForm>
    </SidePanel>
  </div>;
}
