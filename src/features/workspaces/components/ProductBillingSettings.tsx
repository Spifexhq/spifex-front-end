import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { api } from "@/core/api/requests";
import { workspaceApi } from "@/features/workspaces/services/api";
import type { ProductPlan } from "@/features/workspaces/types";
import type { ProductCategory } from "@/models/auth/organization";
import type { GetSubscriptionStatusResponse } from "@/models/auth/billing";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatCurrency } from "@/lib";
import { readonlyWorkspace } from "@/products/personal/services/personalData";
import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";

const dateLabel = (value: string | null | undefined, locale: string) => value ? new Date(value).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function ProductBillingSettings() {
  const { t, i18n } = useTranslation(["subscription", "personal"]);
  const auth = useAuthContext();
  const organization = auth.organization?.organization;
  const category: ProductCategory = organization?.product_category || "business";
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [billing, setBilling] = useState({ country: "", currency: "", current: category === "personal" ? "personal-free" : "free" });
  const [subscription, setSubscription] = useState<GetSubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const readOnly = readonlyWorkspace(organization?.lifecycle);
  const canManage = auth.isOwner || auth.organization?.role === "admin" || auth.isSuperUser;

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void api.getPersonalSettings().then(async profile => {
      const country = profile.data.country || "";
      const [catalog, status] = await Promise.all([workspaceApi.catalog(category, country || undefined), api.getSubscriptionStatus()]);
      if (active) {
        const current = status.data.subscription?.plan_code || organization?.selected_plan_code || (category === "personal" ? "personal-free" : "free");
        setPlans(catalog.data.plans); setSubscription(status.data); setBilling({ country, currency: catalog.data.billing_currency, current });
      }
    }).catch(cause => { if (active) setError(apiErrorMessage(cause, t("personal:error"))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.organization?.organization?.id, category, organization?.selected_plan_code, retry, t]);

  const status = subscription?.subscription?.status || "none";
  const statusTone = status === "active" || status === "trialing" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "past_due" || status === "incomplete" ? "border-amber-200 bg-amber-50 text-amber-800" : status === "unpaid" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-gray-200 bg-gray-50 text-gray-700";
  const currentPlan = useMemo(() => plans.find(plan => plan.code === billing.current), [plans, billing.current]);
  const periodDate = subscription?.subscription?.current_period_end;
  const endedDate = subscription?.subscription?.ended_at;
  const isCanceled = status === "canceled";
  const canManageCurrentSubscription = ["active", "trialing", "past_due", "incomplete", "unpaid"].includes(status);
  const checkout = async (plan: ProductPlan) => {
    if (!canManage || busy || readOnly) return;
    const price = plan.prices.find(item => item.currency === billing.currency);
    if (!price) return;
    setBusy(true); setError("");
    try { const response = await workspaceApi.checkout(plan.code, billing.country, price.billing_interval); if (!response.data.url) throw new Error(t("errors.noRedirect")); window.location.assign(response.data.url); }
    catch (cause) { setError(apiErrorMessage(cause, t("errors.checkout"))); setBusy(false); }
  };
  const portal = async (plan?: ProductPlan, selectedPrice?: ProductPlan["prices"][number]) => {
    if (!canManage || busy || readOnly) return;
    setBusy(true); setError("");
    try {
      const response = await api.createCustomerPortalSession(plan ? {
        plan_code: plan.code,
        country_code: billing.country,
        billing_interval: selectedPrice?.billing_interval === "year" ? "year" : "month",
      } : undefined);
      if (!response.data.url) throw new Error(t("errors.noPortal"));
      window.location.assign(response.data.url);
    }
    catch (cause) {
      const errorCode = cause && typeof cause === "object" ? (cause as { code?: string }).code : undefined;
      setError(errorCode === "portal_plan_change_not_configured" ? t("errors.planChangeNotConfigured") : apiErrorMessage(cause, t("errors.portal")));
      setBusy(false);
    }
  };
  if (loading) return <PageSkeleton variant="groups" rows={3}/>;
  const subscriptionBody = status === "active" || status === "trialing"
    ? subscription?.subscription?.cancel_at_period_end ? t("callout.active.cancelAtBody", { date: dateLabel(periodDate, i18n.language) }) : t(status === "trialing" ? "callout.trialing.title" : "callout.active.renewsBody", { date: dateLabel(periodDate, i18n.language) })
    : status === "past_due" ? t("callout.pastDue.body") : status === "incomplete" ? t("callout.incomplete.body") : status === "unpaid" ? t("callout.unpaid.body") : status === "canceled" ? t(subscription?.subscription?.ended_at ? "callout.canceled.bodyEnded" : "callout.canceled.bodyNoAccess", { date: dateLabel(subscription?.subscription?.ended_at, i18n.language) }) : t("callout.none.body");
  const statusTitle = status === "active" ? t("callout.active.title") : status === "trialing" ? t("callout.trialing.title") : status === "past_due" ? t("callout.pastDue.title") : status === "incomplete" ? t("callout.incomplete.title") : status === "unpaid" ? t("callout.unpaid.title") : status === "canceled" ? t("callout.canceled.title") : t("callout.none.title");
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><h2 className="text-sm font-semibold text-gray-900">{t("section.withPlan")}</h2><span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${statusTone}`}>{t(`status.${status}`, t("status.unknown"))}</span></div></div>
      <div className={`mx-4 my-3 rounded-md border-l-4 px-4 py-3 ${statusTone}`}><p className="text-[13px] font-medium">{statusTitle}</p><p className="mt-1 text-xs leading-5">{subscriptionBody}</p>{subscription?.subscription && !subscription?.has_access && !isCanceled && <p className="mt-1 text-xs">{t("current.noAccessHint")}</p>}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-[13px] text-gray-600"><span>{currentPlan ? <>{t(isCanceled ? "current.lastPlan" : "current.youAreOn")} <strong className="font-semibold text-gray-900">{currentPlan.name}</strong></> : t("current.noActive")}{isCanceled ? endedDate && <> <span className="mx-1">·</span>{t("current.endedOn")} {dateLabel(endedDate, i18n.language)}</> : periodDate && <> <span className="mx-1">·</span>{subscription?.subscription?.cancel_at_period_end ? t("current.cancelAt") : t("current.renews")} {dateLabel(periodDate, i18n.language)}</>}</span>{subscription?.subscription && canManage && canManageCurrentSubscription && <Button variant="outline" disabled={busy || readOnly} onClick={() => void portal()}>{t("btn.manage")}</Button>}</div>
    </section>
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<Button size="xs" variant="outline" onClick={() => setRetry(value => value + 1)}>{t("personal:retry")}</Button></div>}
    {!canManage && <p className="text-xs text-gray-500">{t("errors.ownerOnly")}</p>}
    <div className="grid gap-4 lg:grid-cols-3">{plans.map(plan => {
      const price = plan.prices.find(item => item.currency === billing.currency && item.billing_interval === "month") ?? plan.prices.find(item => item.currency === billing.currency);
      const isCurrent = plan.code === billing.current && Boolean(subscription?.has_access);
      const activeSubscription = status === "active" || status === "trialing" || status === "past_due" || status === "incomplete" || status === "unpaid";
      const actionLabel = isCurrent ? t("btn.current") : activeSubscription ? t("btn.changeInPortal") : t("btn.subscribe");
      return <section key={plan.code} className="flex min-h-44 flex-col rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>{isCurrent && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">{t("btn.current")}</span>}</div>
        <p className="mt-4 text-xl font-semibold tracking-tight text-gray-900">{plan.tier === "free" ? t("personal:free") : price ? <>{formatCurrency(price.amount_minor / 100, price.currency)}<span className="ml-1 text-xs font-normal text-gray-500">{t(price.billing_interval === "year" ? "personal:perYear" : "personal:perMonth")}</span></> : t("personal:notAvailable")}</p>
        {plan.description && <p className="mt-3 text-xs leading-5 text-gray-500">{plan.description}</p>}
        {plan.tier !== "free" && <Button className="mt-auto self-start" variant={isCurrent || activeSubscription ? "outline" : "primary"} disabled={busy || readOnly || !canManage || !price || isCurrent} onClick={() => activeSubscription && (status === "active" || status === "trialing") ? void portal(plan, price) : activeSubscription ? void portal() : void checkout(plan)}>{price ? actionLabel : t("personal:notAvailable")}</Button>}
      </section>;
    })}</div>
    <p className="text-xs leading-5 text-gray-500">{t("personal:billingHint")}</p>
  </div>;
}
