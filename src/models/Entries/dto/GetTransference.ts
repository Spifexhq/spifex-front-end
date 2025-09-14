// models/entries/dto/GetTransference.ts
export interface TransferencePayloadBase {
  date: string;            // "YYYY-MM-DD" (antes: due_date)
  amount: string;          // "1234.56"
  source_bank: string;     // external_id do banco origem (antes: bank_out_id:number)
  dest_bank: string;       // external_id do banco destino (antes: bank_in_id:number)
  description?: string;    // (antes: observation)
}

export type AddTransferenceRequest = TransferencePayloadBase;
export type EditTransferenceRequest = Partial<TransferencePayloadBase>;
