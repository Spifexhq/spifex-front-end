/* --------------------------------------------------------------------------
 * File: src/pages/PersonalSettings.tsx
 * Standalone settings page (not the /locale-setup flow)
 * - Uses "PersonalSettings" i18n namespace (separate JSONs per language)
 * - Country: ISO-3166 alpha-2 values (US/PT/BR...), label shows full country name
 * - Timezone select only inside modal (unchanged pattern)
 * - No nulls in local state for country (string/empty string)
 * -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import { api } from "src/api/requests";
import { useAuthContext } from "src/hooks/useAuth";
import { PersonalSettings as PersonalSettingsModel, Organization } from "src/models/auth";
import { TIMEZONES, formatTimezoneLabel } from "src/lib/location";
import LanguageSwitcher from "@/components/LanguageSwitcher";

import { getCountries, CountryOption } from "@/lib/location/countries";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ----------------------------- Helpers/Types ----------------------------- */
type EditableUserField =
  | "name"
  | "phone"
  | "job_title"
  | "department"
  | "timezone"
  | "country";

function getInitials(name?: string) {
  if (!name) return "US";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function pickField<T, K extends keyof T>(obj: T, key: K): Pick<T, K> {
  return { [key]: obj[key] } as Pick<T, K>;
}

/* Linha sem bordas próprias; o container usa divide-y */
const Row = ({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value || "—"}</p>
    </div>
    {action}
  </div>
);

const PersonalSettings: React.FC = () => {
  const { t, i18n } = useTranslation("personalSettings");

  useEffect(() => { document.title = t("title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const navigate = useNavigate();
  const { isOwner, organization: orgCtx } = useAuthContext();
  const orgExternalId = orgCtx?.organization?.external_id ?? null;

  /* ------------------------------ Flags ------------------------------ */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------ State ------------------------------ */
  const [profile, setProfile] = useState<PersonalSettingsModel | null>(null);
  const [orgProfile, setOrgProfile] = useState<Organization | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  // Timezone (apenas no modal)
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  // Country dataset and selection
  const COUNTRIES = useMemo<CountryOption[]>(() => getCountries(i18n.language), [i18n.language]);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption[]>([]);

  const [formData, setFormData] = useState<PersonalSettingsModel>({
    name: "",
    email: "",
    phone: "",
    job_title: "",
    department: "",
    timezone: "",
    country: "", // ISO-3166 alpha-2 (kept as string/empty)
  });

  /* ------------------------------ Load data ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.getPersonalSettings();
        setProfile(data);

        // Normalize + hydrate form
        setFormData({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          job_title: data.job_title ?? "",
          department: data.department ?? "",
          timezone: data.timezone ?? "",
          country: (data.country ?? "").toString().toUpperCase(),
        });

        // Timezone selection state
        const tzObj = TIMEZONES.find((t) => t.value === (data.timezone ?? ""));
        setSelectedTimezone(tzObj ? [tzObj] : []);
        setUseDeviceTz((data.timezone ?? "") === deviceTz);

        // Organization (owner only)
        if (isOwner && orgExternalId) {
          const res = await api.getOrganization();
          setOrgProfile(res.data);
        }

        // Country selection state
        const cc = (data.country ?? "").toString().toUpperCase();
        const found = COUNTRIES.find((c) => c.value === cc);
        setSelectedCountry(found ? [found] : []);
      } catch {
        setSnack({ message: t("toast.loadError"), severity: "error" });
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [deviceTz, orgExternalId, isOwner, t, COUNTRIES]);

  /* ------------------------------- Handlers ------------------------------ */
  const openModal = (field?: EditableUserField) => {
    if (profile) {
      // Reset editing form to latest profile
      const cc = (profile.country ?? "").toString().toUpperCase();
      setFormData({
        name: profile.name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        job_title: profile.job_title ?? "",
        department: profile.department ?? "",
        timezone: profile.timezone ?? "",
        country: cc,
      });

      // TZ state
      setUseDeviceTz((profile.timezone ?? "") === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === (profile.timezone ?? ""));
      setSelectedTimezone(tzObj ? [tzObj] : []);

      // Country state
      const cObj = COUNTRIES.find((c) => c.value === cc);
      setSelectedCountry(cObj ? [cObj] : []);
    }
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (profile) {
      const cc = (profile.country ?? "").toString().toUpperCase();
      setFormData({
        name: profile.name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        job_title: profile.job_title ?? "",
        department: profile.department ?? "",
        timezone: profile.timezone ?? "",
        country: cc,
      });
      setUseDeviceTz((profile.timezone ?? "") === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === (profile.timezone ?? ""));
      setSelectedTimezone(tzObj ? [tzObj] : []);
      const cObj = COUNTRIES.find((c) => c.value === cc);
      setSelectedCountry(cObj ? [cObj] : []);
    }
    setEditingField(null);
    setModalOpen(false);
  }, [profile, deviceTz, COUNTRIES]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value } as PersonalSettingsModel));

  const handleSubmit = async () => {
    let payload: Partial<PersonalSettingsModel>;

    if (editingField !== null) {
      // Start with exactly the field being edited
      payload = pickField(formData, editingField);

      // If it’s country, normalize to uppercase alpha-2
      if (editingField === "country") {
        payload.country = (formData.country ?? "").toString().toUpperCase();
      }
    } else {
      // Full form update, but never send email in this endpoint
      payload = {
        ...formData,
        country: (formData.country ?? "").toString().toUpperCase(),
      };

      // Explicitly strip email before sending to the backend
      delete payload.email;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.editPersonalSettings(payload);

      setProfile(data);

      // Rehydrate selection states
      const tzObj = TIMEZONES.find((t) => t.value === (data.timezone ?? ""));
      setSelectedTimezone(tzObj ? [tzObj] : []);

      const cc = (data.country ?? "").toString().toUpperCase();
      const cObj = COUNTRIES.find((c) => c.value === cc);
      setSelectedCountry(cObj ? [cObj] : []);

      closeModal();
      setSnack({ message: t("toast.updateOk"), severity: "success" });
    } catch (err) {
      console.error(t("toast.updateError"), err);
      setSnack({ message: t("toast.updateError"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecurityNavigation = () => {
    navigate("/settings/security");
  };

  const handleFormatsNavigation = () => {
    // Ajuste a rota se for diferente na sua app
    navigate("/settings/manage-formats");
  };

  /* ------------------------------ Modal UX ------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  /* ------------------------------ Loading UI ------------------------------ */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  /* -------------------------------- Render ------------------------------- */
  const countryCode = (profile?.country ?? "").toString().toUpperCase();
  const countryLabel =
    countryCode ? (COUNTRIES.find((c) => c.value === countryCode)?.label ?? countryCode) : "";

  return (
    <>
      {/* thin progress during submit (background action) */}
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(profile?.name)}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.personal")}
                  </h1>
                </div>
              </div>

              <LanguageSwitcher />
            </div>
          </header>

          {/* Grid principal */}
          <section className="mt-6 grid grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {/* Empresa (owner) */}
              {isOwner && orgProfile && (
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                    <span className="text-[11px] uppercase tracking-wide text-gray-700">
                      {t("section.company")}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    <Row label={t("field.companyName")} value={orgProfile.name || "—"} />
                  </div>
                </div>
              )}

              {/* Dados pessoais */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.personalData")}
                  </span>
                </div>
                <div className="divide-y divide-gray-200">
                  {/* Email FIRST, read-only */}
                  <Row
                    label={t("field.primaryEmail")}
                    value={profile?.email ?? ""}
                  />
                  {/* Full name below, editable */}
                  <Row
                    label={t("field.fullName")}
                    value={profile?.name ?? ""}
                    action={
                      <Button
                        variant="outline"
                        onClick={() => openModal("name")}
                        disabled={isSubmitting}
                      >
                        {t("btn.updateName")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.phone")}
                    value={profile?.phone ?? ""}
                    action={
                      <Button
                        variant="outline"
                        onClick={() => openModal("phone")}
                        disabled={isSubmitting}
                      >
                        {t("btn.updatePhone")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.jobTitle")}
                    value={profile?.job_title ?? ""}
                    action={
                      <Button
                        variant="outline"
                        onClick={() => openModal("job_title")}
                        disabled={isSubmitting}
                      >
                        {t("btn.updateJobTitle")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.department")}
                    value={profile?.department ?? ""}
                    action={
                      <Button
                        variant="outline"
                        onClick={() => openModal("department")}
                        disabled={isSubmitting}
                      >
                        {t("btn.updateDepartment")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.country")}
                    value={countryLabel ? `${countryLabel} (${countryCode})` : "—"}
                    action={
                      <Button
                        variant="outline"
                        onClick={() => openModal("country")}
                        disabled={isSubmitting}
                      >
                        {t("btn.updateCountry")}
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              {/* Fuso horário */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.timezone")}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">
                        {t("label.current")}
                      </p>
                      <p className="text-[13px] font-medium text-gray-900">
                        {formatTimezoneLabel(profile?.timezone ?? "")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => openModal("timezone")}
                      disabled={isSubmitting}
                    >
                      {t("btn.update")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Segurança (atalho) */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.security")}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">{t("security.subtitle")}</p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      onClick={handleSecurityNavigation}
                      disabled={isSubmitting}
                    >
                      {t("btn.manageSecurity")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Formatos (datas, números, etc.) */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.formats")}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">
                    {t("formats.subtitle")}
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      onClick={handleFormatsNavigation}
                      disabled={isSubmitting}
                    >
                      {t("btn.manageFormats")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal ------------------------------ */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">{t("modal.title")}</h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("modal.close")}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </header>

              <form
                className={`space-y-3 ${isSubmitting ? "opacity-70 pointer-events-none" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                {(editingField === null || editingField === "name") && (
                  <Input
                    label={t("field.fullName")}
                    name="name"
                    value={formData.name ?? ""}
                    onChange={handleChange}
                    required
                  />
                )}

                {(editingField === null || editingField === "phone") && (
                  <Input
                    label={t("field.phone")}
                    name="phone"
                    type="tel"
                    value={formData.phone ?? ""}
                    onChange={handleChange}
                  />
                )}
                {(editingField === null || editingField === "job_title") && (
                  <Input
                    label={t("field.jobTitle")}
                    name="job_title"
                    value={formData.job_title ?? ""}
                    onChange={handleChange}
                  />
                )}
                {(editingField === null || editingField === "department") && (
                  <Input
                    label={t("field.department")}
                    name="department"
                    value={formData.department ?? ""}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "country") && (
                  <SelectDropdown<CountryOption>
                    label={t("field.country")}
                    items={COUNTRIES}
                    selected={selectedCountry}
                    onChange={(items) => {
                      const v = (items[0]?.value ?? "").toString().toUpperCase();
                      setSelectedCountry(items);
                      setFormData((p) => ({ ...p, country: v }));
                    }}
                    getItemKey={(item) => item.value}
                    getItemLabel={(item) => item.label}
                    singleSelect
                    hideCheckboxes
                    clearOnClickOutside={false}
                    buttonLabel={t("field.country")}
                    customStyles={{ maxHeight: "260px" }}
                  />
                )}

                {(editingField === null || editingField === "timezone") && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] text-gray-700">
                        {t("modal.useDeviceTz")}
                      </label>
                      <Checkbox
                        checked={useDeviceTz}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseDeviceTz(checked);
                          setFormData((p) => ({
                            ...p,
                            timezone: checked ? deviceTz : p.timezone,
                          }));
                          if (checked) {
                            const tzObj = TIMEZONES.find((tt) => tt.value === deviceTz);
                            setSelectedTimezone(tzObj ? [tzObj] : []);
                          }
                        }}
                        size="sm"
                        colorClass="defaultColor"
                      />
                    </div>

                    <SelectDropdown
                      label={t("modal.tzLabel")}
                      items={TIMEZONES}
                      selected={selectedTimezone}
                      onChange={(tz) => {
                        setSelectedTimezone(tz);
                        if (tz.length > 0) {
                          setFormData((p) => ({ ...p, timezone: tz[0].value }));
                        }
                      }}
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      singleSelect
                      hideCheckboxes
                      clearOnClickOutside={false}
                      buttonLabel={t("btnLabel.tz")}
                      customStyles={{ maxHeight: "250px" }}
                      disabled={useDeviceTz}
                    />
                  </>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    {t("btn.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {t("btn.save")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

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
    </>
  );
};

export default PersonalSettings;
