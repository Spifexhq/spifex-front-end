import deFinancial from "./locales/de/financial.json";
import frFinancial from "./locales/fr/financial.json";
import ptFinancial from "./locales/pt/financial.json";
import enFinancial from "./locales/en/financial.json";
import enPersonal from "./locales/en/personal.json";
import ptPersonal from "./locales/pt/personal.json";
import frPersonal from "./locales/fr/personal.json";
import dePersonal from "./locales/de/personal.json";
import enFinanceEntries from "./locales/en/financeEntries.json";
import ptFinanceEntries from "./locales/pt/financeEntries.json";
import frFinanceEntries from "./locales/fr/financeEntries.json";
import deFinanceEntries from "./locales/de/financeEntries.json";
// src/lib/i18n/index.tsx
import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
// import Backend from "i18next-http-backend";

/* -------------------------------------------------------------------------- */
/* Languages                                                                   */
/* -------------------------------------------------------------------------- */

export const LANGS = ["pt", "en", "fr", "de"] as const;
export type AppLang = (typeof LANGS)[number];

/* -------------------------------------------------------------------------- */
/* Common                                                                       */
/* -------------------------------------------------------------------------- */

import ptCommon from "./locales/pt/common.json";
import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";
import deCommon from "./locales/de/common.json";

/* -------------------------------------------------------------------------- */
/* Auth                                                                         */
/* -------------------------------------------------------------------------- */

import ptSignIn from "./locales/pt/signIn.json";
import enSignIn from "./locales/en/signIn.json";
import frSignIn from "./locales/fr/signIn.json";
import deSignIn from "./locales/de/signIn.json";

import ptSignUp from "./locales/pt/signUp.json";
import enSignUp from "./locales/en/signUp.json";
import frSignUp from "./locales/fr/signUp.json";
import deSignUp from "./locales/de/signUp.json";

import ptPasswordValidation from "./locales/pt/passwordValidation.json";
import enPasswordValidation from "./locales/en/passwordValidation.json";
import frPasswordValidation from "./locales/fr/passwordValidation.json";
import dePasswordValidation from "./locales/de/passwordValidation.json";

import ptForgotPassword from "./locales/pt/forgotPassword.json";
import enForgotPassword from "./locales/en/forgotPassword.json";
import frForgotPassword from "./locales/fr/forgotPassword.json";
import deForgotPassword from "./locales/de/forgotPassword.json";

import ptResetPassword from "./locales/pt/resetPassword.json";
import enResetPassword from "./locales/en/resetPassword.json";
import frResetPassword from "./locales/fr/resetPassword.json";
import deResetPassword from "./locales/de/resetPassword.json";

import ptPasswordVerification from "./locales/pt/passwordVerification.json";
import enPasswordVerification from "./locales/en/passwordVerification.json";
import frPasswordVerification from "./locales/fr/passwordVerification.json";
import dePasswordVerification from "./locales/de/passwordVerification.json";

import ptEmailVerification from "./locales/pt/emailVerification.json";
import enEmailVerification from "./locales/en/emailVerification.json";
import frEmailVerification from "./locales/fr/emailVerification.json";
import deEmailVerification from "./locales/de/emailVerification.json";

/* -------------------------------------------------------------------------- */
/* Layout                                                                       */
/* -------------------------------------------------------------------------- */

import ptNavbar from "./locales/pt/navbar.json";
import enNavbar from "./locales/en/navbar.json";
import frNavbar from "./locales/fr/navbar.json";
import deNavbar from "./locales/de/navbar.json";

import ptSidebar from "./locales/pt/sidebar.json";
import enSidebar from "./locales/en/sidebar.json";
import frSidebar from "./locales/fr/sidebar.json";
import deSidebar from "./locales/de/sidebar.json";

import ptSettingsSidebar from "./locales/pt/settingsSidebar.json";
import enSettingsSidebar from "./locales/en/settingsSidebar.json";
import frSettingsSidebar from "./locales/fr/settingsSidebar.json";
import deSettingsSidebar from "./locales/de/settingsSidebar.json";

import ptUserMenu from "./locales/pt/userMenu.json";
import enUserMenu from "./locales/en/userMenu.json";
import frUserMenu from "./locales/fr/userMenu.json";
import deUserMenu from "./locales/de/userMenu.json";

/* -------------------------------------------------------------------------- */
/* Subscription                                                                 */
/* -------------------------------------------------------------------------- */

import ptSubscription from "./locales/pt/subscription.json";
import enSubscription from "./locales/en/subscription.json";
import frSubscription from "./locales/fr/subscription.json";
import deSubscription from "./locales/de/subscription.json";

import ptLimits from "./locales/pt/limits.json";
import enLimits from "./locales/en/limits.json";
import frLimits from "./locales/fr/limits.json";
import deLimits from "./locales/de/limits.json";

/* -------------------------------------------------------------------------- */
/* Main pages                                                                   */
/* -------------------------------------------------------------------------- */

import ptCashFlow from "./locales/pt/cashFlow.json";
import enCashFlow from "./locales/en/cashFlow.json";
import frCashFlow from "./locales/fr/cashFlow.json";
import deCashFlow from "./locales/de/cashFlow.json";

import ptSettled from "./locales/pt/settled.json";
import enSettled from "./locales/en/settled.json";
import frSettled from "./locales/fr/settled.json";
import deSettled from "./locales/de/settled.json";

import ptReports from "./locales/pt/reports.json";
import enReports from "./locales/en/reports.json";
import frReports from "./locales/fr/reports.json";
import deReports from "./locales/de/reports.json";

/* -------------------------------------------------------------------------- */
/* Generic UI                                                                   */
/* -------------------------------------------------------------------------- */


import ptSelect from "./locales/pt/select.json";
import enSelect from "./locales/en/select.json";
import frSelect from "./locales/fr/select.json";
import deSelect from "./locales/de/select.json";

/* -------------------------------------------------------------------------- */
/* Cashflow / Finance                                                           */
/* -------------------------------------------------------------------------- */

import ptFilterBar from "./locales/pt/filterBar.json";
import enFilterBar from "./locales/en/filterBar.json";
import frFilterBar from "./locales/fr/filterBar.json";
import deFilterBar from "./locales/de/filterBar.json";

import ptKpiCards from "./locales/pt/kpiCards.json";
import enKpiCards from "./locales/en/kpiCards.json";
import frKpiCards from "./locales/fr/kpiCards.json";
import deKpiCards from "./locales/de/kpiCards.json";

import ptEntriesModal from "./locales/pt/entriesModal.json";
import enEntriesModal from "./locales/en/entriesModal.json";
import frEntriesModal from "./locales/fr/entriesModal.json";
import deEntriesModal from "./locales/de/entriesModal.json";

import ptTransferenceModal from "./locales/pt/transferenceModal.json";
import enTransferenceModal from "./locales/en/transferenceModal.json";
import frTransferenceModal from "./locales/fr/transferenceModal.json";
import deTransferenceModal from "./locales/de/transferenceModal.json";

import ptSettlementModal from "./locales/pt/settlementModal.json";
import enSettlementModal from "./locales/en/settlementModal.json";
import frSettlementModal from "./locales/fr/settlementModal.json";
import deSettlementModal from "./locales/de/settlementModal.json";

import ptBanksTable from "./locales/pt/banksTable.json";
import enBanksTable from "./locales/en/banksTable.json";
import frBanksTable from "./locales/fr/banksTable.json";
import deBanksTable from "./locales/de/banksTable.json";



import ptStatements from "./locales/pt/statements.json";
import enStatements from "./locales/en/statements.json";
import frStatements from "./locales/fr/statements.json";
import deStatements from "./locales/de/statements.json";

/* -------------------------------------------------------------------------- */
/* Misc                                                                         */
/* -------------------------------------------------------------------------- */

import ptHelp from "./locales/pt/help.json";
import enHelp from "./locales/en/help.json";
import frHelp from "./locales/fr/help.json";
import deHelp from "./locales/de/help.json";

import ptCookies from "./locales/pt/cookies.json";
import enCookies from "./locales/en/cookies.json";
import frCookies from "./locales/fr/cookies.json";
import deCookies from "./locales/de/cookies.json";

import ptOverview from "./locales/pt/overview.json";
import enOverview from "./locales/en/overview.json";
import frOverview from "./locales/fr/overview.json";
import deOverview from "./locales/de/overview.json";

/* -------------------------------------------------------------------------- */
/* Settings / Preferences                                                       */
/* -------------------------------------------------------------------------- */

import ptNotificationSettings from "./locales/pt/notificationSettings.json";
import enNotificationSettings from "./locales/en/notificationSettings.json";
import frNotificationSettings from "./locales/fr/notificationSettings.json";
import deNotificationSettings from "./locales/de/notificationSettings.json";

import ptFormatSettings from "./locales/pt/formatSettings.json";
import enFormatSettings from "./locales/en/formatSettings.json";
import frFormatSettings from "./locales/fr/formatSettings.json";
import deFormatSettings from "./locales/de/formatSettings.json";

import ptPersonalLocaleSetup from "./locales/pt/personalLocaleSetup.json";
import enPersonalLocaleSetup from "./locales/en/personalLocaleSetup.json";
import frPersonalLocaleSetup from "./locales/fr/personalLocaleSetup.json";
import dePersonalLocaleSetup from "./locales/de/personalLocaleSetup.json";

import ptOnboarding from "./locales/pt/onboarding.json";
import enOnboarding from "./locales/en/onboarding.json";
import frOnboarding from "./locales/fr/onboarding.json";
import deOnboarding from "./locales/de/onboarding.json";

import ptPersonalSettings from "./locales/pt/personalSettings.json";
import enPersonalSettings from "./locales/en/personalSettings.json";
import frPersonalSettings from "./locales/fr/personalSettings.json";
import dePersonalSettings from "./locales/de/personalSettings.json";

import ptOrganizationSettings from "./locales/pt/organizationSettings.json";
import enOrganizationSettings from "./locales/en/organizationSettings.json";
import frOrganizationSettings from "./locales/fr/organizationSettings.json";
import deOrganizationSettings from "./locales/de/organizationSettings.json";

import ptGroupSettings from "./locales/pt/groupSettings.json";
import enGroupSettings from "./locales/en/groupSettings.json";
import frGroupSettings from "./locales/fr/groupSettings.json";
import deGroupSettings from "./locales/de/groupSettings.json";

import ptGroupPermissionsTable from "./locales/pt/groupPermissionsTable.json";
import enGroupPermissionsTable from "./locales/en/groupPermissionsTable.json";
import frGroupPermissionsTable from "./locales/fr/groupPermissionsTable.json";
import deGroupPermissionsTable from "./locales/de/groupPermissionsTable.json";

import ptCurrencySettings from "./locales/pt/currencySettings.json";
import enCurrencySettings from "./locales/en/currencySettings.json";
import frCurrencySettings from "./locales/fr/currencySettings.json";
import deCurrencySettings from "./locales/de/currencySettings.json";

import ptSecurityAndPrivacy from "./locales/pt/securityAndPrivacy.json";
import enSecurityAndPrivacy from "./locales/en/securityAndPrivacy.json";
import frSecurityAndPrivacy from "./locales/fr/securityAndPrivacy.json";
import deSecurityAndPrivacy from "./locales/de/securityAndPrivacy.json";

import ptAiConnections from "./locales/pt/aiConnections.json";
import enAiConnections from "./locales/en/aiConnections.json";
import frAiConnections from "./locales/fr/aiConnections.json";
import deAiConnections from "./locales/de/aiConnections.json";

/* -------------------------------------------------------------------------- */
/* Settings screens                                                             */
/* -------------------------------------------------------------------------- */

import ptMemberSettings from "./locales/pt/memberSettings.json";
import enMemberSettings from "./locales/en/memberSettings.json";
import frMemberSettings from "./locales/fr/memberSettings.json";
import deMemberSettings from "./locales/de/memberSettings.json";

import ptBankSettings from "./locales/pt/bankSettings.json";
import enBankSettings from "./locales/en/bankSettings.json";
import frBankSettings from "./locales/fr/bankSettings.json";
import deBankSettings from "./locales/de/bankSettings.json";

import ptDepartmentSettings from "./locales/pt/departmentSettings.json";
import enDepartmentSettings from "./locales/en/departmentSettings.json";
import frDepartmentSettings from "./locales/fr/departmentSettings.json";
import deDepartmentSettings from "./locales/de/departmentSettings.json";

import ptProjectSettings from "./locales/pt/projectSettings.json";
import enProjectSettings from "./locales/en/projectSettings.json";
import frProjectSettings from "./locales/fr/projectSettings.json";
import deProjectSettings from "./locales/de/projectSettings.json";

import ptAccountingSettings from "./locales/pt/accountingSettings.json";
import enAccountingSettings from "./locales/en/accountingSettings.json";
import frAccountingSettings from "./locales/fr/accountingSettings.json";
import deAccountingSettings from "./locales/de/accountingSettings.json";

import ptLedgerAccounts from "./locales/pt/ledgerAccounts.json";
import enLedgerAccounts from "./locales/en/ledgerAccounts.json";
import frLedgerAccounts from "./locales/fr/ledgerAccounts.json";
import deLedgerAccounts from "./locales/de/ledgerAccounts.json";

import ptCategorySettings from "./locales/pt/categorySettings.json";
import enCategorySettings from "./locales/en/categorySettings.json";
import frCategorySettings from "./locales/fr/categorySettings.json";
import deCategorySettings from "./locales/de/categorySettings.json";

import ptInventorySettings from "./locales/pt/inventorySettings.json";
import enInventorySettings from "./locales/en/inventorySettings.json";
import frInventorySettings from "./locales/fr/inventorySettings.json";
import deInventorySettings from "./locales/de/inventorySettings.json";

import ptEntitySettings from "./locales/pt/entitySettings.json";
import enEntitySettings from "./locales/en/entitySettings.json";
import frEntitySettings from "./locales/fr/entitySettings.json";
import deEntitySettings from "./locales/de/entitySettings.json";

/* -------------------------------------------------------------------------- */
/* Status                                                                       */
/* -------------------------------------------------------------------------- */

import ptStatusComingSoon from "./locales/pt/statusComingSoon.json";
import enStatusComingSoon from "./locales/en/statusComingSoon.json";
import frStatusComingSoon from "./locales/fr/statusComingSoon.json";
import deStatusComingSoon from "./locales/de/statusComingSoon.json";

import ptStatusMaintenance from "./locales/pt/statusMaintenance.json";
import enStatusMaintenance from "./locales/en/statusMaintenance.json";
import frStatusMaintenance from "./locales/fr/statusMaintenance.json";
import deStatusMaintenance from "./locales/de/statusMaintenance.json";

import ptStatus404 from "./locales/pt/status404.json";
import enStatus404 from "./locales/en/status404.json";
import frStatus404 from "./locales/fr/status404.json";
import deStatus404 from "./locales/de/status404.json";

import ptStatus500 from "./locales/pt/status500.json";
import enStatus500 from "./locales/en/status500.json";
import frStatus500 from "./locales/fr/status500.json";
import deStatus500 from "./locales/de/status500.json";

/* -------------------------------------------------------------------------- */
/* Middlewares                                                                  */
/* -------------------------------------------------------------------------- */

import ptPermissionMiddleware from "./locales/pt/permissionMiddleware.json";
import enPermissionMiddleware from "./locales/en/permissionMiddleware.json";
import frPermissionMiddleware from "./locales/fr/permissionMiddleware.json";
import dePermissionMiddleware from "./locales/de/permissionMiddleware.json";

import ptOwnerMiddleware from "./locales/pt/ownerMiddleware.json";
import enOwnerMiddleware from "./locales/en/ownerMiddleware.json";
import frOwnerMiddleware from "./locales/fr/ownerMiddleware.json";
import deOwnerMiddleware from "./locales/de/ownerMiddleware.json";

import ptSubscriptionMiddleware from "./locales/pt/subscriptionMiddleware.json";
import enSubscriptionMiddleware from "./locales/en/subscriptionMiddleware.json";
import frSubscriptionMiddleware from "./locales/fr/subscriptionMiddleware.json";
import deSubscriptionMiddleware from "./locales/de/subscriptionMiddleware.json";

/* -------------------------------------------------------------------------- */
/* Namespaces                                                                   */
/* -------------------------------------------------------------------------- */

const NAMESPACES = [
  "financial",
  "personal",
  "common",

  "signIn",
  "signUp",
  "passwordValidation",
  "forgotPassword",
  "resetPassword",
  "passwordVerification",
  "emailVerification",

  "navbar",
  "sidebar",
  "settingsSidebar",
  "userMenu",

  "subscription",
  "limits",

  "cashFlow",
  "settled",
  "reports",

  "select",

  "filterBar",
  "kpiCards",
  "entriesModal",
  "transferenceModal",
  "settlementModal",
  "banksTable",
  "statements",

  "help",
  "cookies",
  "overview",

  "notificationSettings",
  "formatSettings",
  "personalLocaleSetup",
  "onboarding",
  "personalSettings",
  "organizationSettings",
  "groupSettings",
  "groupPermissionsTable",
  "currencySettings",
  "securityAndPrivacy",
  "aiConnections",

  "memberSettings",
  "bankSettings",
  "departmentSettings",
  "projectSettings",
  "accountingSettings",
  "ledgerAccounts",
  "categorySettings",
  "inventorySettings",
  "entitySettings",

  "statusComingSoon",
  "statusMaintenance",
  "status404",
  "status500",

  "permissionMiddleware",
  "ownerMiddleware",
  "subscriptionMiddleware",
] as const;

/* -------------------------------------------------------------------------- */
/* Resources                                                                    */
/* -------------------------------------------------------------------------- */

const resources: Resource = {
  pt: {
    personal: ptPersonal,
    financial: ptFinancial,
    common: ptCommon,
    signIn: ptSignIn,
    signUp: ptSignUp,
    passwordValidation: ptPasswordValidation,
    forgotPassword: ptForgotPassword,
    resetPassword: ptResetPassword,
    passwordVerification: ptPasswordVerification,
    emailVerification: ptEmailVerification,

    navbar: ptNavbar,
    sidebar: ptSidebar,
    settingsSidebar: ptSettingsSidebar,
    userMenu: ptUserMenu,

    subscription: ptSubscription,
    limits: ptLimits,

    cashFlow: ptCashFlow,
    settled: ptSettled,
    reports: ptReports,

    financeEntries: ptFinanceEntries,
    select: ptSelect,

    filterBar: ptFilterBar,
    kpiCards: ptKpiCards,
    entriesModal: ptEntriesModal,
    transferenceModal: ptTransferenceModal,
    settlementModal: ptSettlementModal,
    banksTable: ptBanksTable,
    statements: ptStatements,

    help: ptHelp,
    cookies: ptCookies,
    overview: ptOverview,

    notificationSettings: ptNotificationSettings,
    formatSettings: ptFormatSettings,
    personalLocaleSetup: ptPersonalLocaleSetup,
    onboarding: ptOnboarding,
    personalSettings: ptPersonalSettings,
    organizationSettings: ptOrganizationSettings,
    groupSettings: ptGroupSettings,
    groupPermissionsTable: ptGroupPermissionsTable,
    currencySettings: ptCurrencySettings,
    securityAndPrivacy: ptSecurityAndPrivacy,
    aiConnections: ptAiConnections,

    memberSettings: ptMemberSettings,
    bankSettings: ptBankSettings,
    departmentSettings: ptDepartmentSettings,
    projectSettings: ptProjectSettings,
    accountingSettings: ptAccountingSettings,
    ledgerAccounts: ptLedgerAccounts,
    categorySettings: ptCategorySettings,
    inventorySettings: ptInventorySettings,
    entitySettings: ptEntitySettings,

    statusComingSoon: ptStatusComingSoon,
    statusMaintenance: ptStatusMaintenance,
    status404: ptStatus404,
    status500: ptStatus500,

    permissionMiddleware: ptPermissionMiddleware,
    ownerMiddleware: ptOwnerMiddleware,
    subscriptionMiddleware: ptSubscriptionMiddleware,
  },

  en: {
    personal: enPersonal,
    financial: enFinancial,
    common: enCommon,
    signIn: enSignIn,
    signUp: enSignUp,
    passwordValidation: enPasswordValidation,
    forgotPassword: enForgotPassword,
    resetPassword: enResetPassword,
    passwordVerification: enPasswordVerification,
    emailVerification: enEmailVerification,

    navbar: enNavbar,
    sidebar: enSidebar,
    settingsSidebar: enSettingsSidebar,
    userMenu: enUserMenu,

    subscription: enSubscription,
    limits: enLimits,

    cashFlow: enCashFlow,
    settled: enSettled,
    reports: enReports,

    financeEntries: enFinanceEntries,
    select: enSelect,

    filterBar: enFilterBar,
    kpiCards: enKpiCards,
    entriesModal: enEntriesModal,
    transferenceModal: enTransferenceModal,
    settlementModal: enSettlementModal,
    banksTable: enBanksTable,
    statements: enStatements,

    help: enHelp,
    cookies: enCookies,
    overview: enOverview,

    notificationSettings: enNotificationSettings,
    formatSettings: enFormatSettings,
    personalLocaleSetup: enPersonalLocaleSetup,
    onboarding: enOnboarding,
    personalSettings: enPersonalSettings,
    organizationSettings: enOrganizationSettings,
    groupSettings: enGroupSettings,
    groupPermissionsTable: enGroupPermissionsTable,
    currencySettings: enCurrencySettings,
    securityAndPrivacy: enSecurityAndPrivacy,
    aiConnections: enAiConnections,

    memberSettings: enMemberSettings,
    bankSettings: enBankSettings,
    departmentSettings: enDepartmentSettings,
    projectSettings: enProjectSettings,
    accountingSettings: enAccountingSettings,
    ledgerAccounts: enLedgerAccounts,
    categorySettings: enCategorySettings,
    inventorySettings: enInventorySettings,
    entitySettings: enEntitySettings,

    statusComingSoon: enStatusComingSoon,
    statusMaintenance: enStatusMaintenance,
    status404: enStatus404,
    status500: enStatus500,

    permissionMiddleware: enPermissionMiddleware,
    ownerMiddleware: enOwnerMiddleware,
    subscriptionMiddleware: enSubscriptionMiddleware,
  },

  fr: {
    personal: frPersonal,
    financial: frFinancial,
    common: frCommon,
    signIn: frSignIn,
    signUp: frSignUp,
    passwordValidation: frPasswordValidation,
    forgotPassword: frForgotPassword,
    resetPassword: frResetPassword,
    passwordVerification: frPasswordVerification,
    emailVerification: frEmailVerification,

    navbar: frNavbar,
    sidebar: frSidebar,
    settingsSidebar: frSettingsSidebar,
    userMenu: frUserMenu,

    subscription: frSubscription,
    limits: frLimits,

    cashFlow: frCashFlow,
    settled: frSettled,
    reports: frReports,

    financeEntries: frFinanceEntries,
    select: frSelect,

    filterBar: frFilterBar,
    kpiCards: frKpiCards,
    entriesModal: frEntriesModal,
    transferenceModal: frTransferenceModal,
    settlementModal: frSettlementModal,
    banksTable: frBanksTable,
    statements: frStatements,

    help: frHelp,
    cookies: frCookies,
    overview: frOverview,

    notificationSettings: frNotificationSettings,
    formatSettings: frFormatSettings,
    personalLocaleSetup: frPersonalLocaleSetup,
    onboarding: frOnboarding,
    personalSettings: frPersonalSettings,
    organizationSettings: frOrganizationSettings,
    groupSettings: frGroupSettings,
    groupPermissionsTable: frGroupPermissionsTable,
    currencySettings: frCurrencySettings,
    securityAndPrivacy: frSecurityAndPrivacy,
    aiConnections: frAiConnections,

    memberSettings: frMemberSettings,
    bankSettings: frBankSettings,
    departmentSettings: frDepartmentSettings,
    projectSettings: frProjectSettings,
    accountingSettings: frAccountingSettings,
    ledgerAccounts: frLedgerAccounts,
    categorySettings: frCategorySettings,
    inventorySettings: frInventorySettings,
    entitySettings: frEntitySettings,

    statusComingSoon: frStatusComingSoon,
    statusMaintenance: frStatusMaintenance,
    status404: frStatus404,
    status500: frStatus500,

    permissionMiddleware: frPermissionMiddleware,
    ownerMiddleware: frOwnerMiddleware,
    subscriptionMiddleware: frSubscriptionMiddleware,
  },

  de: {
    personal: dePersonal,
    financial: deFinancial,
    common: deCommon,
    signIn: deSignIn,
    signUp: deSignUp,
    passwordValidation: dePasswordValidation,
    forgotPassword: deForgotPassword,
    resetPassword: deResetPassword,
    passwordVerification: dePasswordVerification,
    emailVerification: deEmailVerification,

    navbar: deNavbar,
    sidebar: deSidebar,
    settingsSidebar: deSettingsSidebar,
    userMenu: deUserMenu,

    subscription: deSubscription,
    limits: deLimits,

    cashFlow: deCashFlow,
    settled: deSettled,
    reports: deReports,

    financeEntries: deFinanceEntries,
    select: deSelect,

    filterBar: deFilterBar,
    kpiCards: deKpiCards,
    entriesModal: deEntriesModal,
    transferenceModal: deTransferenceModal,
    settlementModal: deSettlementModal,
    banksTable: deBanksTable,
    statements: deStatements,

    help: deHelp,
    cookies: deCookies,
    overview: deOverview,

    notificationSettings: deNotificationSettings,
    formatSettings: deFormatSettings,
    personalLocaleSetup: dePersonalLocaleSetup,
    onboarding: deOnboarding,
    personalSettings: dePersonalSettings,
    organizationSettings: deOrganizationSettings,
    groupSettings: deGroupSettings,
    groupPermissionsTable: deGroupPermissionsTable,
    currencySettings: deCurrencySettings,
    securityAndPrivacy: deSecurityAndPrivacy,
    aiConnections: deAiConnections,

    memberSettings: deMemberSettings,
    bankSettings: deBankSettings,
    departmentSettings: deDepartmentSettings,
    projectSettings: deProjectSettings,
    accountingSettings: deAccountingSettings,
    ledgerAccounts: deLedgerAccounts,
    categorySettings: deCategorySettings,
    inventorySettings: deInventorySettings,
    entitySettings: deEntitySettings,

    statusComingSoon: deStatusComingSoon,
    statusMaintenance: deStatusMaintenance,
    status404: deStatus404,
    status500: deStatus500,

    permissionMiddleware: dePermissionMiddleware,
    ownerMiddleware: deOwnerMiddleware,
    subscriptionMiddleware: deSubscriptionMiddleware,
  },
};

/* -------------------------------------------------------------------------- */
/* Init                                                                         */
/* -------------------------------------------------------------------------- */

i18n
  // .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: { default: ["en"] },
    supportedLngs: LANGS as unknown as string[],
    nonExplicitSupportedLngs: true,

    resources,
    ns: [...NAMESPACES],
    defaultNS: "common",

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;