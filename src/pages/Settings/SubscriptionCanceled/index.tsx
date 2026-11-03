// ✅ Add a dedicated cancel landing page at: /settings/subscription
// It shows a clean “Checkout canceled” message and provides a button back to
// /settings/subscription-management (and also supports a generic fallback).

// 1) Create the page:
// File: src/pages/Settings/SubscriptionCanceled/index.tsx

import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Button from "@/shared/ui/Button";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const SubscriptionCanceled: React.FC = () => {
  const { t } = useTranslation(["subscription"]);
  const navigate = useNavigate();
  const q = useQuery();

  const checkoutState = (q.get("checkout") || "").toLowerCase();
  const isCanceled = checkoutState === "canceled";

  useEffect(() => {
    document.title = t("subscription:title", "Plan & Billing");
  }, [t]);

  const goBack = () => navigate("/settings/subscription-management", { replace: true });

  return (
    <>
      <TopProgress active={false} variant="top" topOffset={64} />

      <main className="settings-page">
        <div className="settings-content ">
          <section className="rounded-lg border border-gray-200 bg-white overflow-hidden settings-panel">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 settings-panel-heading">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">
                {t("subscription:header.settings", "Settings")}
              </div>
              
            </div>

            <div className="px-5 py-4">
              <div className="rounded-md border border-gray-200 border-l-4 border-l-amber-400 bg-white px-4 py-3">
                <p className="text-[13px] font-medium text-gray-900">
                  {isCanceled
                    ? t("subscription:checkout.canceled.title", "Checkout canceled")
                    : t("subscription:checkout.generic.title", "Checkout update")}
                </p>
                <p className="mt-1 text-[12px] text-gray-600">
                  {isCanceled
                    ? t(
                        "subscription:checkout.canceled.body",
                        "No charges were made. You can try again anytime from subscription management.",
                      )
                    : t(
                        "subscription:checkout.generic.body",
                        "Return to subscription management to continue.",
                      )}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button onClick={goBack}>
                    {t("subscription:checkout.backToPlans", "Back to subscription management")}
                  </Button>

                  <Button variant="outline" onClick={() => navigate("/settings", { replace: true })}>
                    {t("subscription:btn.goSettings", "Go to settings")}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default SubscriptionCanceled;
