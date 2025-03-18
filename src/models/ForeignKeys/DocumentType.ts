export type DocumentType = {
  id: number;
  document_type: string;
  uuid_document_type: string;
};

export type ApiGetDocumentTypes = {
  document_types: DocumentType[];
};

export type ApiGetDocumentType = {
  document_type: DocumentType;
};
