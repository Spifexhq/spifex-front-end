import { api } from "@/core/api/requests";
import type { EntryAttachmentApi } from "@/shared/financial/components/EntryAttachments";

export const entryAttachmentApi: EntryAttachmentApi = {
  list: api.getEntryAttachments,
  upload: api.uploadEntryAttachment,
  remove: api.removeEntryAttachment,
  download: api.downloadEntryAttachment,
};
