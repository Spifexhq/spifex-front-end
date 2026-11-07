import { configurationAfterFailure, isSetupRequestCancelled } from "@/lib/localeSetup";
import { isCancel } from "axios";
import { lazy, Suspense, useState, useEffect, type FC, useCallback, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";
import { AuthMiddleware, LocaleProfileMiddleware } from "@/middlewares";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
const ApplicationShell = lazy(() => import("../../../products/business/layouts/ApplicationShell"));
import { CookieBanner } from "@/components/Cookies/CookieBanner";
import { api } from "@/core/api/requests";
import type { ConfigurationStatus } from "@/models/auth/configuration";
import { AUTH_SYNC_EVENT } from "@/core/api/http";

export const SpifexLayout: FC = () => {
  const { handleInitUser, user, organization } = useAuthContext();
  const { pathname } = useLocation();
  const personalProduct = organization?.organization?.product_category === "personal";
  const identityKey = `${user?.id || ""}:${organization?.organization?.id || ""}`;
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [snapshot, setSnapshot] = useState<{ key: string; data: ConfigurationStatus | null } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const validatedAt = useRef(0);
  const sequence = useRef(0);
  const inFlight = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const loadConfiguration = useCallback((force = false): Promise<void> => {
    if (!force && inFlight.current?.key === identityKey) return inFlight.current.promise;
    const version = ++sequence.current;
    setPendingKey(identityKey);
    setFailedKey(null);
    const promise = (async () => {
      try {
        // Auth initialization can invalidate an otherwise normal in-flight read.
        // Retry that cancellation within the same loading state, not as an error.
        let response: Awaited<ReturnType<typeof api.getConfigurationStatus>> | undefined;
        for (let attempt = 0; attempt < 3; attempt++) {
          try { response = await api.getConfigurationStatus(); break; }
          catch (error) { if (!(isCancel(error) || isSetupRequestCancelled(error)) || attempt === 2 || version !== sequence.current) throw error; }
        }
        if (!response) return;
        const { data } = response;
        if (version === sequence.current) { setSnapshot({ key: identityKey, data }); validatedAt.current = Date.now(); }
      } catch (error) {
        if (version === sequence.current && !isCancel(error) && !isSetupRequestCancelled(error)) { const status = (error as { status?: number })?.status;
          // A temporary background failure cannot destroy an already validated
          // same-workspace tree. Explicit access denials still remove access.
          setSnapshot(previous => configurationAfterFailure(previous, identityKey, status));
          setFailedKey(identityKey); }
        throw error;
      } finally { if (version === sequence.current) { inFlight.current = null; setPendingKey(null); } }
    })();
    inFlight.current = { key: identityKey, promise };
    return promise;
  }, [identityKey]);

  useEffect(() => {
    let active = true;
    void handleInitUser().catch(() => undefined).finally(() => { if (active) setLoadingAuth(false); });
    return () => { active = false; };
  }, [handleInitUser]);

  useEffect(() => {
    if (!loadingAuth && user?.id) void loadConfiguration().catch(() => undefined);
  }, [loadingAuth, user?.id, loadConfiguration]);

  useEffect(() => {
    if (loadingAuth || !user?.id) return;
    const sync = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason || "";
      const relevant = ["ws:onboarding.updated", "ws:profile.updated", "ws_connected", "connection_recovered"].includes(reason);
      if (relevant || (reason === "focus_revalidated" && Date.now() - validatedAt.current >= 300_000)) void loadConfiguration().catch(() => undefined);
    };
    window.addEventListener(AUTH_SYNC_EVENT, sync);
    return () => window.removeEventListener(AUTH_SYNC_EVENT, sync);
  }, [loadConfiguration, loadingAuth, user?.id]);

  const configuration = snapshot?.key === identityKey ? snapshot.data : null;
  const failed = failedKey === identityKey;
  const loading = retrying || (pendingKey === identityKey && !configuration) || (!configuration && !failed);
  const retry = async () => { setRetrying(true); try { await loadConfiguration(); } finally { setRetrying(false); } };
  if (loadingAuth) return <TopProgress active variant="center" />;
  if (personalProduct && !pathname.startsWith("/personal") && pathname !== "/locale-setup") return <Navigate replace to="/personal/overview" />;
  return <AuthMiddleware>
    <LocaleProfileMiddleware configuration={configuration} loading={loading} failed={failed} retry={retry}>
      {pathname === "/locale-setup" ? <Outlet key={identityKey} context={{ configuration, refreshConfiguration: () => loadConfiguration(true) }} /> : personalProduct ? <Outlet key={identityKey} /> : <Suspense fallback={<TopProgress active variant="center" />}><ApplicationShell onboarding={configuration} showOnboardingWarning={!!configuration && configuration.completed !== true}><Outlet /></ApplicationShell></Suspense>}
      <CookieBanner />
    </LocaleProfileMiddleware>
  </AuthMiddleware>;
};
export default SpifexLayout;
