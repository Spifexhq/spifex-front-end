// src/pages/Status500/index.tsx (adjust path/name if different)
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import error500 from "@/assets/Images/status/500.svg";
import facebook from "@/assets/Images/status/facebook.svg";
import x from "@/assets/Images/status/x.svg";
import instagram from "@/assets/Images/status/instagram.svg";

import Button from "@/shared/ui/Button";

const Status500: React.FC = () => {
  const { t } = useTranslation(["status500"]);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t("status500:documentTitle");
  }, [t]);

  const handleReturn = () => {
    navigate("/cashflow");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
        <img
          src={error500}
          alt={t("status500:images.errorAlt")}
          className="mb-8 w-72 select-none pointer-events-none"
        />

        <h2 className="mb-4 text-2xl font-semibold sm:text-3xl">
          {t("status500:heading")}
        </h2>

        <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">
          {t("status500:subtitle")}
        </p>

        <Button variant="outline" onClick={handleReturn}>
          {t("status500:actions.backHome")}
        </Button>

        <div className="my-10 h-px w-full max-w-md bg-gray-200" />

        <div className="flex items-center justify-center gap-6">
          <a
            href="https://www.facebook.com/spifexHQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("status500:social.facebook")}
            title={t("status500:social.facebook")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={facebook}
              alt={t("status500:images.facebookAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>

          <a
            href="https://x.com/spifexHQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("status500:social.x")}
            title={t("status500:social.x")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={x}
              alt={t("status500:images.xAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>

          <a
            href="https://instagram.com/spifexhq"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("status500:social.instagram")}
            title={t("status500:social.instagram")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={instagram}
              alt={t("status500:images.instagramAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Status500;
