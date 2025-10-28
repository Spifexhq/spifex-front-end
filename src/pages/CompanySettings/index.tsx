/* --------------------------------------------------------------------------
 * File: src/pages/CompanySettings.tsx
 * Style: light borders; Navbar + SidebarSettings; compact labels
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";

import Navbar from "src/components/layout/Navbar";
import SidebarSettings from "src/components/layout/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";
import { Organization } from "src/models/auth/domain";
import { formatTimezoneLabel, TIMEZONES } from "src/lib";
import { useTranslation } from "react-i18next";

type EditableUserField = "none" | "name" | "timezone" | "address";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --------------------------------- Helpers -------------------------------- */
function getInitials(name?: string) {
  if (!name) return "EM";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/* Row sem bordas próprias; o container usa divide-y */
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
      <p className="text-[13px] font-medium text-gray-900 truncate">{value ?? "—"}</p>
    </div>
    {action}
  </div>
);

const CompanySettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings", "common"]);

  useEffect(() => {
    document.title = t("settings:company.title");
  }, [t]);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const { isOwner } = useAuthContext();

  const [orgProfile, setOrgProfile] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);

  const [snack, setSnack] = useState<Snack>(null);

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    timezone: "UTC",
    line1: "",
    line2: "",
    country: "",
    city: "",
    postal_code: "",
  });

  /* ------------------------------ Carrega dados --------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const response = await api.getOrganization();
        const data = response.data;

        setOrgProfile(data);
        setFormData({
          name: data.name,
          timezone: data.timezone ?? "UTC",
          line1: data.line1 ?? "",
          line2: data.line2 ?? "",
          country: data.country ?? "",
          city: data.city ?? "",
          postal_code: data.postal_code ?? "",
        });

        const tzObj = TIMEZONES.find((t) => t.value === (data.timezone ?? "UTC"));
        setSelectedTimezone(tzObj ? [tzObj] : []);
        setUseDeviceTz((data.timezone ?? "UTC") === deviceTz);
      } catch (err) {
        console.error("settings:company.toast.orgLoadError", err);
        setSnack({ message: t("settings:company.toast.orgLoadError"), severity: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [deviceTz, t]);

  /* ------------------------------ Handlers ------------------------------- */
  const openModal = (field?: EditableUserField) => {
    if (orgProfile) {
      setFormData({
        name: orgProfile.name,
        timezone: orgProfile.timezone ?? "UTC",
        line1: orgProfile.line1 ?? "",
        line2: orgProfile.line2 ?? "",
        country: orgProfile.country ?? "",
        city: orgProfile.city ?? "",
        postal_code: orgProfile.postal_code ?? "",
      });

      setUseDeviceTz((orgProfile.timezone ?? "UTC") === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === (orgProfile.timezone ?? "UTC"));
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (orgProfile) {
      setFormData({
        name: orgProfile.name,
        timezone: orgProfile.timezone ?? "UTC",
        line1: orgProfile.line1 ?? "",
        line2: orgProfile.line2 ?? "",
        country: orgProfile.country ?? "",
        city: orgProfile.city ?? "",
        postal_code: orgProfile.postal_code ?? "",
      });

      setUseDeviceTz((orgProfile.timezone ?? "UTC") === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === (orgProfile.timezone ?? "UTC"));
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }

    setEditingField(null);
    setModalOpen(false);
  }, [orgProfile, deviceTz]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submitPartial = async (partialData: Partial<typeof formData>) => {
    try {
      if (!orgProfile) {
        setSnack({ message: t("settings:company.toast.orgUpdateError"), severity: "error" });
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
        ...partialData,
      };

      const res = await api.editOrganization(requestBody);
      if (!res.data) throw new Error("settings:company.toast.orgUpdateError");

      const updated = await api.getOrganization();
      setOrgProfile(updated.data);
      closeModal();
      setSnack({ message: t("settings:company.toast.orgUpdateOk"), severity: "success" });
    } catch {
      setSnack({ message: t("settings:company.toast.orgUpdateError"), severity: "error" });
    }
  };

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

  /* ------------------------------ Modal content -------------------------- */
  const renderModalContent = () => {
    switch (editingField) {
      case "name":
        return (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitPartial({ name: formData.name });
            }}
          >
            <Input
              label={t("settings:company.field.orgNameInput")}
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="cancel" type="button" onClick={closeModal}>
                {t("settings:company.btn.cancel")}
              </Button>
              <Button type="submit">{t("settings:company.btn.save")}</Button>
            </div>
          </form>
        );

      case "timezone":
        return (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitPartial({ timezone: formData.timezone });
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-gray-700">{t("settings:company.modal.useDeviceTz")}</label>
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
              disabled={useDeviceTz}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="cancel" type="button" onClick={closeModal}>
                {t("settings:company.btn.cancel")}
              </Button>
              <Button type="submit">{t("settings:company.btn.save")}</Button>
            </div>
          </form>
        );

      case "address":
        return (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitPartial({
                line1: formData.line1,
                line2: formData.line2,
                city: formData.city,
                country: formData.country,
                postal_code: formData.postal_code,
              });
            }}
          >
            <Input label={t("settings:company.field.address1")} name="line1" value={formData.line1} onChange={handleChange} />
            <Input label={t("settings:company.field.address2")} name="line2" value={formData.line2} onChange={handleChange} />
            <Input label={t("settings:company.field.city")} name="city" value={formData.city} onChange={handleChange} />
            <Input label={t("settings:company.field.country")} name="country" value={formData.country} onChange={handleChange} />
            <Input label={t("settings:company.field.postalCode")} name="postal_code" value={formData.postal_code} onChange={handleChange} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="cancel" type="button" onClick={closeModal}>
                {t("settings:company.btn.cancel")}
              </Button>
              <Button type="submit">{t("settings:company.btn.save")}</Button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings userName={orgProfile?.name} activeItem="company-settings" />

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
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

          {/* Card principal */}
          <section className="mt-6">
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
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("name")}
                      >
                        {t("settings:company.btn.updateName")}
                      </Button>
                    )
                  }
                />

                <Row
                  label={t("settings:company.field.timezone")}
                  value={formatTimezoneLabel(orgProfile?.timezone ?? "")}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("timezone")}
                      >
                        {t("settings:company.btn.updateTimezone")}
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
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
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
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
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
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        {t("settings:company.btn.updateCity")}
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
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        {t("settings:company.btn.updateCountry")}
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
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        {t("settings:company.btn.updatePostalCode")}
                      </Button>
                    )
                  }
                />
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && editingField !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
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
                >
                  &times;
                </button>
              </header>

              {renderModalContent()}
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
