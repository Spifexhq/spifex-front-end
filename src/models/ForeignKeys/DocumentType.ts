export type DocumentType = {
  id: number;
  document_type: string | null;
  uuid_document_type: string | null;
};

export type ApiGetDocumentTypes = {
  document_types: DocumentType[];
};

export type ApiGetDocumentType = {
  document_type: DocumentType;
};
