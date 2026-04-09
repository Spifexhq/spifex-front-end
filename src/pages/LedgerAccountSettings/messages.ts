// src\pages\LedgerAccountSettings\messages.ts
import i18n from "@/lib/i18n";

export type LedgerLocale = "en" | "pt" | "fr" | "de";

export type LedgerMessages = {
  workspace: Record<string, string>;
  setup: Record<string, string>;
  accounting: Record<string, string>;
  modal: Record<string, string>;
};

const WORKSPACE_KEYS = [
  "pageLabel",
  "personalLedger",
  "organizationalLedger",
  "titleOverview",
  "titleAccounting",
  "descriptionOverview",
  "descriptionAccounting",
  "profileMode",
  "profileTemplate",
  "profileView",
  "profileCompact",
  "profileFull",
  "controlCenter",
  "controlCenterText",
  "addAccount",
  "moreActions",
  "deleteAll",
  "deleteAllConfirm",
  "deleteAllSuccess",
  "deleteAllError",
  "searchLabel",
  "searchPlaceholder",
  "sectionLabel",
  "accountTypeLabel",
  "bankControlLabel",
  "manualPostingLabel",
  "activeLabel",
  "applyFilters",
  "clearFilters",
  "prev",
  "next",
  "summaryActive",
  "summaryActiveSubtitle",
  "summaryPosting",
  "summaryPostingSubtitle",
  "summaryBank",
  "summaryBankSubtitle",
  "summaryManual",
  "summaryManualSubtitle",
  "treeTitle",
  "treeSubtitle",
  "viewTree",
  "viewList",
  "edit",
  "delete",
  "inactive",
  "system",
  "header",
  "posting",
  "bankControlYes",
  "bankControlNo",
  "manualAllowed",
  "manualBlocked",
  "emptyTitle",
  "emptySubtitle",
  "createdSuccess",
  "updatedSuccess",
  "deletedSuccess",
  "requestError",
  "backToLedger",
] as const;

const SETUP_KEYS = [
  "pageLabel",
  "titlePersonal",
  "titleOrganizational",
  "descriptionCompact",
  "descriptionPersonal",
  "descriptionOrganizational",
  "currentProfile",
  "modeLabel",
  "viewLabel",
  "personal",
  "organizational",
  "compact",
  "full",
  "setupMethod",
  "standardTitle",
  "standardDescription",
  "uploadTitle",
  "uploadDescription",
  "manualTitle",
  "manualDescription",
  "templateLabel",
  "templatePersonal",
  "templateOrganizational",
  "downloadCsv",
  "downloadXlsx",
  "fileLabel",
  "manualLabel",
  "manualPlaceholder",
  "submit",
  "submitting",
  "permissionError",
  "selectFileError",
  "manualError",
  "chooseModeError",
  "success",
  "genericError",
] as const;

const ACCOUNTING_KEYS = ["title", "description"] as const;

const MODAL_KEYS = [
  "createTitle",
  "editTitle",
  "general",
  "classification",
  "controls",
  "advanced",
  "code",
  "name",
  "description",
  "parent",
  "parentPlaceholder",
  "statementSection",
  "normalBalance",
  "accountType",
  "header",
  "posting",
  "active",
  "bankControl",
  "manualPosting",
  "reportGroup",
  "reportSubgroup",
  "externalRef",
  "currencyCode",
  "metadata",
  "cancel",
  "saveCreate",
  "saveEdit",
  "invalidJson",
  "requiredName",
  "requiredCode",
  "selectSection",
  "selectBalance",
  "selectAccountType",
] as const;

function normalizeLedgerLocale(input?: string | null): LedgerLocale {
  const value = String(input || "en").toLowerCase();

  if (value.startsWith("pt")) return "pt";
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("de")) return "de";
  return "en";
}

function mapNestedKeys<T extends readonly string[]>(
  group: string,
  keys: T,
  lng: LedgerLocale
): Record<T[number], string> {
  return keys.reduce((acc, key) => {
    acc[key] = i18n.t(`${group}.${key}`, {
      lng,
      ns: "ledgerAccounts",
      defaultValue: key,
    });
    return acc;
  }, {} as Record<T[number], string>);
}

export function getLedgerMessages(languageCode?: string | null): LedgerMessages {
  const lng = normalizeLedgerLocale(languageCode);

  return {
    workspace: mapNestedKeys("workspace", WORKSPACE_KEYS, lng),
    setup: mapNestedKeys("setup", SETUP_KEYS, lng),
    accounting: mapNestedKeys("accounting", ACCOUNTING_KEYS, lng),
    modal: mapNestedKeys("modal", MODAL_KEYS, lng),
  };
}

export function getLedgerLocale(languageCode?: string | null): LedgerLocale {
  return normalizeLedgerLocale(languageCode);
}
