/* --------------------------------------------------------------------------
 * File: src/pages/PersonalSettings.tsx
 * -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import Checkbox from "@/shared/ui/Checkbox";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import type { PersonalSettings as PersonalSettingsModel, EditPersonalSettingsRequest } from "@/models/auth/user";
import type { Organization } from "@/models/auth/organization";

import { TIMEZONES, formatTimezoneLabel } from "@/lib/location";
import { getCountries, type CountryOption } from "@/lib/location/countries";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
  | "country"
  | "line1"
  | "line2"
  | "city"
  | "region"
  | "postal_code"
  | "national_id"
  | "birth_date"
  | "gender"
  | "note";

type GenderOption = { label: string; value: string };

type FormData = {
  name: string;
  email: string;

  phone: string;
  job_title: string;
  department: string;

  timezone: string;
  country: string;

  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;

  national_id: string;
  birth_date: string; // "YYYY-MM-DD" or ""
  gender: string;
  note: string;
};

function getInitials(name?: string) {
  if (!name) return "US";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function pickField<T, K extends keyof T>(obj: T, key: K): Pick<T, K> {
  return { [key]: obj[key] } as Pick<T, K>;
}

const normalizeCountry = (v: unknown) => (v ?? "").toString().toUpperCase().trim();

function maskNationalId(raw?: string) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.length <= 4) return "••••";
  return `••••••${s.slice(-4)}`;
}

function toFormData(p: PersonalSettingsModel | null): FormData {
  return {
    name: p?.name ?? "",
    email: p?.email ?? "",

    phone: p?.phone ?? "",
    job_title: p?.job_title ?? "",
    department: p?.department ?? "",

    timezone: p?.timezone ?? "",
    country: normalizeCountry(p?.country ?? ""),

    line1: p?.line1 ?? "",
    line2: p?.line2 ?? "",
    city: p?.city ?? "",
    region: p?.region ?? "",
    postal_code: p?.postal_code ?? "",

    national_id: p?.national_id ?? "",
    birth_date: (p?.birth_date ?? "") || "",
    gender: p?.gender ?? "",
    note: p?.note ?? "",
  };
}

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

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const navigate = useNavigate();
  const { isOwner, organization: orgCtx } = useAuthContext();
  const orgExternalId = orgCtx?.organization?.id ?? null;

  /* ------------------------------ Flags ------------------------------ */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------ State ------------------------------ */
  const [profile, setProfile] = useState<PersonalSettingsModel | null>(null);
  const [orgProfile, setOrgProfile] = useState<Organization | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  // Timezone (modal only)
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  // Countries dataset + selection
  const COUNTRIES = useMemo<CountryOption[]>(() => getCountries(i18n.language), [i18n.language]);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption[]>([]);

  // Gender (simple controlled dropdown)
  const GENDERS = useMemo<GenderOption[]>(
    () => [
      { value: "male", label: t("gender.male") },
      { value: "female", label: t("gender.female") },
      { value: "non_binary", label: t("gender.nonBinary") },
      { value: "other", label: t("gender.other") },
      { value: "prefer_not_to_say", label: t("gender.preferNot") },
    ],
    [t]
  );
  const [selectedGender, setSelectedGender] = useState<GenderOption[]>([]);

  const [formData, setFormData] = useState<FormData>(() => toFormData(null));

  const hydrateSelectionsFrom = useCallback(
    (p: PersonalSettingsModel | null) => {
      const next = toFormData(p);
      setFormData(next);

      // TZ selection state
      setUseDeviceTz((next.timezone ?? "") === deviceTz);
      const tzObj = TIMEZONES.find((z) => z.value === (next.timezone ?? ""));
      setSelectedTimezone(tzObj ? [tzObj] : []);

      // Country selection state
      const cc = normalizeCountry(next.country);
      const cObj = COUNTRIES.find((c) => c.value === cc);
      setSelectedCountry(cObj ? [cObj] : []);

      // Gender selection state
      const gObj = GENDERS.find((g) => g.value === (next.gender ?? ""));
      setSelectedGender(gObj ? [gObj] : []);
    },
    [COUNTRIES, GENDERS, deviceTz]
  );

  /* ------------------------------ Load data ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.getPersonalSettings();
        setProfile(data);
        hydrateSelectionsFrom(data);

        // Organization (owner only)
        if (isOwner && orgExternalId) {
          const res = await api.getOrganization();
          setOrgProfile(res.data);
        }
      } catch {
        setSnack({ message: t("toast.loadError"), severity: "error" });
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [hydrateSelectionsFrom, isOwner, orgExternalId, t]);

  /* ------------------------------- Handlers ------------------------------ */
  const openModal = (field?: EditableUserField) => {
    hydrateSelectionsFrom(profile);
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    hydrateSelectionsFrom(profile);
    setEditingField(null);
    setModalOpen(false);
  }, [hydrateSelectionsFrom, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async () => {
    let payload: EditPersonalSettingsRequest;

    const buildAllPayload = (): EditPersonalSettingsRequest => ({
      name: formData.name,
      phone: formData.phone,
      job_title: formData.job_title,
      department: formData.department,

      timezone: useDeviceTz ? deviceTz : formData.timezone,
      country: normalizeCountry(formData.country),

      line1: formData.line1,
      line2: formData.line2,
      city: formData.city,
      region: formData.region,
      postal_code: formData.postal_code,

      national_id: formData.national_id,
      birth_date: formData.birth_date ? formData.birth_date : null,
      gender: formData.gender,
      note: formData.note,
    });

    if (editingField !== null) {
      payload = pickField(formData, editingField) as EditPersonalSettingsRequest;

      if (editingField === "country") {
        payload.country = normalizeCountry(formData.country);
      }

      if (editingField === "timezone") {
        payload.timezone = useDeviceTz ? deviceTz : formData.timezone;
      }

      if (editingField === "birth_date") {
        payload.birth_date = formData.birth_date ? formData.birth_date : null;
      }
    }
    else {
      payload = buildAllPayload();
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.editPersonalSettings(payload);
      setProfile(data);
      hydrateSelectionsFrom(data);

      closeModal();
      setSnack({ message: t("toast.updateOk"), severity: "success" });
    } catch (err) {
      console.error(t("toast.updateError"), err);
      setSnack({ message: t("toast.updateError"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecurityNavigation = () => navigate("/settings/security");
  const handleFormatsNavigation = () => navigate("/settings/manage-formats");

  /* ------------------------------ Modal UX ------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ------------------------------ Loading UI ------------------------------ */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={8} />
      </>
    );
  }

  /* -------------------------------- Render ------------------------------- */
  const countryCode = normalizeCountry(profile?.country ?? "");
  const countryLabel = countryCode ? (COUNTRIES.find((c) => c.value === countryCode)?.label ?? countryCode) : "";

  const timezoneLabel = formatTimezoneLabel(profile?.timezone ?? "");

  const genderLabel =
    profile?.gender ? (GENDERS.find((g) => g.value === profile.gender)?.label ?? profile.gender) : "";

  const birthDateLabel = profile?.birth_date ? String(profile.birth_date) : "";

  return (
    <>
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(profile?.name)}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.personal")}</h1>
                </div>
              </div>

              <LanguageSwitcher />
            </div>
          </header>

          <section className="mt-6 grid grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {/* Company (owner) */}
              {isOwner && orgProfile && (
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                    <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.company")}</span>
                  </div>
                  <div className="flex flex-col">
                    <Row label={t("field.companyName")} value={orgProfile.name || "—"} />
                  </div>
                </div>
              )}

              {/* Personal profile */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.personalData")}</span>
                </div>
                <div className="flex flex-col">
                  <Row label={t("field.primaryEmail")} value={profile?.email ?? ""} />

                  <Row
                    label={t("field.fullName")}
                    value={profile?.name ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("name")} disabled={isSubmitting}>
                        {t("btn.updateName")}
                      </Button>
                    }
                  />

                  <Row
                    label={t("field.phone")}
                    value={profile?.phone ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("phone")} disabled={isSubmitting}>
                        {t("btn.updatePhone")}
                      </Button>
                    }
                  />

                  <Row
                    label={t("field.jobTitle")}
                    value={profile?.job_title ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("job_title")} disabled={isSubmitting}>
                        {t("btn.updateJobTitle")}
                      </Button>
                    }
                  />

                  <Row
                    label={t("field.department")}
                    value={profile?.department ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("department")} disabled={isSubmitting}>
                        {t("btn.updateDepartment")}
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Address (like OrganizationSettings) */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.address")}</span>
                </div>
                <div className="flex flex-col">
                  <Row
                    label={t("field.address1")}
                    value={profile?.line1 ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("line1")} disabled={isSubmitting}>
                        {t("btn.updateAddress1")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.address2")}
                    value={profile?.line2 ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("line2")} disabled={isSubmitting}>
                        {t("btn.updateAddress2")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.city")}
                    value={profile?.city ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("city")} disabled={isSubmitting}>
                        {t("btn.updateCity")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.region")}
                    value={profile?.region ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("region")} disabled={isSubmitting}>
                        {t("btn.updateRegion")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.postalCode")}
                    value={profile?.postal_code ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("postal_code")} disabled={isSubmitting}>
                        {t("btn.updatePostalCode")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.country")}
                    value={countryLabel ? `${countryLabel} (${countryCode})` : "—"}
                    action={
                      <Button variant="outline" onClick={() => openModal("country")} disabled={isSubmitting}>
                        {t("btn.updateCountry")}
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              {/* Timezone */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.timezone")}</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">{t("label.current")}</p>
                      <p className="text-[13px] font-medium text-gray-900">{timezoneLabel}</p>
                    </div>
                    <Button variant="outline" onClick={() => openModal("timezone")} disabled={isSubmitting}>
                      {t("btn.update")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sensitive personal data */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.sensitive")}</span>
                </div>
                <div className="flex flex-col">
                  <Row
                    label={t("field.nationalId")}
                    value={maskNationalId(profile?.national_id)}
                    action={
                      <Button variant="outline" onClick={() => openModal("national_id")} disabled={isSubmitting}>
                        {t("btn.updateNationalId")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.birthDate")}
                    value={birthDateLabel}
                    action={
                      <Button variant="outline" onClick={() => openModal("birth_date")} disabled={isSubmitting}>
                        {t("btn.updateBirthDate")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.gender")}
                    value={genderLabel}
                    action={
                      <Button variant="outline" onClick={() => openModal("gender")} disabled={isSubmitting}>
                        {t("btn.updateGender")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.note")}
                    value={profile?.note ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("note")} disabled={isSubmitting}>
                        {t("btn.updateNote")}
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Security */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.security")}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">{t("security.subtitle")}</p>
                  <div className="mt-3">
                    <Button variant="outline" onClick={handleSecurityNavigation} disabled={isSubmitting}>
                      {t("btn.manageSecurity")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Formats */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.formats")}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">{t("formats.subtitle")}</p>
                  <div className="mt-3">
                    <Button variant="outline" onClick={handleFormatsNavigation} disabled={isSubmitting}>
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
                    kind="text"
                    label={t("field.fullName")}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                )}

                {(editingField === null || editingField === "phone") && (
                  <Input
                    kind="text"
                    label={t("field.phone")}
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "job_title") && (
                  <Input
                    kind="text"
                    label={t("field.jobTitle")}
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "department") && (
                  <Input
                    kind="text"
                    label={t("field.department")}
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "line1") && (
                  <Input
                    kind="text"
                    label={t("field.address1")}
                    name="line1"
                    value={formData.line1}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "line2") && (
                  <Input
                    kind="text"
                    label={t("field.address2")}
                    name="line2"
                    value={formData.line2}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "city") && (
                  <Input kind="text" label={t("field.city")} name="city" value={formData.city} onChange={handleChange} />
                )}

                {(editingField === null || editingField === "region") && (
                  <Input
                    kind="text"
                    label={t("field.region")}
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "postal_code") && (
                  <Input
                    kind="text"
                    label={t("field.postalCode")}
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "country") && (
                  <SelectDropdown<CountryOption>
                    label={t("field.country")}
                    items={COUNTRIES}
                    selected={selectedCountry}
                    onChange={(items) => {
                      const v = normalizeCountry(items[0]?.value);
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

                {(editingField === null || editingField === "national_id") && (
                  <Input
                    kind="text"
                    label={t("field.nationalId")}
                    name="national_id"
                    value={formData.national_id}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "birth_date") && (
                  <Input
                    kind="text"
                    type="date"
                    label={t("field.birthDate")}
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                  />
                )}

                {(editingField === null || editingField === "gender") && (
                  <SelectDropdown<GenderOption>
                    label={t("field.gender")}
                    items={GENDERS}
                    selected={selectedGender}
                    onChange={(items) => {
                      const v = (items[0]?.value ?? "").toString();
                      setSelectedGender(items);
                      setFormData((p) => ({ ...p, gender: v }));
                    }}
                    getItemKey={(item) => item.value}
                    getItemLabel={(item) => item.label}
                    singleSelect
                    hideCheckboxes
                    clearOnClickOutside={false}
                    buttonLabel={t("field.gender")}
                    customStyles={{ maxHeight: "240px" }}
                  />
                )}

                {(editingField === null || editingField === "note") && (
                  <Input kind="text" label={t("field.note")} name="note" value={formData.note} onChange={handleChange} />
                )}

                {(editingField === null || editingField === "timezone") && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] text-gray-700">{t("modal.useDeviceTz")}</label>
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
                        if (tz.length > 0) setFormData((p) => ({ ...p, timezone: tz[0].value }));
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
                  <Button variant="cancel" type="button" onClick={closeModal} disabled={isSubmitting}>
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
