import {
  useEffect,
  useState,
  useMemo,
  FormEvent,
  MouseEvent,
  ChangeEvent,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "src/api/requests";
import { validatePassword, useAutoCountry } from "src/lib";

import Snackbar from "src/components/ui/Snackbar";
import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";

import signUpBackground from "@/assets/Images/background/signup-background.svg";
import logoBlack from "@/assets/Icons/Logo/logo-black.svg";

import { getCountries, CountryOption } from "@/lib/location/countries";
import { getCurrencies, CurrencyOption } from "@/lib/currency/currencies";
import type { SignUpRequest } from "src/models/auth/auth";

type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

type Step = 1 | 2 | 3 | 4;

type AppLanguage = "en" | "pt" | "fr" | "de";
type AppCurrency = string;

type LanguageOption = { value: AppLanguage; label: string };

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

const emailProviders: Record<string, string> = {
  "gmail.com": "https://mail.google.com/",
  "outlook.com": "https://outlook.office.com/mail/",
  "hotmail.com": "https://outlook.office.com/mail/",
  "live.com": "https://outlook.office.com/mail/",
  "icloud.com": "https://www.icloud.com/",
  "yahoo.com": "https://mail.yahoo.com/",
};

const SignUp = () => {
  const { t, i18n } = useTranslation("signUp");
  const [step, setStep] = useState<Step>(1);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  // Step 1 – account
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Step 2 – preferences
  const [prefs, setPrefs] = useState<{
    language: AppLanguage | "";
    country: string;
    currency: AppCurrency;
  }>({
    language: "",
    country: "",
    currency: "EUR",
  });

  // Step 3 – consents
  const [consents, setConsents] = useState({
    privacy: false,
    tos: false,
    marketing: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  // For success screen
  const [emailServiceUrl, setEmailServiceUrl] = useState<string>("");
  const [createdEmail, setCreatedEmail] = useState<string>("");

  // Telemetry
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { country: autoCountry } = useAutoCountry({ timeoutMs: 2500 });
  const browserLanguage =
    typeof navigator !== "undefined" ? navigator.language : "";
  const browserLanguages: string[] =
    typeof navigator !== "undefined" && Array.isArray(navigator.languages)
      ? [...navigator.languages]
      : [];
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;

  // Country dataset and selection
  const COUNTRIES = useMemo<CountryOption[]>(
    () => getCountries(i18n.language),
    [i18n.language]
  );
  const [selectedCountry, setSelectedCountry] = useState<CountryOption[]>([]);

  // Currency dataset and selection
  const CURRENCIES = useMemo<CurrencyOption[]>(
    () => getCurrencies(i18n.language),
    [i18n.language]
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption[]>([]);

  // Language dropdown selection
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption[]>([]);

  const getApiErrorMessage = (err: unknown) => {
    if (!err || typeof err !== "object") return t("apiFallbackError");
    const e = err as { message?: unknown; detail?: unknown };
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.detail === "string" && e.detail) return e.detail;
    return t("apiFallbackError");
  };

  // Initialize language default from i18n
  useEffect(() => {
    const raw = (i18n.language || "en").split("-")[0];
    const allowed: AppLanguage[] = ["en", "pt", "fr", "de"];
    const safeLang: AppLanguage = allowed.includes(raw as AppLanguage)
      ? (raw as AppLanguage)
      : "en";

    setPrefs((prev) => ({
      ...prev,
      language: (prev.language || safeLang) as AppLanguage,
    }));
  }, [i18n.language]);

  // Keep language dropdown in sync with prefs.language
  useEffect(() => {
    if (!prefs.language) {
      setSelectedLanguage([]);
      return;
    }
    const found = LANGUAGE_OPTIONS.find((opt) => opt.value === prefs.language);
    setSelectedLanguage(found ? [found] : []);
  }, [prefs.language]);

  // Initialize country default from autoCountry
  useEffect(() => {
    if (!autoCountry) return;
    setPrefs((prev) => ({
      ...prev,
      country: prev.country || autoCountry.toUpperCase(),
    }));
  }, [autoCountry]);

  // Keep country dropdown in sync with prefs.country
  useEffect(() => {
    if (!prefs.country) {
      setSelectedCountry([]);
      return;
    }
    const code = prefs.country.toUpperCase();
    const found = COUNTRIES.find((c) => c.value === code);
    setSelectedCountry(found ? [found] : []);
  }, [prefs.country, COUNTRIES]);

  // Keep currency dropdown in sync with prefs.currency
  useEffect(() => {
    if (!prefs.currency) {
      setSelectedCurrency([]);
      return;
    }
    const code = prefs.currency.toUpperCase();
    const found = CURRENCIES.find((c) => c.value === code);
    setSelectedCurrency(found ? [found] : []);
  }, [prefs.currency, CURRENCIES]);

  const handleInputChange =
    (field: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleConsentChange =
    (field: keyof typeof consents) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setConsents((prev) => ({ ...prev, [field]: checked }));
    };

  const isStep1Incomplete =
    !form.name || !form.email || !form.password || !form.confirmPassword;

  const isStep2Incomplete = !prefs.language || !prefs.country || !prefs.currency;

  const isStep3Incomplete = !consents.privacy || !consents.tos;

  const computeEmailServiceUrl = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    return emailProviders[domain] || `mailto:${email}`;
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    // STEP 1 – validate and go to step 2
    if (step === 1) {
      if (isStep1Incomplete) {
        setSnack({ message: t("fillAllFields"), severity: "warning" });
        return;
      }

      if (form.password !== form.confirmPassword) {
        setSnack({ message: t("passwordsDontMatch"), severity: "warning" });
        return;
      }

      const { isValid, message } = validatePassword(form.password);
      if (!isValid) {
        setSnack({ message, severity: "warning" });
        return;
      }

      try {
        setIsLoading(true);
        const res = await api.checkEmailAvailability(form.email);

        if ("error" in res) {
          setSnack({
            message: getApiErrorMessage(res.error),
            severity: "error",
          });
          return;
        }

        if (!res.data.available) {
          setSnack({ message: t("emailAlreadyInUse"), severity: "warning" });
          return;
        }

        setStep(2);
      } catch {
        setSnack({ message: t("signUpUnexpectedError"), severity: "error" });
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // STEP 2 – validate and go to step 3
    if (step === 2) {
      if (isStep2Incomplete) {
        setSnack({ message: t("fillAllFields"), severity: "warning" });
        return;
      }

      setStep(3);
      return;
    }

    // STEP 3 – final validations + API call
    if (step === 3) {
      if (isStep3Incomplete) {
        setSnack({
          message: t("mustAcceptRequiredConsents"),
          severity: "warning",
        });
        return;
      }

      setIsLoading(true);

      try {
        const payload: SignUpRequest = {
          name: form.name,
          email: form.email,
          password: form.password,
          timezone,
          country: prefs.country.toUpperCase(),

          language: prefs.language || undefined,
          currency: prefs.currency,

          browser_language: browserLanguage,
          browser_languages: browserLanguages,
          locale,

          consents: {
            privacy_policy: consents.privacy,
            terms_of_service: consents.tos,
            marketing: consents.marketing,
          },
        };

        const res = await api.signUp(payload);

        if ("error" in res) {
          setSnack({
            message: getApiErrorMessage(res.error),
            severity: "error",
          });
          return;
        }

        setSnack({ message: t("signUpSuccess"), severity: "success" });

        const url = computeEmailServiceUrl(form.email);
        setCreatedEmail(form.email);
        setEmailServiceUrl(url);

        setForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        setStep(4);
      } catch {
        setSnack({ message: t("signUpUnexpectedError"), severity: "error" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    setStep((prev) => {
      if (prev <= 1) return 1;
      if (prev >= 4) return 3;
      return (prev - 1) as Step;
    });
  };

  const handleOpenEmail = () => {
    if (emailServiceUrl) {
      window.open(emailServiceUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Left section (image) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-slate-900">
        <img
          src={signUpBackground}
          alt={t("backgroundAlt")}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/80 to-slate-800/60" />
      </div>

      {/* Right section (form + success) */}
      <div className="flex flex-col w-full md:w-1/2 px-6 py-6 sm:px-10 sm:py-8">
        {/* Logo */}
        <header className="flex items-center justify-between mb-8">
          <a
            href="https://spifex.com"
            className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 rounded-lg"
          >
            <img
              src={logoBlack}
              alt="Spifex logo"
              className="h-7 w-auto sm:h-8"
            />
          </a>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            {step < 4 ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    {t("heading")}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    {t("subheading")}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          step >= s ? "bg-slate-900" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="relative min-h-[220px]">
                    {/* STEP 1 – account */}
                    <div
                      className={`space-y-4 transition-opacity duration-300 ${
                        step === 1
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none absolute inset-0"
                      }`}
                    >
                      <Input
                        label={t("nameLabel")}
                        placeholder={t("namePlaceholder")}
                        type="text"
                        value={form.name}
                        onChange={handleInputChange("name")}
                        disabled={isLoading}
                        autoComplete="off"
                      />

                      <Input
                        label={t("emailLabel")}
                        placeholder={t("emailPlaceholder")}
                        type="email"
                        value={form.email}
                        onChange={handleInputChange("email")}
                        disabled={isLoading}
                        autoComplete="email"
                        autoCorrect="off"
                      />

                      <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
                        <div className="flex-1">
                          <Input
                            label={t("passwordLabel")}
                            placeholder={t("passwordPlaceholder")}
                            type="password"
                            value={form.password}
                            onChange={handleInputChange("password")}
                            disabled={isLoading}
                            showTogglePassword
                            autoComplete="new-password"
                            autoCorrect="off"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            label={t("confirmPasswordLabel")}
                            placeholder={t("confirmPasswordPlaceholder")}
                            type="password"
                            value={form.confirmPassword}
                            onChange={handleInputChange("confirmPassword")}
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            disabled={isLoading}
                            showTogglePassword
                            autoComplete="new-password"
                            autoCorrect="off"
                          />
                        </div>
                      </div>
                    </div>

                    {/* STEP 2 – preferences */}
                    <div
                      className={`space-y-4 transition-opacity duration-300 ${
                        step === 2
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none absolute inset-0"
                      }`}
                    >
                      <SelectDropdown<LanguageOption>
                        label={t("languageLabel")}
                        items={LANGUAGE_OPTIONS}
                        selected={selectedLanguage}
                        onChange={(items) => {
                          const next = (items[0]?.value ?? "") as
                            | AppLanguage
                            | "";
                          setSelectedLanguage(items);
                          setPrefs((prev) => ({ ...prev, language: next }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        clearOnClickOutside={false}
                        buttonLabel={
                          selectedLanguage[0]?.label || t("languagePlaceholder")
                        }
                        customStyles={{ maxHeight: "260px" }}
                        disabled={isLoading}
                        hideFilter
                      />

                      <SelectDropdown<CountryOption>
                        label={t("countryLabel")}
                        items={COUNTRIES}
                        selected={selectedCountry}
                        onChange={(items) => {
                          const v = (items[0]?.value ?? "")
                            .toString()
                            .toUpperCase();
                          setSelectedCountry(items);
                          setPrefs((prev) => ({ ...prev, country: v }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        clearOnClickOutside={false}
                        buttonLabel={
                          selectedCountry[0]?.label || t("countryPlaceholder")
                        }
                        customStyles={{ maxHeight: "260px" }}
                        disabled={isLoading}
                      />

                      <SelectDropdown<CurrencyOption>
                        label={t("currencyLabel")}
                        items={CURRENCIES}
                        selected={selectedCurrency}
                        onChange={(items) => {
                          setSelectedCurrency(items);
                          const value = items[0]?.value ?? "";
                          setPrefs((prev) => ({
                            ...prev,
                            currency: value || prev.currency,
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        clearOnClickOutside={false}
                        buttonLabel={
                          selectedCurrency[0]?.label || t("currencyPlaceholder")
                        }
                        customStyles={{ maxHeight: "200px" }}
                        disabled={isLoading}
                      />
                    </div>

                    {/* STEP 3 – consents */}
                    <div
                      className={`space-y-4 transition-opacity duration-300 ${
                        step === 3
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none absolute inset-0"
                      }`}
                    >
                      <p className="text-sm text-slate-600 mb-1">
                        {t("consentIntro")}
                      </p>

                      <label className="flex items-start gap-3 text-sm text-slate-700">
                        <Checkbox
                          checked={consents.privacy}
                          onChange={handleConsentChange("privacy")}
                          disabled={isLoading}
                          required
                        />
                        <span>
                          {t("privacyConsent")}{" "}
                          <a
                            href="/legal/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-900 underline underline-offset-2"
                          >
                            {t("viewPrivacyPolicy")}
                          </a>
                        </span>
                      </label>

                      <label className="flex items-start gap-3 text-sm text-slate-700">
                        <Checkbox
                          checked={consents.tos}
                          onChange={handleConsentChange("tos")}
                          disabled={isLoading}
                          required
                        />
                        <span>
                          {t("tosConsent")}{" "}
                          <a
                            href="/legal/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-900 underline underline-offset-2"
                          >
                            {t("viewTos")}
                          </a>
                        </span>
                      </label>

                      <label className="flex items-start gap-3 text-sm text-slate-700">
                        <Checkbox
                          checked={consents.marketing}
                          onChange={handleConsentChange("marketing")}
                          disabled={isLoading}
                        />
                        <span>{t("marketingConsent")}</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {step > 1 && step < 4 && (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleBack}
                        disabled={isLoading}
                        className="w-full h-12 rounded-xl text-sm font-medium sm:flex-1"
                      >
                        {t("backButton")}
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      type="submit"
                      isLoading={isLoading}
                      disabled={
                        isLoading ||
                        (step === 1 && isStep1Incomplete) ||
                        (step === 2 && isStep2Incomplete) ||
                        (step === 3 && isStep3Incomplete)
                      }
                      className="w-full h-12 rounded-xl text-sm font-medium sm:flex-1"
                    >
                      {step === 3 ? t("signUpButton") : t("continueButton")}
                    </Button>
                  </div>
                </form>

                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{t("hasAccount")}</span>
                  <Link
                    to="/signin"
                    className="font-medium text-slate-900 hover:underline underline-offset-4"
                  >
                    {t("signInCta")}
                  </Link>
                </div>
              </>
            ) : (
              <div className="bg-white shadow-sm rounded-2xl p-6 sm:p-8 text-center">
                <h1 className="text-2xl font-semibold text-slate-900 mb-4">
                  {t("redirectHeading")}
                </h1>
                <p className="text-sm text-slate-500 mb-6">
                  {t("redirectDescription")}
                </p>

                {createdEmail && (
                  <p className="text-xs text-slate-400 mb-4">
                    {t("redirectSentTo")}{" "}
                    <span className="font-medium text-slate-600">
                      {createdEmail}
                    </span>
                  </p>
                )}

                {emailServiceUrl && (
                  <Button
                    variant="primary"
                    onClick={handleOpenEmail}
                    className="w-full h-11 rounded-xl text-sm font-medium"
                  >
                    {t("redirectOpenEmailButton")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>

        <Snackbar
          open={!!snack}
          autoHideDuration={6000}
          onClose={() => setSnack(null)}
          severity={snack?.severity}
          message={snack?.message}
          anchor={{ vertical: "bottom", horizontal: "center" }}
          pauseOnHover
          showCloseButton
        />
      </div>
    </div>
  );
};

export default SignUp;
