export type SettledEntryPayloadBase = {
  settlement_due_date: string;
  bank_id: number;
  is_partial: boolean;
  partial_amount?: string;
};

export type EditSettledEntryPayload = SettledEntryPayloadBase;
