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

import ptNavbar from "./locales/pt/navbar.json";
import enNavbar from "./locales/en/navbar.json";
import frNavbar from "./locales/fr/navbar.json";
import deNavbar from "./locales/de/navbar.json";

import ptSidebar from "./locales/pt/sidebar.json";
import enSidebar from "./locales/en/sidebar.json";
import frSidebar from "./locales/fr/sidebar.json";
import deSidebar from "./locales/de/sidebar.json";

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

import ptSelectionActionsBar from "./locales/pt/selectionActionsBar.json";
import enSelectionActionsBar from "./locales/en/selectionActionsBar.json";
import frSelectionActionsBar from "./locales/fr/selectionActionsBar.json";
import deSelectionActionsBar from "./locales/de/selectionActionsBar.json";

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


/* ========================= Objeto de recursos ============================ */
const resources: Resource = {
  pt: {
    common: ptCommon,
    navbar: ptNavbar,
    sidebar: ptSidebar,
    settings: ptSettings,
    filterBar: ptFilterBar,
    kpiCards: ptKpiCards,
    entriesModal: ptEntriesModal,
    transferenceModal: ptTransf,
    settlementModal: ptSettlementModal,
    selectDropdown: ptSelect,
    selectionActionsBar: ptSelectionActionsBar,
    banksTable: ptBanksTable,
    cashFlowTable: ptCashFlowTable,
    settledTable: ptSettledTable,
    reports: ptReportsPage,
    simulatedAI: ptSimAI,
  },
  en: {
    common: enCommon,
    navbar: enNavbar,
    sidebar: enSidebar,
    settings: enSettings,
    filterBar: enFilterBar,
    kpiCards: enKpiCards,
    entriesModal: enEntriesModal,
    transferenceModal: enTransf,
    settlementModal: enSettlementModal,
    selectDropdown: enSelect,
    selectionActionsBar: enSelectionActionsBar,
    banksTable: enBanksTable,
    cashFlowTable: enCashFlowTable,
    settledTable: enSettledTable,
    reports: enReportsPage,
    simulatedAI: enSimAI,
  },
  fr: {
    common: frCommon,
    navbar: frNavbar,
    sidebar: frSidebar,
    settings: frSettings,
    filterBar: frFilterBar,
    kpiCards: frKpiCards,
    entriesModal: frEntriesModal,
    transferenceModal: frTransf,
    settlementModal: frSettlementModal,
    selectDropdown: frSelect,
    selectionActionsBar: frSelectionActionsBar,
    banksTable: frBanksTable,
    cashFlowTable: frCashFlowTable,
    settledTable: frSettledTable,
    reports: frReportsPage,
    simulatedAI: frSimAI,
  },
  de: {
    common: deCommon,
    navbar: deNavbar,
    sidebar: deSidebar,
    settings: deSettings,
    filterBar: deFilterBar,
    kpiCards: deKpiCards,
    entriesModal: deEntriesModal,
    transferenceModal: deTransf,
    settlementModal: deSettlementModal,
    selectDropdown: deSelect,
    selectionActionsBar: deSelectionActionsBar,
    banksTable: deBanksTable,
    cashFlowTable: deCashFlowTable,
    settledTable: deSettledTable,
    reports: deReportsPage,
    simulatedAI: deSimAI,
  },
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
      "settings",
      "sidebar",
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
