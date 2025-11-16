/* -----------------------------------------------------------------------------
 * File: src/pages/SubscriptionManagement.tsx
 * Style: Navbar fixed + light settings card
 * i18n:   group "subscription"
 * ----------------------------------------------------------------------------*/

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { useAuth } from "@/api";
import { useAuthContext } from "@/contexts/useAuthContext";

import TopProgress from "@/components/ui/Loaders/TopProgress";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import Button from "@/components/ui/Button";
import { useTranslation } from "react-i18next";
import { api } from "@/api/requests";

/* ------------------------------ Types (client) ------------------------------ */
export type SubscriptionStatus =
  | "incomplete" | "trialing" | "active"
  | "past_due"   | "canceled" | "unpaid";

export interface SubscriptionDTO {
  is_subscribed: boolean;
  subscription: Subscription | null; // ← your full model below
}

// You already have this:
export interface Subscription {
  id: number;
  organization_id: number;
  stripe_subscription_id: string;
  status: SubscriptionStatus | string; // keep union if you want stricter typing
  plan_price_id: string;
  plan_product_id: string | null;
  plan_nickname: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan: {
    code: string | null;
    name: string | null;
    description: string | null;
  } | null;
  customer: {
    id: number;
    stripe_customer_id: string;
    default_payment_method_id: string | null;
    created_at: string;
  } | null;
}

/* --------------------------------- Helpers --------------------------------- */
const getInitials = (name?: string) => {
  if (!name) return "GP";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

const fmtDate = (iso?: string, locale = navigator.language) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

const Badge: React.FC<{ tone?: "green" | "amber" | "red" | "gray"; children: React.ReactNode }> = ({ tone = "gray", children }) => {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red:   "bg-rose-50 text-rose-700 border-rose-200",
    gray:  "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tones[tone]} inline-flex items-center gap-1`}>
      {children}
    </span>
  );
};

const Row: React.FC<{ left: React.ReactNode; right?: React.ReactNode }> = ({ left, right }) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900 truncate">{left}</p>
    </div>
    {right}
  </div>
);

/* --------------------------------- Component -------------------------------- */
const SubscriptionManagement: React.FC = () => {
  const { t, i18n } = useTranslation(["subscription"]);
  const isLogged = useRequireLogin();
  const { handleInitUser } = useAuth();
  const { user, isOwner, isSuperUser } = useAuthContext();
  const navigate = useNavigate();

  /* Flags */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);      // any redirect / checkout
  const [modalPlanId, setModalPlanId] = useState<string>("");   // plan picker modal

  /* Data */
  const [sub, setSub] = useState<SubscriptionDTO | null>(null);

  // Pricing map (env → label). Use your own price ids.
  const availablePlans = useMemo(() => {
    const dev = import.meta.env.VITE_ENVIRONMENT === "development";
    return dev
      ? [
          { priceId: "price_1Q01ZhJP9mPoGRyfBocieoN0", label: t("subscription:plan.basic") },
          { priceId: "price_1Q0BQ0JP9mPoGRyfvnYKUjCy", label: t("subscription:plan.premium") },
        ]
      : [
          { priceId: "price_1Q00r4JP9mPoGRyfZjHpSZul", label: t("subscription:plan.basic") },
          { priceId: "price_1Q6OSrJP9mPoGRyfjaNSlrhX", label: t("subscription:plan.premium") },
        ];
  }, [t]);

  const currentPriceId = sub?.subscription?.plan_price_id;
  const currentPlanLabel =
    availablePlans.find(p => p.priceId === currentPriceId)?.label
    ?? sub?.subscription?.plan_nickname
    ?? t("subscription:current.unknown");

  /* Permissions */
  const canCheckout = isOwner || isSuperUser;  // owner/admin enforced server-side too
  const canManage = (sub?.is_subscribed ?? false) && canCheckout;

  /* Bootstrap */
  useEffect(() => { document.title = t("subscription:title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

useEffect(() => {
  (async () => {
    try {
      await handleInitUser();
      const resp = await api.getSubscriptionStatus();
      setSub(resp.data); // <-- now has is_subscribed + subscription
    } finally {
      setIsInitialLoading(false);
    }
  })();
}, [handleInitUser]);

  /* Modal UX */
  const closeModal = useCallback(() => {
    if (!isProcessing) setModalPlanId("");
  }, [isProcessing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    if (modalPlanId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalPlanId, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalPlanId ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalPlanId]);

  /* Actions (inline, no separate components) */
  const startCheckout = async (priceId: string) => {
    if (!canCheckout || isProcessing) return;
    setIsProcessing(true);
    try {
      const resp = await api.createCheckoutSession(priceId);
      const url = (resp?.data)?.url;
      if (url) window.location.href = url;
      else alert(t("subscription:errors.noRedirect", "Couldn’t redirect to payment page."));
    } catch (e) {
      console.error(e);
      alert(t("subscription:errors.checkout", "Payment init failed. Try again later."));
    } finally {
      setIsProcessing(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!canManage || isProcessing) return;
    setIsProcessing(true);
    try {
      const resp = await api.createCustomerPortalSession();
      const url = (resp?.data)?.url;
      if (url) window.location.href = url;
      else alert(t("subscription:errors.noPortal", "Couldn’t open the customer portal."));
    } catch (e) {
      console.error(e);
      alert(t("subscription:errors.portal", "Portal redirect failed. Try again later."));
    } finally {
      setIsProcessing(false);
    }
  };

  /* Loading */
  if (!isLogged) return null;
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  /* Status badges */
  type SubscriptionStatus =
    | "incomplete" | "trialing" | "active"
    | "past_due"   | "canceled" | "unpaid";

  const statusTone: Record<SubscriptionStatus, "green" | "amber" | "red" | "gray"> = {
    active: "green",
    trialing: "green",
    past_due: "amber",
    incomplete: "amber",
    unpaid: "red",
    canceled: "gray",
  };

  const rawStatus = (sub?.subscription?.status ?? "canceled") as string;

  const isSubscriptionStatus = (v: string): v is SubscriptionStatus =>
    (["incomplete","trialing","active","past_due","canceled","unpaid"] as const)
      .includes(v as SubscriptionStatus);

  const tone = isSubscriptionStatus(rawStatus) ? statusTone[rawStatus] : "gray";

  const statusBadge = sub?.is_subscribed ? (
    <Badge tone={tone}>{rawStatus.replace("_", " ")}</Badge>
  ) : (
    <Badge tone="gray">{t("subscription:status.none", "No plan")}</Badge>
  );

  /* Header badge while processing */
  const headerBadge = isProcessing ? (
    <Badge>{t("subscription:badge.processing", "Processing…")}</Badge>
  ) : null;

  /* UI */
  return (
    <>
      <TopProgress active={isProcessing} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(user?.name)}
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("subscription:header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("subscription:header.title")}
                  </h1>
                </div>
                {statusBadge}
                {headerBadge}
              </div>
            </div>
          </header>

          {/* Main card */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {(sub?.is_subscribed)
                    ? t("subscription:section.withPlan")
                    : t("subscription:section.noPlan")}
                </span>
              </div>

              {/* Current plan summary */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* Left: status text */}
                  <div className="text-[13px]">
                    {sub?.is_subscribed ? (
                      <>
                        {t("subscription:current.youAreOn")}&nbsp;
                        <span className="font-semibold">{currentPlanLabel}</span>
                        <span className="ml-2 text-gray-500">
                          • {sub?.subscription?.cancel_at_period_end
                            ? t("subscription:current.cancelAt", "cancels at")
                            : t("subscription:current.renews", "renews on")}{" "}
                          {fmtDate(sub?.subscription?.current_period_end, i18n.language)}
                        </span>
                      </>
                    ) : (
                      t("subscription:current.noActive", "You don’t have an active plan.")
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="ml-auto flex items-center gap-2">
                    {/* Always visible */}
                    <Button
                      variant="outline"
                      disabled={isProcessing}
                      onClick={() => navigate("/settings/limits")}
                    >
                      {t("subscription:btn.checkLimits", "Check your limits")}
                    </Button>

                    {/* Only for owners/superusers with active subscription */}
                    {canManage && (
                      <Button
                        variant="outline"
                        disabled={isProcessing}
                        onClick={openCustomerPortal}
                      >
                        {t("subscription:btn.manage", "Manage subscription")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan chooser */}
              <div className="divide-y divide-gray-200">
                {availablePlans.map(plan => {
                  const isCurrent = plan.priceId === currentPriceId;
                  return (
                    <Row
                      key={plan.priceId}
                      left={plan.label}
                      right={
                        sub?.is_subscribed ? (
                          isCurrent ? (
                            <Button variant="outline" className="!border-gray-200 !text-gray-500" disabled>
                              {t("subscription:btn.current")}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              disabled={!canCheckout || isProcessing}
                              onClick={() => setModalPlanId(plan.priceId)}
                            >
                              {t("subscription:btn.switch", "Choose")}
                            </Button>
                          )
                        ) : (
                          <Button
                            onClick={() => setModalPlanId(plan.priceId)}
                            disabled={!canCheckout || isProcessing}
                            isLoading={isProcessing && modalPlanId === plan.priceId}
                          >
                            {t("subscription:btn.subscribe", "Subscribe")}
                          </Button>
                        )
                      }
                    />
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Confirm modal */}
        {modalPlanId && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md" role="dialog" aria-modal="true">
              {isProcessing ? (
                <div className="flex items-center justify-center h-32">
                  <TopProgress active={true} variant="center" />
                </div>
              ) : (
                <>
                  <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                    <h3 className="text-[14px] font-semibold text-gray-800">
                      {t("subscription:modal.title")}
                    </h3>
                    <button
                      className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                      onClick={closeModal}
                      aria-label={t("subscription:modal.close")}
                    >
                      &times;
                    </button>
                  </header>

                  <p className="text-[13px] text-gray-700 mb-4">
                    {t("subscription:modal.text")}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={closeModal}
                      disabled={isProcessing}
                    >
                      {t("subscription:btn.cancel")}
                    </Button>
                    <Button
                      onClick={() => startCheckout(modalPlanId)}
                      disabled={isProcessing}
                      isLoading={isProcessing}
                    >
                      {t("subscription:btn.confirm")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default SubscriptionManagement;
