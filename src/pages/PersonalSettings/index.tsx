/* -------------------------------------------------------------------------- */
/* File: src/pages/PersonalSettings.tsx                                       */
/* -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import type { PersonalSettings as PersonalSettingsModel, EditPersonalSettingsRequest } from "@/models/auth/user";
import type { Organization } from "@/models/auth/organization";

import { formatTimezoneLabel } from "@/lib/location";
import { getCountries, type CountryOption } from "@/lib/location/countries";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PersonalSettingsModal from "./PersonalSettingsModal";

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
  birth_date: string;
  gender: string;
  note: string;
};

function getInitials(name?: string) {
  if (!name) return "US";
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function pickField<T, K extends keyof T>(obj: T, key: K): Pick<T, K> {
  return { [key]: obj[key] } as Pick<T, K>;
}

const normalizeCountry = (value: unknown) => (value ?? "").toString().toUpperCase().trim();

function maskNationalId(raw?: string) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `••••••${value.slice(-4)}`;
}

function toFormData(profile: PersonalSettingsModel | null): FormData {
  return {
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    job_title: profile?.job_title ?? "",
    department: profile?.department ?? "",
    timezone: profile?.timezone ?? "",
    country: normalizeCountry(profile?.country ?? ""),
    line1: profile?.line1 ?? "",
    line2: profile?.line2 ?? "",
    city: profile?.city ?? "",
    region: profile?.region ?? "",
    postal_code: profile?.postal_code ?? "",
    national_id: profile?.national_id ?? "",
    birth_date: (profile?.birth_date ?? "") || "",
    gender: profile?.gender ?? "",
    note: profile?.note ?? "",
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
  <div className="flex items-start sm:items-center justify-between gap-3 px-4 py-3">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 break-words sm:truncate">{value || "—"}</p>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
    <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
      <span className="text-[11px] uppercase tracking-wide text-gray-700">{title}</span>
    </div>
    {children}
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

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [profile, setProfile] = useState<PersonalSettingsModel | null>(null);
  const [orgProfile, setOrgProfile] = useState<Organization | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  const countries = useMemo<CountryOption[]>(() => getCountries(i18n.language), [i18n.language]);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption[]>([]);

  const genders = useMemo<GenderOption[]>(
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
    (currentProfile: PersonalSettingsModel | null) => {
      const next = toFormData(currentProfile);
      setFormData(next);

      setUseDeviceTz((next.timezone ?? "") === deviceTz);

      const tzObj = next.timezone ? [{ label: next.timezone, value: next.timezone }] : [];
      setSelectedTimezone(tzObj);

      const countryCode = normalizeCountry(next.country);
      const countryObj = countries.find((item) => item.value === countryCode);
      setSelectedCountry(countryObj ? [countryObj] : []);

      const genderObj = genders.find((item) => item.value === (next.gender ?? ""));
      setSelectedGender(genderObj ? [genderObj] : []);
    },
    [countries, genders, deviceTz]
  );

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.getPersonalSettings();
        setProfile(data);
        hydrateSelectionsFrom(data);

        if (isOwner && orgExternalId) {
          const response = await api.getOrganization();
          setOrgProfile(response.data);
        }
      } catch {
        setSnack({ message: t("toast.loadError"), severity: "error" });
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [hydrateSelectionsFrom, isOwner, orgExternalId, t]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    } else {
      payload = buildAllPayload();
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.editPersonalSettings(payload);
      setProfile(data);
      hydrateSelectionsFrom(data);
      closeModal();
      setSnack({ message: t("toast.updateOk"), severity: "success" });
    } catch (error) {
      console.error(t("toast.updateError"), error);
      setSnack({ message: t("toast.updateError"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecurityNavigation = () => navigate("/settings/security");
  const handleFormatsNavigation = () => navigate("/settings/manage-formats");

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={8} />
      </>
    );
  }

  const countryCode = normalizeCountry(profile?.country ?? "");
  const countryLabel = countryCode
    ? (countries.find((item) => item.value === countryCode)?.label ?? countryCode)
    : "";

  const timezoneLabel = formatTimezoneLabel(profile?.timezone ?? "");
  const genderLabel = profile?.gender ? (genders.find((item) => item.value === profile.gender)?.label ?? profile.gender) : "";
  const birthDateLabel = profile?.birth_date ? String(profile.birth_date) : "";

  return (
    <>
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-full bg-transparent text-gray-900 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700 shrink-0">
                  {getInitials(profile?.name)}
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.personal")}</h1>
                </div>
              </div>

              <div className="self-start sm:self-auto">
                <LanguageSwitcher />
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              {isOwner && orgProfile && (
                <SectionCard title={t("section.company")}>
                  <div className="flex flex-col">
                    <Row label={t("field.companyName")} value={orgProfile.name || "—"} />
                  </div>
                </SectionCard>
              )}

              <SectionCard title={t("section.personalData")}>
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
              </SectionCard>

              <SectionCard title={t("section.address")}>
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
              </SectionCard>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <SectionCard title={t("section.timezone")}>
                <div className="px-4 py-3">
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">{t("label.current")}</p>
                      <p className="text-[13px] font-medium text-gray-900 break-words">{timezoneLabel}</p>
                    </div>
                    <Button variant="outline" onClick={() => openModal("timezone")} disabled={isSubmitting}>
                      {t("btn.update")}
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title={t("section.sensitive")}>
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
              </SectionCard>

              <SectionCard title={t("section.security")}>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">{t("security.subtitle")}</p>
                  <div className="mt-3">
                    <Button variant="outline" onClick={handleSecurityNavigation} disabled={isSubmitting}>
                      {t("btn.manageSecurity")}
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title={t("section.formats")}>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">{t("formats.subtitle")}</p>
                  <div className="mt-3">
                    <Button variant="outline" onClick={handleFormatsNavigation} disabled={isSubmitting}>
                      {t("btn.manageFormats")}
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </section>
        </div>

        <PersonalSettingsModal
          isOpen={modalOpen}
          editingField={editingField}
          isSubmitting={isSubmitting}
          formData={formData}
          onChange={handleChange}
          onClose={closeModal}
          onSubmit={handleSubmit}
          useDeviceTz={useDeviceTz}
          setUseDeviceTz={setUseDeviceTz}
          deviceTz={deviceTz}
          selectedTimezone={selectedTimezone}
          setSelectedTimezone={setSelectedTimezone}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          countries={countries}
          selectedGender={selectedGender}
          setSelectedGender={setSelectedGender}
          genders={genders}
          setFormData={setFormData}
        />
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