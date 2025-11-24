/* --------------------------------------------------------------------------
 * File: src/pages/CompanySettings.tsx
 * Style: light borders; Navbar + SidebarSettings; compact labels
 * Standards: flags (isInitialLoading, isSubmitting),
 *            TopProgress + PageSkeleton, ESC/scroll lock,
 *            robust fetch/update, consistent disabling.
 * i18n: settings:company.*
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";

import { api } from "src/api/requests";
import { useAuthContext } from "src/hooks/useAuth";
import type { Organization } from "src/models/auth/domain";
import { TIMEZONES, formatTimezoneLabel } from "src/lib/location";

type EditableOrgField = "name" | "timezone" | "address";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ Helpers ----------------------------------- */
function getInitials(name?: string) {
  if (!name) return "EM";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/* Row (container uses divide-y) */
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

const CompanySettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings", "common"]);
  const { isOwner } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t("settings:company.title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------ Flags ----------------------------------- */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------ State ----------------------------------- */
  const [orgProfile, setOrgProfile] = useState<Organization | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableOrgField | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    timezone: "",
    line1: "",
    line2: "",
    country: "",
    city: "",
    postal_code: "",
  });

  const setFormFromOrg = useCallback(
    (org: Organization) => {
      const tz = org.timezone ?? "";
      setFormData({
        name: org.name,
        timezone: tz,
        line1: org.line1 ?? "",
        line2: org.line2 ?? "",
        country: org.country ?? "",
        city: org.city ?? "",
        postal_code: org.postal_code ?? "",
      });

      // timezone state
      setUseDeviceTz(tz === deviceTz);
      const effectiveTz = tz || deviceTz;
      const tzObj = TIMEZONES.find((t) => t.value === effectiveTz);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    },
    [deviceTz]
  );

  /* ------------------------------ Fetch org -------------------------------- */
  useEffect(() => {
    (async () => {
      setIsInitialLoading(true);
      try {
        const response = await api.getOrganization();
        const data = response.data as Organization;
        setOrgProfile(data);
        setFormFromOrg(data);
      } catch (err) {
        console.error("settings:company.toast.orgLoadError", err);
        setSnack({ message: t("settings:company.toast.orgLoadError"), severity: "error" });
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [setFormFromOrg, t]);

  /* ------------------------------ Handlers -------------------------------- */
  const openModal = (field?: EditableOrgField) => {
    if (orgProfile) {
      setFormFromOrg(orgProfile);
    }
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (orgProfile) {
      setFormFromOrg(orgProfile);
    }
    setEditingField(null);
    setModalOpen(false);
  }, [orgProfile, setFormFromOrg]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!orgProfile) {
      setSnack({
        message: t("settings:company.toast.orgUpdateError"),
        severity: "error",
      });
      return;
    }

    const requestBody = {
      name: formData.name,
      timezone: formData.timezone,
      line1: formData.line1,
      line2: formData.line2,
      city: formData.city,
      country: formData.country,
      postal_code: formData.postal_code,
    };

    setIsSubmitting(true);
    try {
      const res = await api.editOrganization(requestBody);
      if (!res.data) {
        throw new Error("settings:company.toast.orgUpdateError");
      }

      const updated = res.data as Organization;
      setOrgProfile(updated);
      setFormFromOrg(updated);

      closeModal();
      setSnack({ message: t("settings:company.toast.orgUpdateOk"), severity: "success" });
    } catch (err) {
      console.error(err);
      setSnack({
        message: t("settings:company.toast.orgUpdateError"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------ Modal UX -------------------------------- */
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
        <PageSkeleton rows={6} />
      </>
    );
  }

  const globalBusy = isSubmitting;

  /* -------------------------------- Render -------------------------------- */
  return (
    <>
      {/* thin progress during submit (background action) */}
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(orgProfile?.name)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("settings:company.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:company.header.organization")}
                </h1>
              </div>
            </div>
          </header>

          {/* Main grid — same pattern as PersonalSettings */}
          <section className="mt-6 grid grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {/* Org info / address card */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:company.section.orgInfo")}
                  </span>
                </div>

                <div className="divide-y divide-gray-200">
                  <Row
                    label={t("settings:company.field.name")}
                    value={orgProfile?.name}
                    action={
                      isOwner && (
                        <Button
                          variant="outline"
                          onClick={() => openModal("name")}
                          disabled={globalBusy}
                        >
                          {t("settings:company.btn.updateName")}
                        </Button>
                      )
                    }
                  />

                  <Row
                    label={t("settings:company.field.address1")}
                    value={orgProfile?.line1}
                    action={
                      isOwner && (
                        <Button
                          variant="outline"
                          onClick={() => openModal("address")}
                          disabled={globalBusy}
                        >
                          {t("settings:company.btn.update")}
                        </Button>
                      )
                    }
                  />
                  <Row
                    label={t("settings:company.field.address2")}
                    value={orgProfile?.line2}
                    action={
                      isOwner && (
                        <Button
                          variant="outline"
                          onClick={() => openModal("address")}
                          disabled={globalBusy}
                        >
                          {t("settings:company.btn.update")}
                        </Button>
                      )
                    }
                  />
                  <Row
                    label={t("settings:company.field.city")}
                    value={orgProfile?.city}
                    action={
                      isOwner && (
                        <Button
                          variant="outline"
                          onClick={() => openModal("address")}
                          disabled={globalBusy}
                        >
                          {t("settings:company.btn.updateCity")}
                        </Button>
                      )
                    }
                  />
                  <Row
                    label={t("settings:company.field.postalCode")}
                    value={orgProfile?.postal_code}
                    action={
                      isOwner && (
                        <Button
                          variant="outline"
                          onClick={() => openModal("address")}
                          disabled={globalBusy}
                        >
                          {t("settings:company.btn.updatePostalCode")}
                        </Button>
                      )
                    }
                  />
                  <Row
                    label={t("settings:company.field.country")}
                    value={orgProfile?.country}
                    action={
                      isOwner && (
                        <Button
                          variant="outline"
                          onClick={() => openModal("address")}
                          disabled={globalBusy}
                        >
                          {t("settings:company.btn.updateCountry")}
                        </Button>
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              {/* Timezone card — same style as PersonalSettings */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:company.section.timezone")}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">
                        {t("settings:company.label.currentTz", "Current")}
                      </p>
                      <p className="text-[13px] font-medium text-gray-900">
                        {formatTimezoneLabel(orgProfile?.timezone ?? "")}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="outline"
                        onClick={() => openModal("timezone")}
                        disabled={globalBusy}
                      >
                        {t("settings:company.btn.updateTimezone")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Currency card */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:company.section.currency")}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">
                        {t("settings:company.label.currency")}
                      </p>
                      <p className="text-[12px] text-gray-700">
                        {t(
                          "settings:company.description.currency",
                          "Configure the default currency used for prices and reports."
                        )}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="outline"
                        onClick={() => navigate("/settings/manage-currency")}
                        disabled={globalBusy}
                      >
                        {t("settings:company.btn.manageCurrency")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && editingField !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {editingField === "name" && t("settings:company.modal.editName")}
                  {editingField === "timezone" && t("settings:company.modal.editTimezone")}
                  {editingField === "address" && t("settings:company.modal.editAddress")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:company.modal.close")}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </header>

              <form
                className={`space-y-3 ${isSubmitting ? "opacity-70 pointer-events-none" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit();
                }}
              >
                {editingField === "name" && (
                  <Input
                    label={t("settings:company.field.orgNameInput")}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                )}

                {editingField === "timezone" && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] text-gray-700">
                        {t("settings:company.modal.useDeviceTz")}
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
                        disabled={isSubmitting}
                      />
                    </div>

                    <SelectDropdown
                      label={t("settings:company.modal.tzLabel")}
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
                      buttonLabel={t("settings:company.btnLabel.tz")}
                      customStyles={{ maxHeight: "250px" }}
                      disabled={useDeviceTz || isSubmitting}
                    />
                  </>
                )}

                {editingField === "address" && (
                  <>
                    <Input
                      label={t("settings:company.field.address1")}
                      name="line1"
                      value={formData.line1}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    <Input
                      label={t("settings:company.field.address2")}
                      name="line2"
                      value={formData.line2}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    <Input
                      label={t("settings:company.field.city")}
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    <Input
                      label={t("settings:company.field.postalCode")}
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    <Input
                      label={t("settings:company.field.country")}
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal} disabled={isSubmitting}>
                    {t("settings:company.btn.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {t("settings:company.btn.save")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ----------------------------- Snackbar ----------------------------- */}
      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default CompanySettings;
