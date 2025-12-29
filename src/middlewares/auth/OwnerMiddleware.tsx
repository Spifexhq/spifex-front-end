import { type ReactElement, useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuthContext } from "@/hooks/useAuth";
import { getAccess } from "@/lib/tokens";
import TopProgress from "@/components/ui/Loaders/TopProgress";

type OwnerBehavior = "hide" | "redirect" | "lock";

interface OwnerMiddlewareProps {
  children: ReactElement;
  behavior?: OwnerBehavior;
  redirectTo?: string;
  loginRedirectTo?: string;
}

const LockIcon: React.FC<{ className?: string; title?: string }> = ({ className, title }) => (
  <svg
    className={className}
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label={title ?? "Locked"}
  >
    {title ? <title>{title}</title> : null}

    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="
        M44 52V36
        C44 24.9543 52.9543 16 64 16
        C75.0457 16 84 24.9543 84 36
        V52H44Z

        M54 52V36
        C54 30.4772 58.4772 26 64 26
        C69.5228 26 74 30.4772 74 36
        V52H54Z
      "
      fill="currentColor"
    />
    <rect x="24" y="48" width="80" height="68" rx="16" fill="currentColor" />
    <circle cx="64" cy="84" r="8" fill="#FFFFFF" />
  </svg>
);

export const OwnerMiddleware = ({
  children,
  behavior = "redirect",
  redirectTo,
  loginRedirectTo,
}: OwnerMiddlewareProps) => {
  const { t } = useTranslation(["ownerMiddleware"]);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isOwner, handleInitUser } = useAuthContext();

  const accessToken = getAccess();
  const authReady = !accessToken || !!user;

  const didInit = useRef(false);
  useEffect(() => {
    if (authReady) return;
    if (didInit.current) return;
    didInit.current = true;

    void handleInitUser().catch(() => {
    });
  }, [authReady, handleInitUser]);

  if (!authReady) return <TopProgress active variant="center" />;

  if (!accessToken || !user) {
    return (
      <Navigate
        to={loginRedirectTo ?? "/signin"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!isOwner) {
    if (behavior === "redirect") {
      return (
        <Navigate
          to={redirectTo ?? "/settings/personal"}
          replace
          state={{ from: location.pathname }}
        />
      );
    }

    if (behavior === "lock") {
      const target = redirectTo ?? "/settings/personal";

      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center">
            <LockIcon
              title={t("lock.alt")}
              className="my-6 h-56 w-56 text-gray-900"
            />

            <h1 className="text-lg font-semibold">{t("lock.title")}</h1>
            <h2 className="mb-6 text-sm font-medium">{t("lock.subtitle")}</h2>

            <button
              type="button"
              onClick={() => navigate(target, { replace: true })}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm border border-gray-200 bg-gray-900 text-white hover:opacity-90 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              {t("lock.btn.goToSettings")}
            </button>
          </div>
        </div>
      );
    }

    // hide
    return null;
  }

  return children;
};
