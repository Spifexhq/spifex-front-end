// src/middlewares/LocaleProfileMiddleware.tsx
import React, { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { api } from "@/api/requests";
import { isSupportedCountryAlpha2 } from "@/lib/location/countries";
import { isSupportedTimezone } from "@/lib/location/timezonesList";

type Status = "idle" | "loading" | "ready" | "redirecting";

const LOCALE_PAGE = "/locale-setup";
const DEFAULT_REDIRECT_AFTER_READY = "/cashflow";

export const LocaleProfileMiddleware: React.FC<PropsWithChildren> = ({ children }) => {
  const [status, setStatus] = useState<Status>("idle");
  const [shouldRenderChildren, setShouldRenderChildren] = useState(false);
  const didCheckKey = useRef<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname + (location.search || "");
  const isLocalePage = location.pathname === LOCALE_PAGE;

  const returnTo = useMemo(() => {
    return encodeURIComponent(currentPath);
  }, [currentPath]);

  useEffect(() => {
    let mounted = true;
    const checkKey = currentPath;

    if (didCheckKey.current === checkKey) return;
    didCheckKey.current = checkKey;

    setShouldRenderChildren(false);
    setStatus("loading");

    (async () => {
      try {
        const res = await api.getPersonalSettings();

        const tz = String(res?.data?.timezone || "").trim();
        const country = String(res?.data?.country || "").trim().toUpperCase();

        const tzOk =
          tz.length > 0 &&
          tz.toUpperCase() !== "UTC" &&
          isSupportedTimezone(tz);

        const countryOk = isSupportedCountryAlpha2(country);

        const ok = tzOk && countryOk;

        if (!mounted) return;

        if (isLocalePage && ok) {
          setStatus("redirecting");
          navigate(DEFAULT_REDIRECT_AFTER_READY, { replace: true });
          return;
        }

        if (!isLocalePage && !ok) {
          setStatus("redirecting");
          navigate(`${LOCALE_PAGE}?step=locale&return=${returnTo}`, { replace: true });
          return;
        }

        setStatus("ready");
        setShouldRenderChildren(true);
      } catch {
        if (!mounted) return;

        setStatus("ready");
        setShouldRenderChildren(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [currentPath, isLocalePage, navigate, returnTo]);

  if (status === "loading" || status === "redirecting") {
    return <TopProgress active variant="center" />;
  }

  return shouldRenderChildren ? <>{children}</> : null;
};