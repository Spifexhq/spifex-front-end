/* -----------------------------------------------------------------------------
 * File: src/pages/SubscriptionManagement/index.tsx
 * ----------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useRequireLogin } from "@/hooks/useRequireLogin";
import { useAuthContext } from "@/hooks/useAuth";

import TopProgress from "@/components/ui/Loaders/TopProgress";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import Button from "@/components/ui/Button";
import { api } from "@/api/requests";
import type { GetSubscriptionStatusResponse } from "@/models/auth/billing";

/* ------------------------------ Helpers ------------------------------------ */
const getInitials = (name?: string) => {
  if (!name) return "GP";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

const toIso = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : undefined;
};

const fmtDate = (iso?: string, locale = navigator.language) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const parseIsoMs = (iso?: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
};

const isOlderThanMonths = (iso?: string, months = 2): boolean => {
  const ms = parseIsoMs(iso);
  if (ms == null) return false;

  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - months);
  return ms < threshold.getTime();
};

type BadgeTone = "green" | "amber" | "red" | "gray";

const Badge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
}> = ({ tone = "gray", children }) => {
  const tones: Record<BadgeTone, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
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

/* ------------------------- Minimal notice (no blue) ------------------------ */
type NoticeTone = "neutral" | "good" | "warn" | "danger";

const Notice: React.FC<{
  tone?: NoticeTone;
  title: React.ReactNode;
  body?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ tone = "neutral", title, body, actions }) => {
  const leftBorder: Record<NoticeTone, string> = {
    neutral: "border-l-gray-300",
    good: "border-l-emerald-400",
    warn: "border-l-amber-400",
    danger: "border-l-rose-400",
  };

  return (
    <div className={`rounded-md border border-gray-200 border-l-4 ${leftBorder[tone]} bg-white px-4 py-3`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-900">{title}</p>
          {body ? <p className="mt-1 text-[12px] text-gray-600">{body}</p> : null}
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
};

/* ------------------------------ Status mapping ------------------------------ */
type KnownStatus = "incomplete" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
type StatusKind = KnownStatus | "none" | "unknown";

const statusTone: Record<StatusKind, BadgeTone> = {
  active: "green",
  trialing: "green",
  past_due: "amber",
  incomplete: "amber",
  unpaid: "red",
  canceled: "gray",
  none: "gray",
  unknown: "gray",
};

const isKnownStatus = (v: string): v is KnownStatus =>
  (["incomplete", "trialing", "active", "past_due", "canceled", "unpaid"] as const).includes(v as KnownStatus);

const humanStatus = (s: StatusKind) => {
  if (s === "none") return "no plan";
  if (s === "unknown") return "unknown";
  return s.split("_").join(" ");
};

/* -------------------------------- Component -------------------------------- */
const SubscriptionManagement: React.FC = () => {
  const { t, i18n } = useTranslation(["subscription"]);
  const isLogged = useRequireLogin();

  const { handleInitUser, user, isOwner, isSuperUser } = useAuthContext();
  const navigate = useNavigate();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [sub, setSub] = useState<GetSubscriptionStatusResponse | null>(null);

  // Raw subscription snapshot from API
  const rawSubscription = sub?.subscription ?? null;

  const rawStatusKind: StatusKind = useMemo(() => {
    const raw = String(rawSubscription?.status ?? "");
    if (!raw) return "none";
    return isKnownStatus(raw) ? raw : "unknown";
  }, [rawSubscription?.status]);

  // ISO dates (raw)
  const rawAccessUntilIso = toIso(rawSubscription?.current_period_end);
  const rawEndedAtIso = toIso(rawSubscription?.ended_at);

  // UX rule:
  // If canceled and cancellation is older than 2 months -> behave like "none" (no prior subscription)
  const isStaleCanceled = useMemo(() => {
    if (rawStatusKind !== "canceled") return false;

    // Primary: ended_at. Fallback: period_end.
    const endedRef = rawEndedAtIso ?? rawAccessUntilIso;
    return isOlderThanMonths(endedRef, 2);
  }, [rawStatusKind, rawEndedAtIso, rawAccessUntilIso]);

  // Effective state used by UI
  const subscription = isStaleCanceled ? null : rawSubscription;

  const statusKind: StatusKind = isStaleCanceled ? "none" : rawStatusKind;

  const hasSubscription = Boolean(subscription);
  const isSubscribed = Boolean(sub?.is_subscribed) && !isStaleCanceled;
  const hasAccess = Boolean(sub?.has_access) && !isStaleCanceled;

  const accessUntilIso = toIso(subscription?.current_period_end);
  const endedAtIso = toIso(subscription?.ended_at);

  const cancelAtPeriodEnd = Boolean(subscription?.cancel_at_period_end);

  // NOTE: backend is owner/admin; UI uses owner/superuser. If you have isAdmin in context, add it here.
  const canCheckout = Boolean(isOwner || isSuperUser);
  const canManage = Boolean(hasSubscription && canCheckout);

  const availablePlans = useMemo(() => {
    const isDev = import.meta.env.DEV;
    return isDev
      ? [
          { priceId: "price_1Q01ZhJP9mPoGRyfBocieoN0", label: t("subscription:plan.basic") },
          { priceId: "price_1Q0BQ0JP9mPoGRyfvnYKUjCy", label: t("subscription:plan.premium") },
        ]
      : [
          { priceId: "price_1Q00r4JP9mPoGRyfZjHpSZul", label: t("subscription:plan.basic") },
          { priceId: "price_1Q6OSrJP9mPoGRyfjaNSlrhX", label: t("subscription:plan.premium") },
        ];
  }, [t]);

  const currentPriceId = toIso(subscription?.plan_price_id);

  const currentPlanLabel =
    availablePlans.find((p) => p.priceId === currentPriceId)?.label ??
    toIso(subscription?.plan_nickname) ??
    t("subscription:current.unknown", "Unknown plan");

  // ----- Lifecycle -----
  useEffect(() => {
    document.title = t("subscription:title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const loadStatus = useCallback(async () => {
    setIsProcessing(true);
    try {
      await handleInitUser();
      const resp = await api.getSubscriptionStatus();
      setSub(resp.data);
    } finally {
      setIsProcessing(false);
    }
  }, [handleInitUser]);

  useEffect(() => {
    if (!isOwner) {
      setIsInitialLoading(false);
      return;
    }

    (async () => {
      try {
        await loadStatus();
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [loadStatus, isOwner]);

  // ----- Actions -----
  const startCheckout = useCallback(
    async (priceId: string) => {
      if (!canCheckout || isProcessing) return;
      setIsProcessing(true);
      try {
        const resp = await api.createCheckoutSession(priceId);
        const url = toIso(resp?.data?.url);
        if (url) window.location.href = url;
        else alert(t("subscription:errors.noRedirect", "Couldn't redirect to the payment page."));
      } catch (e) {
        console.error(e);
        alert(t("subscription:errors.checkout", "Payment initialization failed. Please try again later."));
      } finally {
        setIsProcessing(false);
      }
    },
    [canCheckout, isProcessing, t],
  );

  const openCustomerPortal = useCallback(async () => {
    if (!canManage || isProcessing) return;
    setIsProcessing(true);
    try {
      const resp = await api.createCustomerPortalSession();
      const url = toIso(resp?.data?.url);
      if (url) window.location.href = url;
      else alert(t("subscription:errors.noPortal", "Couldn't open the customer portal."));
    } catch (e) {
      console.error(e);
      alert(t("subscription:errors.portal", "Portal redirect failed. Please try again later."));
    } finally {
      setIsProcessing(false);
    }
  }, [canManage, isProcessing, t]);

  // ----- Render helpers (NO hooks) -----
  const renderStatusNotice = () => {
    const accessUntilLabel = fmtDate(accessUntilIso, i18n.language);
    const endedAtLabel = fmtDate(endedAtIso, i18n.language);

    const manageBtn = (
      <Button variant="outline" disabled={!canManage || isProcessing} onClick={openCustomerPortal}>
        {t("subscription:btn.manage", "Manage subscription")}
      </Button>
    );

    const fixPaymentBtn = (
      <Button disabled={!canManage || isProcessing} onClick={openCustomerPortal}>
        {t("subscription:btn.fixPayment", "Fix payment")}
      </Button>
    );

    const reactivateBtn =
      currentPriceId != null ? (
        <Button disabled={!canCheckout || isProcessing} onClick={() => startCheckout(currentPriceId)}>
          {t("subscription:btn.reactivate", "Reactivate")}
        </Button>
      ) : (
        <Button disabled={!canManage || isProcessing} onClick={openCustomerPortal}>
          {t("subscription:btn.reactivate", "Reactivate")}
        </Button>
      );

    switch (statusKind) {
      case "none":
        return (
          <Notice
            tone="neutral"
            title={t("subscription:callout.none.title", "You don't have an active plan yet.")}
            body={t(
              "subscription:callout.none.body",
              "Choose a plan below. You can manage billing anytime from the portal after subscribing.",
            )}
          />
        );

      case "active":
      case "trialing": {
        const title =
          statusKind === "trialing"
            ? t("subscription:callout.trialing.title", "Your trial is running.")
            : t("subscription:callout.active.title", "Your subscription is active.");

        const body = cancelAtPeriodEnd
          ? t(
              "subscription:callout.active.cancelAtBody",
              "Your plan is scheduled to end on {{date}}. You'll keep access until then.",
              { date: accessUntilLabel },
            )
          : t("subscription:callout.active.renewsBody", "Next renewal on {{date}}.", { date: accessUntilLabel });

        return <Notice tone="good" title={title} body={body} actions={canManage ? manageBtn : null} />;
      }

      case "incomplete":
        return (
          <Notice
            tone="warn"
            title={t("subscription:callout.incomplete.title", "Payment still processing.")}
            body={t(
              "subscription:callout.incomplete.body",
              "If you just checked out, it can take a moment to update. If it stays here, open billing to complete payment or update your method.",
            )}
            actions={fixPaymentBtn}
          />
        );

      case "past_due":
        return (
          <Notice
            tone="warn"
            title={t("subscription:callout.pastDue.title", "We couldn't process your last payment.")}
            body={t(
              "subscription:callout.pastDue.body",
              "Update your payment method to avoid service interruption. You can do this securely in the billing portal.",
            )}
            actions={fixPaymentBtn}
          />
        );

      case "unpaid":
        return (
          <Notice
            tone="danger"
            title={t("subscription:callout.unpaid.title", "Your subscription is unpaid.")}
            body={t(
              "subscription:callout.unpaid.body",
              "Billing needs attention. Open the portal to fix payment or re-subscribe to restore access.",
            )}
            actions={fixPaymentBtn}
          />
        );

      case "canceled": {
        const body = endedAtIso
          ? t("subscription:callout.canceled.bodyEnded", "Access ended on {{date}}.", { date: endedAtLabel })
          : t("subscription:callout.canceled.bodyNoAccess", "Access is no longer available. Reactivate anytime.");

        return (
          <Notice
            tone="neutral"
            title={t("subscription:callout.canceled.title", "Your plan is canceled.")}
            body={body}
            actions={
              <>
                {reactivateBtn}
                {canManage ? manageBtn : null}
              </>
            }
          />
        );
      }

      default:
        return (
          <Notice
            tone="neutral"
            title={t("subscription:callout.unknown.title", "Subscription status available.")}
            body={t("subscription:callout.unknown.body", "Open billing to review your subscription details.")}
            actions={canManage ? manageBtn : null}
          />
        );
    }
  };

  const renderPlanAction = (planPriceId: string) => {
    const isCurrent = planPriceId === currentPriceId;

    if (statusKind === "none") {
      return (
        <Button onClick={() => startCheckout(planPriceId)} disabled={!canCheckout || isProcessing}>
          {t("subscription:btn.subscribe", "Subscribe")}
        </Button>
      );
    }

    if (statusKind === "canceled") {
      return (
        <Button onClick={() => startCheckout(planPriceId)} disabled={!canCheckout || isProcessing}>
          {isCurrent ? t("subscription:btn.reactivate", "Reactivate") : t("subscription:btn.subscribe", "Subscribe")}
        </Button>
      );
    }

    if (statusKind === "past_due" || statusKind === "unpaid" || statusKind === "incomplete") {
      return (
        <Button variant="outline" disabled={!canManage || isProcessing} onClick={openCustomerPortal}>
          {t("subscription:btn.fixPayment", "Fix payment")}
        </Button>
      );
    }

    if (statusKind === "active" || statusKind === "trialing") {
      if (isCurrent) {
        return (
          <Button variant="outline" className="!border-gray-200 !text-gray-500" disabled>
            {t("subscription:btn.current", "Current")}
          </Button>
        );
      }
      return (
        <Button variant="outline" disabled={!canManage || isProcessing} onClick={openCustomerPortal}>
          {t("subscription:btn.changeInPortal", "Change in portal")}
        </Button>
      );
    }

    return (
      <Button variant="outline" disabled={!canManage || isProcessing} onClick={openCustomerPortal}>
        {t("subscription:btn.manage", "Manage subscription")}
      </Button>
    );
  };

  // ----- Early returns AFTER hooks -----
  if (!isLogged) return null;

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  if (!isOwner) {
    return (
      <>
        <TopProgress active={isProcessing} variant="top" topOffset={64} />

        <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Header card */}
            <header className="bg-white border border-gray-200 rounded-lg">
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(user?.name)}
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("subscription:header.settings", "Settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("subscription:header.title", "Plan & Billing")}
                  </h1>
                </div>
              </div>
            </header>

            {/* Restricted access message */}
            <section className="mt-6">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-[13px] text-gray-700 mb-4">
                  {t("subscription:errors.ownerOnly", "Only organization owners can manage subscription and billing settings.")}
                </p>
                <Button variant="outline" onClick={() => navigate("/settings/limits")}>
                  {t("subscription:btn.checkLimits", "Check your limits")}
                </Button>
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  const tone = statusTone[statusKind];

  const statusBadge = (
    <Badge tone={tone}>
      {statusKind === "none"
        ? t("subscription:status.none", "No plan")
        : t(`subscription:status.${statusKind}`, humanStatus(statusKind))}
    </Badge>
  );

  const headerBadge = isProcessing ? <Badge>{t("subscription:badge.processing", "Processing…")}</Badge> : null;

  const summaryDateIso: string | undefined = statusKind === "canceled" ? endedAtIso : accessUntilIso;

  const summaryVerb =
    statusKind === "canceled"
      ? t("subscription:current.endedOn", "ended on")
      : cancelAtPeriodEnd
        ? t("subscription:current.cancelAt", "cancels on")
        : t("subscription:current.renews", "renews on");

  return (
    <>
      <TopProgress active={isProcessing} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(user?.name)}
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("subscription:header.settings", "Settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug truncate">
                    {t("subscription:header.title", "Plan & Billing")}
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
              {/* Top bar */}
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {hasSubscription
                    ? t("subscription:section.withPlan", "Your current plan")
                    : t("subscription:section.noPlan", "No active plan")}
                </span>

                <Button variant="outline" disabled={isProcessing} onClick={() => navigate("/settings/limits")}>
                  {t("subscription:btn.checkLimits", "Check your limits")}
                </Button>
              </div>

              {/* Status note */}
              <div className="px-4 py-3">{renderStatusNotice()}</div>

              {/* Summary row */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="text-[13px]">
                    {hasSubscription ? (
                      <>
                        {t("subscription:current.youAreOn", "You are on")}&nbsp;
                        <span className="font-semibold">{currentPlanLabel}</span>

                        <span className="ml-2 text-gray-600">
                          {" "}
                          • {summaryVerb} {fmtDate(summaryDateIso, i18n.language)}
                          {!isSubscribed && (
                            <span className="ml-2 text-gray-500">
                              • {t("subscription:current.notActiveHint", "Not currently active")}
                            </span>
                          )}
                          {!hasAccess && (
                            <span className="ml-2 text-gray-500">
                              • {t("subscription:current.notActiveHint", "Not currently active")}
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      t("subscription:current.noActive", "You don't have an active plan.")
                    )}
                  </div>
                </div>
              </div>

              {/* Plans */}
              <div className="flex flex-col">
                {availablePlans.map((plan) => (
                  <Row key={plan.priceId} left={plan.label} right={renderPlanAction(plan.priceId)} />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default SubscriptionManagement;