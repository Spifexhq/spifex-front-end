import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { workspaceApi } from "@/features/workspaces/services/api";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatCurrency } from "@/lib";
import type { ProductPlan } from "@/features/workspaces/types";
import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { readonlyWorkspace } from "../services/personalData";

export default function PersonalPlans() {
  const { t } = useTranslation("personal");
  const auth = useAuthContext();
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [billing, setBilling] = useState({ country: "", currency: "", current: "personal-free" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const readOnly = readonlyWorkspace(auth.organization?.organization?.lifecycle);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void api.getPersonalSettings().then(async profile => {
      const [catalog, subscription] = await Promise.all([workspaceApi.catalog("personal", profile.data.country || undefined), api.getSubscriptionStatus()]);
      if (active) { setPlans(catalog.data.plans); setBilling({ country: profile.data.country || "", currency: catalog.data.billing_currency, current: subscription.data.has_access ? subscription.data.subscription?.plan_code || "personal-free" : "personal-free" }); }
    }).catch(cause => { if (active) setError(apiErrorMessage(cause, t("error"))); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.organization?.organization?.id, retry, t]);
  const go = async (plan?: ProductPlan) => {
    if (busy || readOnly) return;
    setBusy(true);
    setError("");
    try {
      const price = plan?.prices.find(item => item.currency === billing.currency);
      const response = plan && price ? await workspaceApi.checkout(plan.code, billing.country, price.billing_interval) : await api.createCustomerPortalSession();
      if (!response.data.url) throw new Error(t("error"));
      window.location.assign(response.data.url);
    } catch (cause) { setError(apiErrorMessage(cause, t("error"))); setBusy(false); }
  };
  if (loading) return <PageSkeleton variant="groups" rows={3} />;
  return <div className="space-y-5">
    <p className="max-w-2xl text-sm leading-6 text-slate-500">{t("plansDescription")}</p>
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<Button size="xs" variant="outline" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button></div>}
    <div className="grid gap-4 lg:grid-cols-3">{plans.map(plan => {
      const price = plan.prices.find(item => item.currency === billing.currency);
      const current = billing.current === plan.code;
      return <section key={plan.code} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-900">{plan.name}</h2>{current && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">{t("current")}</span>}</div>
        <p className="mb-6 mt-4 text-xl font-semibold tracking-tight text-slate-900">{plan.tier === "free" ? t("free") : price ? <>{formatCurrency(price.amount_minor / 100, price.currency)}<span className="ml-1 text-xs font-normal text-slate-500">{t(price.billing_interval === "year" ? "perYear" : "perMonth")}</span></> : t("notAvailable")}</p>
        {plan.description && <p className="mb-5 text-xs leading-6 text-slate-500">{plan.description}</p>}
        {plan.tier !== "free" && <Button className="mt-auto" variant="outline" disabled={busy || readOnly || !auth.isOwner || !price || current} onClick={() => void go(plan)}>{t(current ? "currentPlan" : "upgrade")}</Button>}
      </section>;
    })}</div>
    {auth.isSubscribed && auth.isOwner && <Button variant="outline" disabled={busy || readOnly} onClick={() => void go()}>{t("manageBilling")}</Button>}
    <p className="text-xs leading-6 text-slate-500">{t("billingHint")}</p>
  </div>;
}
