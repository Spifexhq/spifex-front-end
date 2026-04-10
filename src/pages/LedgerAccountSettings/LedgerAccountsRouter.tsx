// src\pages\LedgerAccountSettings\LedgerAccountsRouter.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import TopProgress from "@/shared/ui/Loaders/TopProgress";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";

import { api } from "@/api/requests";

import LedgerAccountsGate from "./LedgerAccountsGate";
import LedgerAccountSettingsPage from "./index";

import type { OrgLedgerProfileResponse } from "@/models/auth/organization";

type View = "loading" | "gate" | "settings";

const DEFAULT_PROFILE: OrgLedgerProfileResponse = {
  mode: "organizational",
  default_template: "",
  language_code: "",
  use_compact_cashflow_view: false,
  auto_bootstrapped_at: null,
};

const LedgerAccountsRouter: React.FC = () => {
  const location = useLocation();

  const [view, setView] = useState<View>("loading");
  const [profile, setProfile] = useState<OrgLedgerProfileResponse>(DEFAULT_PROFILE);

  const isRegisterRoute = location.pathname.endsWith("/register/ledger-accounts");

  useEffect(() => {
    let cancelled = false;
    setView("loading");

    (async () => {
      try {
        const [profileRes, existsRes] = await Promise.all([
          api.getOrgLedgerProfile().catch(() => ({ data: DEFAULT_PROFILE })),
          api.getLedgerAccountsExists().catch(() => ({ data: { exists: false } })),
        ]);

        if (cancelled) return;

        const nextProfile = profileRes.data || DEFAULT_PROFILE;
        const exists = !!existsRes.data?.exists;

        setProfile(nextProfile);
        setView(exists ? "settings" : "gate");
      } catch {
        if (!cancelled) {
          setProfile(DEFAULT_PROFILE);
          setView("gate");
        }
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
        <PageSkeleton rows={8} />
      </>
    );
  }

  if (view === "gate") {
    if (isRegisterRoute) {
      return (
        <LedgerAccountsGate
          ledgerMode={profile.mode}
          compact={profile.use_compact_cashflow_view}
          languageCode={profile.language_code}
        />
      );
    }

    return <Navigate to="/settings/register/ledger-accounts" replace />;
  }

  if (isRegisterRoute) {
    return <Navigate to="/settings/ledger-accounts" replace />;
  }

  return (
    <LedgerAccountSettingsPage
      ledgerProfile={profile}
      key={`${profile.mode}:${profile.use_compact_cashflow_view ? "compact" : "full"}`}
    />
  );
};

export default LedgerAccountsRouter;
