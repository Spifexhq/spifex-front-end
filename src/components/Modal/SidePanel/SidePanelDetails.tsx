import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import isEmptyPreviewValue from "./isEmptyPreviewValue";
export type DetailField = { label: ReactNode; value: ReactNode };
export default function SidePanelDetails({ fields }: { fields: DetailField[] }) {
  const { t } = useTranslation("common");
  return <dl className="divide-y divide-gray-100 text-[13px]">{fields.map((field, index) => <div key={index} className="flex items-start justify-between gap-6 py-3"><dt className="min-w-0 text-gray-500">{field.label}</dt><dd className="max-w-[60%] min-w-0 break-words text-right font-medium text-gray-900">{isEmptyPreviewValue(field.value) ? null : typeof field.value === "boolean" ? t(field.value ? "previewYes" : "previewNo") : field.value}</dd></div>)}</dl>;
}
