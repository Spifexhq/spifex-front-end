// src/middlewares/auth/PermissionMiddleware.tsx
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import type { RootState } from "@/redux/store";
import { getAccess } from "@/lib/tokens";

type PermissionBehavior = "hide" | "redirect" | "lock";

type Props = {
  children: ReactNode;
  codeName: string | string[];
  behavior?: PermissionBehavior;
  redirectTo?: string;
  requireAll?: boolean;
};

export const PermissionMiddleware = ({
  children,
  codeName,
  behavior = "hide",
  redirectTo,
  requireAll = false,
}: Props) => {
  const { t } = useTranslation(["permissionMiddleware"]);
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector((s: RootState) => s.auth.user);
  const isOwner = useSelector((s: RootState) => s.auth.organization?.is_owner ?? false);
  const permissions = useSelector((s: RootState) => s.auth.permissions);

  const accessToken = getAccess();
  const authReady = !accessToken || !!user;

  const hasPermission = useMemo(() => {
    if (!authReady || !user) return false;
    if (isOwner) return true;

    const required = Array.isArray(codeName) ? codeName : [codeName];
    return requireAll
      ? required.every((cn) => permissions.includes(cn))
      : required.some((cn) => permissions.includes(cn));
  }, [authReady, user, isOwner, codeName, requireAll, permissions]);

  const didNavigate = useRef(false);

  useEffect(() => {
    if (!authReady) return;
    if (hasPermission) return;
    if (behavior !== "redirect") return;

    const target = redirectTo ?? "/";
    if (!didNavigate.current && location.pathname !== target) {
      didNavigate.current = true;
      navigate(target, { replace: true });
    }
  }, [authReady, hasPermission, behavior, redirectTo, location.pathname, navigate]);

  if (!authReady) return null;

  if (!hasPermission) {
    if (behavior === "lock") {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center">
            <img
              alt={t("permissionMiddleware:lock.alt")}
              src="src/assets/Images/status/lock.svg"
              className="my-6 h-52"
            />
            <h1 className="text-lg font-semibold">{t("permissionMiddleware:lock.title")}</h1>
            <h2 className="mb-6 text-sm font-medium">{t("permissionMiddleware:lock.subtitle")}</h2>
            <button
              type="button"
              onClick={() => navigate(0)}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm border border-gray-200 bg-gray-900 text-white hover:opacity-90 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              {t("permissionMiddleware:lock.btn.refresh")}
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
};
