/* -------------------------------------------------------------------------- */
/*  File: src/lib/pdf/ledgerAccountPdfGenerator.ts                            */
/* -------------------------------------------------------------------------- */

import { jsPDF } from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import i18next from "i18next";

import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";

import type {
  LedgerAccount,
  LedgerAccountType,
  LedgerNormalBalance,
  LedgerStatementSection,
} from "@/models/settings/ledgerAccounts";

/* --------------------------------- Types --------------------------------- */

interface PDFGeneratorOptions {
  companyName?: string;
  title?: string;
  activeOnly?: boolean;
}

interface PDFGeneratorResult {
  success: boolean;
  message: string;
  filename?: string;
}

interface AutoTableData {
  finalY: number;
}

/* -------------------------------- Constants ------------------------------- */

const NS = "ledgerAccountsSettings";

const STATEMENT_SECTION_ORDER: LedgerStatementSection[] = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
  "off_balance",
  "statistical",
];

/* ------------------------------- i18n helpers ------------------------------ */

function t(key: string, opts?: Record<string, unknown>): string {
  const fullKey = `${NS}:${key}`;
  const out = i18next?.t ? i18next.t(fullKey, opts) : fullKey;
  return typeof out === "string" ? out : String(out ?? "");
}

function getLocale(): string {
  const lng = (i18next?.language || "en").trim();
  if (lng === "pt") return "pt-BR";
  if (lng === "de") return "de-DE";
  if (lng === "fr") return "fr-FR";
  return lng;
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

/* ------------------------------- Formatting ------------------------------- */

function sectionLabel(section: LedgerStatementSection): string {
  const labels: Record<LedgerStatementSection, string> = {
    asset: t("pdf.statementSection.asset") || "Assets",
    liability: t("pdf.statementSection.liability") || "Liabilities",
    equity: t("pdf.statementSection.equity") || "Equity",
    income: t("pdf.statementSection.income") || "Income",
    expense: t("pdf.statementSection.expense") || "Expenses",
    off_balance: t("pdf.statementSection.off_balance") || "Off-balance",
    statistical: t("pdf.statementSection.statistical") || "Statistical",
  };

  return labels[section] || section;
}

function accountTypeLabel(type: LedgerAccountType): string {
  if (type === "header") return t("pdf.accountType.header") || "Header";
  return t("pdf.accountType.posting") || "Posting";
}

function normalBalanceLabel(balance: LedgerNormalBalance): string {
  if (balance === "debit") return t("pdf.normalBalance.debit") || "Debit";
  return t("pdf.normalBalance.credit") || "Credit";
}

function statusLabel(isActive: boolean): string {
  return isActive ? t("pdf.status.active") || "Active" : t("pdf.status.inactive") || "Inactive";
}

function boolLabel(v: boolean): string {
  return v ? t("pdf.boolean.yes") || "Yes" : t("pdf.boolean.no") || "No";
}

function indentName(account: LedgerAccount): string {
  const depth = Math.max(0, Number(account.depth || 0));
  const prefix = depth > 0 ? `${"  ".repeat(depth)}↳ ` : "";
  return `${prefix}${safeStr(account.name) || "-"}`;
}

function sortByHierarchy(a: LedgerAccount, b: LedgerAccount) {
  const c = collator();

  const pa = safeStr(a.path);
  const pb = safeStr(b.path);
  if (pa && pb && pa !== pb) return c.compare(pa, pb);
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;

  const ca = safeStr(a.code);
  const cb = safeStr(b.code);
  if (ca && cb && ca !== cb) return c.compare(ca, cb);
  if (ca && !cb) return -1;
  if (!ca && cb) return 1;

  return c.compare(safeStr(a.name), safeStr(b.name));
}

function groupAccountsBySection(accounts: LedgerAccount[]) {
  const grouped = new Map<LedgerStatementSection, LedgerAccount[]>();

  for (const section of STATEMENT_SECTION_ORDER) {
    grouped.set(section, []);
  }

  for (const account of accounts) {
    const section = account.statement_section;
    if (!grouped.has(section)) grouped.set(section, []);
    grouped.get(section)!.push(account);
  }

  return grouped;
}

/* -------------------------- PDF Generator Class --------------------------- */

export class LedgerAccountPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  public async generatePDF(options: PDFGeneratorOptions = {}): Promise<PDFGeneratorResult> {
    const companyName = options.companyName || t("pdf.company") || "Spifex";
    const title = options.title || t("pdf.title") || "Ledger Accounts";

    try {
      const accounts = await this.fetchAllLedgerAccounts(options.activeOnly ?? false);

      if (!accounts.length) {
        return {
          success: false,
          message: t("pdf.messages.empty") || "No ledger accounts found.",
        };
      }

      this.setupDocument(title, companyName);

      let y = 34;
      const grouped = groupAccountsBySection(accounts);

      for (const section of STATEMENT_SECTION_ORDER) {
        const sectionAccounts = (grouped.get(section) || []).slice().sort(sortByHierarchy);
        if (!sectionAccounts.length) continue;
        y = this.renderSection(section, sectionAccounts, y);
      }

      this.addFooter();

      const filename = this.generateFilename();
      this.doc.save(filename);

      return {
        success: true,
        message: t("pdf.messages.ok") || "PDF generated successfully!",
        filename,
      };
    } catch (error: unknown) {
      console.error("Error generating ledger accounts PDF:", error);
      return {
        success: false,
        message: t("pdf.messages.error") || "Error generating the PDF. Please try again.",
      };
    }
  }

  /* ---------------------------------- API ---------------------------------- */

  private async fetchAllLedgerAccounts(activeOnly: boolean): Promise<LedgerAccount[]> {
    const all = await fetchAllCursor<LedgerAccount>((params) =>
      api.getLedgerAccounts({
        ...params,
        ...(activeOnly ? { active: "true" } : {}),
      })
    );

    return all.slice().sort(sortByHierarchy);
  }

  /* ------------------------------- PDF layout ------------------------------ */

  private setupDocument(title: string, companyName: string): void {
    if (companyName) {
      this.doc.setFontSize(11);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(companyName, 14, 12);
    }

    this.doc.setFontSize(18);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title, this.pageWidth / 2, 14, { align: "center" });

    const dateStr = new Date().toLocaleString(getLocale(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(
      t("pdf.generatedAt", { date: dateStr }) || `Generated at: ${dateStr}`,
      this.pageWidth / 2,
      21,
      { align: "center" }
    );

    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(14, 25, this.pageWidth - 14, 25);
  }

  private renderSection(
    section: LedgerStatementSection,
    accounts: LedgerAccount[],
    startY: number
  ) {
    let y = startY;

    if (y > this.pageHeight - 50) {
      this.doc.addPage();
      y = 20;
    }

    this.doc.setFontSize(13);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(sectionLabel(section), 14, y);
    y += 6;

    const body: RowInput[] = accounts.map((account) => [
      safeStr(account.code) || "-",
      indentName(account),
      accountTypeLabel(account.account_type),
      normalBalanceLabel(account.normal_balance),
      toNonEmpty(account.report_group) || "—",
      toNonEmpty(account.report_subgroup) || "—",
      boolLabel(account.is_bank_control),
      boolLabel(account.allows_manual_posting),
      statusLabel(account.is_active),
    ]);

    autoTable(this.doc, {
      startY: y,
      head: [[
        t("pdf.table.code") || "Code",
        t("pdf.table.name") || "Name",
        t("pdf.table.accountType") || "Type",
        t("pdf.table.normalBalance") || "Normal balance",
        t("pdf.table.reportGroup") || "Report group",
        t("pdf.table.reportSubgroup") || "Report subgroup",
        t("pdf.table.bankControl") || "Bank control",
        t("pdf.table.manualPosting") || "Manual posting",
        t("pdf.table.status") || "Status",
      ]],
      body,
      theme: "striped",
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [33, 37, 41],
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [52, 144, 220],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 58 },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 33 },
        5: { cellWidth: 33 },
        6: { cellWidth: 21, halign: "center" },
        7: { cellWidth: 25, halign: "center" },
        8: { cellWidth: 18, halign: "center" },
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

      const footer =
        t("pdf.footer.page", { current: i, total: totalPages }) ||
        `Page ${i} of ${totalPages}`;

      this.doc.text(footer, this.pageWidth / 2, this.pageHeight - 8, {
        align: "center",
      });

      this.doc.setDrawColor(220, 220, 220);
      this.doc.line(14, this.pageHeight - 12, this.pageWidth - 14, this.pageHeight - 12);
    }
  }

  private generateFilename(): string {
    const prefix = (t("pdf.filenamePrefix") || "ledger-accounts")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_.]/gi, "");

    const now = new Date();
    const d = now.toISOString().slice(0, 10);
    const tm = now.toTimeString().slice(0, 8).replace(/:/g, "-");
    return `${prefix}-${d}-${tm}.pdf`;
  }
}

/* -------------------------- Convenience function -------------------------- */

export const generateLedgerAccountsPDF = async (
  options?: PDFGeneratorOptions
): Promise<PDFGeneratorResult> => {
  const generator = new LedgerAccountPdfGenerator();
  return generator.generatePDF(options || {});
};

export default LedgerAccountPdfGenerator;