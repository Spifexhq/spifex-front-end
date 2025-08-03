export interface TransferencePayloadBase {
  due_date: string;
  amount: string;
  bank_out_id: number;
  bank_in_id: number;
  observation?: string;
};

export type AddTransferencePayload = TransferencePayloadBase;

export type EditTransferencePayload = Partial<TransferencePayloadBase>;
