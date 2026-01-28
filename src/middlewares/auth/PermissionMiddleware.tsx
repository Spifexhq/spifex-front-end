// src/middlewares/auth/PermissionMiddleware.tsx
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuthContext } from "@/hooks/useAuth";
import { getAccess } from "@/lib/tokens";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Button from "@/shared/ui/Button";

type PermissionBehavior = "hide" | "redirect" | "lock";

type Props = {
  children: ReactNode;
  codeName: string | string[];
  behavior?: PermissionBehavior;
  redirectTo?: string;
  requireAll?: boolean;
};

function getInitials(name?: string): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";

  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "U";
}

export const PermissionMiddleware = ({
  children,
  codeName,
  behavior = "hide",
  redirectTo,
  requireAll = false,
}: Props) => {
  const { t } = useTranslation(["permissionMiddleware"]);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isOwner, permissions, handleInitUser } = useAuthContext();

  const accessToken = getAccess();
  const authReady = !accessToken || !!user;
  const didInit = useRef(false);

  useEffect(() => {
    if (authReady) return;
    if (didInit.current) return;
    didInit.current = true;

    void handleInitUser().catch(() => {});
  }, [authReady, handleInitUser]);

  const hasPermission = useMemo(() => {
    if (!authReady || !user) return false;
    if (isOwner) return true;

    const required = Array.isArray(codeName) ? codeName : [codeName];

    return requireAll
      ? required.every((cn) => permissions.includes(cn))
      : required.some((cn) => permissions.includes(cn));
  }, [authReady, user, isOwner, codeName, requireAll, permissions]);

  if (!authReady) return <TopProgress active variant="center" />;

  if (!hasPermission) {
    // Default behavior used for inline elements (navbar buttons, etc.)
    if (behavior === "hide") return null;

    // For route-level guards: do NOT auto-redirect anymore.
    // Keep refresh UX, optionally allow user to go back manually.
    const target = redirectTo ?? "/settings";
    const showGoBack = behavior === "redirect" && !!redirectTo;

    return (
      <>
        <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Header card (same pattern as subscription page) */}
            <header className="bg-white border border-gray-200 rounded-lg">
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(user?.name)}
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.title")}
                  </h1>
                </div>
              </div>
            </header>

            {/* Restricted access message */}
            <section className="mt-6">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-[13px] text-gray-700 mb-4">{t("message")}</p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate(0)}>
                    {t("btn.refresh")}
                  </Button>

                  {showGoBack && (
                    <Button
                      variant="cancel"
                      onClick={() =>
                        navigate(target, {
                          replace: true,
                          state: { from: location.pathname },
                        })
                      }
                    >
                      {t("btn.goBack")}
                    </Button>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  return <>{children}</>;
};
