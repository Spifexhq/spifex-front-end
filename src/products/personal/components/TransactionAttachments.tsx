import EntryAttachments, { type EntryAttachmentApi } from "@/shared/financial/components/EntryAttachments";
import { personalApi } from "@/products/personal/services/api";

const attachmentApi: EntryAttachmentApi = {
  list: personalApi.attachments,
  upload: personalApi.uploadAttachment,
  remove: personalApi.removeAttachment,
  download: personalApi.downloadAttachment,
};

export default function TransactionAttachments({ entryId, editable = false }: { entryId: string; editable?: boolean }) {
  return <EntryAttachments entryId={entryId} editable={editable} namespace="personal" api={attachmentApi} />;
}
