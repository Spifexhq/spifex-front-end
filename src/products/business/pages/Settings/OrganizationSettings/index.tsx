import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { PreferenceSection as SectionCard, PreferenceRow as Row } from "@/shared/ui/Settings/PreferenceSection";
/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/OrganizationSettings/index.tsx                             */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import { TIMEZONES, formatTimezoneLabel } from "@/lib/location";
import { getCountries, type CountryOption } from "@/lib/location/countries";
import type { Organization } from "@/models/auth/organization";
import OrganizationSettingsModal, {
  type EditableOrgField,
  type OrgFormData,
} from "./OrganizationSettingsModal";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ----------------------------- Helpers/Types ----------------------------- */
function pickField<T, K extends keyof T>(obj: T, key: K): Pick<T, K> {
  return { [key]: obj[key] } as Pick<T, K>;
}



const normalizeCountry = (value: unknown) => (value ?? "").toString().toUpperCase().trim();

function toFormData(org: Organization | null): OrgFormData {
  const countryCode = normalizeCountry(org?.country ?? "");
  return {
    name: org?.name ?? "",
    timezone: org?.timezone ?? "",
    line1: (org?.line1 ?? "") || "",
    line2: (org?.line2 ?? "") || "",
    city: (org?.city ?? "") || "",
    region: (org?.region ?? "") || "",
    postal_code: (org?.postal_code ?? "") || "",
    country: countryCode,
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

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [org, setOrg] = useState<Organization | null>(null);
  const orgRef = useRef<Organization | null>(null);

  useEffect(() => {
    orgRef.current = org;
  }, [org]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableOrgField | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const countries = useMemo<CountryOption[]>(() => getCountries(i18n.language), [i18n.language]);

  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption[]>([]);
  const [formData, setFormData] = useState<OrgFormData>(() => toFormData(null));

  const hydrateSelectionsFrom = useCallback(
    (currentOrg: Organization | null) => {
      const next = toFormData(currentOrg);
      setFormData(next);

      setUseDeviceTz((next.timezone ?? "") === deviceTz);

      const tzObj = TIMEZONES.find((item) => item.value === (next.timezone ?? ""));
      setSelectedTimezone(tzObj ? [tzObj] : []);

      const countryCode = normalizeCountry(next.country);
      const countryObj = countries.find((item) => item.value === countryCode);
      setSelectedCountry(countryObj ? [countryObj] : []);
    },
    [countries, deviceTz]
  );

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
      } catch (notificationCause) {
        setSnack({ message: apiErrorMessage(notificationCause, t("toast.orgLoadError")), severity: "error" });
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [hydrateSelectionsFrom, isOwner, t]);

  const openModal = (field?: EditableOrgField) => {
    const currentOrg = orgRef.current;
    hydrateSelectionsFrom(currentOrg);
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    const currentOrg = orgRef.current;
    hydrateSelectionsFrom(currentOrg);
    setEditingField(null);
    setModalOpen(false);
  }, [hydrateSelectionsFrom]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        region: formData.region,
        postal_code: formData.postal_code,
        country: normalizeCountry(formData.country),
      };
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.editOrganization(payload);

      setOrg(data);
      orgRef.current = data;
      hydrateSelectionsFrom(data);

      closeModal();
      setSnack({ message: t("toast.orgUpdateOk"), severity: "success" });
    } catch (error) {
      console.error(error);
      setSnack({ message: apiErrorMessage(error, t("toast.orgUpdateError")), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyNavigation = () => {
    navigate("/settings/manage-currency");
  };

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton variant="form" rows={6} />
      </>
    );
  }

  if (!isOwner) {
    return (
      <main className="min-w-0 px-4 pb-10 pt-5 sm:px-7">
        <div className="mx-auto w-full max-w-[1440px] space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4 ">
            <p className="text-[13px] text-gray-700">{t("errors.ownerOnly")}</p>
          </div>
        </div>
      </main>
    );
  }

  const countryCode = normalizeCountry(org?.country ?? "");
  const countryLabel = countryCode
    ? (countries.find((item) => item.value === countryCode)?.label ?? countryCode)
    : "";

  const timezoneLabel = formatTimezoneLabel(org?.timezone ?? "");

  return (
    <>
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-w-0 px-4 pb-10 pt-5 sm:px-7">
        <div className="mx-auto w-full max-w-[1440px] space-y-5">
          

          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7 space-y-6">
              <SectionCard title={t("section.orgInfo")}>
                <div className="flex flex-col">
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
              </SectionCard>

              <SectionCard title={t("section.address")}>
                <div className="flex flex-col">
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
                    label={t("field.region")}
                    value={org?.region ?? ""}
                    action={
                      <Button variant="outline" onClick={() => openModal("region")} disabled={isSubmitting}>
                        {t("btn.updateRegion")}
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

            <div className="xl:col-span-5 space-y-6">
              <SectionCard title={t("section.timezone")}>
                <div className="px-4 py-3">
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{t("label.currentTz")}</p>
                      <p className="text-[13px] font-medium text-gray-900 break-words">{timezoneLabel}</p>
                    </div>
                    <Button variant="outline" onClick={() => openModal("timezone")} disabled={isSubmitting}>
                      {t("btn.updateTimezone")}
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title={t("section.currency")}>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">{t("description.currency")}</p>
                  <div className="mt-3">
                    <Button variant="outline" onClick={handleCurrencyNavigation} disabled={isSubmitting}>
                      {t("btn.manageCurrency")}
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </section>
        </div>

        <OrganizationSettingsModal
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
          setFormData={setFormData}
        />
      </main>

      <Snackbar
        notificationKey={snack}
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
