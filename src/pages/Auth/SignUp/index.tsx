/* --------------------------------------------------------------------------
 * File: src/pages/Auth/SignUp.tsx
 * -------------------------------------------------------------------------- */
import {
  useEffect,
  useState,
  useMemo,
  FormEvent,
  MouseEvent,
  ChangeEvent,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/api/requests";
import { validateEmailFormat, validatePassword, useAutoCountry } from "@/lib";

import Snackbar from "@/shared/ui/Snackbar";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import { Select } from "src/shared/ui/Select";

import signUpBackground from "@/assets/Images/background/signup-background.svg";
import logoBlack from "@/assets/Icons/logo/logo-black.svg";

import { getCountries, CountryOption } from "@/lib/location/countries";
import { getCurrencies, CurrencyOption } from "@/lib/currency/currencies";
import type { SignUpRequest } from "@/models/auth/auth";

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

const EMAIL_QUERY_PARAM = "email";

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
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

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

  // Success state
  const [emailServiceUrl, setEmailServiceUrl] = useState<string>("");
  const [createdEmail, setCreatedEmail] = useState<string>("");

  // Prevent refilling email repeatedly from URL once the user edits it
  const [didHydrateEmailFromQuery, setDidHydrateEmailFromQuery] = useState(false);

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

  // Derived datasets
  const COUNTRIES = useMemo<CountryOption[]>(
    () => getCountries(i18n.language),
    [i18n.language]
  );

  const CURRENCIES = useMemo<CurrencyOption[]>(
    () => getCurrencies(i18n.language),
    [i18n.language]
  );

  // Controlled dropdown selections
  const [selectedCountry, setSelectedCountry] = useState<CountryOption[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption[]>([]);

  const getApiErrorMessage = (err: unknown) => {
    if (!err || typeof err !== "object") return t("apiFallbackError");

    const e = err as { message?: unknown; detail?: unknown };

    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.detail === "string" && e.detail) return e.detail;

    return t("apiFallbackError");
  };

  const computeEmailServiceUrl = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    return emailProviders[domain] || `mailto:${email}`;
  };

  const normalizeLanguage = (rawLanguage: string): AppLanguage => {
    const raw = (rawLanguage || "en").split("-")[0];
    const allowed: AppLanguage[] = ["en", "pt", "fr", "de"];
    return allowed.includes(raw as AppLanguage) ? (raw as AppLanguage) : "en";
  };

  const showSnack = (
    message: React.ReactNode,
    severity: "success" | "error" | "warning" | "info"
  ) => {
    setSnack({ message, severity });
  };

  const isStep1Incomplete =
    !form.name.trim() ||
    !form.email.trim() ||
    !form.password ||
    !form.confirmPassword;

  const isStep2Incomplete =
    !prefs.language || !prefs.country || !prefs.currency;

  const isStep3Incomplete = !consents.privacy || !consents.tos;

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  // Hydrate email from query string: /signup?email=someone@example.com
  useEffect(() => {
    if (didHydrateEmailFromQuery) return;

    const emailFromUrl = searchParams.get(EMAIL_QUERY_PARAM)?.trim() || "";
    if (!emailFromUrl) {
      setDidHydrateEmailFromQuery(true);
      return;
    }

    const emailCheck = validateEmailFormat(emailFromUrl, t);
    if (!emailCheck.isValid || !emailCheck.normalized) {
      setDidHydrateEmailFromQuery(true);
      return;
    }

    setForm((prev) => {
      if (prev.email.trim()) return prev;
      return {
        ...prev,
        email: emailCheck.normalized,
      };
    });

    setDidHydrateEmailFromQuery(true);
  }, [didHydrateEmailFromQuery, searchParams, t]);

  // Initialize language from current i18n language
  useEffect(() => {
    const safeLang = normalizeLanguage(i18n.language);

    setPrefs((prev) => ({
      ...prev,
      language: (prev.language || safeLang) as AppLanguage,
    }));
  }, [i18n.language]);

  // Initialize country from autoCountry
  useEffect(() => {
    if (!autoCountry) return;

    setPrefs((prev) => ({
      ...prev,
      country: prev.country || autoCountry.toUpperCase(),
    }));
  }, [autoCountry]);

  // Sync selected language dropdown
  useEffect(() => {
    if (!prefs.language) {
      setSelectedLanguage([]);
      return;
    }

    const found = LANGUAGE_OPTIONS.find((opt) => opt.value === prefs.language);
    setSelectedLanguage(found ? [found] : []);
  }, [prefs.language]);

  // Sync selected country dropdown
  useEffect(() => {
    if (!prefs.country) {
      setSelectedCountry([]);
      return;
    }

    const code = prefs.country.toUpperCase();
    const found = COUNTRIES.find((country) => country.value === code);
    setSelectedCountry(found ? [found] : []);
  }, [prefs.country, COUNTRIES]);

  // Sync selected currency dropdown
  useEffect(() => {
    if (!prefs.currency) {
      setSelectedCurrency([]);
      return;
    }

    const code = prefs.currency.toUpperCase();
    const found = CURRENCIES.find((currency) => currency.value === code);
    setSelectedCurrency(found ? [found] : []);
  }, [prefs.currency, CURRENCIES]);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "");
    setForm((prev) => ({ ...prev, email: value }));
  };

  const handleInputChange =
    (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleConsentChange =
    (field: keyof typeof consents) => (e: ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setConsents((prev) => ({ ...prev, [field]: checked }));
    };

  const goToNextStep = () => {
    setStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev));
  };

  const handleBack = () => {
    setStep((prev) => {
      if (prev <= 1) return 1;
      if (prev >= 4) return 3;
      return (prev - 1) as Step;
    });
  };

  const handleOpenEmail = () => {
    if (!emailServiceUrl) return;
    window.open(emailServiceUrl, "_blank", "noopener,noreferrer");
  };

  const validateStep1 = async () => {
    const emailCheck = validateEmailFormat(form.email, t);

    if (isStep1Incomplete) {
      showSnack(t("fillAllFields"), "warning");
      return false;
    }

    if (!emailCheck.isValid) {
      showSnack(emailCheck.message || t("invalidEmailFormat"), "warning");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      showSnack(t("passwordsDontMatch"), "warning");
      return false;
    }

    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.isValid) {
      showSnack(passwordValidation.message, "warning");
      return false;
    }

    try {
      setIsLoading(true);

      if (emailCheck.normalized !== form.email) {
        setForm((prev) => ({ ...prev, email: emailCheck.normalized }));
      }

      const res = await api.checkEmailAvailability(emailCheck.normalized);

      if ("error" in res) {
        showSnack(getApiErrorMessage(res.error), "error");
        return false;
      }

      if (!res.data.available) {
        showSnack(t("emailAlreadyInUse"), "warning");
        return false;
      }

      return true;
    } catch {
      showSnack(t("signUpUnexpectedError"), "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep2 = () => {
    if (isStep2Incomplete) {
      showSnack(t("fillAllFields"), "warning");
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    if (isStep3Incomplete) {
      showSnack(t("mustAcceptRequiredConsents"), "warning");
      return false;
    }

    return true;
  };

  const submitSignUp = async () => {
    const normalizedEmail = form.email.trim().toLowerCase();

    try {
      setIsLoading(true);

      const payload: SignUpRequest = {
        name: form.name.trim(),
        email: normalizedEmail,
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
        showSnack(getApiErrorMessage(res.error), "error");
        return;
      }

      showSnack(t("signUpSuccess"), "success");

      const emailUrl = computeEmailServiceUrl(normalizedEmail);
      setCreatedEmail(normalizedEmail);
      setEmailServiceUrl(emailUrl);

      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setStep(4);
    } catch {
      showSnack(t("signUpUnexpectedError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    if (step === 1) {
      const isValid = await validateStep1();
      if (isValid) goToNextStep();
      return;
    }

    if (step === 2) {
      const isValid = validateStep2();
      if (isValid) goToNextStep();
      return;
    }

    if (step === 3) {
      const isValid = validateStep3();
      if (!isValid) return;
      await submitSignUp();
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Left section */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-slate-900">
        <img
          src={signUpBackground}
          alt={t("backgroundAlt")}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/80 to-slate-800/60" />
      </div>

      {/* Right section */}
      <div className="flex flex-col w-full md:w-1/2 px-6 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between mb-8">
          <a
            href="https://www.spifex.com/"
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
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
                    {/* STEP 1 */}
                    <div
                      className={`space-y-4 transition-opacity duration-300 ${
                        step === 1
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none absolute inset-0"
                      }`}
                    >
                      <Input
                        kind="text"
                        label={t("nameLabel")}
                        placeholder={t("namePlaceholder")}
                        type="text"
                        value={form.name}
                        onChange={handleInputChange("name")}
                        disabled={isLoading}
                        autoComplete="name"
                      />

                      <Input
                        kind="text"
                        label={t("emailLabel")}
                        placeholder={t("emailPlaceholder")}
                        type="email"
                        value={form.email}
                        onChange={handleEmailChange}
                        disabled={isLoading}
                        autoComplete="email"
                        autoCorrect="off"
                        autoCapitalize="none"
                      />

                      <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
                        <div className="flex-1">
                          <Input
                            kind="text"
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
                            kind="text"
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

                    {/* STEP 2 */}
                    <div
                      className={`space-y-4 transition-opacity duration-300 ${
                        step === 2
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none absolute inset-0"
                      }`}
                    >
                      <Select<LanguageOption>
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

                      <Select<CountryOption>
                        label={t("countryLabel")}
                        items={COUNTRIES}
                        selected={selectedCountry}
                        onChange={(items) => {
                          const next = (items[0]?.value ?? "")
                            .toString()
                            .toUpperCase();
                          setSelectedCountry(items);
                          setPrefs((prev) => ({ ...prev, country: next }));
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

                      <Select<CurrencyOption>
                        label={t("currencyLabel")}
                        items={CURRENCIES}
                        selected={selectedCurrency}
                        onChange={(items) => {
                          const next = items[0]?.value ?? "";
                          setSelectedCurrency(items);
                          setPrefs((prev) => ({
                            ...prev,
                            currency: next || prev.currency,
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

                    {/* STEP 3 */}
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
                      type="submit"
                      onClick={handleSubmit}
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