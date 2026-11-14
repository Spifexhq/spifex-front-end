import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/core/api/requests";
import { getCursorFromUrl } from "@/lib/list";
import { useCursorPager } from "@/hooks/useCursorPager";
import SidePanel, { SidePanelDetails } from "@/components/Modal/SidePanel";
import ResultsPerPage from "@/shared/ui/DataTable/ResultsPerPage";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import StatusDot from "@/shared/ui/StatusDot";
import InventoryStatusBadge from "./InventoryStatusBadge";
import type { InventoryLocation, InventoryStockLevel } from "@/models/settings/inventory";

const PAGE_SIZE = 20;

export default function InventoryLocationPreviewPanel({
  location,
  canEdit,
  onClose,
  onEdit,
}: {
  location: InventoryLocation | null;
  canEdit: boolean;
  onClose(): void;
  onEdit(location: InventoryLocation): void;
}) {
  const { t } = useTranslation("inventory");
  const { t: commonT } = useTranslation("common");

  const fetchPage = useCallback(async (cursor?: string, pageSize = PAGE_SIZE) => {
    if (!location?.id) return { items: [] as InventoryStockLevel[], nextCursor: undefined as string | undefined };
    const { data, meta } = await api.getInventoryStock({
      location: location.id,
      cursor,
      page_size: pageSize,
      include_count: "true",
    });
    const nextUrl = meta?.pagination?.next ?? data.next ?? null;
    return {
      items: data.results ?? [],
      nextCursor: nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined,
      totalCount: (data as { count?: number }).count,
    };
  }, [location?.id]);

  const pager = useCursorPager<InventoryStockLevel>(fetchPage, {
    autoLoadFirst: !!location?.id,
    deps: [location?.id],
    initialPageSize: PAGE_SIZE,
  });

  const start = pager.items.length ? pager.index * pager.pageSize + 1 : 0;
  const end = pager.items.length ? start + pager.items.length - 1 : 0;

  return (
    <SidePanel
      isOpen={!!location}
      loading={pager.loading && !pager.items.length}
      skeletonVariant="detail"
      skeletonRows={5}
      title={t("locations.previewTitle")}
      subtitle={location ? `${location.code} · ${location.name}` : undefined}
      onClose={onClose}
      footer={location && canEdit ? <Button type="button" variant="outline" onClick={() => onEdit(location)}>{t("common.edit")}</Button> : undefined}
    >
      {location ? (
        <div className="space-y-6">
          {pager.error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{pager.error}</p> : null}

          <SidePanelDetails
            fields={[
              { label: t("locations.columns.code"), value: <span className="font-mono text-[12px]">{location.code}</span> },
              { label: t("common.name"), value: location.name },
              { label: t("common.description"), value: location.description || "—" },
              { label: t("locations.columns.default"), value: location.is_default ? <Badge tone="neutral" size="md">{t("common.default")}</Badge> : "—" },
              { label: t("locations.columns.status"), value: <StatusDot active={location.is_active} label={t(location.is_active ? "common.active" : "common.inactive")} /> },
              { label: t("locations.columns.stock"), value: <span className="tabular-nums font-medium">{location.stock_quantity}</span> },
            ]}
          />

          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold text-gray-900">{t("locations.stockTitle")}</h2>
            {pager.items.length ? (
              <>
                <table className="w-full table-fixed border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                      <th scope="col" className="w-[50%] px-3 py-2 text-left font-medium">{t("stock.balanceColumns.item")}</th>
                      <th scope="col" className="w-[25%] px-3 py-2 text-right font-medium">{t("stock.balanceColumns.quantity")}</th>
                      <th scope="col" className="w-[25%] px-3 py-2 text-right font-medium">{t("stock.balanceColumns.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pager.items.map(level => (
                      <tr key={level.id}>
                        <td className="px-3 py-2"><p className="truncate font-medium text-gray-800">{level.name}</p><p className="text-[10px] text-gray-500">{level.sku}</p></td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">{level.quantity}</td>
                        <td className="px-3 py-2 text-right"><InventoryStatusBadge status={level.status} label={t(`status.${level.status}`)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
                  <ResultsPerPage value={pager.pageSize} disabled={pager.loading} onChange={pager.setPageSize}>
                    <span aria-live="polite">
                      {pager.totalCount !== undefined
                        ? commonT("pagination.rangeTotal", { start, end, count: pager.totalCount })
                        : commonT("pagination.range", { start, end })}
                    </span>
                  </ResultsPerPage>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={commonT("pagination.previous")}
                      disabled={!pager.canPrev || pager.loading}
                      onClick={() => void pager.prev()}
                      className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs text-slate-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 max-md:min-h-10"
                    >
                      <ChevronLeft size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={commonT("pagination.next")}
                      disabled={!pager.canNext || pager.loading}
                      onClick={() => void pager.next()}
                      className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs text-slate-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 max-md:min-h-10"
                    >
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>
            ) : pager.loading ? (
              <p className="text-xs text-gray-500">{t("common.loading")}</p>
            ) : (
              <p className="text-xs text-gray-500">{t("stock.emptyBalances")}</p>
            )}
          </section>
        </div>
      ) : null}
    </SidePanel>
  );
}
