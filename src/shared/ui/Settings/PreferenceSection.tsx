import { useId, type ReactNode } from "react";
import { CircleSlash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import isEmptyPreviewValue from "@/components/Modal/SidePanel/isEmptyPreviewValue";

export function PreferenceSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return <section aria-labelledby={id} className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white"><h2 id={id} className="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-900">{title}</h2>{children}</section>;
}
export function PreferenceRow({ label, value, action, disabled }: { label: string; value: ReactNode; action?: ReactNode; disabled?: boolean }) {
  const { t } = useTranslation("common");
  return <div className={`flex flex-col gap-3 border-b border-gray-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between ${disabled ? "pointer-events-none opacity-60" : ""}`}><div className="min-w-0 space-y-1"><p className="text-xs text-gray-500">{label}</p><div className="break-words text-[13px] font-medium text-gray-900">{isEmptyPreviewValue(value) ? <CircleSlash2 size={15} role="img" aria-label={t("previewEmpty")} className="text-gray-400" /> : value}</div></div>{action && <div className="shrink-0 self-start sm:self-center [&_button]:text-xs">{action}</div>}</div>;
}
