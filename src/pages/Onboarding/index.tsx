import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Building2, CheckCircle2, CreditCard, UserRound } from "lucide-react";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { TIMEZONES } from "@/lib/location/timezonesList";
import { formatTimezoneLabel } from "@/lib/location/formatTimezoneLabel";
import { getCountries, type CountryOption } from "@/lib/location/countries";
import type { OnboardingStatus } from "@/models/auth/onboarding";
import type { EditPersonalSettingsRequest } from "@/models/auth/user";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type StepKey = "personal" | "organization" | "ledger";

type PersonalForm = {
  phone: string;
  national_id: string;
  timezone: string;
  country: string;
  line1: string;
  line2: string;
};

type OrgForm = {
  timezone: string;
  country: string;
  line1: string;
  line2: string;
};

type Mode = "csv" | "manual" | "standard" | null;

const normalize = (v: unknown) => (v ?? "").toString().trim();
const normalizeCountry = (v: unknown) => normalize(v).toUpperCase();
const isBlank = (v: unknown) => normalize(v).length === 0;
const hasAtLeastOneAddressLine = (line1?: string, line2?: string) =>
  !isBlank(line1) || !isBlank(line2);

const MissingFieldNotice = ({ text }: { text: string }) => (
  <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
    <span>{text}</span>
  </div>
);

const SectionCard = ({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-gray-200 bg-white">
    <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 rounded-xl border border-gray-200 bg-white p-2 text-gray-700">
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-[12px] text-gray-600">{subtitle}</p> : null}
        </div>
      </div>
    </div>
    <div className="px-5 py-5">{children}</div>
  </section>
);

const StepBadge = ({
  active,
  done,
  label,
  index,
}: {
  active: boolean;
  done: boolean;
  label: string;
  index: number;
}) => (
  <div
    className={[
      "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
      active
        ? "border-gray-900 bg-gray-900 text-white"
        : done
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-gray-200 bg-white text-gray-700",
    ].join(" ")}
  >
    <div
      className={[
        "grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold",
        active
          ? "bg-white/15 text-white"
          : done
          ? "bg-emerald-100 text-emerald-800"
          : "bg-gray-100 text-gray-700",
      ].join(" ")}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
    </div>
    <span className="text-[13px] font-medium">{label}</span>
  </div>
);

const missingBlockClass = (missing: boolean) =>
  missing ? "rounded-xl border border-amber-300 bg-amber-50/40 p-2" : "";

const OnboardingPage: React.FC = () => {
  const { t, i18n } = useTranslation("onboarding");
  const navigate = useNavigate();
  const { permissions, isOwner } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [ledgerSubmitting, setLedgerSubmitting] = useState(false);

  const [snack, setSnack] = useState<Snack>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  const [personalForm, setPersonalForm] = useState<PersonalForm>({
    phone: "",
    national_id: "",
    timezone: "",
    country: "",
    line1: "",
    line2: "",
  });

  const [orgForm, setOrgForm] = useState<OrgForm>({
    timezone: "",
    country: "",
    line1: "",
    line2: "",
  });

  const [selectedPersonalTimezone, setSelectedPersonalTimezone] = useState<{ label: string; value: string }[]>([]);
  const [selectedOrgTimezone, setSelectedOrgTimezone] = useState<{ label: string; value: string }[]>([]);
  const countries = useMemo<CountryOption[]>(() => getCountries(i18n.language), [i18n.language]);
  const [selectedPersonalCountry, setSelectedPersonalCountry] = useState<CountryOption[]>([]);
  const [selectedOrgCountry, setSelectedOrgCountry] = useState<CountryOption[]>([]);

  const [step, setStep] = useState(0);
  const [ledgerMode, setLedgerMode] = useState<Mode>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textBlock, setTextBlock] = useState("");
  const [stdChoice, setStdChoice] = useState<"personal" | "business" | null>(null);

  const canViewPersonal = isOwner || permissions.includes("view_personal_settings_page");
  const canViewOrganization = isOwner || permissions.includes("view_organization_settings_page");
  const canUseLedger =
    isOwner ||
    (permissions.includes("view_ledger_accounts_page") &&
      permissions.includes("add_ledger_account"));

  const loadAll = useCallback(async () => {
    const tasks: Promise<unknown>[] = [api.getOnboardingStatus()];

    if (canViewPersonal) tasks.push(api.getPersonalSettings());
    if (canViewOrganization) tasks.push(api.getOrganization());

    const results = await Promise.all(tasks);

    let idx = 0;
    const onboardingRes = results[idx++] as Awaited<ReturnType<typeof api.getOnboardingStatus>>;
    setOnboarding(onboardingRes.data);

    if (canViewPersonal) {
      const personalRes = results[idx++] as Awaited<ReturnType<typeof api.getPersonalSettings>>;
      const data = personalRes.data;

      setPersonalForm({
        phone: data.phone ?? "",
        national_id: data.national_id ?? "",
        timezone: data.timezone ?? "",
        country: normalizeCountry(data.country),
        line1: data.line1 ?? "",
        line2: data.line2 ?? "",
      });

      const tz = TIMEZONES.find((z) => z.value === (data.timezone ?? ""));
      setSelectedPersonalTimezone(tz ? [tz] : []);

      const country = countries.find((c) => c.value === normalizeCountry(data.country));
      setSelectedPersonalCountry(country ? [country] : []);
    }

    if (canViewOrganization) {
      const orgRes = results[idx++] as Awaited<ReturnType<typeof api.getOrganization>>;
      const data = orgRes.data;

      setOrgForm({
        timezone: data.timezone ?? "",
        country: normalizeCountry(data.country),
        line1: data.line1 ?? "",
        line2: data.line2 ?? "",
      });

      const tz = TIMEZONES.find((z) => z.value === (data.timezone ?? ""));
      setSelectedOrgTimezone(tz ? [tz] : []);

      const country = countries.find((c) => c.value === normalizeCountry(data.country));
      setSelectedOrgCountry(country ? [country] : []);
    }
  }, [canViewOrganization, canViewPersonal, countries]);

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadAll();
      } catch (e) {
        console.error(e);
        if (mounted) {
          setSnack({ message: t("errors.load"), severity: "error" });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadAll, t]);

  const refreshOnboarding = useCallback(async () => {
    try {
      setLoadingOnboarding(true);
      const { data } = await api.getOnboardingStatus();
      setOnboarding(data);
    } finally {
      setLoadingOnboarding(false);
    }
  }, []);

  const personalDone = Boolean(
    onboarding?.personal_locale_setup && onboarding?.personal_info_setup
  );
  const orgDone = Boolean(onboarding?.org_locale_setup && onboarding?.org_info_setup);
  const ledgerDone = Boolean(onboarding?.ledger_accounts_setup);

  const steps = useMemo(() => {
    const arr: { key: StepKey; label: string; done: boolean }[] = [];
    if (canViewPersonal && !personalDone) {
      arr.push({ key: "personal", label: t("steps.personal"), done: false });
    }
    if (canViewOrganization && !orgDone) {
      arr.push({ key: "organization", label: t("steps.organization"), done: false });
    }
    if (canUseLedger && !ledgerDone) {
      arr.push({ key: "ledger", label: t("steps.ledger"), done: false });
    }
    return arr;
  }, [canUseLedger, canViewOrganization, canViewPersonal, ledgerDone, orgDone, personalDone, t]);

  useEffect(() => {
    if (!steps.length) return;
    if (step > steps.length - 1) setStep(0);
  }, [step, steps.length]);

  const personalMissing = {
    phone: isBlank(personalForm.phone),
    national_id: isBlank(personalForm.national_id),
    timezone: isBlank(personalForm.timezone),
    country: isBlank(personalForm.country),
    addressGroup: !hasAtLeastOneAddressLine(personalForm.line1, personalForm.line2),
    line1:
      !hasAtLeastOneAddressLine(personalForm.line1, personalForm.line2) &&
      isBlank(personalForm.line1),
    line2:
      !hasAtLeastOneAddressLine(personalForm.line1, personalForm.line2) &&
      isBlank(personalForm.line2),
  };

  const orgMissing = {
    timezone: isBlank(orgForm.timezone),
    country: isBlank(orgForm.country),
    addressGroup: !hasAtLeastOneAddressLine(orgForm.line1, orgForm.line2),
    line1:
      !hasAtLeastOneAddressLine(orgForm.line1, orgForm.line2) &&
      isBlank(orgForm.line1),
    line2:
      !hasAtLeastOneAddressLine(orgForm.line1, orgForm.line2) &&
      isBlank(orgForm.line2),
  };

  const isPersonalStepValid =
    !personalMissing.phone &&
    !personalMissing.national_id &&
    !personalMissing.timezone &&
    !personalMissing.country &&
    !personalMissing.addressGroup;

  const isOrgStepValid =
    !orgMissing.timezone &&
    !orgMissing.country &&
    !orgMissing.addressGroup;

  const savePersonal = async () => {
    if (!isPersonalStepValid) {
      setSnack({ message: t("errors.personalInvalid"), severity: "warning" });
      return;
    }

    try {
      setSavingPersonal(true);

      const payload: EditPersonalSettingsRequest = {
        phone: personalForm.phone,
        national_id: personalForm.national_id,
        timezone: personalForm.timezone,
        country: normalizeCountry(personalForm.country),
        line1: personalForm.line1,
        line2: personalForm.line2,
      };

      await api.editPersonalSettings(payload);
      await refreshOnboarding();
      setSnack({ message: t("success.personal"), severity: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ message: t("errors.personalSave"), severity: "error" });
    } finally {
      setSavingPersonal(false);
    }
  };

  const saveOrg = async () => {
    if (!isOrgStepValid) {
      setSnack({ message: t("errors.organizationInvalid"), severity: "warning" });
      return;
    }

    try {
      setSavingOrg(true);

      await api.editOrganization({
        timezone: orgForm.timezone,
        country: normalizeCountry(orgForm.country),
        line1: orgForm.line1,
        line2: orgForm.line2,
      });

      await refreshOnboarding();
      setSnack({ message: t("success.organization"), severity: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ message: t("errors.organizationSave"), severity: "error" });
    } finally {
      setSavingOrg(false);
    }
  };

  const submitLedger = async () => {
    try {
      setLedgerSubmitting(true);

      if (ledgerMode === "csv") {
        if (!csvFile) {
          setSnack({ message: t("errors.ledgerFile"), severity: "warning" });
          return;
        }

        const formData = new FormData();
        formData.append("mode", "csv");
        formData.append("file", csvFile);
        await api.importLedgerAccounts(formData);
      } else if (ledgerMode === "manual") {
        if (!textBlock.trim()) {
          setSnack({ message: t("errors.ledgerManual"), severity: "warning" });
          return;
        }

        const formData = new FormData();
        formData.append("mode", "manual");
        formData.append("manual_text", textBlock);
        await api.importLedgerAccounts(formData);
      } else if (ledgerMode === "standard") {
        if (!stdChoice) {
          setSnack({ message: t("errors.ledgerStandard"), severity: "warning" });
          return;
        }

        await api.importStandardLedgerAccounts(stdChoice);
      } else {
        setSnack({ message: t("errors.ledgerMode"), severity: "info" });
        return;
      }

      await refreshOnboarding();
      setSnack({ message: t("success.ledger"), severity: "success" });
    } catch (e) {
      console.error(e);
      setSnack({ message: t("errors.ledgerSave"), severity: "error" });
    } finally {
      setLedgerSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={8} />
      </>
    );
  }

  if (!steps.length || onboarding?.completed) {
    return (
      <main className="min-h-full bg-transparent text-gray-900 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <SectionCard
            title={t("done.title")}
            subtitle={t("done.subtitle")}
            icon={<CheckCircle2 className="h-5 w-5" />}
          >
            <div className="flex justify-end">
              <Button onClick={() => navigate("/cashflow")}>{t("done.cta")}</Button>
            </div>
          </SectionCard>
        </div>
      </main>
    );
  }

  const currentStep = steps[step];

  return (
    <>
      <TopProgress
        active={savingPersonal || savingOrg || ledgerSubmitting || loadingOnboarding}
        variant="top"
        topOffset={64}
      />

      <main className="min-h-full bg-transparent text-gray-900 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h1 className="text-[17px] font-semibold text-gray-900">
                    {t("header.title")}
                  </h1>
                  <p className="mt-1 text-[12px] text-gray-600">
                    {t("header.subtitle")}
                  </p>
                </div>

                <div className="px-4 py-4 space-y-3">
                  {steps.map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStep(index)}
                      className="w-full text-left"
                    >
                      <StepBadge
                        active={step === index}
                        done={item.done}
                        label={item.label}
                        index={index}
                      />
                    </button>
                  ))}
                </div>
              </section>
            </aside>

            <div className="lg:col-span-8 xl:col-span-9">
              {currentStep?.key === "personal" && (
                <SectionCard
                  title={t("personal.title")}
                  subtitle={t("personal.subtitle")}
                  icon={<UserRound className="h-5 w-5" />}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={missingBlockClass(personalMissing.phone)}>
                      <Input
                        kind="text"
                        label={t("fields.phoneRequired")}
                        name="phone"
                        value={personalForm.phone}
                        onChange={(e) =>
                          setPersonalForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder={t("placeholders.phone")}
                      />
                      {personalMissing.phone && (
                        <MissingFieldNotice text={t("validations.phone")} />
                      )}
                    </div>

                    <div className={missingBlockClass(personalMissing.national_id)}>
                      <Input
                        kind="text"
                        label={t("fields.nationalIdRequired")}
                        name="national_id"
                        value={personalForm.national_id}
                        onChange={(e) =>
                          setPersonalForm((p) => ({
                            ...p,
                            national_id: e.target.value,
                          }))
                        }
                        placeholder={t("placeholders.nationalId")}
                      />
                      {personalMissing.national_id && (
                        <MissingFieldNotice text={t("validations.nationalId")} />
                      )}
                    </div>

                    <div className={missingBlockClass(personalMissing.timezone)}>
                      <SelectDropdown<{ label: string; value: string }>
                        label={t("fields.timezoneRequired")}
                        items={TIMEZONES}
                        selected={selectedPersonalTimezone}
                        onChange={(items) => {
                          setSelectedPersonalTimezone(items);
                          setPersonalForm((p) => ({
                            ...p,
                            timezone: items[0]?.value ?? "",
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        clearOnClickOutside={false}
                        buttonLabel={
                          selectedPersonalTimezone[0]?.label ||
                          (personalForm.timezone
                            ? formatTimezoneLabel(personalForm.timezone)
                            : t("placeholders.timezone"))
                        }
                        customStyles={{ maxHeight: "260px" }}
                      />
                      {personalMissing.timezone && (
                        <MissingFieldNotice text={t("validations.timezone")} />
                      )}
                    </div>

                    <div className={missingBlockClass(personalMissing.country)}>
                      <SelectDropdown<CountryOption>
                        label={t("fields.countryRequired")}
                        items={countries}
                        selected={selectedPersonalCountry}
                        onChange={(items) => {
                          setSelectedPersonalCountry(items);
                          setPersonalForm((p) => ({
                            ...p,
                            country: (items[0]?.value ?? "").toString().toUpperCase(),
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        clearOnClickOutside={false}
                        buttonLabel={
                          selectedPersonalCountry[0]?.label || t("placeholders.country")
                        }
                        customStyles={{ maxHeight: "260px" }}
                      />
                      {personalMissing.country && (
                        <MissingFieldNotice text={t("validations.country")} />
                      )}
                    </div>

                    <div className={missingBlockClass(personalMissing.line1)}>
                      <Input
                        kind="text"
                        label={t("fields.addressLine1Required")}
                        name="line1"
                        value={personalForm.line1}
                        onChange={(e) =>
                          setPersonalForm((p) => ({ ...p, line1: e.target.value }))
                        }
                        placeholder={t("placeholders.address1")}
                      />
                    </div>

                    <div className={missingBlockClass(personalMissing.line2)}>
                      <Input
                        kind="text"
                        label={t("fields.addressLine2Required")}
                        name="line2"
                        value={personalForm.line2}
                        onChange={(e) =>
                          setPersonalForm((p) => ({ ...p, line2: e.target.value }))
                        }
                        placeholder={t("placeholders.address2")}
                      />
                    </div>
                  </div>

                  {personalMissing.addressGroup && (
                    <div className="mt-3">
                      <MissingFieldNotice text={t("validations.personalAddress")} />
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <Button onClick={savePersonal} isLoading={savingPersonal}>
                      {t("actions.saveContinue")}
                    </Button>
                  </div>
                </SectionCard>
              )}

              {currentStep?.key === "organization" && (
                <SectionCard
                  title={t("organization.title")}
                  subtitle={t("organization.subtitle")}
                  icon={<Building2 className="h-5 w-5" />}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={missingBlockClass(orgMissing.timezone)}>
                      <SelectDropdown<{ label: string; value: string }>
                        label={t("fields.orgTimezoneRequired")}
                        items={TIMEZONES}
                        selected={selectedOrgTimezone}
                        onChange={(items) => {
                          setSelectedOrgTimezone(items);
                          setOrgForm((p) => ({
                            ...p,
                            timezone: items[0]?.value ?? "",
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        clearOnClickOutside={false}
                        buttonLabel={
                          selectedOrgTimezone[0]?.label ||
                          (orgForm.timezone
                            ? formatTimezoneLabel(orgForm.timezone)
                            : t("placeholders.timezone"))
                        }
                        customStyles={{ maxHeight: "260px" }}
                      />
                      {orgMissing.timezone && (
                        <MissingFieldNotice text={t("validations.orgTimezone")} />
                      )}
                    </div>

                    <div className={missingBlockClass(orgMissing.country)}>
                      <SelectDropdown<CountryOption>
                        label={t("fields.orgCountryRequired")}
                        items={countries}
                        selected={selectedOrgCountry}
                        onChange={(items) => {
                          setSelectedOrgCountry(items);
                          setOrgForm((p) => ({
                            ...p,
                            country: (items[0]?.value ?? "").toString().toUpperCase(),
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        clearOnClickOutside={false}
                        buttonLabel={
                          selectedOrgCountry[0]?.label || t("placeholders.country")
                        }
                        customStyles={{ maxHeight: "260px" }}
                      />
                      {orgMissing.country && (
                        <MissingFieldNotice text={t("validations.orgCountry")} />
                      )}
                    </div>

                    <div className={missingBlockClass(orgMissing.line1)}>
                      <Input
                        kind="text"
                        label={t("fields.orgAddressLine1Required")}
                        name="line1"
                        value={orgForm.line1}
                        onChange={(e) =>
                          setOrgForm((p) => ({ ...p, line1: e.target.value }))
                        }
                        placeholder={t("placeholders.address1")}
                      />
                    </div>

                    <div className={missingBlockClass(orgMissing.line2)}>
                      <Input
                        kind="text"
                        label={t("fields.orgAddressLine2Required")}
                        name="line2"
                        value={orgForm.line2}
                        onChange={(e) =>
                          setOrgForm((p) => ({ ...p, line2: e.target.value }))
                        }
                        placeholder={t("placeholders.address2")}
                      />
                    </div>
                  </div>

                  {orgMissing.addressGroup && (
                    <div className="mt-3">
                      <MissingFieldNotice text={t("validations.orgAddress")} />
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <Button onClick={saveOrg} isLoading={savingOrg}>
                      {t("actions.saveContinue")}
                    </Button>
                  </div>
                </SectionCard>
              )}

              {currentStep?.key === "ledger" && (
                <SectionCard
                  title={t("ledger.title")}
                  subtitle={t("ledger.subtitle")}
                  icon={<CreditCard className="h-5 w-5" />}
                >
                  <div className="space-y-5">
                    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[14px] font-semibold text-gray-900">
                          {t("ledger.csvTitle")}
                        </h3>
                        <label className="text-[13px] flex items-center gap-2 text-gray-700">
                          <input
                            type="radio"
                            name="ledger-mode"
                            checked={ledgerMode === "csv"}
                            onChange={() => setLedgerMode("csv")}
                            disabled={ledgerSubmitting}
                          />
                          {t("actions.choose")}
                        </label>
                      </div>

                      {ledgerMode === "csv" && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              onClick={() => api.downloadLedgerCsvTemplate()}
                            >
                              {t("ledger.downloadCsv")}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => api.downloadLedgerXlsxTemplate()}
                            >
                              {t("ledger.downloadXlsx")}
                            </Button>
                          </div>

                          <Input
                            kind="text"
                            type="file"
                            label={t("ledger.uploadLabel")}
                            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                            accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                          />
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[14px] font-semibold text-gray-900">
                          {t("ledger.manualTitle")}
                        </h3>
                        <label className="text-[13px] flex items-center gap-2 text-gray-700">
                          <input
                            type="radio"
                            name="ledger-mode"
                            checked={ledgerMode === "manual"}
                            onChange={() => setLedgerMode("manual")}
                            disabled={ledgerSubmitting}
                          />
                          {t("actions.choose")}
                        </label>
                      </div>

                      {ledgerMode === "manual" && (
                        <textarea
                          className="w-full min-h-[160px] rounded-xl border border-gray-200 p-3 text-[14px] outline-none focus:ring-2 focus:ring-gray-200"
                          placeholder={t("ledger.manualPlaceholder")}
                          value={textBlock}
                          onChange={(e) => setTextBlock(e.target.value)}
                        />
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[14px] font-semibold text-gray-900">
                          {t("ledger.standardTitle")}
                        </h3>
                        <label className="text-[13px] flex items-center gap-2 text-gray-700">
                          <input
                            type="radio"
                            name="ledger-mode"
                            checked={ledgerMode === "standard"}
                            onChange={() => setLedgerMode("standard")}
                            disabled={ledgerSubmitting}
                          />
                          {t("actions.choose")}
                        </label>
                      </div>

                      {ledgerMode === "standard" && (
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-[13px] text-gray-700">
                            <input
                              type="radio"
                              name="std"
                              checked={stdChoice === "personal"}
                              onChange={() => setStdChoice("personal")}
                              disabled={ledgerSubmitting}
                            />
                            {t("ledger.personalPlan")}
                          </label>

                          <label className="flex items-center gap-2 text-[13px] text-gray-700">
                            <input
                              type="radio"
                              name="std"
                              checked={stdChoice === "business"}
                              onChange={() => setStdChoice("business")}
                              disabled={ledgerSubmitting}
                            />
                            {t("ledger.businessPlan")}
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <Button onClick={submitLedger} isLoading={ledgerSubmitting}>
                        {t("actions.finishSetup")}
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>
          </div>
        </div>
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

export default OnboardingPage;