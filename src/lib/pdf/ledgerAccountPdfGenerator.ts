/* -------------------------------------------------------------------------- */
/*  File: src/lib/pdf/ledgerAccountPdfGenerator.ts
/* -------------------------------------------------------------------------- */

import { jsPDF } from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import i18next from "i18next";

import { api } from "src/api/requests";
import { fetchAllCursor } from "src/lib/list";

import type { LedgerAccount } from "src/models/settings/ledgerAccounts";

/* --------------------------------- Types --------------------------------- */
interface PDFGeneratorOptions {
  companyName?: string; // already translated by caller (recommended) or fallback via i18n
  title?: string; // already translated by caller (recommended) or fallback via i18n
}
interface PDFGeneratorResult {
  success: boolean;
  message: string;
  filename?: string;
}
interface AutoTableData {
  finalY: number;
}

type TxType = "debit" | "credit";
type CategoryKey =
  | "operationalRevenue"
  | "nonOperationalRevenue"
  | "operationalExpense"
  | "nonOperationalExpense";
type CategoryValue = 1 | 2 | 3 | 4;

/* ---------------------------- Shared mappings ---------------------------- */

const CATEGORY_VALUE_TO_KEY: Record<CategoryValue, CategoryKey> = {
  1: "operationalRevenue",
  2: "nonOperationalRevenue",
  3: "operationalExpense",
  4: "nonOperationalExpense",
};

const CATEGORY_DEFAULT_TX: Record<CategoryValue, TxType> = {
  1: "credit",
  2: "credit",
  3: "debit",
  4: "debit",
};

/** Tolerant read type (matches LedgerAccountSettings behavior) */
type GLX = LedgerAccount & {
  category?: number | string | null;
  default_tx?: TxType | string | null;
  external_id?: string;
};

/* ------------------------------- i18n helpers ------------------------------ */

const NS = "ledgerAccountsSettings";

function t(key: string, opts?: Record<string, unknown>): string {
  // Prefer explicit namespaced keys so this works outside React hooks.
  // Example: t("pdf.title") => i18next.t("ledgerAccountsSettings:pdf.title")
  const fullKey = `${NS}:${key}`;
  const out = i18next?.t ? i18next.t(fullKey, opts) : fullKey;
  return typeof out === "string" ? out : String(out ?? "");
}

function getLocale(): string {
  const lng = (i18next?.language || "en").trim();
  // common normalization: "pt" -> "pt-BR" (optional), keep region if present
  if (lng === "pt") return "pt-BR";
  if (lng === "de") return "de-DE";
  if (lng === "fr") return "fr-FR";
  return lng; // "en", "en-US", etc.
}

function collator() {
  return new Intl.Collator(getLocale(), { numeric: true, sensitivity: "base" });
}

function safeStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function toNonEmpty(v: unknown): string | null {
  const s = safeStr(v).trim();
  return s ? s : null;
}

/* ----------------------- LedgerAccountSettings-aligned ---------------------- */

function getCategoryValue(acc: GLX): CategoryValue | undefined {
  const c = acc.category;
  if (typeof c === "number" && [1, 2, 3, 4].includes(c)) return c as CategoryValue;
  if (typeof c === "string" && c) {
    const n = Number(c);
    if ([1, 2, 3, 4].includes(n)) return n as CategoryValue;
  }
  return undefined;
}

function getCategoryKeyFromAccount(acc: GLX): CategoryKey | undefined {
  const v = getCategoryValue(acc);
  return v ? CATEGORY_VALUE_TO_KEY[v] : undefined;
}

function getDefaultTx(acc: GLX): TxType | "" {
  const dt = acc.default_tx;
  if (dt === "credit" || dt === "debit") return dt;
  const v = getCategoryValue(acc);
  return v ? CATEGORY_DEFAULT_TX[v] : "";
}

function resolveCategoryLabel(acc: GLX): string {
  const key = getCategoryKeyFromAccount(acc);
  if (key) {
    const label = t(`categories.${key}`);
    return label || key;
  }
  return t("pdf.placeholders.noCategory") || "(No category)";
}

function resolveSubgroupLabel(acc: GLX): string {
  return toNonEmpty(acc.subcategory) ?? (t("pdf.placeholders.noSubgroup") || "(No subgroup)");
}

function txLabel(tx: TxType | "" | undefined): string {
  if (tx === "credit") return t("pdf.tx.credit") || "Credit";
  if (tx === "debit") return t("pdf.tx.debit") || "Debit";
  return t("pdf.tx.none") || "-";
}

function statusLabel(isActive?: boolean): string {
  return isActive === false ? (t("pdf.status.inactive") || "Inactive") : (t("pdf.status.active") || "Active");
}

function sortByCodeThenName(a: LedgerAccount, b: LedgerAccount) {
  const c = collator();
  const ca = safeStr(a.code);
  const cb = safeStr(b.code);

  if (ca && cb && ca !== cb) return c.compare(ca, cb);
  if (ca && !cb) return -1;
  if (!ca && cb) return 1;

  return c.compare(safeStr(a.account), safeStr(b.account));
}

/* -------------------------- PDF Generator Class --------------------------- */

export class LedgerAccountPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  public async generatePDF(options: PDFGeneratorOptions = {}): Promise<PDFGeneratorResult> {
    const companyName = options.companyName || t("pdf.company") || "Spifex";
    const title = options.title || t("pdf.title") || "Chart of Accounts";

    try {
      const accounts = await this.fetchAllLedgerAccounts();
      if (!accounts.length) {
        return { success: false, message: t("pdf.messages.empty") || "No ledger accounts found." };
      }

      this.setupDocument(title, companyName);

      // Group by translated category label, then subgroup label
      let y = 40;

      const accX = accounts.map((a) => a as GLX);

      const categoryLabels = this.unique(accX.map(resolveCategoryLabel)).sort((a, b) => collator().compare(a, b));

      for (const categoryLabel of categoryLabels) {
        const inCategory = accX.filter((a) => resolveCategoryLabel(a) === categoryLabel);
        y = this.renderCategory(categoryLabel, inCategory, y);
      }

      this.addFooter();

      const filename = this.generateFilename();
      this.doc.save(filename);

      return { success: true, message: t("pdf.messages.ok") || "PDF generated successfully!", filename };
    } catch (error: unknown) {
      // Keep logs English-only
      console.error("Error generating ledger accounts PDF:", error);
      return {
        success: false,
        message: t("pdf.messages.error") || "Error generating the PDF. Please try again.",
      };
    }
  }

  /* ---------------------------------- API ---------------------------------- */

  private async fetchAllLedgerAccounts(): Promise<LedgerAccount[]> {
    const all = await fetchAllCursor<LedgerAccount>(api.getLedgerAccounts);
    return all.slice().sort(sortByCodeThenName);
  }

  /* ------------------------------- PDF layout ------------------------------ */

  private setupDocument(title: string, companyName: string): void {
    // Company
    if (companyName) {
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(companyName, 15, 15);
    }

    // Title
    this.doc.setFontSize(20);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title, this.pageWidth / 2, 20, { align: "center" });

    // Generated at
    const dateStr = new Date().toLocaleString(getLocale(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(t("pdf.generatedAt", { date: dateStr }) || `Generated at: ${dateStr}`, this.pageWidth / 2, 28, {
      align: "center",
    });

    // Separator line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(15, 32, this.pageWidth - 15, 32);
  }

  private renderCategory(categoryLabel: string, accountsInCategory: GLX[], startY: number) {
    let y = startY;

    if (y > this.pageHeight - 80) {
      this.doc.addPage();
      y = 25;
    }

    // Category title
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(categoryLabel, 15, y);
    y += 10;

    // Subgroups
    const subgroupLabels = this.unique(accountsInCategory.map(resolveSubgroupLabel)).sort((a, b) =>
      collator().compare(a, b)
    );

    for (const subgroupLabel of subgroupLabels) {
      const inSub = accountsInCategory
        .filter((a) => resolveSubgroupLabel(a) === subgroupLabel)
        .slice()
        .sort(sortByCodeThenName);

      y = this.renderSubgroup(subgroupLabel, inSub, y);
    }

    return y + 6;
  }

  private renderSubgroup(subgroupLabel: string, accounts: GLX[], startY: number) {
    let y = startY;

    if (y > this.pageHeight - 60) {
      this.doc.addPage();
      y = 25;
    }

    // Subgroup title
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(73, 80, 87);
    this.doc.text(`• ${subgroupLabel}`, 20, y);
    y += 6;

    const body: RowInput[] = accounts.map((a) => {
      const tx = getDefaultTx(a);
      return [
        safeStr(a.code) || "-", // Code
        safeStr(a.account) || "-", // Ledger account
        txLabel(tx), // Default type
        statusLabel(a.is_active), // Status
      ];
    });

    autoTable(this.doc, {
      startY: y,
      head: [[t("pdf.table.code") || "Code", t("pdf.table.account") || "Ledger account", t("pdf.table.defaultType") || "Default type", t("pdf.table.status") || "Status"]],
      body,
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [33, 37, 41],
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [52, 144, 220],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 24 }, // Code
        2: { cellWidth: 26, halign: "center" }, // Default type
        3: { cellWidth: 24, halign: "center" }, // Status
        // Column 1 auto width, linebreak enabled
      },
    });

    const atData = (this.doc as jsPDF & { lastAutoTable: AutoTableData }).lastAutoTable;
    return atData.finalY + 8;
  }

  private addFooter(): void {
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(108, 117, 125);

      const footer = t("pdf.footer.page", { current: i, total: totalPages }) || `Page ${i} of ${totalPages}`;
      this.doc.text(footer, this.pageWidth / 2, this.pageHeight - 10, { align: "center" });

      this.doc.setDrawColor(220, 220, 220);
      this.doc.line(15, this.pageHeight - 15, this.pageWidth - 15, this.pageHeight - 15);
    }
  }

  private unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }

  private generateFilename(): string {
    const prefix = (t("pdf.filenamePrefix") || "chart-of-accounts")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_.]/gi, "");

    const now = new Date();
    const d = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const tm = now.toTimeString().slice(0, 8).replace(/:/g, "-"); // HH-MM-SS
    return `${prefix}-${d}-${tm}.pdf`;
  }
}

/* -------------------------- Convenience function -------------------------- */

export const generateLedgerAccountsPDF = async (options?: PDFGeneratorOptions): Promise<PDFGeneratorResult> => {
  const generator = new LedgerAccountPdfGenerator();
  return generator.generatePDF(options || {});
};

export default LedgerAccountPdfGenerator;
