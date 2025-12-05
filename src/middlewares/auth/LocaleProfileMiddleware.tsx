// src/middlewares/LocaleProfileMiddleware.tsx
import React, { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import { api } from "@/api/requests";
import { isSupportedCountryAlpha2 } from "@/lib/location/countries";
import { isSupportedTimezone } from "@/lib/location/timezonesList";

type Status = "idle" | "loading" | "ready" | "redirecting";

const LOCALE_PAGE = "/locale-setup";
const ALLOWLIST_PREFIXES = [LOCALE_PAGE];

function isAllowlisted(pathname: string) {
  return ALLOWLIST_PREFIXES.some((p) => pathname.startsWith(p));
}

export const LocaleProfileMiddleware: React.FC<PropsWithChildren> = ({ children }) => {
  const [status, setStatus] = useState<Status>("idle");
  const [shouldRenderChildren, setShouldRenderChildren] = useState(false);
  const didCheck = useRef(false);

  const location = useLocation();
  const navigate = useNavigate();

  const returnTo = useMemo(() => {
    const current = location.pathname + (location.search || "");
    return encodeURIComponent(current);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let mounted = true;

    // ✅ PASS-THROUGH when already on /locale-setup to avoid any blocking/redirecting
    if (isAllowlisted(location.pathname)) {
      setStatus("ready");
      setShouldRenderChildren(true);
      return;
    }

    (async () => {
      if (didCheck.current) return;
      didCheck.current = true;

      setStatus("loading");
      try {
        const res = await api.getPersonalSettings();

        const tz = (res?.data?.timezone || "").trim();
        const country = (res?.data?.country || "").trim();

        const tzOk =
          tz.length > 0 &&
          tz.toUpperCase() !== "UTC" &&
          isSupportedTimezone(tz);

        const countryOk = isSupportedCountryAlpha2(country);

        const ok = tzOk && countryOk;

        if (!ok) {
          setStatus("redirecting");
          navigate(`${LOCALE_PAGE}?step=locale&return=${returnTo}`, { replace: true });
          return;
        }

        if (mounted) {
          setStatus("ready");
          setShouldRenderChildren(true);
        }
      } catch {
        if (mounted) {
          setStatus("ready");
          setShouldRenderChildren(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [location.pathname, navigate, returnTo]);

  if (status === "loading" || status === "redirecting") {
    return <TopProgress active variant="center" />;
  }

  return shouldRenderChildren ? <>{children}</> : null;
};
