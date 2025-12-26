/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountSettings/LedgerAccountsRouter.tsx
 * i18n: namespace "ledgerAccounts"
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";

import TopProgress from "@/components/ui/Loaders/TopProgress";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";

import { api } from "src/api/requests";

import LedgerAccountsGate from "./LedgerAccountsGate";
import LedgerAccountSettings from "./index";

type View = "loading" | "gate" | "settings";

const LedgerAccountsRouter: React.FC = () => {
  const { t, i18n } = useTranslation("ledgerAccountsGate");
  const [view, setView] = useState<View>("loading");
  const location = useLocation();

  const isRegisterRoute = location.pathname.endsWith("/register/ledger-accounts");

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    let cancelled = false;

    setView("loading");

    (async () => {
      try {
        const { data } = await api.getLedgerAccountsExists();
        const any = !!data?.exists;

        if (!cancelled) setView(any ? "settings" : "gate");
      } catch {
        if (!cancelled) setView("gate");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (view === "loading") {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  if (view === "gate") {
    if (isRegisterRoute) return <LedgerAccountsGate />;
    return <Navigate to="/settings/register/ledger-accounts" replace />;
  }

  if (isRegisterRoute) return <Navigate to="/settings/ledger-accounts" replace />;

  return <LedgerAccountSettings />;
};

export default LedgerAccountsRouter;
