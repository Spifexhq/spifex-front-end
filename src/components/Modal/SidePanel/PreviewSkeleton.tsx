import { useTranslation } from "react-i18next";
/** Shared placeholder for preview details; never changes the pinned header or footer. */
export default function PreviewSkeleton({ variant = "list", rows = 7 }: { variant?: "list" | "detail"; rows?: number }) {
  const { t } = useTranslation("common");
  return <div aria-label={t("previewLoading")} role="status" aria-busy="true" className="space-y-6 motion-safe:animate-pulse">
    {variant === "detail" && <div aria-hidden="true" className="space-y-2"><div className="h-3 w-20 rounded bg-gray-100"/><div className="h-7 w-40 rounded bg-gray-100"/></div>}
    <div aria-hidden="true" className="divide-y divide-gray-100">{Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center justify-between gap-6 py-3"><div className="h-3 w-28 max-w-[45%] rounded bg-gray-100"/><div className="h-3 w-36 max-w-[45%] rounded bg-gray-100"/></div>)}</div>
    {variant === "detail" && <div aria-hidden="true" className="space-y-2"><div className="h-3 w-full rounded bg-gray-100"/><div className="h-3 w-2/3 rounded bg-gray-100"/></div>}
  </div>;
}
