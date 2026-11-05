import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { needsLocaleSetup, safeSetupReturn } from "@/lib/localeSetup";
import type { ConfigurationStatus } from "@/models/auth/configuration";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Button from "@/shared/ui/Button";

type Props = PropsWithChildren<{ configuration: ConfigurationStatus | null; loading: boolean; failed: boolean; retry(): Promise<void> }>;

export const LocaleProfileMiddleware = ({ children, configuration, loading, failed, retry }: Props) => {
  const { isOwner } = useAuthContext();
  const { t } = useTranslation("personalLocaleSetup");
  const location = useLocation();
  if (loading || (!configuration && !failed)) return <TopProgress active variant="center" />;
  // A failed prerequisite check must never expose the application shell.
  if (!configuration) return <main className="grid min-h-dvh place-items-center bg-white p-6"><div className="max-w-sm space-y-4 text-center"><p className="text-sm text-slate-600">{t("toastLoadError")}</p><Button variant="outline" onClick={() => { void retry().catch(() => undefined); }}>{t("retry")}</Button></div></main>;
  const setup = location.pathname === "/locale-setup";
  if (needsLocaleSetup(configuration, isOwner) && !setup) return <Navigate replace to={`/locale-setup?return=${encodeURIComponent(location.pathname + location.search)}`} />;
  if (!needsLocaleSetup(configuration, isOwner) && setup) return <Navigate replace to={safeSetupReturn(new URLSearchParams(location.search).get("return"))} />;
  return <>{children}</>;
};
