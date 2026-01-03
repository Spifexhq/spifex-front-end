// src/pages/PersonalLocaleSetup/index.tsx
/* Standalone page: /locale-setup */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import TopProgress from "@/shared/ui/Loaders/TopProgress";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Snackbar from "@/shared/ui/Snackbar";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { api } from "@/api/requests";
import { useAuth } from "@/api";
import { TIMEZONES } from "@/lib/location/timezonesList";
import { formatTimezoneLabel } from "@/lib/location/formatTimezoneLabel";
import type { TimezoneOption } from "@/lib/location/timezonesList";
import { getCountries, CountryOption } from "@/lib/location/countries";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type PersonalSettingsModel = {
  name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  department?: string;
  timezone: string;
  country?: string; // "US" | "PT" | ...
};

const PersonalLocaleSetup: React.FC = () => {
  const { t, i18n } = useTranslation("personalLocaleSetup");
  const navigate = useNavigate();
  const { search } = useLocation();
  const { handleSignOut } = useAuth();

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const step = params.get("step");
  const returnTo = params.get("return");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const COUNTRIES = useMemo<CountryOption[]>(() => getCountries(i18n.language), [i18n.language]);

  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [tzSelected, setTzSelected] = useState<TimezoneOption[]>([]);
  const [countrySelected, setCountrySelected] = useState<CountryOption[]>([]);
  const [form, setForm] = useState<PersonalSettingsModel>({ timezone: "", country: "" });

  const [snack, setSnack] = useState<Snack>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.getPersonalSettings();
        const tz = data.timezone || deviceTz || "";
        const cc = (data.country ?? "").toString().toUpperCase();

        if (!mounted) return;

        setForm({
          timezone: tz,
          country: cc,
          name: data.name,
          email: data.email,
          phone: data.phone ?? "",
          job_title: data.job_title ?? "",
          department: data.department ?? ""
        });

        const tzObj = TIMEZONES.find((z) => z.value === tz);
        setTzSelected(tzObj ? [tzObj] : []);
        setUseDeviceTz(tz === deviceTz);

        const countryObj = COUNTRIES.find((c) => c.value === cc);
        setCountrySelected(countryObj ? [countryObj] : []);
      } catch {
        setSnack({ message: t("toastLoadError"), severity: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [deviceTz, t, COUNTRIES]);

  const updateField = (name: keyof PersonalSettingsModel, value: string) =>
    setForm((p) => ({ ...p, [name]: value }));

  const isComplete =
    (form.timezone?.trim() ?? "").length > 0 && (form.country?.trim() ?? "").length === 2;

  const handleCancel = useCallback(() => {
    if (cancelling || saving) return;
    setCancelling(true);
    try {
      handleSignOut();
    } finally {
      navigate("/signin", { replace: true });
    }
  }, [handleSignOut, navigate, cancelling, saving]);

  const handleSave = useCallback(async () => {
    if (!isComplete || saving) return;
    setSaving(true);
    try {
      const payload: Partial<PersonalSettingsModel> = {
        timezone: form.timezone,
        ...(form.country && form.country.trim()
          ? { country: form.country.trim().toUpperCase() }
          : {})
      };
      const { data } = await api.editPersonalSettings(payload);

      setForm((p) => ({
        ...p,
        timezone: data.timezone,
        country: (data.country ?? "").toString().toUpperCase()
      }));

      if (step === "locale" && returnTo) {
        navigate(decodeURIComponent(returnTo), { replace: true });
        return;
      }

      setSnack({ message: t("toastUpdateOk"), severity: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ message: t("toastUpdateError"), severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [form.timezone, form.country, isComplete, navigate, returnTo, saving, step, t]);

  if (loading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const Callout = () => (
    <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-[13px]">
      <div className="font-medium mb-0.5">{t("calloutTitle")}</div>
      <div className="text-[12px] text-amber-800">{t("calloutBody")}</div>
    </div>
  );

  const countryLabel =
    (form.country && COUNTRIES.find((c) => c.value === form.country)?.label) || "";

  return (
    <>
      <TopProgress active={saving || cancelling} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg mb-6">
            <div className="px-5 py-4">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">
                {t("headerSettings")}
              </div>
              <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                {t("headerPersonal")}
              </h1>
            </div>
          </header>

          {step === "locale" && <Callout />}

          {/* Locale card */}
          <section className="mt-6 rounded-lg border border-gray-200 bg-white">
            <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
              <span className="text-[11px] uppercase tracking-wide text-gray-700">
                {t("sectionLocale")}
              </span>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Timezone */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("fieldTimezone")}
                  </p>
                  <p className="text-[13px] font-medium text-gray-900">
                    {form.timezone ? (formatTimezoneLabel(form.timezone) || form.timezone) : "—"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-[12px] text-gray-700">{t("modalUseDeviceTz")}</label>
                    <Checkbox
                      checked={useDeviceTz}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDeviceTz(checked);
                        if (checked) {
                          updateField("timezone", deviceTz);
                          const tzObj = TIMEZONES.find((z) => z.value === deviceTz);
                          setTzSelected(tzObj ? [tzObj] : []);
                        }
                      }}
                      size="sm"
                      colorClass="defaultColor"
                      disabled={saving || cancelling}
                    />
                  </div>
                </div>

                <div className="w-80">
                  <SelectDropdown<TimezoneOption>
                    label={t("modalTzLabel")}
                    items={TIMEZONES}
                    selected={tzSelected}
                    onChange={(tz) => {
                      setTzSelected(tz);
                      if (tz.length > 0) {
                        updateField("timezone", tz[0].value);
                        setUseDeviceTz(tz[0].value === deviceTz);
                      }
                    }}
                    getItemKey={(item) => item.value}
                    getItemLabel={(item) => item.label}
                    singleSelect
                    hideCheckboxes
                    clearOnClickOutside={false}
                    buttonLabel={t("btnLabelTz")}
                    customStyles={{ maxHeight: "260px" }}
                    disabled={saving || cancelling}
                  />
                </div>
              </div>

              {/* Country */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("fieldCountry")}
                  </p>
                  <p className="text-[13px] font-medium text-gray-900">
                    {countryLabel ? `${countryLabel} (${form.country})` : "—"}
                  </p>
                </div>
                <div className="w-80">
                  <SelectDropdown<CountryOption>
                    label={t("fieldCountry")}
                    items={COUNTRIES}
                    selected={countrySelected}
                    onChange={(items) => {
                      const v = (items[0]?.value ?? "").toString().toUpperCase();
                      setCountrySelected(items);
                      updateField("country", v);
                    }}
                    getItemKey={(item) => item.value}
                    getItemLabel={(item) => item.label}
                    singleSelect
                    hideCheckboxes
                    clearOnClickOutside={false}
                    buttonLabel={t("fieldCountry")}
                    customStyles={{ maxHeight: "260px" }}
                    disabled={saving || cancelling}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={saving || cancelling}>
                {t("btnCancel")}
              </Button>
              <Button onClick={handleSave} disabled={!isComplete || saving || cancelling} isLoading={saving}>
                {step === "locale" ? t("btnSaveContinue") : t("btnSave")}
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={4500}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default PersonalLocaleSetup;
