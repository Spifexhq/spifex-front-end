/* --------------------------------------------------------------------------
 * File: src/pages/SubscriptionManagement.tsx
 * Style: Navbar fixa + SidebarSettings, light borders, compact labels
 * Notes: i18n group "subscription" inside the "settings" namespace
 * Standards:
 *  - Flags: isInitialLoading, isBackgroundSync (unused here), isProcessing
 *  - TopProgress + PageSkeleton on initial; TopProgress during processing
 *  - Header badge when processing
 *  - Esc to close modal, body scroll lock when modal is open
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";
import { useRequireLogin } from "@/hooks/useRequireLogin";

import { useAuth } from "@/api";
import { useAuthContext } from "@/contexts/useAuthContext";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import { InlineLoader } from "@/components/Loaders";

import PaymentButton from "@/components/SubscriptionButtons/PaymentButton";
import ManageSubscriptionLink from "@/components/SubscriptionButtons/ManageSubscriptionLink";
import Button from "src/components/ui/Button";
import { useTranslation } from "react-i18next";

/* --------------------------------- Helpers -------------------------------- */
function getInitials(name?: string) {
  if (!name) return "GP"; // Gestão de Plano
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

const RowPlan = ({
  label,
  action,
}: {
  label: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900 truncate">{label}</p>
    </div>
    {action}
  </div>
);

const SubscriptionManagement: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  const isLogged = useRequireLogin();
  const { handleInitUser } = useAuth();
  const { isSubscribed, activePlanId, user } = useAuthContext();

  /* ------------------------------- Flags ----------------------------------- */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // used for checkout/plan switch flow

  /* ------------------------------- Local ----------------------------------- */
  const [selectedPlanId, setSelectedPlanId] = useState("");

  // Labels come from i18n; price IDs from env
  const availablePlans =
    import.meta.env.VITE_ENVIRONMENT === "development"
      ? [
          { priceId: "price_1Q01ZhJP9mPoGRyfBocieoN0", label: t("settings:subscription.plan.basic") },
          { priceId: "price_1Q0BQ0JP9mPoGRyfvnYKUjCy", label: t("settings:subscription.plan.premium") },
        ]
      : [
          { priceId: "price_1Q00r4JP9mPoGRyfZjHpSZul", label: t("settings:subscription.plan.basic") },
          { priceId: "price_1Q6OSrJP9mPoGRyfjaNSlrhX", label: t("settings:subscription.plan.premium") },
        ];

  const currentPlanLabel =
    availablePlans.find((p) => p.priceId === activePlanId)?.label ??
    t("settings:subscription.current.unknown");

  /* ------------------------------ Bootstrap -------------------------------- */
  useEffect(() => {
    document.title = t("settings:subscription.title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const init = async () => {
      try {
        await handleInitUser();
      } finally {
        setIsInitialLoading(false);
      }
    };
    void init();
  }, [handleInitUser]);

  /* ------------------------------- Modal UX -------------------------------- */
  const closeModal = useCallback(() => {
    if (isProcessing) return;
    setSelectedPlanId("");
  }, [isProcessing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (selectedPlanId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPlanId, closeModal]);

  useEffect(() => {
    document.body.style.overflow = selectedPlanId ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPlanId]);

  /* ------------------------------- Loading UI ------------------------------ */
  if (!isLogged) return null;

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  /* --------------------------------- UI ----------------------------------- */
  const headerBadge = isProcessing ? (
    <span
      aria-live="polite"
      className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm"
    >
      {t("settings:subscription.badge.processing", "Processing…")}
    </span>
  ) : null;

  return (
    <>
      {/* Thin top progress while processing a subscription action */}
      <TopProgress active={isProcessing} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(user?.name)}
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("settings:subscription.header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("settings:subscription.header.title")}
                  </h1>
                </div>
                {headerBadge}
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {isSubscribed
                    ? t("settings:subscription.section.withPlan")
                    : t("settings:subscription.section.noPlan")}
                </span>
              </div>

              <div className="divide-y divide-gray-200">
                {isSubscribed ? (
                  <>
                    {/* Plano atual */}
                    <RowPlan
                      label={
                        <>
                          {t("settings:subscription.current.youAreOn")}&nbsp;
                          <span className="font-semibold">{currentPlanLabel}</span>
                        </>
                      }
                    />

                    {/* Linhas de planos para trocar */}
                    {availablePlans.map((plan) => (
                      <RowPlan
                        key={plan.priceId}
                        label={plan.label}
                        action={
                          <Button
                            variant="outline"
                            className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                            disabled={plan.priceId === activePlanId || isProcessing}
                            onClick={() => setSelectedPlanId(plan.priceId)}
                          >
                            {plan.priceId === activePlanId
                              ? t("settings:subscription.btn.current")
                              : t("settings:subscription.btn.select")}
                          </Button>
                        }
                      />
                    ))}

                    {/* Ações de gestão (o botão interno já trata rótulos/fluxo) */}
                    <div className="px-4 py-3">
                      <ManageSubscriptionLink />
                    </div>
                  </>
                ) : (
                  <>
                    {availablePlans.map((plan) => (
                      <RowPlan
                        key={plan.priceId}
                        label={plan.label}
                        action={
                          <PaymentButton
                            priceId={plan.priceId}
                            label={t("settings:subscription.btn.subscribe")}
                          />
                        }
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal de confirmação ------------------------------ */}
        {selectedPlanId && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            {/* Sem onClick no backdrop → não fecha ao clicar fora */}
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center h-32">
                  <InlineLoader />
                </div>
              ) : (
                <>
                  <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                    <h3 className="text-[14px] font-semibold text-gray-800">
                      {t("settings:subscription.modal.title")}
                    </h3>
                    <button
                      className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                      onClick={closeModal}
                      aria-label={t("settings:subscription.modal.close")}
                    >
                      &times;
                    </button>
                  </header>

                  <p className="text-[13px] text-gray-700 mb-4">
                    {t("settings:subscription.modal.text")}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={closeModal}
                      disabled={isProcessing}
                    >
                      {t("settings:subscription.btn.cancel")}
                    </Button>
                    <PaymentButton
                      priceId={selectedPlanId}
                      label={t("settings:subscription.btn.confirm")}
                      onProcessingChange={setIsProcessing}
                    />
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
