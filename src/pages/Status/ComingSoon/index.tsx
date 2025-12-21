// src/pages/StatusComingSoon/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import comingSoon from "@/assets/Images/status/coming-soon.svg";
import facebook from "@/assets/Images/status/facebook.svg";
import x from "@/assets/Images/status/x.svg";
import instagram from "@/assets/Images/status/instagram.svg";
import Button from "src/components/ui/Button";

interface TimeLeft {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

const TARGET_DATE = new Date("2025-12-31T23:59:59");

const StatusComingSoon: React.FC = () => {
  const { t } = useTranslation(["statusComingSoon"]);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t("statusComingSoon:documentTitle");
  }, [t]);

  const calculateTimeLeft = (): TimeLeft => {
    const difference = +TARGET_DATE - +new Date();
    if (difference <= 0) return {};

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeOrder: (keyof TimeLeft)[] = useMemo(
    () => ["days", "hours", "minutes", "seconds"],
    []
  );

  const hasTimeLeft = timeOrder.some((k) => typeof timeLeft[k] === "number");

  const handleReturn = () => {
    navigate("/cashflow");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
        <img
          src={comingSoon}
          alt={t("statusComingSoon:images.comingSoonAlt")}
          className="mb-10 w-64 select-none pointer-events-none"
        />

        <h1 className="mb-2 text-4xl font-bold">{t("statusComingSoon:heading")}</h1>

        <p className="mb-6 max-w-lg text-sm text-gray-600 sm:text-base">
          {t("statusComingSoon:subtitle")}
        </p>

        <div className="mb-8 grid w-full max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
          {hasTimeLeft ? (
            timeOrder.map((interval) => {
              const value = timeLeft[interval];
              if (value === undefined) return null;

              return (
                <div
                  key={interval}
                  className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm"
                >
                  <div className="text-3xl font-bold tabular-nums text-gray-900">
                    {value}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-600">
                    {t(`statusComingSoon:timer.${interval}`)}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-2 text-sm font-semibold text-red-600 sm:col-span-4">
              {t("statusComingSoon:timer.expired")}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleReturn}
        >
          {t("statusComingSoon:actions.back")}
        </Button>

        <div className="my-10 h-px w-full max-w-md bg-gray-200" />

        <div className="flex items-center justify-center gap-6">
          <a
            href="https://www.facebook.com/spifexHQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("statusComingSoon:social.facebook")}
            title={t("statusComingSoon:social.facebook")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={facebook}
              alt={t("statusComingSoon:images.facebookAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>

          <a
            href="https://x.com/spifexHQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("statusComingSoon:social.x")}
            title={t("statusComingSoon:social.x")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={x}
              alt={t("statusComingSoon:images.xAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>

          <a
            href="https://instagram.com/spifexhq"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("statusComingSoon:social.instagram")}
            title={t("statusComingSoon:social.instagram")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={instagram}
              alt={t("statusComingSoon:images.instagramAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default StatusComingSoon;
