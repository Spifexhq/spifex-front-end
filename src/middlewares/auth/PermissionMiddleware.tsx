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
  requireSubscription?: boolean;
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
  requireSubscription = false,
}: Props) => {
  const { t } = useTranslation(["permissionMiddleware"]);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    user,
    isOwner,
    isSuperUser,
    permissions,
    isSubscribed,
    handleInitUser,
  } = useAuthContext();

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

    if (isOwner || isSuperUser) return true;

    const required = Array.isArray(codeName) ? codeName : [codeName];

    return requireAll
      ? required.every((cn) => permissions.includes(cn))
      : required.some((cn) => permissions.includes(cn));
  }, [authReady, user, isOwner, isSuperUser, codeName, requireAll, permissions]);

  const hasSubscriptionAccess = useMemo(() => {
    if (!authReady || !user) return false;
    if (isSuperUser) return true;
    if (!requireSubscription) return true;
    return !!isSubscribed;
  }, [authReady, user, isSuperUser, requireSubscription, isSubscribed]);

  const hasAccess = hasPermission && hasSubscriptionAccess;

  if (!authReady) return <TopProgress active variant="center" />;

  if (!hasAccess) {
    if (behavior === "hide") return null;

    const target = redirectTo ?? "/settings";
    const showGoBack = behavior === "redirect" && !!redirectTo;

    const message = !hasPermission
      ? t("message")
      : t(
          "subscriptionMessage",
          "Your current plan does not include access to this feature."
        );

    return (
      <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <header className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700">
                {getInitials(user?.name)}
              </div>

              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("header.settings")}
                </div>
                <h1 className="leading-snug text-[16px] font-semibold text-gray-900">
                  {t("header.title")}
                </h1>
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-4 text-[13px] text-gray-700">{message}</p>

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
    );
  }

  return <>{children}</>;
};