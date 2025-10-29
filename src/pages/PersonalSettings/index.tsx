/* --------------------------------------------------------------------------
 * File: src/pages/PersonalSettings.tsx
 * Navbar fixa + SidebarSettings (sem tabs)
 * Respeita alturas: Navbar (h-16) => pt-16 no conteúdo
 * Borda leve (gray-200), sem overflow horizontal
 * Select de fuso horário somente dentro do modal
 * -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import { SuspenseLoader } from "@/components/Loaders";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";
import { PersonalSettings as PersonalSettingsModel, Organization } from "src/models/auth";
import { TIMEZONES, formatTimezoneLabel } from "src/lib/location";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ----------------------------- Helpers/Types ----------------------------- */
type EditableUserField =
  | "name"
  | "email"
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
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value || "—"}</p>
    </div>
    {action}
  </div>
);

const PersonalSettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings", "common"]);

  useEffect(() => { document.title = t("settings:personal.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const navigate = useNavigate();
  const { isOwner, organization: orgCtx } = useAuthContext();
  const orgExternalId = orgCtx?.organization?.external_id ?? null;

  const [profile, setProfile] = useState<PersonalSettingsModel | null>(null);
  const [orgProfile, setOrgProfile] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);

  const [snack, setSnack] = useState<Snack>(null);

  // Timezone (apenas no modal)
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  const [formData, setFormData] = useState<PersonalSettingsModel>({
    name: "",
    email: "",
    phone: "",
    job_title: "",
    department: "",
    timezone: "",
    country: "",
  });

  /* ------------------------------ Load data ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.getPersonalSettings();
        setProfile(data);
        setFormData(data);

        const tzObj = TIMEZONES.find((t) => t.value === data.timezone);
        setSelectedTimezone(tzObj ? [tzObj] : []);
        setUseDeviceTz(data.timezone === deviceTz);

        if (isOwner && orgExternalId) {
          const res = await (await import("src/api/requests")).api.getOrganization();
          setOrgProfile(res.data);
        }
      } catch (err) {
        console.error("Erro ao buscar dados pessoais", err);
        setSnack({ message: t("settings:personal.toast.loadError"), severity: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [deviceTz, orgExternalId, isOwner, t]);

  /* ------------------------------- Handlers ------------------------------ */
  const openModal = (field?: EditableUserField) => {
    if (profile) {
      setFormData(profile);
      setUseDeviceTz(profile.timezone === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === profile.timezone);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (profile) {
      setFormData(profile);
      setUseDeviceTz(profile.timezone === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === profile.timezone);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }
    setEditingField(null);
    setModalOpen(false);
  }, [profile, deviceTz]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value } as PersonalSettingsModel));

  const handleSubmit = async () => {
    const payload = editingField !== null
      ? { [editingField]: (formData)[editingField] }
      : formData;

    try {
      const { data } = await api.editPersonalSettings(payload);
      setProfile(data);
      closeModal();
      setSnack({ message: t("settings:personal.toast.updateOk"), severity: "success" });
    } catch (err) {
      console.error(t("settings:personal.toast.updateError"), err);
      setSnack({ message: t("settings:personal.toast.updateError"), severity: "error" });
    }
  };

  const handleSecurityNavigation = () => {
    navigate("/settings/security");
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

  /* -------------------------------- Render ------------------------------- */
  if (loading) return <SuspenseLoader />;

  return (
    <>
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
                    {t("settings:personal.header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("settings:personal.header.personal")}
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
                      {t("settings:personal.section.company")}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    <Row
                      label={t("settings:personal.field.companyName")}
                      value={orgProfile.name || "—"}
                    />
                  </div>
                </div>
              )}

              {/* Dados pessoais */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:personal.section.personalData")}
                  </span>
                </div>
                <div className="divide-y divide-gray-200">
                  <Row
                    label={t("settings:personal.field.fullName")}
                    value={profile?.name ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("name")}>
                        {t("settings:personal.btn.updateName")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("settings:personal.field.primaryEmail")}
                    value={profile?.email ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("email")}>
                        {t("settings:personal.btn.updateEmail")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("settings:personal.field.phone")}
                    value={profile?.phone ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("phone")}>
                        {t("settings:personal.btn.updatePhone")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("settings:personal.field.jobTitle")}
                    value={profile?.job_title ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("job_title")}>
                        {t("settings:personal.btn.updateJobTitle")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("settings:personal.field.department")}
                    value={profile?.department ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("department")}>
                        {t("settings:personal.btn.updateDepartment")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("settings:personal.field.country")}
                    value={profile?.country ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("country")}>
                        {t("settings:personal.btn.updateCountry")}
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
                    {t("settings:personal.section.timezone")}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">
                        {t("settings:personal.label.current")}
                      </p>
                      <p className="text-[13px] font-medium text-gray-900">
                        {formatTimezoneLabel(profile?.timezone ?? "")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={() => openModal("timezone")}
                    >
                      {t("settings:personal.btn.update")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Segurança (atalho) */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:personal.section.security")}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">
                    {t("settings:personal.security.subtitle")}
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={handleSecurityNavigation}
                    >
                      {t("settings:personal.btn.manageSecurity")}
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
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {t("settings:personal.modal.title")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:personal.modal.close")}
                >
                  &times;
                </button>
              </header>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                {(editingField === null || editingField === "name") && (
                  <Input label={t("settings:personal.field.fullName")} name="name" value={formData.name} onChange={handleChange} required />
                )}
                {(editingField === null || editingField === "email") && (
                  <Input label={t("settings:personal.field.primaryEmail")} name="email" type="email" value={formData.email} onChange={handleChange} required />
                )}
                {(editingField === null || editingField === "phone") && (
                  <Input label={t("settings:personal.field.phone")} name="phone" type="tel" value={formData.phone ?? ""} onChange={handleChange} />
                )}
                {(editingField === null || editingField === "job_title") && (
                  <Input label={t("settings:personal.field.jobTitle")} name="job_title" value={formData.job_title ?? ""} onChange={handleChange} />
                )}
                {(editingField === null || editingField === "department") && (
                  <Input label={t("settings:personal.field.department")} name="department" value={formData.department ?? ""} onChange={handleChange} />
                )}
                {(editingField === null || editingField === "country") && (
                  <Input label={t("settings:personal.field.country")} name="country" value={formData.country ?? ""} onChange={handleChange} />
                )}

                {(editingField === null || editingField === "timezone") && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] text-gray-700">
                        {t("settings:personal.modal.useDeviceTz")}
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
                            const tzObj = TIMEZONES.find((t) => t.value === deviceTz);
                            setSelectedTimezone(tzObj ? [tzObj] : []);
                          }
                        }}
                        size="sm"
                        colorClass="defaultColor"
                      />
                    </div>

                    <SelectDropdown
                      label={t("settings:personal.modal.tzLabel")}
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
                      buttonLabel={t("settings:personal.btnLabel.tz")}
                      customStyles={{ maxHeight: "250px" }}
                      disabled={useDeviceTz}
                    />
                  </>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    {t("settings:personal.btn.cancel")}
                  </Button>
                  <Button type="submit">{t("settings:personal.btn.save")}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Typed Snackbar (no Alert) */}
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
