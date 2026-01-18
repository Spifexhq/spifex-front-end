// src/models/entries/documentTypes.ts
import type { Paginated } from "@/models/Api";

/* ---------------------------------- List ---------------------------------- */

export interface DocumentType {
  code: string;
  is_active: boolean;
}

export type GetDocumentTypesResponse = Paginated<DocumentType>;
export type GetDocumentTypeResponse = DocumentType;