import { useTranslation } from "react-i18next";
import { Paperclip, Trash2 } from "lucide-react";
import Checkbox from "@/shared/ui/Checkbox";

export type PendingAttachment = { file: File; shareToSeries: boolean };

type Props = {
  files: PendingAttachment[];
  maxFiles: number;
  maxBytes: number;
  namespace: string;
  seriesCount?: number;
  onAdd(files: File[]): void;
  onRemove(index: number): void;
  onToggleShare(index: number, checked: boolean): void;
};

/** Creation-time attachment picker; files upload after the entry is created. */
export default function PendingAttachments({ files, maxFiles, maxBytes, namespace, seriesCount = 1, onAdd, onRemove, onToggleShare }: Props) {
  const { t } = useTranslation(namespace);
  const atLimit = files.length >= maxFiles;
  return <section className="border-t border-slate-100 pt-5">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-800"><Paperclip size={15} aria-hidden="true" />{t("attachments")}</h3>
      <label className={`cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 ${atLimit ? "pointer-events-none opacity-50" : ""}`}>
        {t("addFile")}
        <input
          className="sr-only"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          disabled={atLimit}
          onChange={event => {
            const selected = Array.from(event.currentTarget.files || []);
            event.currentTarget.value = "";
            if (selected.length) onAdd(selected);
          }}
        />
      </label>
    </div>
    <p className="mt-2 text-[11px] leading-5 text-slate-500">{t("pendingAttachmentHint", { count: maxFiles, size: Math.floor(maxBytes / 1024 / 1024) })}</p>
    {files.length ? <ul className="mt-3 divide-y divide-slate-100">{files.map((item, index) => <li key={`${item.file.name}-${item.file.size}-${index}`} className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700" title={item.file.name}>{item.file.name}</p><p className="mt-1 text-[10px] text-slate-400">{Math.max(1, Math.round(item.file.size / 1024))} KB</p></div>
      {seriesCount > 1 && <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500">
        <Checkbox id={`pending-attachment-share-${index}`} size="sm" checked={item.shareToSeries} onChange={event => onToggleShare(index, event.currentTarget.checked)} />
        <label htmlFor={`pending-attachment-share-${index}`} className="cursor-pointer whitespace-nowrap" title={t("attachToSeriesHint")}>{t("attachAllInstallments", { count: seriesCount })}</label>
      </div>}
      <button type="button" className="grid size-10 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t("removeFile", { name: item.file.name })} onClick={() => onRemove(index)}><Trash2 size={15} aria-hidden="true" /></button>
    </li>)}</ul> : <p className="mt-4 text-xs text-slate-400">{t("noAttachments")}</p>}
  </section>;
}
