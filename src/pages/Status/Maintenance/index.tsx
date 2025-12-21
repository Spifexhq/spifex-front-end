// src/pages/StatusMaintenance/index.tsx
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import maintenance from "@/assets/Images/status/maintenance.svg";
import facebook from "@/assets/Images/status/facebook.svg";
import x from "@/assets/Images/status/x.svg";
import instagram from "@/assets/Images/status/instagram.svg";

const StatusMaintenance: React.FC = () => {
  const { t } = useTranslation(["statusMaintenance"]);

  useEffect(() => {
    document.title = t("statusMaintenance:documentTitle");
  }, [t]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
        <img
          src={maintenance}
          alt={t("statusMaintenance:images.maintenanceAlt")}
          className="mb-10 w-72 select-none pointer-events-none"
        />

        <h2 className="mb-2 text-3xl font-semibold">
          {t("statusMaintenance:heading")}
        </h2>

        <p className="text-sm text-gray-600 sm:text-base">
          {t("statusMaintenance:subtitle")}
        </p>

        <div className="my-10 h-px w-full max-w-md bg-gray-200" />

        <div className="flex items-center justify-center gap-6">
          <a
            href="https://www.facebook.com/spifexHQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("statusMaintenance:social.facebook")}
            title={t("statusMaintenance:social.facebook")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={facebook}
              alt={t("statusMaintenance:images.facebookAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>

          <a
            href="https://x.com/spifexHQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("statusMaintenance:social.x")}
            title={t("statusMaintenance:social.x")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={x}
              alt={t("statusMaintenance:images.xAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>

          <a
            href="https://instagram.com/spifexhq"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("statusMaintenance:social.instagram")}
            title={t("statusMaintenance:social.instagram")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:scale-110 hover:bg-gray-50"
          >
            <img
              src={instagram}
              alt={t("statusMaintenance:images.instagramAlt")}
              className="h-5 w-5 select-none pointer-events-none"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default StatusMaintenance;
