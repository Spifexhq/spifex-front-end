import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Database,
  Download,
  FileText,
  Filter,
  FolderTree,
  Landmark,
  Link2,
  ListTree,
  LocateFixed,
  Maximize2,
  Minimize2,
  Move,
  Network,
  PanelRight,
  RotateCcw,
  ScrollText,
  Search,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
import AccountingSideModal from "../components/AccountingSideModal";
import { api } from "@/api";
import { fetchAllCursor } from "@/lib/list";

import type {
  AccountingBook,
  BankAccountLedgerMap,
  CategoryPostingPolicy,
  JournalEntry,
} from "@/models/settings/accounting";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { BankAccount } from "@/models/settings/banking";
import type { CashflowCategory } from "@/models/settings/categories";

type NodeGroup = "page" | "api" | "entity" | "status" | "data";
type EdgeKind = "depends" | "feeds" | "controls" | "relates";
type DatasetKey =
  | "books"
  | "accounts"
  | "bankMappings"
  | "policies"
  | "journals"
  | "banks"
  | "categories";

type DiagramNode = {
  id: string;
  label: string;
  short: string;
  group: NodeGroup;
  description: string;
  architectureLabel?: string;
  x: number;
  y: number;
};

type DiagramEdge = {
  from: string;
  to: string;
  kind: EdgeKind;
  note?: string;
};

type ExplorerData = {
  books: AccountingBook[];
  accounts: LedgerAccount[];
  banks: BankAccount[];
  categories: CashflowCategory[];
  bankMappings: BankAccountLedgerMap[];
  policies: CategoryPostingPolicy[];
  journals: JournalEntry[];
};

type DatasetConfig = {
  key: DatasetKey;
  label: string;
  description: string;
};

type RowOption = {
  id: string;
  dataset: DatasetKey;
  label: string;
  sublabel: string;
  keywords: string;
};

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
} | null;

type SnackbarState = {
  severity: "error" | "success" | "info";
  message: string;
} | null;

const DATASET_CONFIGS: DatasetConfig[] = [
  { key: "books", label: "Books", description: "Accounting books and execution scopes." },
  { key: "accounts", label: "Chart of accounts", description: "Ledger hierarchy and posting accounts." },
  { key: "banks", label: "Banks", description: "Operational bank accounts." },
  { key: "categories", label: "Categories", description: "Operational cashflow categories." },
  { key: "bankMappings", label: "Bank mappings", description: "Bank + book + ledger account bridge." },
  { key: "policies", label: "Posting policies", description: "Category + book + ledger-account policy bridge." },
  { key: "journals", label: "Journals", description: "Accounting execution with lines and statuses." },
];

const groupStyles: Record<NodeGroup, string> = {
  page: "border-gray-200 bg-white text-gray-900",
  api: "border-gray-200 bg-white text-gray-700",
  entity: "border-gray-200 bg-white text-gray-900",
  status: "border-amber-200 bg-amber-50 text-amber-900",
  data: "border-blue-200 bg-blue-50 text-gray-900",
};

const groupLabels: Record<NodeGroup, string> = {
  page: "Page",
  api: "API",
  entity: "Entity",
  status: "Readiness",
  data: "Data row",
};

const edgeStyles: Record<EdgeKind, string> = {
  depends: "stroke-gray-400",
  feeds: "stroke-gray-500",
  controls: "stroke-gray-700",
  relates: "stroke-blue-500",
};

const EMPTY_DATA: ExplorerData = {
  books: [],
  accounts: [],
  banks: [],
  categories: [],
  bankMappings: [],
  policies: [],
  journals: [],
};

const BASE_NODES: DiagramNode[] = [
  {
    id: "workspace",
    label: "AccountingWorkspace",
    short: "Chart of Accounts",
    group: "page",
    architectureLabel: "Page",
    x: 120,
    y: 120,
    description: "Hierarchy workspace for ledger accounts.",
  },
  {
    id: "booksPage",
    label: "AccountingBooksPage",
    short: "Books",
    group: "page",
    architectureLabel: "Page",
    x: 120,
    y: 340,
    description: "Accounting books registry.",
  },
  {
    id: "bankMappingsPage",
    label: "AccountingBankMappingsPage",
    short: "Bank Mappings",
    group: "page",
    architectureLabel: "Page",
    x: 120,
    y: 560,
    description: "Bridge between bank accounts, books, and bank-control ledger accounts.",
  },
  {
    id: "postingPoliciesPage",
    label: "AccountingPostingPoliciesPage",
    short: "Posting Policies",
    group: "page",
    architectureLabel: "Page",
    x: 120,
    y: 780,
    description: "Bridge between cashflow categories, books, and ledger accounts.",
  },
  {
    id: "journalsPage",
    label: "AccountingJournalsPage",
    short: "Journals",
    group: "page",
    architectureLabel: "Page",
    x: 120,
    y: 1000,
    description: "Journal creation, review, and reversal page.",
  },
  {
    id: "reconciliation",
    label: "AccountingReconciliationPage",
    short: "Reconciliation",
    group: "status",
    architectureLabel: "Readiness",
    x: 120,
    y: 1220,
    description: "Readiness board fed by upstream completeness.",
  },

  {
    id: "ledgerApi",
    label: "Ledger Accounts API",
    short: "Ledger API",
    group: "api",
    architectureLabel: "API",
    x: 760,
    y: 170,
    description: "Ledger listing and CRUD source.",
  },
  {
    id: "booksApi",
    label: "Accounting Books API",
    short: "Books API",
    group: "api",
    architectureLabel: "API",
    x: 760,
    y: 440,
    description: "Books listing and CRUD source.",
  },
  {
    id: "banksApi",
    label: "Bank Accounts API",
    short: "Banks API",
    group: "api",
    architectureLabel: "API",
    x: 760,
    y: 710,
    description: "Operational bank account lookup source.",
  },
  {
    id: "categoriesApi",
    label: "Cashflow Categories API",
    short: "Categories API",
    group: "api",
    architectureLabel: "API",
    x: 760,
    y: 980,
    description: "Operational category lookup source.",
  },
  {
    id: "journalsApi",
    label: "Journals API",
    short: "Journals API",
    group: "api",
    architectureLabel: "API",
    x: 760,
    y: 1250,
    description: "Journal listing / create / reverse source.",
  },

  {
    id: "ledgerEntity",
    label: "LedgerAccount",
    short: "Ledger Account",
    group: "entity",
    architectureLabel: "Entity",
    x: 1460,
    y: 260,
    description: "Main chart-of-accounts structure.",
  },
  {
    id: "bookEntity",
    label: "AccountingBook",
    short: "Accounting Book",
    group: "entity",
    architectureLabel: "Entity",
    x: 1460,
    y: 610,
    description: "Accounting execution scope.",
  },
  {
    id: "bankEntity",
    label: "BankAccount",
    short: "Bank Account",
    group: "entity",
    architectureLabel: "Entity",
    x: 1460,
    y: 960,
    description: "Operational bank account.",
  },
  {
    id: "categoryEntity",
    label: "CashflowCategory",
    short: "Cashflow Category",
    group: "entity",
    architectureLabel: "Entity",
    x: 1460,
    y: 1310,
    description: "Operational category used in policy mapping.",
  },
  {
    id: "journalEntity",
    label: "JournalEntry",
    short: "Journal Entry",
    group: "entity",
    architectureLabel: "Entity",
    x: 2120,
    y: 820,
    description: "Accounting execution output.",
  },
];

const BASE_EDGES: DiagramEdge[] = [
  { from: "workspace", to: "ledgerApi", kind: "depends", note: "list + CRUD" },
  { from: "booksPage", to: "booksApi", kind: "depends", note: "list + CRUD" },
  { from: "bankMappingsPage", to: "booksApi", kind: "depends", note: "lookup" },
  { from: "bankMappingsPage", to: "ledgerApi", kind: "depends", note: "bank-control lookup" },
  { from: "bankMappingsPage", to: "banksApi", kind: "depends", note: "bank lookup" },
  { from: "postingPoliciesPage", to: "booksApi", kind: "depends", note: "book lookup" },
  { from: "postingPoliciesPage", to: "ledgerApi", kind: "depends", note: "account lookup" },
  { from: "postingPoliciesPage", to: "categoriesApi", kind: "depends", note: "category scope" },
  { from: "journalsPage", to: "booksApi", kind: "depends", note: "book lookup" },
  { from: "journalsPage", to: "ledgerApi", kind: "depends", note: "line account lookup" },
  { from: "journalsPage", to: "journalsApi", kind: "depends", note: "list/create/reverse" },
  { from: "ledgerApi", to: "ledgerEntity", kind: "feeds", note: "results" },
  { from: "booksApi", to: "bookEntity", kind: "feeds", note: "results" },
  { from: "banksApi", to: "bankEntity", kind: "feeds", note: "results" },
  { from: "categoriesApi", to: "categoryEntity", kind: "feeds", note: "results" },
  { from: "journalsApi", to: "journalEntity", kind: "feeds", note: "results" },
  { from: "ledgerEntity", to: "workspace", kind: "controls", note: "tree + inspector" },
  { from: "ledgerEntity", to: "bankMappingsPage", kind: "controls", note: "bank-control account" },
  { from: "ledgerEntity", to: "postingPoliciesPage", kind: "controls", note: "settlement/accrual/clearing" },
  { from: "ledgerEntity", to: "journalsPage", kind: "controls", note: "journal lines" },
  { from: "bookEntity", to: "booksPage", kind: "controls", note: "registry" },
  { from: "bookEntity", to: "bankMappingsPage", kind: "controls", note: "mapping scope" },
  { from: "bookEntity", to: "postingPoliciesPage", kind: "controls", note: "policy scope" },
  { from: "bookEntity", to: "journalsPage", kind: "controls", note: "journal header" },
  { from: "bankEntity", to: "bankMappingsPage", kind: "controls", note: "operational bank" },
  { from: "categoryEntity", to: "postingPoliciesPage", kind: "controls", note: "category bridge" },
  { from: "journalEntity", to: "reconciliation", kind: "feeds", note: "review / exceptions" },
  { from: "postingPoliciesPage", to: "reconciliation", kind: "feeds", note: "policy readiness" },
  { from: "bankMappingsPage", to: "reconciliation", kind: "feeds", note: "bank readiness" },
];

const filterOptions = [
  { id: "all", label: "All" },
  { id: "architecture", label: "Architecture only" },
  { id: "selected", label: "Selected data only" },
] as const;

type FilterMode = (typeof filterOptions)[number]["id"];

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  for (const key of [
    "results",
    "items",
    "data",
    "books",
    "entries",
    "mappings",
    "policies",
    "banks",
    "categories",
  ]) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    const nested = extractCollection<T>(obj.data);
    if (nested.length || Array.isArray(obj.data)) return nested;
  }

  return [];
}

function iconForNode(group: NodeGroup) {
  switch (group) {
    case "page":
      return <PanelRight className="h-4 w-4" />;
    case "api":
      return <Database className="h-4 w-4" />;
    case "entity":
      return <Box className="h-4 w-4" />;
    case "status":
      return <ShieldCheck className="h-4 w-4" />;
    case "data":
      return <ListTree className="h-4 w-4" />;
  }
}

function legendIcon(label: string) {
  if (label.includes("Ledger")) return <FolderTree className="h-4 w-4" />;
  if (label.includes("Book")) return <ScrollText className="h-4 w-4" />;
  if (label.includes("Bank")) return <Landmark className="h-4 w-4" />;
  if (label.includes("Category")) return <Link2 className="h-4 w-4" />;
  if (label.includes("Journal")) return <FileText className="h-4 w-4" />;
  return <Network className="h-4 w-4" />;
}

function edgePath(from: DiagramNode, to: DiagramNode) {
  const startX = from.x + 240;
  const startY = from.y + 48;
  const endX = to.x;
  const endY = to.y + 48;
  const dx = Math.max(180, Math.abs(endX - startX) * 0.42);
  return `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
}

function formatBook(book: AccountingBook) {
  return [book.code, book.name].filter(Boolean).join(" — ") || book.id;
}

function formatAccount(account: LedgerAccount) {
  return [account.code, account.name].filter(Boolean).join(" — ") || account.id;
}

function formatBank(bank: BankAccount) {
  return [bank.institution, bank.branch, bank.account_number].filter(Boolean).join(" — ") || bank.id;
}

function formatCategory(category: CashflowCategory) {
  return [category.code, category.name].filter(Boolean).join(" — ") || category.id;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildRowOptions(data: ExplorerData): RowOption[] {
  const booksById = new Map(data.books.map((item) => [item.id, item]));
  const accountsById = new Map(data.accounts.map((item) => [item.id, item]));
  const banksById = new Map(data.banks.map((item) => [item.id, item]));
  const categoriesById = new Map(data.categories.map((item) => [item.id, item]));

  return [
    ...data.books.map((item) => ({
      id: item.id,
      dataset: "books" as const,
      label: formatBook(item),
      sublabel: `${item.basis} • ${item.currency_code}`,
      keywords: `${item.code} ${item.name} ${item.basis} ${item.currency_code}`.toLowerCase(),
    })),
    ...data.accounts.map((item) => ({
      id: item.id,
      dataset: "accounts" as const,
      label: formatAccount(item),
      sublabel: `${item.statement_section} • ${item.account_type}${item.is_bank_control ? " • bank control" : ""}`,
      keywords: `${item.code} ${item.name} ${item.statement_section} ${item.account_type} ${item.report_group || ""}`.toLowerCase(),
    })),
    ...data.banks.map((item) => ({
      id: item.id,
      dataset: "banks" as const,
      label: formatBank(item),
      sublabel: `${item.currency || "—"}`,
      keywords: `${item.institution} ${item.branch} ${item.account_number} ${item.currency || ""}`.toLowerCase(),
    })),
    ...data.categories.map((item) => ({
      id: item.id,
      dataset: "categories" as const,
      label: formatCategory(item),
      sublabel: `${item.tx_type_hint || "no hint"}`,
      keywords: `${item.code} ${item.name} ${item.tx_type_hint || ""}`.toLowerCase(),
    })),
    ...data.bankMappings.map((item, index) => {
      const bankLabel = banksById.get(item.bank_account_id)
        ? formatBank(banksById.get(item.bank_account_id) as BankAccount)
        : "Bank";
      const bookLabel = booksById.get(item.book_id)
        ? formatBook(booksById.get(item.book_id) as AccountingBook)
        : "Book";
      const accountLabel = accountsById.get(item.ledger_account_id)
        ? formatAccount(accountsById.get(item.ledger_account_id) as LedgerAccount)
        : "Ledger account";

      return {
        id: item.id,
        dataset: "bankMappings" as const,
        label: `Bank mapping ${index + 1}`,
        sublabel: `${bankLabel} • ${bookLabel} • ${accountLabel}`,
        keywords: `${bankLabel} ${bookLabel} ${accountLabel}`.toLowerCase(),
      };
    }),
    ...data.policies.map((item, index) => {
      const categoryLabel = categoriesById.get(item.cashflow_category_id)
        ? formatCategory(categoriesById.get(item.cashflow_category_id) as CashflowCategory)
        : "Category";
      const bookLabel = booksById.get(item.book_id)
        ? formatBook(booksById.get(item.book_id) as AccountingBook)
        : "Book";

      return {
        id: item.id,
        dataset: "policies" as const,
        label: `Posting policy ${index + 1}`,
        sublabel: `${categoryLabel} • ${bookLabel}`,
        keywords: `${categoryLabel} ${bookLabel} ${item.status}`.toLowerCase(),
      };
    }),
    ...data.journals.map((item) => ({
      id: item.id,
      dataset: "journals" as const,
      label: item.entry_number || item.id,
      sublabel: `${item.book_code} • ${item.status} • ${item.lines.length} lines`,
      keywords: `${item.entry_number} ${item.book_code} ${item.status} ${item.memo || ""} ${item.lines
        .map((line) => `${line.account_code} ${line.account_name}`)
        .join(" ")}`.toLowerCase(),
    })),
  ];
}

function deriveDataGraph(data: ExplorerData, selectedRows: Record<DatasetKey, Set<string>>) {
  const booksById = new Map(data.books.map((item) => [item.id, item]));
  const accountsById = new Map(data.accounts.map((item) => [item.id, item]));
  const banksById = new Map(data.banks.map((item) => [item.id, item]));
  const categoriesById = new Map(data.categories.map((item) => [item.id, item]));

  const dataNodes: DiagramNode[] = [];
  const dataEdges: DiagramEdge[] = [];
  const selectedAccounts = new Set<string>();
  const selectedBooks = new Set<string>();
  const selectedBanks = new Set<string>();
  const selectedCategories = new Set<string>();
  const selectedJournals = new Set<string>();

  const selectedBooksSet = selectedRows.books;
  const selectedAccountsSet = selectedRows.accounts;
  const selectedBanksSet = selectedRows.banks;
  const selectedCategoriesSet = selectedRows.categories;
  const selectedMappingsSet = selectedRows.bankMappings;
  const selectedPoliciesSet = selectedRows.policies;
  const selectedJournalsSet = selectedRows.journals;

  const pushNode = (
    id: string,
    short: string,
    label: string,
    description: string,
    x: number,
    y: number,
    architectureLabel: string
  ) => {
    dataNodes.push({
      id,
      short,
      label,
      description,
      x,
      y,
      group: "data",
      architectureLabel,
    });
  };

  data.bankMappings
    .filter((item) => selectedMappingsSet.has(item.id))
    .forEach((item) => {
      selectedBooks.add(item.book_id);
      selectedAccounts.add(item.ledger_account_id);
      selectedBanks.add(item.bank_account_id);
    });

  data.policies
    .filter((item) => selectedPoliciesSet.has(item.id))
    .forEach((item) => {
      selectedBooks.add(item.book_id);
      selectedCategories.add(item.cashflow_category_id);
      [
        item.settlement_debit_account_id,
        item.settlement_credit_account_id,
        item.accrual_debit_account_id,
        item.accrual_credit_account_id,
        item.clearing_account_id,
      ]
        .filter(Boolean)
        .forEach((id) => selectedAccounts.add(id as string));
    });

  data.journals
    .filter((item) => selectedJournalsSet.has(item.id))
    .forEach((item) => {
      selectedJournals.add(item.id);
      selectedBooks.add(item.book_id);
      item.lines.forEach((line) => {
        selectedAccounts.add(line.account_id);
        if (line.bank_account_id) selectedBanks.add(line.bank_account_id);
      });
    });

  data.books
    .filter((item) => selectedBooksSet.has(item.id) || selectedBooks.has(item.id))
    .forEach((item, index) => {
      pushNode(
        `data-book-${item.id}`,
        item.code || item.id,
        formatBook(item),
        selectedBooksSet.has(item.id) ? "Selected book row" : "Correlated book by id",
        2720,
        80 + index * 120,
        "Book"
      );
      dataEdges.push({
        from: `data-book-${item.id}`,
        to: "bookEntity",
        kind: "relates",
        note: selectedBooksSet.has(item.id) ? "selected row" : "correlated by id",
      });
    });

  data.accounts
    .filter((item) => selectedAccountsSet.has(item.id) || selectedAccounts.has(item.id))
    .forEach((item, index) => {
      pushNode(
        `data-account-${item.id}`,
        item.code || item.id,
        formatAccount(item),
        selectedAccountsSet.has(item.id) ? "Selected account row" : "Correlated account by id",
        2720,
        520 + index * 120,
        "Ledger account"
      );
      dataEdges.push({
        from: `data-account-${item.id}`,
        to: "ledgerEntity",
        kind: "relates",
        note: selectedAccountsSet.has(item.id) ? "selected row" : "correlated by id",
      });
    });

  data.banks
    .filter((item) => selectedBanksSet.has(item.id) || selectedBanks.has(item.id))
    .forEach((item, index) => {
      pushNode(
        `data-bank-${item.id}`,
        item.institution || item.id,
        formatBank(item),
        selectedBanksSet.has(item.id) ? "Selected bank row" : "Correlated bank by id",
        2720,
        1120 + index * 120,
        "Bank"
      );
      dataEdges.push({
        from: `data-bank-${item.id}`,
        to: "bankEntity",
        kind: "relates",
        note: selectedBanksSet.has(item.id) ? "selected row" : "correlated by id",
      });
    });

  data.categories
    .filter((item) => selectedCategoriesSet.has(item.id) || selectedCategories.has(item.id))
    .forEach((item, index) => {
      pushNode(
        `data-category-${item.id}`,
        item.code || item.id,
        formatCategory(item),
        selectedCategoriesSet.has(item.id) ? "Selected category row" : "Correlated category by id",
        3360,
        80 + index * 120,
        "Cashflow category"
      );
      dataEdges.push({
        from: `data-category-${item.id}`,
        to: "categoryEntity",
        kind: "relates",
        note: selectedCategoriesSet.has(item.id) ? "selected row" : "correlated by id",
      });
    });

  data.bankMappings
    .filter((item) => selectedMappingsSet.has(item.id))
    .forEach((item, index) => {
      const bankLabel = banksById.get(item.bank_account_id)
        ? formatBank(banksById.get(item.bank_account_id) as BankAccount)
        : "Bank";
      const bookLabel = booksById.get(item.book_id)
        ? formatBook(booksById.get(item.book_id) as AccountingBook)
        : "Book";
      const accountLabel = accountsById.get(item.ledger_account_id)
        ? formatAccount(accountsById.get(item.ledger_account_id) as LedgerAccount)
        : "Ledger account";

      pushNode(
        `data-bankmap-${item.id}`,
        `Map ${index + 1}`,
        `Bank mapping ${index + 1}`,
        `${bankLabel} • ${bookLabel} • ${accountLabel}`,
        3360,
        500 + index * 130,
        "Bank mapping"
      );

      dataEdges.push({ from: `data-bankmap-${item.id}`, to: "bankMappingsPage", kind: "relates", note: "selected mapping" });
      dataEdges.push({ from: `data-bankmap-${item.id}`, to: `data-book-${item.book_id}`, kind: "relates", note: "book_id" });
      dataEdges.push({
        from: `data-bankmap-${item.id}`,
        to: `data-account-${item.ledger_account_id}`,
        kind: "relates",
        note: "ledger_account_id",
      });
      dataEdges.push({
        from: `data-bankmap-${item.id}`,
        to: `data-bank-${item.bank_account_id}`,
        kind: "relates",
        note: "bank_account_id",
      });
    });

  data.policies
    .filter((item) => selectedPoliciesSet.has(item.id))
    .forEach((item, index) => {
      const categoryLabel = categoriesById.get(item.cashflow_category_id)
        ? formatCategory(categoriesById.get(item.cashflow_category_id) as CashflowCategory)
        : "Category";
      const bookLabel = booksById.get(item.book_id)
        ? formatBook(booksById.get(item.book_id) as AccountingBook)
        : "Book";

      pushNode(
        `data-policy-${item.id}`,
        `Policy ${index + 1}`,
        `Posting policy ${index + 1}`,
        `${categoryLabel} • ${bookLabel}`,
        3360,
        940 + index * 140,
        "Posting policy"
      );

      dataEdges.push({ from: `data-policy-${item.id}`, to: "postingPoliciesPage", kind: "relates", note: "selected policy" });
      dataEdges.push({
        from: `data-policy-${item.id}`,
        to: `data-category-${item.cashflow_category_id}`,
        kind: "relates",
        note: "cashflow_category_id",
      });
      dataEdges.push({
        from: `data-policy-${item.id}`,
        to: `data-book-${item.book_id}`,
        kind: "relates",
        note: "book_id",
      });

      [
        [item.settlement_debit_account_id, "settlement_debit_account_id"],
        [item.settlement_credit_account_id, "settlement_credit_account_id"],
        [item.accrual_debit_account_id, "accrual_debit_account_id"],
        [item.accrual_credit_account_id, "accrual_credit_account_id"],
        [item.clearing_account_id, "clearing_account_id"],
      ]
        .filter(([id]) => !!id)
        .forEach(([id, label]) => {
          dataEdges.push({
            from: `data-policy-${item.id}`,
            to: `data-account-${id as string}`,
            kind: "relates",
            note: label as string,
          });
        });
    });

  data.journals
    .filter((item) => selectedJournalsSet.has(item.id))
    .forEach((item, index) => {
      pushNode(
        `data-journal-${item.id}`,
        item.entry_number || item.id,
        item.entry_number || item.id,
        `${item.book_code} • ${item.status} • ${item.lines.length} lines`,
        4040,
        500 + index * 150,
        "Journal"
      );

      dataEdges.push({ from: `data-journal-${item.id}`, to: "journalsPage", kind: "relates", note: "selected journal" });
      dataEdges.push({ from: `data-journal-${item.id}`, to: `data-book-${item.book_id}`, kind: "relates", note: "book_id" });
      dataEdges.push({ from: `data-journal-${item.id}`, to: "journalEntity", kind: "relates", note: item.status });

      item.lines.forEach((line) => {
        dataEdges.push({
          from: `data-journal-${item.id}`,
          to: `data-account-${line.account_id}`,
          kind: "relates",
          note: `line ${line.line_no} account_id`,
        });
        if (line.bank_account_id) {
          dataEdges.push({
            from: `data-journal-${item.id}`,
            to: `data-bank-${line.bank_account_id}`,
            kind: "relates",
            note: `line ${line.line_no} bank_account_id`,
          });
        }
      });
    });

  return {
    nodes: dataNodes,
    edges: dataEdges,
    stats: {
      books: [...selectedBooksSet, ...selectedBooks].length,
      accounts: [...selectedAccountsSet, ...selectedAccounts].length,
      banks: [...selectedBanksSet, ...selectedBanks].length,
      categories: [...selectedCategoriesSet, ...selectedCategories].length,
      journals: [...selectedJournalsSet].length,
    },
  };
}

export default function AccountingCorrelationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExplorerData>(EMPTY_DATA);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const [selectedId, setSelectedId] = useState<string>("ledgerEntity");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [zoom, setZoom] = useState(0.36);
  const [pan, setPan] = useState({ x: 18, y: 12 });
  const [draggingNode, setDraggingNode] = useState<DragState>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [enabledDatasets, setEnabledDatasets] = useState<DatasetKey[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<DatasetKey, Set<string>>>({
    books: new Set(),
    accounts: new Set(),
    bankMappings: new Set(),
    policies: new Set(),
    journals: new Set(),
    banks: new Set(),
    categories: new Set(),
  });
  const [panning, setPanning] = useState<null | {
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>(null);

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<null | {
    startDistance: number;
    startZoom: number;
    centerBoardX: number;
    centerBoardY: number;
  }>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(
    Object.fromEntries(BASE_NODES.map((node) => [node.id, { x: node.x, y: node.y }]))
  );

  const boardRef = useRef<HTMLDivElement | null>(null);
  const previousSelectedRowsRef = useRef<Record<DatasetKey, Set<string>>>({
    books: new Set(),
    accounts: new Set(),
    bankMappings: new Set(),
    policies: new Set(),
    journals: new Set(),
    banks: new Set(),
    categories: new Set(),
  });

  const BOARD_WIDTH = 4700;
  const BOARD_HEIGHT = 1900;
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 96;
  const DRAG_MARGIN = 28;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        booksResponse,
        bankMappingsResponse,
        policiesResponse,
        categoriesResponse,
        journalsResponse,
        allAccounts,
        allBanks,
      ] = await Promise.all([
        api.getAccountingBooks(),
        api.getBankAccountLedgerMaps(),
        api.getCategoryPostingPolicies(),
        api.getCashflowCategories ? api.getCashflowCategories() : Promise.resolve([]),
        api.getJournalEntries(),
        fetchAllCursor<LedgerAccount>((params?: { cursor?: string }) =>
          api.getLedgerAccounts({ cursor: params?.cursor, active: "true" })
        ),
        fetchAllCursor<BankAccount>((params?: { cursor?: string }) =>
          api.getBanks({ cursor: params?.cursor, active: "true" })
        ),
      ]);

      setData({
        books: extractCollection<AccountingBook>((booksResponse as { data?: unknown })?.data ?? booksResponse),
        accounts: allAccounts,
        banks: allBanks,
        categories: extractCollection<CashflowCategory>(
          (categoriesResponse as { data?: unknown })?.data ?? categoriesResponse
        ),
        bankMappings: extractCollection<BankAccountLedgerMap>(
          (bankMappingsResponse as { data?: unknown })?.data ?? bankMappingsResponse
        ),
        policies: extractCollection<CategoryPostingPolicy>(
          (policiesResponse as { data?: unknown })?.data ?? policiesResponse
        ),
        journals: extractCollection<JournalEntry>(
          (journalsResponse as { data?: unknown })?.data ?? journalsResponse
        ),
      });
    } catch {
      setSnackbar({ severity: "error", message: "Failed to load correlation explorer data." });
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const rowOptions = useMemo(() => buildRowOptions(data), [data]);
  const dataGraph = useMemo(() => deriveDataGraph(data, selectedRows), [data, selectedRows]);

  const composedNodes = useMemo(() => {
    const base = BASE_NODES.map((node) => ({
      ...node,
      ...(nodePositions[node.id] || { x: node.x, y: node.y }),
    }));
    const dynamic = dataGraph.nodes.map((node) => ({
      ...node,
      ...(nodePositions[node.id] || { x: node.x, y: node.y }),
    }));
    return [...base, ...dynamic];
  }, [dataGraph.nodes, nodePositions]);

  const allEdges = useMemo(() => [...BASE_EDGES, ...dataGraph.edges], [dataGraph.edges]);

  const selected = useMemo(
    () => composedNodes.find((node) => node.id === selectedId) ?? composedNodes[0],
    [composedNodes, selectedId]
  );

  const visibleNodes = useMemo(() => {
    if (filterMode === "architecture") return composedNodes.filter((node) => node.group !== "data");
    if (filterMode === "selected") return composedNodes.filter((node) => node.group === "data");
    return composedNodes;
  }, [composedNodes, filterMode]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => allEdges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
    [allEdges, visibleIds]
  );

  const incoming = useMemo(
    () => visibleEdges.filter((edge) => edge.to === selectedId),
    [visibleEdges, selectedId]
  );

  const outgoing = useMemo(
    () => visibleEdges.filter((edge) => edge.from === selectedId),
    [visibleEdges, selectedId]
  );

  const relatedIds = useMemo(() => {
    const set = new Set<string>([selectedId]);
    incoming.forEach((edge) => set.add(edge.from));
    outgoing.forEach((edge) => set.add(edge.to));
    return set;
  }, [incoming, outgoing, selectedId]);

  const visibleRowOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rowOptions.filter((item) => {
      if (!enabledDatasets.includes(item.dataset)) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.sublabel.toLowerCase().includes(q) ||
        item.keywords.includes(q)
      );
    });
  }, [enabledDatasets, rowOptions, search]);

  const toBoardCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom]
  );

  const clampNodePosition = useCallback(
    (x: number, y: number) => ({
      x: clamp(x, DRAG_MARGIN, BOARD_WIDTH - NODE_WIDTH - DRAG_MARGIN),
      y: clamp(y, DRAG_MARGIN, BOARD_HEIGHT - NODE_HEIGHT - DRAG_MARGIN),
    }),
    [BOARD_HEIGHT, BOARD_WIDTH]
  );

  const centerNode = useCallback(
    (nodeId: string) => {
      const node = composedNodes.find((item) => item.id === nodeId);
      const rect = boardRef.current?.getBoundingClientRect();
      if (!node || !rect) return;

      setPan({
        x: rect.width / 2 - (node.x + NODE_WIDTH / 2) * zoom,
        y: rect.height / 2 - (node.y + NODE_HEIGHT / 2) * zoom,
      });
    },
    [composedNodes, zoom]
  );

  const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  const midpointBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const boardX = (cursorX - pan.x) / zoom;
    const boardY = (cursorY - pan.y) / zoom;
    const delta = event.deltaY < 0 ? 1.08 : 0.92;
    const nextZoom = Math.min(1.8, Math.max(0.28, zoom * delta));

    setPan({
      x: cursorX - boardX * nextZoom,
      y: cursorY - boardY * nextZoom,
    });
    setZoom(nextZoom);
  };

  const startPan: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;

    if (event.pointerType === "touch") {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (boardRef.current) {
        try {
          boardRef.current.setPointerCapture(event.pointerId);
        } catch {
          // no-op
        }
      }

      if (activePointersRef.current.size === 2) {
        const [first, second] = Array.from(activePointersRef.current.values());
        const center = midpointBetween(first, second);
        const rect = boardRef.current?.getBoundingClientRect();

        if (rect) {
          pinchStateRef.current = {
            startDistance: distanceBetween(first, second),
            startZoom: zoom,
            centerBoardX: (center.x - rect.left - pan.x) / zoom,
            centerBoardY: (center.y - rect.top - pan.y) / zoom,
          };
        }

        setPanning(null);
        setDraggingNode(null);
        return;
      }

      if (activePointersRef.current.size === 1) {
        if (target.closest("[data-node-card='true']")) return;

        setPanning({
          startX: event.clientX,
          startY: event.clientY,
          originX: pan.x,
          originY: pan.y,
        });
        return;
      }

      return;
    }

    if (target.closest("[data-node-card='true']")) return;

    event.preventDefault();
    setPanning({
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    });
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.pointerType === "touch" && activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (activePointersRef.current.size === 2 && pinchStateRef.current) {
        const [first, second] = Array.from(activePointersRef.current.values());
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect) return;

        const center = midpointBetween(first, second);
        const distance = distanceBetween(first, second);

        if (pinchStateRef.current.startDistance <= 0) return;

        const scaleFactor = distance / pinchStateRef.current.startDistance;
        const nextZoom = Math.min(1.8, Math.max(0.28, pinchStateRef.current.startZoom * scaleFactor));

        setZoom(nextZoom);
        setPan({
          x: center.x - rect.left - pinchStateRef.current.centerBoardX * nextZoom,
          y: center.y - rect.top - pinchStateRef.current.centerBoardY * nextZoom,
        });

        return;
      }

      if (activePointersRef.current.size === 1 && panning) {
        setPan({
          x: panning.originX + (event.clientX - panning.startX),
          y: panning.originY + (event.clientY - panning.startY),
        });
        return;
      }
    }

    if (draggingNode) {
      const next = toBoardCoordinates(event.clientX, event.clientY);
      const clamped = clampNodePosition(next.x - draggingNode.offsetX, next.y - draggingNode.offsetY);
      setNodePositions((prev) => ({ ...prev, [draggingNode.id]: clamped }));
      return;
    }

    if (panning) {
      setPan({
        x: panning.originX + (event.clientX - panning.startX),
        y: panning.originY + (event.clientY - panning.startY),
      });
    }
  };

  const endInteractions = useCallback(
    (event?: React.PointerEvent<HTMLDivElement>) => {
      if (event?.pointerType === "touch") {
        activePointersRef.current.delete(event.pointerId);

        if (boardRef.current) {
          try {
            boardRef.current.releasePointerCapture(event.pointerId);
          } catch {
            // no-op
          }
        }

        if (activePointersRef.current.size < 2) {
          pinchStateRef.current = null;
        }

        if (activePointersRef.current.size === 1) {
          const remaining = Array.from(activePointersRef.current.values())[0];
          setPanning({
            startX: remaining.x,
            startY: remaining.y,
            originX: pan.x,
            originY: pan.y,
          });
        } else {
          setPanning(null);
        }

        setDraggingNode(null);
        return;
      }

      setDraggingNode(null);
      setPanning(null);
    },
    [pan.x, pan.y]
  );

  const toggleDataset = useCallback((dataset: DatasetKey) => {
    setEnabledDatasets((prev) =>
      prev.includes(dataset) ? prev.filter((item) => item !== dataset) : [...prev, dataset]
    );
  }, []);

  const toggleRow = useCallback((dataset: DatasetKey, id: string) => {
    setSelectedRows((prev) => {
      const nextSet = new Set(prev[dataset]);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return { ...prev, [dataset]: nextSet };
    });
  }, []);

  const selectedCount = Object.values(selectedRows).reduce((sum, set) => sum + set.size, 0);

  const downloadBoardAsPng = useCallback(() => {
    const xmlns = "http://www.w3.org/2000/svg";

    const dashedRect = `
      <rect
        x="${DRAG_MARGIN}"
        y="${DRAG_MARGIN}"
        width="${BOARD_WIDTH - DRAG_MARGIN * 2}"
        height="${BOARD_HEIGHT - DRAG_MARGIN * 2}"
        rx="12"
        ry="12"
        fill="none"
        stroke="#d1d5db"
        stroke-width="2"
        stroke-dasharray="8 6"
        vector-effect="non-scaling-stroke"
      />
    `;

    const defs = `
      <defs>
        <marker id="export-arrowhead" markerWidth="9" markerHeight="9" refX="6.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#9ca3af" />
        </marker>
      </defs>
    `;

    const edgesMarkup = visibleEdges
      .map((edge) => {
        const from = visibleNodes.find((node) => node.id === edge.from);
        const to = visibleNodes.find((node) => node.id === edge.to);
        if (!from || !to) return "";

        const highlighted = selectedId === edge.from || selectedId === edge.to;
        const stroke =
          edge.kind === "depends"
            ? "#9ca3af"
            : edge.kind === "feeds"
            ? "#6b7280"
            : edge.kind === "controls"
            ? "#374151"
            : "#3b82f6";

        const dash =
          edge.kind === "feeds" ? `stroke-dasharray="5 4"` : edge.kind === "relates" ? `stroke-dasharray="2 5"` : "";

        return `
          <path
            d="${edgePath(from, to)}"
            fill="none"
            stroke="${stroke}"
            stroke-width="${highlighted ? 2.2 : 1.5}"
            opacity="${highlighted ? 1 : 0.5}"
            marker-end="url(#export-arrowhead)"
            ${dash}
          />
        `;
      })
      .join("");

    const nodesMarkup = visibleNodes
      .map((node) => {
        const isSelected = selectedId === node.id;
        const dimmed = !relatedIds.has(node.id);
        const background =
          node.group === "status"
            ? "#fffbeb"
            : node.group === "data"
            ? "#eff6ff"
            : "#ffffff";
        const border =
          node.group === "status"
            ? "#fcd34d"
            : node.group === "data"
            ? "#bfdbfe"
            : "#e5e7eb";

        const opacity = dimmed && !isSelected ? 0.55 : 1;
        const ring = isSelected
          ? `<rect x="${node.x - 2}" y="${node.y - 2}" width="${NODE_WIDTH + 4}" height="${NODE_HEIGHT + 4}" rx="10" ry="10" fill="none" stroke="#111827" stroke-width="2"/>`
          : "";

        return `
          ${ring}
          <g opacity="${opacity}">
            <rect
              x="${node.x}"
              y="${node.y}"
              width="${NODE_WIDTH}"
              height="${NODE_HEIGHT}"
              rx="8"
              ry="8"
              fill="${background}"
              stroke="${border}"
              stroke-width="1.2"
            />
            <rect
              x="${node.x + 12}"
              y="${node.y + 12}"
              width="28"
              height="28"
              rx="14"
              ry="14"
              fill="#ffffff"
              stroke="#e5e7eb"
            />
            <rect
              x="${node.x + NODE_WIDTH - 96}"
              y="${node.y + 14}"
              width="84"
              height="18"
              rx="9"
              ry="9"
              fill="#ffffff"
              stroke="#e5e7eb"
            />
            <text
              x="${node.x + NODE_WIDTH - 54}"
              y="${node.y + 27}"
              text-anchor="middle"
              font-family="Inter, Arial, sans-serif"
              font-size="10"
              fill="#4b5563"
              letter-spacing="0.8"
            >
              ${escapeXml(node.architectureLabel || groupLabels[node.group])}
            </text>
            <text
              x="${node.x + 12}"
              y="${node.y + 56}"
              font-family="Inter, Arial, sans-serif"
              font-size="13"
              font-weight="600"
              fill="#111827"
            >
              ${escapeXml(node.short)}
            </text>
            <text
              x="${node.x + 12}"
              y="${node.y + 74}"
              font-family="Inter, Arial, sans-serif"
              font-size="12"
              fill="#4b5563"
            >
              ${escapeXml(node.label.length > 32 ? `${node.label.slice(0, 31)}…` : node.label)}
            </text>
          </g>
        `;
      })
      .join("");

    const svgMarkup = `
      <svg xmlns="${xmlns}" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}">
        <rect x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" fill="#f9fafb" />
        ${defs}
        ${dashedRect}
        ${edgesMarkup}
        ${nodesMarkup}
      </svg>
    `;

    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = BOARD_WIDTH;
      canvas.height = BOARD_HEIGHT;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }

      context.fillStyle = "#f9fafb";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `accounting-correlations-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    };

    image.src = url;
  }, [
    visibleEdges,
    visibleNodes,
    relatedIds,
    selectedId,
    BOARD_HEIGHT,
    BOARD_WIDTH,
    DRAG_MARGIN,
    NODE_HEIGHT,
    NODE_WIDTH,
  ]);

  useEffect(() => {
    const previous = previousSelectedRowsRef.current;
    let nextSelectedNodeId: string | null = null;

    (Object.keys(selectedRows) as DatasetKey[]).forEach((dataset) => {
      const prevSet = previous[dataset];
      const nextSet = selectedRows[dataset];

      nextSet.forEach((id) => {
        if (!prevSet.has(id) && !nextSelectedNodeId) {
          if (dataset === "books") nextSelectedNodeId = `data-book-${id}`;
          else if (dataset === "accounts") nextSelectedNodeId = `data-account-${id}`;
          else if (dataset === "banks") nextSelectedNodeId = `data-bank-${id}`;
          else if (dataset === "categories") nextSelectedNodeId = `data-category-${id}`;
          else if (dataset === "bankMappings") nextSelectedNodeId = `data-bankmap-${id}`;
          else if (dataset === "policies") nextSelectedNodeId = `data-policy-${id}`;
          else if (dataset === "journals") nextSelectedNodeId = `data-journal-${id}`;
        }
      });
    });

    previousSelectedRowsRef.current = {
      books: new Set(selectedRows.books),
      accounts: new Set(selectedRows.accounts),
      bankMappings: new Set(selectedRows.bankMappings),
      policies: new Set(selectedRows.policies),
      journals: new Set(selectedRows.journals),
      banks: new Set(selectedRows.banks),
      categories: new Set(selectedRows.categories),
    };

    if (nextSelectedNodeId) {
      setSelectedId(nextSelectedNodeId);
      window.setTimeout(() => centerNode(nextSelectedNodeId as string), 0);
    }
  }, [centerNode, selectedRows]);

  if (loading) {
    return <PageSkeleton rows={10} />;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[2400px] space-y-6">
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Correlation explorer</div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-[16px] font-semibold text-gray-900">Accounting data correlation explorer</h1>
              <p className="mt-1 text-[13px] leading-6 text-gray-600">
                Select concrete rows and visualize their direct ID correlations to books, categories,
                bank accounts, ledger accounts, and journals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filterOptions.map((option) => {
                const active = filterMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilterMode(option.id)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                      active
                        ? "border-gray-900 bg-white text-gray-900"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={isExpanded ? "grid gap-6" : "grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]"}>
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Correlation board</div>
                <div className="mt-1 text-[13px] font-medium text-gray-900">
                  Wide board with draggable, selectable cards
                </div>
              </div>

              <div className="flex items-center gap-2">
                {filterMode !== "architecture" ? (
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    aria-label="Filter data"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => centerNode(selectedId)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Center selected"
                >
                  <LocateFixed className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={downloadBoardAsPng}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Download PNG"
                >
                  <Download className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label={isExpanded ? "Collapse chart" : "Expand chart"}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(0.28, +(prev * 0.9).toFixed(2)))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(1.8, +(prev * 1.1).toFixed(2)))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoom(0.36);
                    setPan({ x: 18, y: 12 });
                    setNodePositions(Object.fromEntries(BASE_NODES.map((node) => [node.id, { x: node.x, y: node.y }])));
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Reset view"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div
                ref={boardRef}
                className={[
                  "relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 touch-none overscroll-contain select-none",
                  isExpanded ? "h-[min(84vh,1040px)] min-h-[700px]" : "h-[min(78vh,920px)] min-h-[620px]",
                ].join(" ")}
                onWheel={handleWheel}
                onPointerDown={startPan}
                onPointerMove={onPointerMove}
                onPointerUp={(event) => endInteractions(event)}
                onPointerCancel={(event) => endInteractions(event)}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "touch") {
                    endInteractions(event);
                  }
                }}
              >
                <div className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600">
                  <Move className="h-3.5 w-3.5" />
                  Zoom {Math.round(zoom * 100)}% • {selectedCount} selected rows
                </div>

                {filterMode === "selected" && !selectedCount ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-6 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                        <Filter className="h-5 w-5" />
                      </div>
                      <h3 className="mt-3 text-[14px] font-semibold text-gray-900">No data selected yet</h3>
                      <p className="mt-1 max-w-[360px] text-[13px] leading-6 text-gray-600">
                        Open the filter panel, enable datasets, and select rows to visualize direct correlations by ID.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div
                  className="absolute inset-0 origin-top-left"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    width: BOARD_WIDTH,
                    height: BOARD_HEIGHT,
                    overflow: "visible",
                  }}
                >
                  <svg
                    className="absolute inset-0 h-full w-full"
                    style={{ overflow: "visible" }}
                    viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x={DRAG_MARGIN}
                      y={DRAG_MARGIN}
                      width={BOARD_WIDTH - DRAG_MARGIN * 2}
                      height={BOARD_HEIGHT - DRAG_MARGIN * 2}
                      rx={12}
                      ry={12}
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth={2}
                      strokeDasharray="8 6"
                      vectorEffect="non-scaling-stroke"
                    />

                    <defs>
                      <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="6.5" refY="4.5" orient="auto">
                        <path d="M0,0 L9,4.5 L0,9 Z" className="fill-gray-400" />
                      </marker>
                    </defs>

                    {visibleEdges.map((edge, index) => {
                      const from = visibleNodes.find((node) => node.id === edge.from);
                      const to = visibleNodes.find((node) => node.id === edge.to);
                      if (!from || !to) return null;
                      const highlighted = selectedId === edge.from || selectedId === edge.to;

                      return (
                        <path
                          key={`${edge.from}-${edge.to}-${index}`}
                          d={edgePath(from, to)}
                          markerEnd="url(#arrowhead)"
                          className={[
                            edgeStyles[edge.kind],
                            highlighted ? "opacity-100 stroke-[2.2]" : "opacity-50 stroke-[1.5]",
                          ].join(" ")}
                          strokeDasharray={
                            edge.kind === "feeds" ? "5 4" : edge.kind === "relates" ? "2 5" : undefined
                          }
                        />
                      );
                    })}
                  </svg>

                  {visibleNodes.map((node) => {
                    const isSelected = selectedId === node.id;
                    const dimmed = !relatedIds.has(node.id);

                    return (
                      <button
                        key={node.id}
                        type="button"
                        data-node-card="true"
                        onClick={() => setSelectedId(node.id)}
                        onPointerDown={(event) => {
                          if (event.pointerType === "touch" && activePointersRef.current.size > 1) return;

                          event.preventDefault();

                          const point = toBoardCoordinates(event.clientX, event.clientY);
                          setDraggingNode({
                            id: node.id,
                            offsetX: point.x - node.x,
                            offsetY: point.y - node.y,
                          });
                        }}
                        className={[
                          "absolute w-[240px] rounded-lg border px-3 py-3 text-left transition-all select-none",
                          groupStyles[node.group],
                          isSelected ? "ring-2 ring-gray-900 shadow-sm" : "hover:border-gray-300",
                          dimmed && !isSelected ? "opacity-55" : "opacity-100",
                        ].join(" ")}
                        style={{ left: node.x, top: node.y, touchAction: "none" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700">
                            {iconForNode(node.group)}
                          </span>
                          <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                            {node.architectureLabel || groupLabels[node.group]}
                          </span>
                        </div>
                        <div className="mt-3 text-[13px] font-semibold text-gray-900">{node.short}</div>
                        <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-gray-600">{node.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside className={isExpanded ? "space-y-4 xl:col-span-full" : "space-y-4"}>
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Inspector</div>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-700">
                    {selected ? legendIcon(selected.label) : <Network className="h-4 w-4" />}
                    <span className="text-[12px] font-medium uppercase tracking-wide">
                      {selected?.architectureLabel || (selected ? groupLabels[selected.group] : "Node")}
                    </span>
                  </div>
                  <h2 className="mt-2 text-[16px] font-semibold text-gray-900">
                    {selected?.label || "No node selected"}
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-gray-600">
                    {selected?.description || "Select a node to inspect its connections."}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Incoming connections</div>
                  <div className="mt-3 space-y-2">
                    {incoming.length ? (
                      incoming.map((edge, index) => {
                        const source = visibleNodes.find((node) => node.id === edge.from);
                        if (!source) return null;

                        return (
                          <div key={`${edge.from}-${index}`} className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[13px] font-medium text-gray-900">{source.short}</span>
                              <span className="text-[12px] text-gray-600">{edge.kind}</span>
                            </div>
                            {edge.note ? <div className="mt-1 text-[12px] text-gray-600">{edge.note}</div> : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-4 text-[12px] text-gray-500">
                        No incoming connections in the current filter.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Outgoing connections</div>
                  <div className="mt-3 space-y-2">
                    {outgoing.length ? (
                      outgoing.map((edge, index) => {
                        const target = visibleNodes.find((node) => node.id === edge.to);
                        if (!target) return null;

                        return (
                          <div key={`${edge.to}-${index}`} className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[13px] font-medium text-gray-900">{target.short}</span>
                              <span className="text-[12px] text-gray-600">{edge.kind}</span>
                            </div>
                            {edge.note ? <div className="mt-1 text-[12px] text-gray-600">{edge.note}</div> : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-4 text-[12px] text-gray-500">
                        No outgoing connections in the current filter.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <AccountingSideModal
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Correlation filters"
          subtitle={`${enabledDatasets.length} datasets enabled • ${selectedCount} rows selected`}
          contentClassName="pb-4 md:pb-6"
        >
          <div className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Datasets</div>
              </div>

              <div className="space-y-3 px-4 py-4">
                {DATASET_CONFIGS.map((dataset) => {
                  const active = enabledDatasets.includes(dataset.key);
                  const totalForDataset = rowOptions.filter((row) => row.dataset === dataset.key).length;

                  return (
                    <button
                      key={dataset.key}
                      type="button"
                      onClick={() => toggleDataset(dataset.key)}
                      className={[
                        "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                        active ? "border-gray-900 bg-white" : "border-gray-200 bg-white hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-medium text-gray-900">{dataset.label}</div>
                          <div className="mt-1 text-[12px] leading-5 text-gray-600">{dataset.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] font-medium text-gray-900">{totalForDataset}</div>
                          <div className="text-[10px] uppercase tracking-wide text-gray-500">rows</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="min-h-[520px] overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Row selector</div>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search enabled datasets"
                    className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-[13px] text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>

                {!enabledDatasets.length ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-[13px] text-gray-500">
                    Enable one or more datasets to start selecting rows.
                  </div>
                ) : (
                  <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {visibleRowOptions.length ? (
                      visibleRowOptions.map((row) => {
                        const checked = selectedRows[row.dataset].has(row.id);
                        return (
                          <label
                            key={`${row.dataset}-${row.id}`}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(row.dataset, row.id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300"
                            />
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-gray-900">{row.label}</div>
                              <div className="mt-1 text-[12px] leading-5 text-gray-600">{row.sublabel}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                                {row.dataset}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-[13px] text-gray-500">
                        No rows match the current search.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </AccountingSideModal>

        {snackbar ? (
          <Snackbar
            open={Boolean(snackbar)}
            onClose={() => setSnackbar(null)}
            autoHideDuration={6000}
            message={snackbar.message}
            severity={snackbar.severity}
            anchor={{ vertical: "bottom", horizontal: "center" }}
            pauseOnHover
            showCloseButton
          />
        ) : null}
      </div>
    </main>
  );
}