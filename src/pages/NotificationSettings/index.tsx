/* --------------------------------------------------------------------------
 * File: src/pages/NotificationSettings.tsx
 * Standards aligned with Settings pages:
 * - Flags: isInitialLoading, isSubmitting
 * - Loading UI: PageSkeleton on first load; TopProgress for background/submit
 * - Navbar fixed (page padding pt-16 handled by outer layout)
 * - Light borders, compact labels; no horizontal overflow
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

import Checkbox from "src/components/ui/Checkbox";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import { api } from "src/api/requests";
import {
  NotificationPreference,
  NotificationCategory,
} from "src/models/auth/domain/Notifications";
import { useAuthContext } from "src/hooks/useAuth";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

type CategoryMeta = {
  labelKey: string;
  descriptionKey: string;
};

const CATEGORY_META: Record<NotificationCategory, CategoryMeta> = {
  security: {
    labelKey: "category.security.label",
    descriptionKey: "category.security.description",
  },
  billing: {
    labelKey: "category.billing.label",
    descriptionKey: "category.billing.description",
  },
  product_updates: {
    labelKey: "category.product_updates.label",
    descriptionKey: "category.product_updates.description",
  },
  newsletter: {
    labelKey: "category.newsletter.label",
    descriptionKey: "category.newsletter.description",
  },
  marketing: {
    labelKey: "category.marketing.label",
    descriptionKey: "category.marketing.description",
  },
  reminders: {
    labelKey: "category.reminders.label",
    descriptionKey: "category.reminders.description",
  },
};

/* ------------------------ Card row for one category ----------------------- */
const CategoryRow: React.FC<{
  category: NotificationCategory;
  pref: NotificationPreference | undefined;
  onToggle: (category: NotificationCategory, enabled: boolean) => void;
  disabled?: boolean;
}> = ({ category, pref, onToggle, disabled }) => {
  const { t } = useTranslation("notificationSettings");

  const meta = CATEGORY_META[category];
  const isEnabled = !!pref?.enabled;

  return (
    <div className="flex items-start justify-between px-4 py-3">
      <div className="pr-3">
        <p className="text-[13px] font-medium text-gray-900">
          {t(meta.labelKey)}
        </p>
        <p className="mt-1 text-[12px] text-gray-600">
          {t(meta.descriptionKey)}
        </p>
      </div>
      <div className="mt-1">
        <Checkbox
          checked={isEnabled}
          onChange={(e) => onToggle(category, e.target.checked)}
          disabled={disabled}
          size="sm"
          colorClass="defaultColor"
          aria-label={t(meta.labelKey)}
        />
      </div>
    </div>
  );
};

function getInitials(name?: string) {
  if (!name) return "SC";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/* --------------------------------- Page ---------------------------------- */
const NotificationSettings: React.FC = () => {
  const { t, i18n } = useTranslation("notificationSettings");

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: authUser } = useAuthContext();

  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  /* ------------------------------ Load data ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.getNotificationPreferences();
        setPreferences(data);
      } catch (err) {
        console.error("Error loading notification preferences", err);
        setSnack({
          message: t("toast.loadError"),
          severity: "error",
        });
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [t]);

  /* --------------------------- Helper functions -------------------------- */
  const findPref = useCallback(
    (category: NotificationCategory) =>
      preferences.find(
        (p) => p.category === category && p.channel === "email"
      ),
    [preferences]
  );

  const handleToggle = (category: NotificationCategory, enabled: boolean) => {
    setPreferences((prev) => {
      const existsIdx = prev.findIndex(
        (p) => p.category === category && p.channel === "email"
      );
      if (existsIdx === -1) {
        return [
          ...prev,
          { category, channel: "email", enabled },
        ] as NotificationPreference[];
      }
      const copy = [...prev];
      copy[existsIdx] = { ...copy[existsIdx], enabled };
      return copy;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = preferences.map((p) => ({
        category: p.category,
        enabled: p.enabled,
      }));

      const { data } = await api.updateNotificationPreferences(payload);
      setPreferences(data);
      setHasChanges(false);
      setSnack({
        message: t("toast.saveOk"),
        severity: "success",
      });
    } catch (err) {
      console.error("Error updating notification preferences", err);
      setSnack({
        message: t("toast.saveError"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------ Loading UI ----------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={5} />
      </>
    );
  }

  /* -------------------------------- Render ------------------------------- */
  return (
    <>
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(authUser?.name)}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.notifications")}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          {/* Main card */}
          <section className="mt-6 grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8">
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.email")}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {t("section.emailHint")}
                  </span>
                </div>

                <div className="divide-y divide-gray-200">
                  {(Object.keys(CATEGORY_META) as NotificationCategory[]).map(
                    (category) => (
                      <CategoryRow
                        key={category}
                        category={category}
                        pref={findPref(category)}
                        onToggle={handleToggle}
                        disabled={isSubmitting}
                      />
                    )
                  )}
                </div>

                <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!hasChanges || isSubmitting}
                  >
                    {t("btn.save")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Informational side card */}
            <div className="col-span-12 lg:col-span-4">
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("sidebar.title")}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <p className="text-[12px] text-gray-700">
                    {t("sidebar.description")}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {t("sidebar.note")}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Snackbar */}
        <Snackbar
          open={!!snack}
          onClose={() => setSnack(null)}
          autoHideDuration={5000}
          message={snack?.message}
          severity={snack?.severity}
          anchor={{ vertical: "bottom", horizontal: "center" }}
          pauseOnHover
          showCloseButton
        />
      </main>
    </>
  );
};

export default NotificationSettings;
