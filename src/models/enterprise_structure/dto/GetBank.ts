import { Bank } from "../domain/Bank";

export interface GetBanks {
  banks: Bank[];
}

export interface GetBank {
  bank: Bank;
}
