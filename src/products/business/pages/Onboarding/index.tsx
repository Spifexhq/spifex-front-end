import SegmentedControl from "@/shared/ui/SegmentedControl";
import { motion, useReducedMotion } from "framer-motion";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  ListTree,
  RefreshCcw,
  UserRound,
} from "lucide-react";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { Select } from "src/shared/ui/Select";

import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { TIMEZONES } from "@/lib/location/timezonesList";
import { formatTimezoneLabel } from "@/lib/location/formatTimezoneLabel";
import { getCountries, type CountryOption } from "@/lib/location/countries";

import type { ConfigurationStatus } from "@/models/auth/configuration";
import type { EditPersonalSettingsRequest } from "@/models/auth/user";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type StepKey = "personal" | "organization" | "accounting";

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

const CATEGORY_SETTINGS_PATH = "/settings/categories";

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
  <section className="rounded-xl border border-[#e1e6ee] bg-white">
    <div className="border-b border-[#e8ebf0] bg-white px-5 py-5">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 rounded-xl border border-gray-200 bg-white p-2 text-gray-700">
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-[15px] font-semibold text-[#26344a]">{title}</h2>
          {subtitle ? <p className="mt-1 text-[12px] text-gray-600">{subtitle}</p> : null}
        </div>
      </div>
    </div>
    <div className="px-5 py-5">{children}</div>
  </section>
);

const missingBlockClass = (missing: boolean) =>
  missing ? "rounded-xl border border-amber-200 bg-amber-50/30 p-2" : "";

const RequirementRow = ({
  done,
  title,
  description,
  icon,
}: {
  done: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
}) => {
  const { t } = useTranslation("onboarding");
  return (
  <div
    className={[
      "flex items-start gap-3 rounded-lg border px-4 py-4",
      done ? "border-[#e1e6ee] bg-white" : "border-gray-200 bg-white",
    ].join(" ")}
  >
    <div
      className={[
        "mt-0.5 rounded-xl border p-2",
        done ? "border-emerald-200 bg-white text-emerald-700" : "border-gray-200 bg-white text-gray-700",
      ].join(" ")}
    >
      {icon}
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <h3 className="text-[14px] font-semibold text-[#26344a]">{title}</h3>
        {done ? (
          <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {t("status.done")}
          </span>
        ) : (
          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700">
            {t("status.required")}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-gray-600">{description}</p>
    </div>
  </div>
);
};

const OnboardingPage: React.FC = () => {
  const { t, i18n } = useTranslation("onboarding");
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { permissions, isOwner } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);

  const [snack, setSnack] = useState<Snack>(null);
  const [onboarding, setOnboarding] = useState<ConfigurationStatus | null>(null);

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

  const canViewPersonal = isOwner || permissions.includes("view_personal_settings_page");
  const canViewOrganization = isOwner || permissions.includes("view_organization_settings_page");
  const canUseAccounting =
    isOwner ||
    (permissions.includes("view_ledger_accounts_page") &&
      (permissions.includes("add_ledger_account") || permissions.includes("change_ledger_account")));

  const loadAll = useCallback(async () => {
    const tasks: Promise<unknown>[] = [api.getConfigurationStatus()];

    if (canViewPersonal) tasks.push(api.getPersonalSettings());
    if (canViewOrganization) tasks.push(api.getOrganization());

    const results = await Promise.all(tasks);

    let idx = 0;
    const onboardingRes = results[idx++] as Awaited<ReturnType<typeof api.getConfigurationStatus>>;
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
          setSnack({ message: apiErrorMessage(e, t("errors.load")), severity: "error" });
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
      const { data } = await api.getConfigurationStatus();
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
  const categoriesDone = Boolean(onboarding?.cashflow_categories_setup);
  const accountingDone = Boolean(onboarding?.accounting_foundation_setup);

  const steps = useMemo(() => {
    const arr: { key: StepKey; label: string; done: boolean }[] = [];
    if (canViewPersonal && !personalDone) {
      arr.push({ key: "personal", label: t("steps.personal"), done: false });
    }
    if (canViewOrganization && !orgDone) {
      arr.push({ key: "organization", label: t("steps.organization"), done: false });
    }
    if (canUseAccounting && !accountingDone) {
      arr.push({
        key: "accounting",
        label: t("steps.accounting", { defaultValue: "Accounting foundation" }),
        done: false,
      });
    }
    return arr;
  }, [accountingDone, canUseAccounting, canViewOrganization, canViewPersonal, orgDone, personalDone, t]);

  useEffect(() => {
    if (!steps.length) return;
    if (step > steps.length - 1) setStep(0);
  }, [step, steps.length]);

  const personalMissing = {
    phone: isBlank(personalForm.phone),
    national_id: isBlank(personalForm.national_id),
    timezone: !TIMEZONES.some(z => z.value === personalForm.timezone),
    country: !countries.some(c => c.value === normalizeCountry(personalForm.country)),
    addressGroup: !hasAtLeastOneAddressLine(personalForm.line1, personalForm.line2),
    line1:
      !hasAtLeastOneAddressLine(personalForm.line1, personalForm.line2) &&
      isBlank(personalForm.line1),
    line2:
      !hasAtLeastOneAddressLine(personalForm.line1, personalForm.line2) &&
      isBlank(personalForm.line2),
  };

  const orgMissing = {
    timezone: !TIMEZONES.some(z => z.value === orgForm.timezone),
    country: !countries.some(c => c.value === normalizeCountry(orgForm.country)),
    addressGroup: !hasAtLeastOneAddressLine(orgForm.line1, orgForm.line2),
    line1:
      !hasAtLeastOneAddressLine(orgForm.line1, orgForm.line2) &&
      isBlank(orgForm.line1),
    line2:
      !hasAtLeastOneAddressLine(orgForm.line1, orgForm.line2) &&
      isBlank(orgForm.line2),
  };

  const phoneValid = /^\+?[1-9]\d{6,14}$/.test(personalForm.phone.trim());

  const isPersonalStepValid =
    !personalMissing.phone && phoneValid &&
    !personalMissing.national_id &&
    !personalMissing.timezone &&
    !personalMissing.country &&
    !personalMissing.addressGroup;

  const isOrgStepValid =
    !orgMissing.timezone &&
    !orgMissing.country &&
    !orgMissing.addressGroup;

  const savePersonal = async () => {
    if (savingPersonal) return;
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
      setSnack({ message: apiErrorMessage(e, t("errors.personalSave")), severity: "error" });
    } finally {
      setSavingPersonal(false);
    }
  };

  const saveOrg = async () => {
    if (savingOrg) return;
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
      setSnack({ message: apiErrorMessage(e, t("errors.organizationSave")), severity: "error" });
    } finally {
      setSavingOrg(false);
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
      <main className="min-h-full bg-[#f7f8fa] text-[#26344a] px-4 py-6 md:px-7 md:py-6">
        <div className="mx-auto w-full min-w-0 max-w-[1440px]">
          <SectionCard
            title={t("done.title")}
            subtitle={t("done.subtitle")}
            icon={<CheckCircle2 className="h-5 w-5" />}
          >
            <div className="flex justify-end">
              <Button onClick={() => navigate("/overview")}>{t("done.cta")}</Button>
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
        active={savingPersonal || savingOrg || loadingOnboarding}
        variant="top"
        topOffset={64}
      />

      <main className="min-h-full bg-[#f7f8fa] text-[#26344a] px-4 py-6 md:px-7 md:py-6">
        <div className="mx-auto w-full min-w-0 max-w-[1440px]">
          <div className="flex flex-col gap-6">
            <header className="space-y-5">
              <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("header.title")}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t("header.subtitle")}</p></div>
              <SegmentedControl<StepKey> value={currentStep?.key || "personal"} onChange={key => setStep(steps.findIndex(item => item.key === key))} label={t("header.title")} disabled={savingPersonal || savingOrg} items={steps.map(item => ({ value: item.key, label: <span className="inline-flex items-center gap-2">{item.done && <CheckCircle2 size={13} className="text-emerald-600"/>}{item.label}</span> }))}/>
            </header>

            <motion.div key={currentStep?.key} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{duration: reduced ? 0 : .18}} className="min-w-0">
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
                        autoComplete="tel"
                        errorMessage={!personalMissing.phone && !phoneValid ? t("validations.phoneFormat") : undefined}
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
                      <Select<{ label: string; value: string }>
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
                      <Select<CountryOption>
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
                      <Select<{ label: string; value: string }>
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
                      <Select<CountryOption>
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

              {currentStep?.key === "accounting" && (
                <SectionCard
                  title={t("accounting.title", { defaultValue: "Accounting foundation" })}
                  subtitle={t("accounting.subtitle", {
                    defaultValue:
                      "Complete and activate accounting setup, then configure the cashflow categories used by your organization.",
                  })}
                  icon={<CreditCard className="h-5 w-5" />}
                >
                  <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5">
                    <div className="space-y-5">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <RequirementRow
                          done={ledgerDone}
                          title={t("accounting.ledgerTitle", { defaultValue: "Ledger accounts" })}
                          description={t("accounting.ledgerDescription", {
                            defaultValue:
                              "Import a standard chart, upload a file, or paste your own chart of accounts.",
                          })}
                          icon={<CreditCard className="h-4 w-4" />}
                        />

                        <div className="mt-4"><Button variant="outline" onClick={() => navigate("/accounting/setup")}>{i18n.t("setupFlow.continue", { ns: "accountingSettings" })}</Button></div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4">
                        <RequirementRow
                          done={categoriesDone}
                          title={t("accounting.categoriesTitle", {
                            defaultValue: "Cashflow categories",
                          })}
                          description={t("accounting.categoriesDescription", {
                            defaultValue:
                              "At least one active operational category is required so entries can be classified before accounting consumes them.",
                          })}
                          icon={<ListTree className="h-4 w-4" />}
                        />

                        {!categoriesDone ? (
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                            <MissingFieldNotice
                              text={t("accounting.categoryRequired", {
                                defaultValue:
                                  "At least one active cashflow category is still missing.",
                              })}
                            />

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <Button
                                variant="outline"
                                onClick={() => navigate(CATEGORY_SETTINGS_PATH)}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <ListTree className="h-4 w-4" />
                                  <span>
                                    {t("accounting.openCategorySettings", {
                                      defaultValue: "Open category settings",
                                    })}
                                  </span>
                                </span>
                              </Button>

                              <Button variant="outline" onClick={() => void refreshOnboarding()}>
                                <span className="inline-flex items-center gap-2">
                                  <RefreshCcw className="h-4 w-4" />
                                  <span>
                                    {t("accounting.refreshStatus", {
                                      defaultValue: "Refresh status",
                                    })}
                                  </span>
                                </span>
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="text-[11px] uppercase tracking-wide text-gray-600">
                        {t("accounting.checklistLabel", { defaultValue: "Checklist" })}
                      </div>

                      <div className="mt-4 space-y-3">
                        <RequirementRow
                          done={ledgerDone}
                          title={t("accounting.ledgerTitle", { defaultValue: "Ledger accounts" })}
                          description={t(ledgerDone ? "status.configured" : "status.pending")}
                          icon={<CreditCard className="h-4 w-4" />}
                        />
                        <RequirementRow
                          done={categoriesDone}
                          title={t("accounting.categoriesTitle", { defaultValue: "Cashflow categories" })}
                          description={t(categoriesDone ? "status.configured" : "status.pending")}
                          icon={<ListTree className="h-4 w-4" />}
                        />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}
            </motion.div>
          </div>
        </div>
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

export default OnboardingPage;
