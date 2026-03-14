import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { TIMEZONES } from "@/lib/location";
import type { CountryOption } from "@/lib/location/countries";

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

type PersonalSettingsModalProps = {
  isOpen: boolean;
  editingField: EditableUserField | null;
  isSubmitting: boolean;
  formData: FormData;
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

  selectedGender: GenderOption[];
  setSelectedGender: React.Dispatch<React.SetStateAction<GenderOption[]>>;
  genders: GenderOption[];

  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
};

const PersonalSettingsModal: React.FC<PersonalSettingsModalProps> = ({
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
  selectedGender,
  setSelectedGender,
  genders,
  setFormData,
}) => {
  const { t } = useTranslation("personalSettings");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isOpen]);

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
      case "phone":
        return t("btn.updatePhone");
      case "job_title":
        return t("btn.updateJobTitle");
      case "department":
        return t("btn.updateDepartment");
      case "line1":
        return t("btn.updateAddress1");
      case "line2":
        return t("btn.updateAddress2");
      case "city":
        return t("btn.updateCity");
      case "region":
        return t("btn.updateRegion");
      case "postal_code":
        return t("btn.updatePostalCode");
      case "country":
        return t("btn.updateCountry");
      case "timezone":
        return t("btn.update");
      case "national_id":
        return t("btn.updateNationalId");
      case "birth_date":
        return t("btn.updateBirthDate");
      case "gender":
        return t("btn.updateGender");
      case "note":
        return t("btn.updateNote");
      default:
        return t("modal.title");
    }
  }, [editingField, t]);

  const showField = (field: EditableUserField) => editingField === null || editingField === field;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 md:grid md:place-items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-settings-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className={[
          "relative bg-white shadow-2xl flex flex-col w-full",
          "h-[100dvh] max-h-[100dvh] rounded-none border-0 fixed inset-x-0 bottom-0",
          "md:static md:w-[640px] md:max-w-[95vw] md:h-auto md:max-h-[calc(100vh-4rem)]",
          "md:rounded-lg md:border md:border-gray-200",
        ].join(" ")}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shrink-0">
          <div className="px-4 md:px-5 pt-2 md:pt-4 pb-3 md:pb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
              <h3
                id="personal-settings-modal-title"
                className="text-[16px] font-semibold text-gray-900 leading-snug truncate"
              >
                {title}
              </h3>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center disabled:opacity-50 shrink-0"
              onClick={onClose}
              aria-label={t("modal.close")}
              disabled={isSubmitting}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form
          className="flex flex-1 min-h-0 flex-col md:block md:flex-none"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:block md:max-h-none md:overflow-visible md:px-5">
            <div className={`space-y-3 ${isSubmitting ? "opacity-70 pointer-events-none" : ""}`}>
              {showField("name") && (
                <Input
                  ref={firstFieldRef}
                  kind="text"
                  label={t("field.fullName")}
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  required
                />
              )}

              {showField("phone") && (
                <Input
                  ref={!showField("name") ? firstFieldRef : undefined}
                  kind="text"
                  label={t("field.phone")}
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={onChange}
                />
              )}

              {showField("job_title") && (
                <Input
                  ref={!showField("name") && !showField("phone") ? firstFieldRef : undefined}
                  kind="text"
                  label={t("field.jobTitle")}
                  name="job_title"
                  value={formData.job_title}
                  onChange={onChange}
                />
              )}

              {showField("department") && (
                <Input
                  kind="text"
                  label={t("field.department")}
                  name="department"
                  value={formData.department}
                  onChange={onChange}
                />
              )}

              {showField("line1") && (
                <Input
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
                <Input kind="text" label={t("field.city")} name="city" value={formData.city} onChange={onChange} />
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
                <SelectDropdown<CountryOption>
                  label={t("field.country")}
                  items={countries}
                  selected={selectedCountry}
                  onChange={(items) => {
                    const value = (items[0]?.value ?? "").toString().toUpperCase().trim();
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

              {showField("national_id") && (
                <Input
                  kind="text"
                  label={t("field.nationalId")}
                  name="national_id"
                  value={formData.national_id}
                  onChange={onChange}
                />
              )}

              {showField("birth_date") && (
                <Input
                kind="date"
                label={t("field.birthDate")}
                name="birth_date"
                value={formData.birth_date}
                onValueChange={(value) => {
                    setFormData((prev) => ({
                    ...prev,
                    birth_date: value,
                    }));
                }}
                />
              )}

              {showField("gender") && (
                <SelectDropdown<GenderOption>
                  label={t("field.gender")}
                  items={genders}
                  selected={selectedGender}
                  onChange={(items) => {
                    const value = (items[0]?.value ?? "").toString();
                    setSelectedGender(items);
                    setFormData((prev) => ({ ...prev, gender: value }));
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

              {showField("note") && (
                <Input kind="text" label={t("field.note")} name="note" value={formData.note} onChange={onChange} />
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

                  <SelectDropdown<{ label: string; value: string }>
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

          <footer
            className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
              <Button variant="cancel" type="button" onClick={onClose} disabled={isSubmitting} className="w-full md:w-auto">
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {t("btn.save")}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default PersonalSettingsModal;