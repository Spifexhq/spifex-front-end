/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountSettings/LedgerAccountsRouter.tsx
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";

import TopProgress from "@/components/ui/Loaders/TopProgress";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";

import { api } from "src/api/requests";
import type { GetLedgerAccountsResponse } from "src/models/enterprise_structure/dto";

import LedgerAccountsGate from "./LedgerAccountsGate";
import LedgerAccountSettings from "./index";

type View = "loading" | "gate" | "settings";

const LedgerAccountsRouter: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  const [view, setView] = useState<View>("loading");
  const location = useLocation();

  // Are we on /settings/register/ledger-accounts?
  const isRegisterRoute = location.pathname.endsWith("/register/ledger-accounts");

  // Page meta (title + html lang)
  useEffect(() => {
    document.title = t("settings:ledgerAccounts.title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Decide if there are any GL accounts
  useEffect(() => {
    let cancelled = false;

    // Every time the ledger-accounts URL changes, re-check
    setView("loading");

    (async () => {
      try {
        const { data } = (await api.getLedgerAccounts({
          page_size: 1,
        })) as { data: GetLedgerAccountsResponse };

        const list = data?.results ?? [];
        const any = Array.isArray(list) && list.length > 0;

        if (!cancelled) {
          setView(any ? "settings" : "gate");
        }
      } catch {
        // On error, safest is to assume "no accounts yet" → gate
        if (!cancelled) setView("gate");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]); // 🔴 key change: depend on pathname

  if (view === "loading") {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  // ─────────────────────────── No accounts (view === "gate") ───────────────────────────
  if (view === "gate") {
    if (isRegisterRoute) {
      // Already on /settings/register/ledger-accounts → show the gate
      return <LedgerAccountsGate />;
    }

    // On /settings/ledger-accounts but no accounts → move URL to register/ledger-accounts
    return <Navigate to="/settings/register/ledger-accounts" replace />;
  }

  // ─────────────────────────── Accounts exist (view === "settings") ─────────────────────
  if (isRegisterRoute) {
    // There ARE accounts, but user is on /settings/register/ledger-accounts → send to listing
    return <Navigate to="/settings/ledger-accounts" replace />;
  }

  // There ARE accounts and path is /settings/ledger-accounts → show settings page
  return <LedgerAccountSettings />;
};

export default LedgerAccountsRouter;
