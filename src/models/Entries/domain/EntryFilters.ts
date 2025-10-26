export type EntryFilters = {
    start_date?: string;
    end_date?: string;
    description?: string;
    observation?: string;
    gla_id?: string[];
    bank_id?: string[];
    tx_type?: "credit" | "debit";
    amount_min?: number;
    amount_max?: number;
    settlement_status?: boolean;
  };
