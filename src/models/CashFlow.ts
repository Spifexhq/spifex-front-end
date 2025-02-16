export interface Enterprise {
    id: number;
    // Outros campos da Enterprise, se houver...
  }
  
  /* ========================
     MODELOS DO FINANCECONFIG
     ======================== */
  
  /**
   * Conta contábil (General Ledger Account)
   */
  export interface GeneralLedgerAccount {
    id?: number;
    general_ledger_account: string;
    group: string;
    subgroup: string;
    transaction_type: string;
    uuid_general_ledger_account?: string | null;
    enterprise: Enterprise;
  }
  
  /**
   * Tipo de Documento
   */
  export interface DocumentType {
    id?: number;
    document_type?: string | null;
    uuid_document_type?: string | null;
  }
  
  /**
   * Departamento
   */
  export interface Department {
    id?: number;
    department?: string | null;
    uuid_department?: string | null;
    enterprise: Enterprise;
  }
  
  /**
   * Projeto
   */
  export interface Project {
    id?: number;
    project?: string | null;
    project_code: string;
    project_type: string;
    project_description: string;
    uuid_project?: string | null;
    enterprise: Enterprise;
  }
  
  /**
   * Item de Inventário
   */
  export interface Inventory {
    id?: number;
    inventory_item_code?: string | null;
    inventory_item?: string | null;
    inventory_item_quantity?: number | null;
    uuid_inventory_item?: string | null;
    enterprise: Enterprise;
  }
  
  /**
   * Entidade (Pessoa física ou jurídica)
   */
  export interface Entity {
    id?: number;
    full_name?: string | null;
    ssn_tax_id?: string | null;
    ein_tax_id?: string | null;
    alias_name?: string | null;
    area_code?: string | null;
    phone_number?: string | null;
    street?: string | null;
    street_number?: string | null;
    state?: string | null;
    city?: string | null;
    postal_code?: string | null;
    email?: string | null;
    bank_name?: string | null;
    bank_branch?: string | null;
    checking_account?: string | null;
    account_holder_tax_id?: string | null;
    account_holder_name?: string | null;
    entity_type?: string | null;
    uuid_entity?: string | null;
    enterprise: Enterprise;
  }
  
  /**
   * Banco
   */
  export interface Bank {
    id?: number;
    bank_institution: string;
    bank_account_type: string;
    bank_branch?: string | null;
    bank_account?: string | null;
    initial_balance: number;
    current_balance: number;
    consolidated_balance: number;
    bank_status: boolean;
    enterprise: Enterprise;
  }
  
  /* =======================
     MODELOS DO CASHFLOW
     ======================= */
  
  /**
   * Lançamento de Fluxo de Caixa
   */
  export interface CashFlowEntry {
    id?: number;
    due_date: string; // Formato ISO: "YYYY-MM-DD"
    description: string;
    observation?: string | null;
    amount: number; // Valor decimal
    current_installment?: number | null;
    total_installments?: number | null;
    tags?: string | null;
    transaction_type: string;
    notes?: string | null;
    periods?: string | null;
    weekend_action?: string | null;
    creation_date: string; // Data e hora no formato ISO: "YYYY-MM-DDTHH:mm:ssZ"
    installments_correlation_id?: string | null;
    partial_settlement_correlation_id?: string | null;
    transference_correlation_id?: string | null;
    settlement_state: boolean;
    settlement_due_date?: string | null; // "YYYY-MM-DD"
    settlement_date?: string | null; // "YYYY-MM-DDTHH:mm:ssZ"
    general_ledger_account?: GeneralLedgerAccount | null;
    document_type?: DocumentType | null;
    project?: Project | null;
    entity?: Entity | null;
    bank?: Bank | null;
    enterprise: Enterprise;
    // Relações reversas (opcionais)
    department_allocations?: DepartmentAllocation[];
    inventory_allocations?: InventoryAllocation[];
  }
  
  /**
   * Alocação de Departamento para um lançamento de fluxo de caixa
   */
  export interface DepartmentAllocation {
    id?: number;
    // Referência ao lançamento
    cash_flow_entry: CashFlowEntry;
    department: Department;
    percentage: number; // Ex: 50.00 representa 50%
  }
  
  /**
   * Alocação de Inventário para um lançamento de fluxo de caixa
   */
  export interface InventoryAllocation {
    id?: number;
    // Referência ao lançamento
    cash_flow_entry: CashFlowEntry;
    inventory_item: Inventory;
    inventory_item_quantity?: number | null;
    /**
     * As propriedades abaixo são derivadas do CashFlowEntry associado.
     * Caso seja necessário, podem ser implementadas como funções utilitárias.
     */
    settlement_state?: boolean;
    partial_settlement_correlation_id?: string | null;
  }
  