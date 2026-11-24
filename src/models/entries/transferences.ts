// src/models/entries/transferences.ts

export interface TransferencePayloadBase {
  date: string;        // YYYY-MM-DD
  amount: string;      // "1234.56"
  source_bank: string; // BankAccount external_id
  dest_bank: string;   // BankAccount external_id
  description?: string;
  destination_amount?: string;
  exchange_rate?: string;
  fee?: string;
  fee_category?: string;
}

export type AddTransferenceRequest = TransferencePayloadBase;
export type EditTransferenceRequest = Partial<TransferencePayloadBase>;

export interface Transference {
  date: string;
  amount: string;
  source_bank: string;
  dest_bank: string;
  description?: string;
  source_currency?: string;
  dest_currency?: string;
  destination_amount?: string;
  exchange_rate?: string;
  rate_date?: string | null;
  rate_source?: string;
  base_currency?: string;
  fx_gain_loss_minor?: number | null;
  fee_minor?: number;
  fee_currency?: string;
  fee_amount?: string;

  // Optional if backend returns them
  id?: string;
  created_at?: string;
  updated_at?: string;
}
