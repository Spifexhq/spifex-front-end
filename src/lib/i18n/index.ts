// src/lib/i18n/index.tsx
import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
// import Backend from "i18next-http-backend"; // opção para carregar via HTTP

export const LANGS = ['pt', 'en', 'fr', 'de'] as const;
export type AppLang = typeof LANGS[number];

/* ===================== Imports de JSON (sem require) ===================== */
// PT
import ptCommon from "./locales/pt/common.json";
import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";
import deCommon from "./locales/de/common.json";

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

import ptEmailVerification from "./locales/pt/emailVerification.json";
import enEmailVerification from "./locales/en/emailVerification.json";
import frEmailVerification from "./locales/fr/emailVerification.json";
import deEmailVerification from "./locales/de/emailVerification.json";

import ptNavbar from "./locales/pt/navbar.json";
import enNavbar from "./locales/en/navbar.json";
import frNavbar from "./locales/fr/navbar.json";
import deNavbar from "./locales/de/navbar.json";

import ptSidebar from "./locales/pt/sidebar.json";
import enSidebar from "./locales/en/sidebar.json";
import frSidebar from "./locales/fr/sidebar.json";
import deSidebar from "./locales/de/sidebar.json";

import ptSubscription from "./locales/pt/subscription.json";
import enSubscription from "./locales/en/subscription.json";
import frSubscription from "./locales/fr/subscription.json";
import deSubscription from "./locales/de/subscription.json";

import ptSelectionActionsBar from "./locales/pt/selectionActionsBar.json";
import enSelectionActionsBar from "./locales/en/selectionActionsBar.json";
import frSelectionActionsBar from "./locales/fr/selectionActionsBar.json";
import deSelectionActionsBar from "./locales/de/selectionActionsBar.json";

import ptSettings from "./locales/pt/settings.json";
import enSettings from "./locales/en/settings.json";
import frSettings from "./locales/fr/settings.json";
import deSettings from "./locales/de/settings.json";

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

import ptTransf from "./locales/pt/transferenceModal.json";
import enTransf from "./locales/en/transferenceModal.json";
import frTransf from "./locales/fr/transferenceModal.json";
import deTransf from "./locales/de/transferenceModal.json";

import ptSettlementModal from "./locales/pt/settlementModal.json";
import enSettlementModal from "./locales/en/settlementModal.json";
import frSettlementModal from "./locales/fr/settlementModal.json";
import deSettlementModal from "./locales/de/settlementModal.json";

import ptSelect from "./locales/pt/selectDropdown.json";
import enSelect from "./locales/en/selectDropdown.json";
import frSelect from "./locales/fr/selectDropdown.json";
import deSelect from "./locales/de/selectDropdown.json";

import ptBanksTable from "./locales/pt/banksTable.json";
import enBanksTable from "./locales/en/banksTable.json";
import frBanksTable from "./locales/fr/banksTable.json";
import deBanksTable from "./locales/de/banksTable.json";

import ptCashFlowTable from "./locales/pt/cashFlowTable.json";
import enCashFlowTable from "./locales/en/cashFlowTable.json";
import frCashFlowTable from "./locales/fr/cashFlowTable.json";
import deCashFlowTable from "./locales/de/cashFlowTable.json";

import ptSettledTable from "./locales/pt/settledTable.json";
import enSettledTable from "./locales/en/settledTable.json";
import frSettledTable from "./locales/fr/settledTable.json";
import deSettledTable from "./locales/de/settledTable.json";

import ptReportsPage from "./locales/pt/reports.json";
import enReportsPage from "./locales/en/reports.json";
import frReportsPage from "./locales/fr/reports.json";
import deReportsPage from "./locales/de/reports.json";

import ptSimAI from "./locales/pt/simulatedAI.json";
import enSimAI from "./locales/en/simulatedAI.json";
import frSimAI from "./locales/fr/simulatedAI.json";
import deSimAI from "./locales/de/simulatedAI.json";

import ptNotificationSettings from "./locales/pt/notificationSettings.json";
import enNotificationSettings from "./locales/en/notificationSettings.json";
import frNotificationSettings from "./locales/fr/notificationSettings.json";
import deNotificationSettings from "./locales/de/notificationSettings.json";


/* ========================= Objeto de recursos ============================ */
const resources: Resource = {
  pt: {
    common: ptCommon,
    signIn: ptSignIn,
    signUp: ptSignUp,
    passwordValidation: ptPasswordValidation,
    forgotPassword: ptForgotPassword,
    resetPassword: ptResetPassword,
    emailVerification: ptEmailVerification,
    navbar: ptNavbar,
    sidebar: ptSidebar,
    subscription: ptSubscription,
    selectionActionsBar: ptSelectionActionsBar,
    settings: ptSettings,
    filterBar: ptFilterBar,
    kpiCards: ptKpiCards,
    entriesModal: ptEntriesModal,
    transferenceModal: ptTransf,
    settlementModal: ptSettlementModal,
    selectDropdown: ptSelect,
    banksTable: ptBanksTable,
    cashFlowTable: ptCashFlowTable,
    settledTable: ptSettledTable,
    reports: ptReportsPage,
    simulatedAI: ptSimAI,
    notificationSettings: ptNotificationSettings,
  },
  en: {
    common: enCommon,
    signIn: enSignIn,
    signUp: enSignUp,
    passwordValidation: enPasswordValidation,
    forgotPassword: enForgotPassword,
    resetPassword: enResetPassword,
    emailVerification: enEmailVerification,
    navbar: enNavbar,
    sidebar: enSidebar,
    subscription: enSubscription,
    selectionActionsBar: enSelectionActionsBar,
    settings: enSettings,
    filterBar: enFilterBar,
    kpiCards: enKpiCards,
    entriesModal: enEntriesModal,
    transferenceModal: enTransf,
    settlementModal: enSettlementModal,
    selectDropdown: enSelect,
    banksTable: enBanksTable,
    cashFlowTable: enCashFlowTable,
    settledTable: enSettledTable,
    reports: enReportsPage,
    simulatedAI: enSimAI,
    notificationSettings: enNotificationSettings,
  },
  fr: {
    common: frCommon,
    signIn: frSignIn,
    signUp: frSignUp,
    passwordValidation: frPasswordValidation,
    forgotPassword: frForgotPassword,
    resetPassword: frResetPassword,
    emailVerification: frEmailVerification,
    navbar: frNavbar,
    sidebar: frSidebar,
    subscription: frSubscription,
    selectionActionsBar: frSelectionActionsBar,
    settings: frSettings,
    filterBar: frFilterBar,
    kpiCards: frKpiCards,
    entriesModal: frEntriesModal,
    transferenceModal: frTransf,
    settlementModal: frSettlementModal,
    selectDropdown: frSelect,
    banksTable: frBanksTable,
    cashFlowTable: frCashFlowTable,
    settledTable: frSettledTable,
    reports: frReportsPage,
    simulatedAI: frSimAI,
    notificationSettings: frNotificationSettings,
  },
  de: {
    common: deCommon,
    signIn: deSignIn,
    signUp: deSignUp,
    passwordValidation: dePasswordValidation,
    forgotPassword: deForgotPassword,
    resetPassword: deResetPassword,
    emailVerification: deEmailVerification,
    navbar: deNavbar,
    sidebar: deSidebar,
    subscription: deSubscription,
    selectionActionsBar: deSelectionActionsBar,
    settings: deSettings,
    filterBar: deFilterBar,
    kpiCards: deKpiCards,
    entriesModal: deEntriesModal,
    transferenceModal: deTransf,
    settlementModal: deSettlementModal,
    selectDropdown: deSelect,
    banksTable: deBanksTable,
    cashFlowTable: deCashFlowTable,
    settledTable: deSettledTable,
    reports: deReportsPage,
    simulatedAI: deSimAI,
    notificationSettings: deNotificationSettings,
  }
};

i18n
  // .use(Backend) // se for carregar via HTTP
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: { 'pt-BR': ['pt'], default: ['en'] },
    supportedLngs: LANGS as unknown as string[],
    nonExplicitSupportedLngs: true,
    resources,
    ns: [
      "common",
      "signIn",
      "signUp",
      "passwordValidation",
      "forgotPassword",
      "resetPassword",
      "emailVerification",
      "navbar",
      "sidebar",
      "subscription",
      "selectionActionsBar",
      "settings",
      "filterBar",
      "kpiCards",
      "entriesModal",
      "transferenceModal",
      "selectDropdown",
      "banksTable",
      "cashFlowTable",
      "settledTable",
      "reports",
      "simulatedAI",
      "notificationSettings",
    ],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      // ordem: querystring > localStorage > navegador
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
    react: { useSuspense: false },
  });

export default i18n;
