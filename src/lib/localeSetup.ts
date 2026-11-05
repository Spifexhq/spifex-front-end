import type { ConfigurationStatus } from "@/models/auth/configuration";

export function safeSetupReturn(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || Array.from(value).some(char => char.charCodeAt(0) <= 32) || value.split(/[?#]/)[0] === "/locale-setup") return "/overview";
  return value;
}

export function needsLocaleSetup(configuration: ConfigurationStatus, isOwner: boolean): boolean {
  return configuration.personal_locale_setup !== true || (isOwner && configuration.org_locale_setup !== true);
}


/** The HTTP adapter wraps Axios errors but retains their cancellation code. */
export function isSetupRequestCancelled(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: string }).code === "ERR_CANCELED";
}
