// src/models/entries/transferences.ts

export interface TransferencePayloadBase {
  date: string;        // YYYY-MM-DD
  amount: string;      // "1234.56"
  source_bank: string; // BankAccount external_id
  dest_bank: string;   // BankAccount external_id
  description?: string;
}

export type AddTransferenceRequest = TransferencePayloadBase;
export type EditTransferenceRequest = Partial<TransferencePayloadBase>;

export interface Transference {
  date: string;
  amount: string;
  source_bank: string;
  dest_bank: string;
  description?: string;

  // Optional if backend returns them
  id?: string;
  created_at?: string;
  updated_at?: string;
}
