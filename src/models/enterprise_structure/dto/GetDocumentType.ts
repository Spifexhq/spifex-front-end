import { DocumentType } from "../domain/DocumentType";

export interface GetDocumentTypes {
  document_types: DocumentType[];
}

export interface GetDocumentType {
  document_type: DocumentType;
}
