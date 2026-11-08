import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isCancel } from "axios";
import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import type { EntitlementLimitItem, GetEntitlementLimitsResponse } from "@/models/auth/entitlements";
import type { PersonalPermission } from "./permissions";

type AccessContextValue = {
  loading: boolean;
  error: string | null;
  plan: GetEntitlementLimitsResponse["plan"] | null;
  items: EntitlementLimitItem[];
  can: (permission: PersonalPermission) => boolean;
  canUse: (permission: PersonalPermission, units?: number, currentCount?: number) => boolean;
  entitlement: (permission: PersonalPermission) => EntitlementLimitItem | undefined;
  refresh: () => void;
};

const PersonalAccessContext = createContext<AccessContextValue | null>(null);

export function PersonalAccessProvider({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  const workspace = auth.organization?.organization;
  const organizationId = workspace?.id ?? "";
  const product = workspace?.product_category;
  const selectedPlan = workspace?.selected_plan_code ?? "";
  const permissionsKey = auth.permissions.join("\u0000");
  const scopeKey = `${auth.user?.id ?? ""}:${organizationId}:${product ?? ""}:${selectedPlan}:${permissionsKey}`;
  const [data, setData] = useState<GetEntitlementLimitsResponse | null>(null);
  const [dataKey, setDataKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion(value => value + 1);
  }, []);

  useEffect(() => {
    if (!auth.isAuthResolved) return;
    let active = true;
    const read = async () => {
      setLoading(true);
      setError(null);
      if (product !== "personal" || !auth.isLogged || !organizationId) {
        if (active) { setData(null); setDataKey(scopeKey); setLoading(false); }
        return;
      }
      try {
        let response: Awaited<ReturnType<typeof api.getEntitlementLimits>> | undefined;
        for (let attempt = 0; attempt < 3; attempt++) {
          try { response = await api.getEntitlementLimits(); break; }
          catch (cause) {
            if (!active) return;
            const cancelled = isCancel(cause) || (cause && typeof cause === "object" && (cause as { code?: string }).code === "ERR_CANCELED");
            if (!cancelled || attempt === 2) throw cause;
          }
        }
        if (!response || !active) return;
        if (!response.data.plan.code.startsWith("personal-")) throw new Error("The active workspace returned a plan for a different product.");
        if (active) { setData(response.data); setDataKey(scopeKey); }
      } catch (cause) {
        if (active) {
          const cancelled = isCancel(cause) || (cause && typeof cause === "object" && (cause as { code?: string }).code === "ERR_CANCELED");
          if (cancelled) {
            // The active identity can be committed a render after an older
            // request is cancelled. Keep routes gated and retry against the
            // committed workspace instead of treating cancellation as denial.
            setData(null);
            setDataKey("");
            setVersion(value => value + 1);
            return;
          }
          setData(null);
          setDataKey(scopeKey);
          setError(cause instanceof Error ? cause.message : "Could not load Personal access settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void read();
    return () => { active = false; };
  }, [auth.isAuthResolved, auth.isLogged, organizationId, permissionsKey, product, scopeKey, selectedPlan, version]);

  const scopedData = dataKey === scopeKey ? data : null;
  const scopedLoading = dataKey !== scopeKey || loading;
  const scopedError = dataKey === scopeKey ? error : null;
  const byCode = useMemo(() => new Map(scopedData?.items.map(item => [item.permission.code, item]) ?? []), [scopedData]);
  const can = useCallback((permission: PersonalPermission) => {
    if (auth.isSuperUser && product === "personal") return true;
    if (scopedLoading || scopedError || !scopedData) return false;
    const hasMembershipPermission = auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
    return hasMembershipPermission && byCode.has(permission);
  }, [auth.isOwner, auth.isSuperUser, auth.permissions, byCode, product, scopedData, scopedError, scopedLoading]);
  const entitlement = useCallback((permission: PersonalPermission) => byCode.get(permission), [byCode]);
  const canUse = useCallback((permission: PersonalPermission, units = 1, currentCount?: number) => {
    if (auth.isSuperUser && product === "personal") return true;
    if (!can(permission)) return false;
    const item = byCode.get(permission);
    if (!item || !item.limits.enforce || item.limits.unmetered) return true;
    if (item.limits.period === "lifetime" && currentCount !== undefined) {
      return currentCount + units <= (item.limits.limit ?? Number.POSITIVE_INFINITY);
    }
    return item.usage.remaining === null || item.usage.remaining >= units;
  }, [auth.isSuperUser, byCode, can, product]);
  const value = useMemo(() => ({
    loading: scopedLoading,
    error: scopedError,
    plan: scopedData?.plan ?? null,
    items: scopedData?.items ?? [],
    can,
    canUse,
    entitlement,
    refresh,
  }), [can, canUse, entitlement, refresh, scopedData, scopedError, scopedLoading]);

  return <PersonalAccessContext.Provider value={value}>{children}</PersonalAccessContext.Provider>;
}

export function usePersonalAccess() {
  const value = useContext(PersonalAccessContext);
  if (!value) throw new Error("usePersonalAccess must be used within PersonalAccessProvider.");
  return value;
}

export function useOptionalPersonalAccess() {
  return useContext(PersonalAccessContext);
}
