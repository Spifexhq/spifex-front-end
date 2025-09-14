// models/entries/domain/Transference.ts
export interface Transference {
  date: string;
  amount: string;
  source_bank: string;
  dest_bank: string;
  description?: string;
  // id?: string; created_at?: string; updated_at?: string; // opcional, se o backend retornar
}
