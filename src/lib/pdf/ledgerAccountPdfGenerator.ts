/* -------------------------------------------------------------------------- */
/*  File: src/lib/pdf/ledgerAccountPdfGenerator.ts                           */
/* -------------------------------------------------------------------------- */

import { jsPDF } from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { api } from 'src/api/requests';
import { LedgerAccount, GetLedgerAccounts } from 'src/models/enterprise_structure';

// Types específicos do PDF (se necessário diferentes do domínio)
interface PDFGeneratorOptions {
  companyName?: string;
  title?: string;
}

interface PDFGeneratorResult {
  success: boolean;
  message: string;
  filename?: string;
}

// Tipo para o autoTable
interface AutoTableData {
  finalY: number;
}

/* -------------------------- PDF Generator Class --------------------------- */
export class LedgerAccountPdfGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Busca as contas via API e gera o PDF
   */
  public async generatePDF(options: PDFGeneratorOptions = {}): Promise<PDFGeneratorResult> {
    try {
      const { companyName = 'Spifex', title = 'Lista de Contas Contábeis' } = options;

      // Buscar contas via API
      const accounts = await this.fetchLedgerAccounts();

      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          message: 'Nenhuma conta contábil encontrada para gerar o PDF.'
        };
      }

      // Configurar documento
      this.setupDocument(title, companyName);

      // Gerar conteúdo
      let yPosition = 40;
      const groups = this.getUniqueGroups(accounts);

      for (const group of groups) {
        yPosition = await this.renderGroup(accounts, group, yPosition);
      }

      // Adicionar rodapé
      this.addFooter();

      // Baixar arquivo
      const filename = this.generateFilename();
      this.doc.save(filename);

      return {
        success: true,
        message: 'PDF gerado com sucesso!',
        filename
      };

    } catch (error: unknown) {
      console.error('Erro ao gerar PDF:', error);
      
      // Type guard para verificar se é um erro com código
      if (this.isApiError(error)) {
        if (error.code === 'NOT_FOUND_GENERAL_LEDGER_ACCOUNT' || error.code === 'NOT_FOUND') {
          return {
            success: false,
            message: 'Nenhuma conta contábil cadastrada no sistema.'
          };
        }
      }
      
      // Type guard para verificar se é um erro com mensagem
      if (this.isErrorWithMessage(error)) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          return {
            success: false,
            message: 'Erro de conexão. Verifique sua internet e tente novamente.'
          };
        }
      }

      return {
        success: false,
        message: 'Erro interno ao gerar o PDF. Tente novamente.'
      };
    }
  }

  /**
   * Type guards para tratamento de erros
   */
  private isApiError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
  }

  private isErrorWithMessage(error: unknown): error is { message: string } {
    return typeof error === 'object' && error !== null && 'message' in error &&
           typeof (error as { message: unknown }).message === 'string';
  }

  /**
   * Busca as contas contábeis via API
   */
  private async fetchLedgerAccounts(): Promise<LedgerAccount[]> {
    const response = await api.getAllLedgerAccounts() as { data: GetLedgerAccounts };
    const accounts = response.data.general_ledger_accounts;
    
    // Ordenar por ID para consistência
    return accounts.sort((a: LedgerAccount, b: LedgerAccount) => a.id - b.id);
  }

  /**
   * Configura o cabeçalho do documento
   */
  private setupDocument(title: string, companyName: string): void {
    // Logo/Nome da empresa (opcional)
    if (companyName) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(companyName, 15, 15);
    }

    // Título principal
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, 20, { align: 'center' });

    // Data de geração
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Gerado em: ${currentDate}`, this.pageWidth / 2, 28, { align: 'center' });

    // Linha separadora
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(15, 32, this.pageWidth - 15, 32);
  }

  /**
   * Renderiza um grupo de contas
   */
  private async renderGroup(
    accounts: LedgerAccount[], 
    group: string, 
    startY: number
  ): Promise<number> {
    let yPosition = startY;

    // Verificar espaço na página
    if (yPosition > this.pageHeight - 80) {
      this.doc.addPage();
      yPosition = 25;
    }

    // Título do grupo
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(33, 37, 41); // Cor escura
    this.doc.text(group, 15, yPosition);
    yPosition += 12;

    // Processar subgrupos
    const accountsInGroup = accounts.filter(a => a.group === group);
    const subgroups = this.getUniqueSubgroups(accountsInGroup);

    for (const subgroup of subgroups) {
      yPosition = await this.renderSubgroup(accountsInGroup, subgroup, yPosition);
    }

    return yPosition + 8; // Espaço entre grupos
  }

  /**
   * Renderiza um subgrupo de contas
   */
  private async renderSubgroup(
    accounts: LedgerAccount[], 
    subgroup: string, 
    startY: number
  ): Promise<number> {
    let yPosition = startY;

    // Verificar espaço na página
    if (yPosition > this.pageHeight - 50) {
      this.doc.addPage();
      yPosition = 25;
    }

    // Título do subgrupo
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(73, 80, 87); // Cor média
    this.doc.text(`• ${subgroup}`, 20, yPosition);
    yPosition += 8;

    // Preparar dados da tabela
    const subgroupAccounts = accounts.filter(a => a.subgroup === subgroup);
    const tableData: RowInput[] = subgroupAccounts.map(account => [
      account.general_ledger_account,
      account.transaction_type === 'credit' ? 'Crédito' : 'Débito'
    ]);

    // Configurar tabela
    const tableOptions = {
      startY: yPosition,
      head: [['Conta Contábil', 'Tipo de Transação']],
      body: tableData,
      theme: 'striped' as const,
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [33, 37, 41] as [number, number, number],
      },
      headStyles: {
        fillColor: [52, 144, 220] as [number, number, number], // Azul profissional
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold' as const,
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250] as [number, number, number] // Cinza muito claro
      },
      margin: { left: 25, right: 15 },
      columnStyles: {
        0: { cellWidth: 130 }, // Conta contábil mais larga
        1: { cellWidth: 35, halign: 'center' as const } // Tipo centralizado
      }
    };

    // Gerar tabela
    autoTable(this.doc, tableOptions);

    // Retornar nova posição Y
    const autoTableData = (this.doc as jsPDF & { lastAutoTable: AutoTableData }).lastAutoTable;
    return autoTableData.finalY + 10;
  }

  /**
   * Adiciona rodapé a todas as páginas
   */
  private addFooter(): void {
    const totalPages = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      
      // Numeração de páginas
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(108, 117, 125); // Cinza médio
      this.doc.text(
        `Página ${i} de ${totalPages}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );

      // Linha no rodapé (opcional)
      this.doc.setDrawColor(220, 220, 220);
      this.doc.line(15, this.pageHeight - 15, this.pageWidth - 15, this.pageHeight - 15);
    }
  }

  /**
   * Extrai grupos únicos das contas
   */
  private getUniqueGroups(accounts: LedgerAccount[]): string[] {
    return Array.from(new Set(accounts.map(a => a.group))).sort();
  }

  /**
   * Extrai subgrupos únicos de um conjunto de contas
   */
  private getUniqueSubgroups(accounts: LedgerAccount[]): string[] {
    return Array.from(new Set(accounts.map(a => a.subgroup))).sort();
  }

  /**
   * Gera nome do arquivo com timestamp
   */
  private generateFilename(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `contas-contabeis-${dateStr}-${timeStr}.pdf`;
  }
}

/* -------------------------- Função utilitária ---------------------------- */

/**
 * Função de conveniência para gerar PDF rapidamente
 */
export const generateLedgerAccountsPDF = async (
  options?: PDFGeneratorOptions
): Promise<PDFGeneratorResult> => {
  const generator = new LedgerAccountPdfGenerator();
  return generator.generatePDF(options || {});
};

/* ----------------------------- Export padrão ----------------------------- */
export default LedgerAccountPdfGenerator;