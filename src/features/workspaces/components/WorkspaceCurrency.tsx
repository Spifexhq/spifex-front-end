import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { api } from "@/core/api/requests";
import { workspaceApi } from "../services/api";
import type { WorkspaceCurrencyPolicy } from "../types";
import { setAuthSnapshot } from "@/redux";
import { getCurrencies } from "@/lib/currency/currencies";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { PreferenceSection } from "@/shared/ui/Settings/PreferenceSection";
import { Select } from "@/shared/ui/Select";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";

export default function WorkspaceCurrency() {
  const { t, i18n } = useTranslation("personal");
  const { organization, isOwner } = useAuthContext();
  const dispatch = useDispatch();
  const [policy, setPolicy] = useState<WorkspaceCurrencyPolicy | null>(null);
  const [code, setCode] = useState(""), [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false), [retry, setRetry] = useState(0);
  const currencies = useMemo(() => getCurrencies(i18n.language), [i18n.language]);
  const workspace = organization?.organization;
  const writable = isOwner && (!workspace?.lifecycle || workspace.lifecycle === "active");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void workspaceApi.currency().then(result => { if (active) { setPolicy(result.data); setCode(result.data.currency); } }).catch(cause => { if (active) setError(apiErrorMessage(cause, t("error"))); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace?.id, retry, t]);
  return <PreferenceSection title={t("workspaceCurrency")}><form className="max-w-xl space-y-5 p-5" onSubmit={async event => {
    event.preventDefault();
    if (busy || !policy?.can_change || !writable || code === policy.currency) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      await api.updateOrgCurrency({ currency: code, current_password: password });
      setPolicy({ ...policy, currency: code }); setPassword("");
      const profile = await api.getUser(); dispatch(setAuthSnapshot(profile.data)); setSaved(true);
    } catch (cause) { setError(apiErrorMessage(cause, t("error"))); }
    finally { setBusy(false); }
  }}>
    <p className="text-xs leading-6 text-gray-500">{t("currencyExplanation")}</p>
    <Select label={t("currency")} items={currencies} selected={currencies.filter(item => item.value === code)} onChange={items => { setCode(items[0]?.value || ""); setSaved(false); }} getItemKey={item => item.value} getItemLabel={item => item.label} singleSelect hideCheckboxes disabled={loading || busy || !writable || !policy?.can_change}/>
    {policy?.reason === "financial_history" && <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-6 text-gray-600">{t("currencyLocked")}</p>}
    {writable && policy?.can_change && <Input kind="text" type="password" autoComplete="current-password" label={t("currentPassword")} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} required/>}
    {error && <div role="alert" className="flex items-center gap-3 text-xs text-red-700">{error}{!policy && <Button type="button" variant="outline" size="xs" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button>}</div>}
    {saved && <p role="status" className="text-xs text-emerald-700">{t("saved")}</p>}
    {writable && policy?.can_change && <div className="flex justify-end"><Button type="submit" isLoading={busy} disabled={loading || busy || !code || !password || code === policy.currency}>{t("save")}</Button></div>}
  </form></PreferenceSection>;
}
