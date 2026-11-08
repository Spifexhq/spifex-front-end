import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  const [data, setData] = useState<GetEntitlementLimitsResponse | null>(null);
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
        if (active) { setData(null); setLoading(false); }
        return;
      }
      try {
        const response = await api.getEntitlementLimits();
        if (!response.data.plan.code.startsWith("personal-")) throw new Error("The active workspace returned a plan for a different product.");
        if (active) setData(response.data);
      } catch (cause) {
        if (active) {
          setData(null);
          setError(cause instanceof Error ? cause.message : "Could not load Personal access settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void read();
    return () => { active = false; };
  }, [auth.isAuthResolved, auth.isLogged, organizationId, permissionsKey, product, selectedPlan, version]);

  const byCode = useMemo(() => new Map(data?.items.map(item => [item.permission.code, item]) ?? []), [data]);
  const can = useCallback((permission: PersonalPermission) => {
    if (auth.isSuperUser && product === "personal") return true;
    if (loading || error || !data) return false;
    const hasMembershipPermission = auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
    return hasMembershipPermission && byCode.has(permission);
  }, [auth.isOwner, auth.isSuperUser, auth.permissions, byCode, data, error, loading, product]);
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
    loading,
    error,
    plan: data?.plan ?? null,
    items: data?.items ?? [],
    can,
    canUse,
    entitlement,
    refresh,
  }), [can, canUse, data, entitlement, error, loading, refresh]);

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
