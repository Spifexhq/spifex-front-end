import type { FilterDefinition } from "../FilterBar.types";
import { formatDateFromISO } from "@/lib/date";
import { amountChipLabel, isPositiveMajor } from "../FilterBar.utils";

import { DateEditor } from "../editors/DateEditor";
import { BanksEditor } from "../editors/BanksEditor";
import { AccountsEditor } from "../editors/AccountsEditor";
import { ObservationEditor } from "../editors/ObservationEditor";
import { TxTypeEditor } from "../editors/TxTypeEditor";
import { AmountEditor } from "../editors/AmountEditor";

/**
 * Single source of truth for:
 * - Add Filter menu items
 * - Chips
 * - Editors
 * - Clear logic
 *
 * To add a new filter:
 * 1) Create an Editor component in filters/editors
 * 2) Add an entry below
 */
export function getFilterDefinitions(): FilterDefinition[] {
  return [
    {
      key: "date",
      icon: "calendar",
      menuGroup: 0,
      menuLabelKey: "filterBar:menu.date",
      editorTitleKey: "filterBar:menu.date",
      popoverClassName: "w-[calc(100vw-1rem)] sm:min-w-[360px] sm:max-w-[360px]",
      isActive: (f) => !!f.start_date || !!f.end_date,
      getChipLabel: ({ t, filters }) =>
        `${t("filterBar:chips.date")}  ${
          filters.start_date ? formatDateFromISO(filters.start_date) : "yyyy-mm-dd"
        } - ${filters.end_date ? formatDateFromISO(filters.end_date) : "yyyy-mm-dd"}`,
      clear: (prev) => ({ ...prev, start_date: "", end_date: "" }),
      Editor: DateEditor,
    },

    {
      key: "banks",
      icon: "bank",
      menuGroup: 0,
      menuLabelKey: "filterBar:menu.bank",
      editorTitleKey: "filterBar:menu.bank",
      popoverClassName: "w-[calc(100vw-1rem)] sm:min-w-[360px] sm:max-w-[360px]",
      isActive: (f) => f.bank_id.length > 0,
      getChipLabel: ({ t, selectedBanks }) =>
        `${t("filterBar:chips.bank")}  ${selectedBanks
          .slice(0, 2)
          .map((b) => b.institution)
          .join(", ")}${selectedBanks.length > 2 ? ` +${selectedBanks.length - 2}` : ""}`,
      clear: (prev) => ({ ...prev, bank_id: [] }),
      Editor: BanksEditor,
    },

    {
      key: "accounts",
      icon: "accounts",
      menuGroup: 0,
      menuLabelKey: "filterBar:menu.accounts",
      editorTitleKey: "filterBar:menu.accounts",
      popoverClassName: "w-[calc(100vw-1rem)] sm:min-w-[360px] sm:max-w-[360px]",
      isActive: (f) => f.ledger_account_id.length > 0,
      getChipLabel: ({ t, selectedAccounts }) =>
        `${t("filterBar:chips.accounts")}  ${selectedAccounts
          .slice(0, 2)
          .map((a) => a.account)
          .join(", ")}${selectedAccounts.length > 2 ? ` +${selectedAccounts.length - 2}` : ""}`,
      clear: (prev) => ({ ...prev, ledger_account_id: [] }),
      Editor: AccountsEditor,
    },

    // --- Separator boundary (menuGroup changes) ---

    {
      key: "observation",
      icon: "note",
      menuGroup: 1,
      menuLabelKey: "filterBar:menu.observation",
      editorTitleKey: "filterBar:menu.observation",
      popoverClassName: "w-[calc(100vw-1rem)] sm:min-w-[260px] sm:max-w-[360px]",
      isActive: (f) => !!f.observation,
      getChipLabel: ({ t, filters }) => `${t("filterBar:chips.observation")}  ${filters.observation}`,
      clear: (prev) => ({ ...prev, observation: "" }),
      Editor: ObservationEditor,
    },

    {
      key: "tx_type",
      icon: "note",
      menuGroup: 1,
      menuLabelKey: "filterBar:menu.txType",
      editorTitleKey: "filterBar:menu.txType",
      popoverClassName: "w-[calc(100vw-1rem)] sm:min-w-[260px] sm:max-w-[360px]",
      isActive: (f) => !!f.tx_type,
      getChipLabel: ({ t, filters }) =>
        `${t("filterBar:chips.type")} ${
          filters.tx_type === "credit" ? t("filterBar:chips.credit") : t("filterBar:chips.debit")
        }`,
      clear: (prev) => ({ ...prev, tx_type: undefined }),
      Editor: TxTypeEditor,
    },

    {
      key: "amount",
      icon: "note",
      menuGroup: 1,
      menuLabelKey: "filterBar:menu.amount",
      editorTitleKey: "filterBar:menu.amount",
      popoverClassName: "w-[calc(100vw-1rem)] sm:min-w-[260px] sm:max-w-[360px]",
      isActive: (f) => isPositiveMajor(f.amount_min) || isPositiveMajor(f.amount_max),
      getChipLabel: ({ t, filters }) =>
        amountChipLabel(
          isPositiveMajor(filters.amount_min) ? filters.amount_min : undefined,
          isPositiveMajor(filters.amount_max) ? filters.amount_max : undefined,
          t
        ),
      clear: (prev) => ({ ...prev, amount_min: "", amount_max: "" }),
      Editor: AmountEditor,
    },
  ];
}
