/* --------------------------------------------------------------------------
 * File: src/pages/OrganizationSettings/index.tsx
 * - Same modal + partial-update pattern as PersonalSettings
 * - Uses PUT (partial payload when editingField !== null)
 * - Country: ISO-3166 alpha-2 uppercase
 * - Timezone select only inside modal
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";
import Snackbar from "src/components/ui/Snackbar";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import { api } from "src/api/requests";
import { useAuthContext } from "src/hooks/useAuth";

import { TIMEZONES, formatTimezoneLabel } from "src/lib/location";
import { getCountries, type CountryOption } from "@/lib/location/countries";
import type { Organization } from "src/models/auth/organization";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ----------------------------- Helpers/Types ----------------------------- */
type EditableOrgField = "name" | "timezone" | "line1" | "line2" | "city" | "country" | "postal_code";

type OrgFormData = {
  name: string;
  timezone: string;
  line1: string;
  line2: string;
  city: string;
  country: string;
  postal_code: string;
};

function pickField<T, K extends keyof T>(obj: T, key: K): Pick<T, K> {
  return { [key]: obj[key] } as Pick<T, K>;
}

function getInitials(name?: string) {
  if (!name) return "OR";
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
  <div className="flex items-center justify-between px-4 py-2.5">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value || "—"}</p>
    </div>
    {action}
  </div>
);

const normalizeCountry = (v: unknown) => (v ?? "").toString().toUpperCase().trim();

function toFormData(o: Organization | null): OrgFormData {
  const cc = normalizeCountry(o?.country ?? "");
  return {
    name: o?.name ?? "",
    timezone: o?.timezone ?? "",
    line1: (o?.line1 ?? "") || "",
    line2: (o?.line2 ?? "") || "",
    city: (o?.city ?? "") || "",
    country: cc,
    postal_code: (o?.postal_code ?? "") || "",
  };
}

const OrganizationSettings: React.FC = () => {
  const { t, i18n } = useTranslation("organizationSettings");
  const navigate = useNavigate();
  const { isOwner } = useAuthContext();

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------ Flags ------------------------------ */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------ State ------------------------------ */
  const [org, setOrg] = useState<Organization | null>(null);
  const orgRef = useRef<Organization | null>(null);

  useEffect(() => {
    orgRef.current = org;
  }, [org]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableOrgField | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  // Timezone (apenas no modal)
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  // Countries
  const COUNTRIES = useMemo<CountryOption[]>(
    () => getCountries(i18n.language),
    [i18n.language]
  );
  const [selectedCountry, setSelectedCountry] = useState<CountryOption[]>([]);

  const [formData, setFormData] = useState<OrgFormData>(() => toFormData(null));

  const hydrateSelectionsFrom = useCallback(
    (o: Organization | null) => {
      const next = toFormData(o);
      setFormData(next);

      // TZ selection state
      setUseDeviceTz((next.timezone ?? "") === deviceTz);
      const tzObj = TIMEZONES.find((z) => z.value === (next.timezone ?? ""));
      setSelectedTimezone(tzObj ? [tzObj] : []);

      // Country selection state
      const cc = normalizeCountry(next.country);
      const cObj = COUNTRIES.find((c) => c.value === cc);
      setSelectedCountry(cObj ? [cObj] : []);
    },
    [COUNTRIES, deviceTz]
  );

  /* ------------------------------ Load ------------------------------ */
  useEffect(() => {
    if (!isOwner) {
      setIsInitialLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await api.getOrganization();
        setOrg(data);
        orgRef.current = data;
        hydrateSelectionsFrom(data);
      } catch {
        setSnack({ message: t("toast.orgLoadError"), severity: "error" });
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [hydrateSelectionsFrom, isOwner, t]);

  /* ------------------------------ Modal ------------------------------ */
  const openModal = (field?: EditableOrgField) => {
    const current = orgRef.current;
    hydrateSelectionsFrom(current);
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    const current = orgRef.current;
    hydrateSelectionsFrom(current);
    setEditingField(null);
    setModalOpen(false);
  }, [hydrateSelectionsFrom]);

  /* ------------------------------ Handlers ------------------------------ */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async () => {
    let payload: Partial<Organization>;

    if (editingField !== null) {
      payload = pickField(formData, editingField) as Partial<Organization>;

      if (editingField === "country") {
        payload.country = normalizeCountry(formData.country);
      }

      if (editingField === "timezone") {
        payload.timezone = useDeviceTz ? deviceTz : (formData.timezone ?? "");
      }
    } else {
      payload = {
        name: formData.name,
        timezone: useDeviceTz ? deviceTz : formData.timezone,
        line1: formData.line1,
        line2: formData.line2,
        city: formData.city,
        country: normalizeCountry(formData.country),
        postal_code: formData.postal_code,
      };
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.editOrganization(payload); // PUT (partial payload allowed on backend)

      setOrg(data);
      orgRef.current = data;

      // Rehydrate inputs + selection states from server response
      hydrateSelectionsFrom(data);

      closeModal();
      setSnack({ message: t("toast.orgUpdateOk"), severity: "success" });
    } catch (err) {
      console.error(err);
      setSnack({ message: t("toast.orgUpdateError"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyNavigation = () => {
    navigate("/settings/manage-currency");
  };

  /* ------------------------------ Modal UX ------------------------------ */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  if (!isOwner) {
    return (
      <main className="min-h-[calc(100vh-64px)] px-6 py-8 text-gray-900">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-[13px] text-gray-700">{t("errors.ownerOnly")}</p>
          </div>
        </div>
      </main>
    );
  }

  /* -------------------------------- Render -------------------------------- */
  const countryCode = normalizeCountry(org?.country ?? "");
  const countryLabel =
    countryCode ? (COUNTRIES.find((c) => c.value === countryCode)?.label ?? countryCode) : "";

  const timezoneLabel = formatTimezoneLabel(org?.timezone ?? "");

  return (
    <>
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(org?.name)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.organization")}</h1>
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.orgInfo")}</span>
                </div>
                <div className="divide-y divide-gray-200">
                  <Row
                    label={t("field.name")}
                    value={org?.name ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("name")} disabled={isSubmitting}>
                        {t("btn.updateName")}
                      </Button>
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.address")}</span>
                </div>
                <div className="divide-y divide-gray-200">
                  <Row
                    label={t("field.address1")}
                    value={org?.line1 ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("line1")} disabled={isSubmitting}>
                        {t("btn.updateAddress1")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.address2")}
                    value={org?.line2 ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("line2")} disabled={isSubmitting}>
                        {t("btn.updateAddress2")}
                      </Button>
                    }
                  />
                  <Row
                    label={t("field.city")}
                    value={org?.city ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("city")} disabled={isSubmitting}>
                        {t("btn.updateCity")}
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
                  <Row
                    label={t("field.postalCode")}
                    value={org?.postal_code ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("postal_code")} disabled={isSubmitting}>
                        {t("btn.updatePostalCode")}
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.timezone")}</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">{t("label.currentTz")}</p>
                      <p className="text-[13px] font-medium text-gray-900">{timezoneLabel}</p>
                    </div>
                    <Button variant="outline" onClick={() => openModal("timezone")} disabled={isSubmitting}>
                      {t("btn.updateTimezone")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.currency")}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">{t("description.currency")}</p>
                  <div className="mt-3">
                    <Button variant="outline" onClick={handleCurrencyNavigation} disabled={isSubmitting}>
                      {t("btn.manageCurrency")}
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
                    label={t("field.orgNameInput")}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                )}

                {(editingField === null || editingField === "line1") && (
                  <Input label={t("field.address1")} name="line1" value={formData.line1} onChange={handleChange} />
                )}

                {(editingField === null || editingField === "line2") && (
                  <Input label={t("field.address2")} name="line2" value={formData.line2} onChange={handleChange} />
                )}

                {(editingField === null || editingField === "city") && (
                  <Input label={t("field.city")} name="city" value={formData.city} onChange={handleChange} />
                )}

                {(editingField === null || editingField === "postal_code") && (
                  <Input
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

export default OrganizationSettings;
