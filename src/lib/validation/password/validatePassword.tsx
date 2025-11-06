// src/validation/password/validatePassword.tsx
import i18n from "@/lib/i18n";

export type PasswordValidationResult = {
  isValid: boolean;
  message: string | JSX.Element;
};

export const validatePassword = (password: string): PasswordValidationResult => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const isValid = regex.test(password);

  if (isValid) {
    return { isValid: true, message: "" };
  }

  // Use i18n directly (no hooks here)
  const t = (key: string) => i18n.t(key, { ns: "passwordValidation" });

  return {
    isValid: false,
    message: (
      <div>
        <p className="font-medium">{t("title")}</p>
        <ul className="mt-2 ml-7 list-disc list-inside text-sm text-gray-800">
          <li>{t("requirementMinLength")}</li>
          <li>{t("requirementUppercase")}</li>
          <li>{t("requirementNumber")}</li>
          <li>{t("requirementSpecial")}</li>
        </ul>
      </div>
    ),
  };
};
