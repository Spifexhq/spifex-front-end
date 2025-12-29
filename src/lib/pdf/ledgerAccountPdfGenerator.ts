/* -------------------------------------------------------------------------- */
/*  File: src/lib/pdf/ledgerAccountPdfGenerator.ts                           */
/*  Refactor: usa API org-scoped + novo modelo LedgerAccount (id externo string) */
/*            paginação completa, grupos por `category` e subgrupos por       */
/*            `subcategory`, e exibe `default_tx` (crédito/débito).           */
/* -------------------------------------------------------------------------- */

import { jsPDF } from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { api } from "src/api/requests";
import type { GetLedgerAccountsResponse, LedgerAccount } from "src/models/settings/ledgerAccounts";

/* ------------------------------- Types locais ------------------------------ */
interface PDFGeneratorOptions {
  companyName?: string;
  title?: string;
}
interface PDFGeneratorResult {
  success: boolean;
  message: string;
  filename?: string;
}
interface AutoTableData {
  finalY: number;
}

/* -------------------------- Utilidades internas --------------------------- */

function txLabel(tx?: string): "Crédito" | "Débito" | "-" {
  if (!tx) return "-";
  const v = String(tx).toLowerCase();
  return v === "credit" ? "Crédito" : v === "debit" ? "Débito" : "-";
}

// Mapeia category (que pode vir como number, label EN, label PT) -> label PT
const CATEGORY_VALUE_TO_PT: Record<number, string> = {
  1: "Receitas Operacionais",
  2: "Receitas Não Operacionais",
  3: "Despesas Operacionais",
  4: "Despesas Não Operacionais",
};
const CATEGORY_EN_TO_PT: Record<string, string> = {
  "Operational Revenue": "Receitas Operacionais",
  "Non-operational Revenue": "Receitas Não Operacionais",
  "Operational Expense": "Despesas Operacionais",
  "Non-operational Expense": "Despesas Não Operacionais",
};
const CATEGORY_PT_SET = new Set(Object.values(CATEGORY_VALUE_TO_PT));

function normalizeCategory(cat: unknown): string {
  if (typeof cat === "number") {
    return CATEGORY_VALUE_TO_PT[cat] ?? "(Sem categoria)";
  }
  if (typeof cat === "string") {
    // numérico em string
    const n = Number(cat);
    if (!Number.isNaN(n) && CATEGORY_VALUE_TO_PT[n]) {
      return CATEGORY_VALUE_TO_PT[n];
    }
    // já está em PT?
    if (CATEGORY_PT_SET.has(cat)) return cat;
    // label EN -> PT
    if (CATEGORY_EN_TO_PT[cat]) return CATEGORY_EN_TO_PT[cat];
  }
  return "(Sem categoria)";
}

function safeStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function sortByCodeThenName(a: LedgerAccount, b: LedgerAccount) {
  // Ordena por code (string), depois por account
  const ca = safeStr(a.code);
  const cb = safeStr(b.code);
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "pt-BR", { numeric: true });
  return safeStr(a.account).localeCompare(safeStr(b.account), "pt-BR", { numeric: true });
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

  /** Busca todas as contas (paginado) e gera o PDF */
  public async generatePDF(options: PDFGeneratorOptions = {}): Promise<PDFGeneratorResult> {
    const { companyName = "Spifex", title = "Plano de Contas" } = options;

    try {
      const accounts = await this.fetchAllLedgerAccounts();
      if (!accounts.length) {
        return { success: false, message: "Nenhuma conta contábil encontrada." };
      }

      // Cabeçalho
      this.setupDocument(title, companyName);

      // Conteúdo: agrupar por category → subcategory
      let y = 40;
      const categories = this.unique(
        accounts.map((a) => normalizeCategory((a as unknown as { category?: unknown }).category))
      ).sort((a, b) => a.localeCompare(b, "pt-BR"));

      for (const category of categories) {
        const inCat = accounts.filter(
          (a) => normalizeCategory((a as unknown as { category?: unknown }).category) === category
        );
        y = await this.renderCategory(category, inCat, y);
      }

      // Rodapé
      this.addFooter();

      const filename = this.generateFilename();
      this.doc.save(filename);
      return { success: true, message: "PDF gerado com sucesso!", filename };
    } catch (error: unknown) {
      console.error("Erro ao gerar PDF:", error);
      return {
        success: false,
        message: "Erro ao gerar o PDF. Tente novamente.",
      };
    }
  }

  /* --------------------------------- API ---------------------------------- */

  /** Busca todas as páginas de contas contábeis */
  private async fetchAllLedgerAccounts(): Promise<LedgerAccount[]> {
    let cursor: string | undefined;
    const all: LedgerAccount[] = [];

    do {
      const { data } = (await api.getLedgerAccounts({
        cursor,
      })) as { data: GetLedgerAccountsResponse };

      const items = (data?.results ?? []).slice().sort(sortByCodeThenName);
      all.push(...items);
      cursor = (data?.next ?? undefined) || undefined;
    } while (cursor);

    // Ordenação final estável
    return all.sort(sortByCodeThenName);
  }

  /* ------------------------------- Layout PDF ------------------------------ */

  private setupDocument(title: string, companyName: string): void {
    // Empresa
    if (companyName) {
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(companyName, 15, 15);
    }

    // Título
    this.doc.setFontSize(20);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title, this.pageWidth / 2, 20, { align: "center" });

    // Data
    const currentDate = new Date().toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(`Gerado em: ${currentDate}`, this.pageWidth / 2, 28, { align: "center" });

    // Linha
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(15, 32, this.pageWidth - 15, 32);
  }

  private async renderCategory(category: string, accountsInCategory: LedgerAccount[], startY: number) {
    let y = startY;

    // quebra de página se necessário
    if (y > this.pageHeight - 80) {
      this.doc.addPage();
      y = 25;
    }

    // título categoria
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(33, 37, 41);
    this.doc.text(category, 15, y);
    y += 10;

    // subgroups
    const subgroups = this.unique(
      accountsInCategory.map((a) => safeStr(a.subcategory) || "(Sem subgrupo)")
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    for (const sub of subgroups) {
      const inSub = accountsInCategory.filter(
        (a) => (safeStr(a.subcategory) || "(Sem subgrupo)") === sub
      );
      y = await this.renderSubgroup(sub, inSub, y);
    }

    return y + 6;
  }

  private async renderSubgroup(subgroup: string, accounts: LedgerAccount[], startY: number) {
    let y = startY;

    if (y > this.pageHeight - 60) {
      this.doc.addPage();
      y = 25;
    }

    // título subgrupo
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(73, 80, 87);
    this.doc.text(`• ${subgroup}`, 20, y);
    y += 6;

    // tabela
    const body: RowInput[] = accounts.map((a) => [
      safeStr(a.code) || "-", // Código
      safeStr(a.account) || "-", // Conta Contábil
      txLabel((a as unknown as { default_tx?: string }).default_tx), // Tipo padrão
      a.is_active ? "Ativa" : "Inativa",
    ]);

  autoTable(this.doc, {
    startY: y,
    head: [["Código", "Conta Contábil", "Tipo padrão", "Status"]],
    body,
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [33, 37, 41],
      overflow: "linebreak",      // 🔧 quebra texto dentro da célula
    },
    headStyles: {
      fillColor: [52, 144, 220],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },

    // 🔧 margens mais simétricas e dentro do A4
    margin: { left: 15, right: 15 },

    // 🔧 define apenas larguras pequenas; o nome fica "auto" (ajuste dinâmico)
    columnStyles: {
      0: { cellWidth: 24 },                 // Código
      2: { cellWidth: 26, halign: "center" }, // Tipo padrão
      3: { cellWidth: 24, halign: "center" }, // Status
      // 1 (Conta Contábil) sem largura fixa → AutoTable ajusta e quebra linha
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
      this.doc.text(`Página ${i} de ${totalPages}`, this.pageWidth / 2, this.pageHeight - 10, {
        align: "center",
      });

      this.doc.setDrawColor(220, 220, 220);
      this.doc.line(15, this.pageHeight - 15, this.pageWidth - 15, this.pageHeight - 15);
    }
  }

  private unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }

  private generateFilename(): string {
    const now = new Date();
    const d = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const t = now.toTimeString().slice(0, 8).replace(/:/g, "-"); // HH-MM-SS
    return `plano-de-contas-${d}-${t}.pdf`;
  }
}

/* -------------------------- Função utilitária ---------------------------- */

export const generateLedgerAccountsPDF = async (
  options?: PDFGeneratorOptions
): Promise<PDFGeneratorResult> => {
  const generator = new LedgerAccountPdfGenerator();
  return generator.generatePDF(options || {});
};

export default LedgerAccountPdfGenerator;
