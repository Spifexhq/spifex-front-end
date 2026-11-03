import { SidePanelFooter, SidePanelFrame, SidePanelHeader } from "@/components/Modal/SidePanel";

import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import { Select } from "src/shared/ui/Select";

import { TIMEZONES } from "@/lib/location";
import type { CountryOption } from "@/lib/location/countries";

export type EditableOrgField =
  | "name"
  | "timezone"
  | "line1"
  | "line2"
  | "city"
  | "region"
  | "postal_code"
  | "country";

export type OrgFormData = {
  name: string;
  timezone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
};

type OrganizationSettingsModalProps = {
  isOpen: boolean;
  editingField: EditableOrgField | null;
  isSubmitting: boolean;
  formData: OrgFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => void;

  useDeviceTz: boolean;
  setUseDeviceTz: React.Dispatch<React.SetStateAction<boolean>>;
  deviceTz: string;

  selectedTimezone: { label: string; value: string }[];
  setSelectedTimezone: React.Dispatch<React.SetStateAction<{ label: string; value: string }[]>>;

  selectedCountry: CountryOption[];
  setSelectedCountry: React.Dispatch<React.SetStateAction<CountryOption[]>>;
  countries: CountryOption[];

  setFormData: React.Dispatch<React.SetStateAction<OrgFormData>>;
};

const normalizeCountry = (value: unknown) => (value ?? "").toString().toUpperCase().trim();

const OrganizationSettingsModal: React.FC<OrganizationSettingsModalProps> = ({
  isOpen,
  editingField,
  isSubmitting,
  formData,
  onChange,
  onClose,
  onSubmit,
  useDeviceTz,
  setUseDeviceTz,
  deviceTz,
  selectedTimezone,
  setSelectedTimezone,
  selectedCountry,
  setSelectedCountry,
  countries,
  setFormData,
}) => {
  const { t } = useTranslation("organizationSettings");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });
  }, [isOpen, editingField]);

  const title = useMemo(() => {
    switch (editingField) {
      case "name":
        return t("btn.updateName");
      case "line1":
        return t("btn.updateAddress1");
      case "line2":
        return t("btn.updateAddress2");
      case "city":
        return t("btn.updateCity");
      case "region":
        return t("btn.updateRegion");
      case "country":
        return t("btn.updateCountry");
      case "postal_code":
        return t("btn.updatePostalCode");
      case "timezone":
        return t("btn.updateTimezone");
      default:
        return t("modal.title");
    }
  }, [editingField, t]);

  const showField = (field: EditableOrgField) => editingField === null || editingField === field;

  return (
    <SidePanelFrame isOpen={isOpen} labelledBy="organization-settings-modal-title">

        <SidePanelHeader titleId="organization-settings-modal-title" title={<>{title}</>} onClose={onClose} disabled={isSubmitting}></SidePanelHeader>

        <form
          className="settings-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="settings-modal-scroll">
            <div className={`space-y-3 ${isSubmitting ? "opacity-70 pointer-events-none" : ""}`}>
              {showField("name") && (
                <Input
                  ref={firstFieldRef}
                  kind="text"
                  label={t("field.orgNameInput")}
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  required
                />
              )}

              {showField("line1") && (
                <Input
                  ref={!showField("name") ? firstFieldRef : undefined}
                  kind="text"
                  label={t("field.address1")}
                  name="line1"
                  value={formData.line1}
                  onChange={onChange}
                />
              )}

              {showField("line2") && (
                <Input
                  kind="text"
                  label={t("field.address2")}
                  name="line2"
                  value={formData.line2}
                  onChange={onChange}
                />
              )}

              {showField("city") && (
                <Input
                  kind="text"
                  label={t("field.city")}
                  name="city"
                  value={formData.city}
                  onChange={onChange}
                />
              )}

              {showField("region") && (
                <Input
                  kind="text"
                  label={t("field.region")}
                  name="region"
                  value={formData.region}
                  onChange={onChange}
                />
              )}

              {showField("postal_code") && (
                <Input
                  kind="text"
                  label={t("field.postalCode")}
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={onChange}
                />
              )}

              {showField("country") && (
                <Select<CountryOption>
                  label={t("field.country")}
                  items={countries}
                  selected={selectedCountry}
                  onChange={(items) => {
                    const value = normalizeCountry(items[0]?.value);
                    setSelectedCountry(items);
                    setFormData((prev) => ({ ...prev, country: value }));
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

              {showField("timezone") && (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
                    <label className="text-[12px] text-gray-700">{t("modal.useDeviceTz")}</label>
                    <Checkbox
                      checked={useDeviceTz}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDeviceTz(checked);
                        setFormData((prev) => ({
                          ...prev,
                          timezone: checked ? deviceTz : prev.timezone,
                        }));

                        if (checked) {
                          const tzObj = TIMEZONES.find((tz) => tz.value === deviceTz);
                          setSelectedTimezone(tzObj ? [tzObj] : []);
                        }
                      }}
                      size="sm"
                      colorClass="defaultColor"
                    />
                  </div>

                  <Select<{ label: string; value: string }>
                    label={t("modal.tzLabel")}
                    items={TIMEZONES}
                    selected={selectedTimezone}
                    onChange={(items) => {
                      setSelectedTimezone(items);
                      if (items.length > 0) {
                        setFormData((prev) => ({ ...prev, timezone: items[0].value }));
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
            </div>
          </div>

          <SidePanelFooter
            className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
              <Button
                variant="cancel"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full md:w-auto"
              >
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {t("btn.save")}
              </Button>
            </div>
          </SidePanelFooter>
        </form>
      </SidePanelFrame>
  );
};

export default OrganizationSettingsModal;
