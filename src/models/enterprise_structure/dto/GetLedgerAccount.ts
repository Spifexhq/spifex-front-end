// models/enterprise_structure/dto/GetLedgerAccount
import { GLAccount } from "../domain/GLAccount";

export interface GetLedgerAccountsRequest {
  active?: "true" | "false";
  category?: string | number; // aceita label OU número
  q?: string;
  page_size?: number;
  cursor?: string;
}

export interface CursorLinks {
  next: string | null;
  previous: string | null;
}

export interface GetLedgerAccountsResponse extends CursorLinks {
  results: GLAccount[];
}

export type AddGLAccountRequest = {
  account: string;
  code?: string;
  category: 1 | 2 | 3 | 4; // número fixo
  subcategory?: string;
  is_active?: boolean;
};

export type EditGLAccountRequest = Partial<AddGLAccountRequest>;