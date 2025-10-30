// models/enterprise_structure/dto/GetBanks.ts
import { BankAccount } from "../domain/Bank";

export interface GetBanks {
  banks: BankAccount[];
}

export type GetBank = BankAccount;
