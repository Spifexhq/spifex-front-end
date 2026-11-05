import { useTranslation } from "react-i18next";
import { SkeletonLine } from "@/shared/ui/DataTable/DataTableSkeleton";

export default function FinancialActivitySkeleton({ variant = "amount" }: { variant?: "amount" | "banks" }) {
  const { t } = useTranslation("kpiCards");
  return <div role="status" aria-busy="true"><span className="sr-only">{t("loading")}</span>{variant === "amount" ? <SkeletonLine className="my-1 h-6 w-28 max-w-full" /> : <div aria-hidden="true" className="divide-y divide-gray-100">{Array.from({ length: 3 }, (_, i) => <div key={i} className="flex items-center gap-2.5 py-1"><SkeletonLine className="h-7 w-7" /><div className="flex-1 space-y-1.5"><SkeletonLine className="h-3 w-32" /><SkeletonLine className="h-2 w-20" /></div><SkeletonLine className="h-3 w-20" /></div>)}</div>}</div>;
}
