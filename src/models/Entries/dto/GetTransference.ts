// Payload
export interface TransferencePayloadBase {
  due_date: string;
  amount: string;
  bank_out_id: number;
  bank_in_id: number;
  observation?: string;
};

export type AddTransferenceRequest = TransferencePayloadBase;

export type EditTransferenceRequest = Partial<TransferencePayloadBase>;
