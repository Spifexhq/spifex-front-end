import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Boxes, Plus } from "lucide-react";
import { api } from "@/core/api/requests";
import { formatDateFromISO } from "@/lib";
import { getCursorFromUrl } from "@/lib/list";
import { useAuthContext } from "@/hooks/useAuth";
import DataTable from "@/shared/ui/DataTable";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
import { ErrorState } from "@/shared/ui/State";
import InventoryStatusBadge from "../components/InventoryStatusBadge";
import InventoryStockLevelPreviewPanel from "../components/InventoryStockLevelPreviewPanel";
import StockMovementPreviewPanel from "../components/StockMovementPreviewPanel";
import StockMovementPanel from "../components/StockMovementPanel";
import StockTransferPanel from "../components/StockTransferPanel";
import { useInventoryPermissions } from "../permissions";
import { useInventoryPickers } from "../useInventoryPickers";
import { inventoryUnitLabel } from "../units";
import type { InventoryStockLevel, InventoryStockStatus, StockMovement, StockMovementType } from "@/models/settings/inventory";

function asStockStatus(value: string | undefined): InventoryStockStatus | undefined {
  return value === "ok" || value === "low" || value === "out" ? value : undefined;
}

function asMovementType(value: string | undefined): StockMovementType | undefined {
  const allowed: StockMovementType[] = ["opening", "receipt", "issue", "adjustment", "transfer_in", "transfer_out"];
  return allowed.includes(value as StockMovementType) ? value as StockMovementType : undefined;
}

export default function InventoryStockPage() {
  const { t } = useTranslation("inventory");
  const { organization } = useAuthContext();
  const currency = organization?.organization?.currency || "EUR";
  const { canView, canEdit } = useInventoryPermissions();
  const pickers = useInventoryPickers(canView);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "movements" ? "movements" : "balances";
  const initialStatus = asStockStatus(searchParams.get("status") || undefined);
  const [snack, setSnack] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [movementPanel, setMovementPanel] = useState<{ open: boolean; itemId?: string; locationId?: string }>({ open: false });
  const [transferPanel, setTransferPanel] = useState<{ open: boolean; itemId?: string; locationId?: string }>({ open: false });
  const [previewLevel, setPreviewLevel] = useState<InventoryStockLevel | null>(null);
  const [previewMovement, setPreviewMovement] = useState<StockMovement | null>(null);

  const itemOptions = useMemo(() => pickers.items.map(item => item.id), [pickers.items]);
  const itemLabels = useMemo(
    () => Object.fromEntries(pickers.items.map(item => [item.id, `${item.sku} · ${item.name}`])),
    [pickers.items],
  );

  const locationOptions = useMemo(() => pickers.locations.map(location => location.id), [pickers.locations]);
  const locationLabels = useMemo(
    () => Object.fromEntries(pickers.locations.map(location => [location.id, `${location.code} · ${location.name}`])),
    [pickers.locations],
  );

  const balanceFilters = useRecordFilters<InventoryStockLevel>(
    [],
    [
      { key: "item", label: t("stock.filters.item"), value: level => level.item_id },
      { key: "location", label: t("stock.filters.location"), value: level => level.location_id },
      { key: "status", label: t("stock.filters.status"), value: level => level.status },
    ],
    level => `${level.sku} ${level.name} ${level.location_code} ${level.location_name}`,
    {
      key: `balances:${pickers.items.length}:${pickers.locations.length}`,
      enabled: canView && tab === "balances",
      initialApplied: initialStatus ? { status: initialStatus } : undefined,
      placeholder: t("common.search"),
      onItems: () => {},
      fetchPage: async (filters, cursor, pageSize) => {
        const { data, meta } = await api.getInventoryStock({
          cursor,
          page_size: pageSize,
          include_count: "true",
          q: filters.search || undefined,
          item: filters.item || undefined,
          location: filters.location || undefined,
          status: asStockStatus(filters.status),
        });
        const nextUrl = meta?.pagination?.next ?? data.next ?? null;
        return {
          items: data.results ?? [],
          nextCursor: nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined,
          totalCount: (data as { count?: number }).count,
          metadata: {
            options: { item: itemOptions, location: locationOptions, status: ["ok", "low", "out"] },
            optionLabels: {
              item: itemLabels,
              location: locationLabels,
              status: { ok: t("status.ok"), low: t("status.low"), out: t("status.out") },
            },
          },
        };
      },
    },
    canEdit ? (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="gap-2" onClick={() => setTransferPanel({ open: true, locationId: pickers.locations.find(location => location.is_default)?.id })}>
          <ArrowLeftRight size={15} aria-hidden="true" />{t("stock.transfer")}
        </Button>
        <Button type="button" className="gap-2" onClick={() => setMovementPanel({ open: true, locationId: pickers.locations.find(location => location.is_default)?.id })}>
          <Plus size={15} aria-hidden="true" />{t("stock.addMovement")}
        </Button>
      </div>
    ) : undefined,
  );

  const movementFilters = useRecordFilters<StockMovement>(
    [],
    [
      { key: "item", label: t("stock.filters.item"), value: movement => movement.item_id },
      { key: "location", label: t("stock.filters.location"), value: movement => movement.location_id },
      { key: "type", label: t("stock.filters.type"), value: movement => movement.movement_type },
      { key: "from", label: t("stock.filters.from"), value: movement => movement.occurred_at.slice(0, 10), date: "from" },
      { key: "to", label: t("stock.filters.to"), value: movement => movement.occurred_at.slice(0, 10), date: "to" },
    ],
    movement => `${movement.sku} ${movement.name} ${movement.reference} ${movement.reason} ${movement.location_code}`,
    {
      key: `movements:${pickers.items.length}:${pickers.locations.length}`,
      enabled: canView && tab === "movements",
      placeholder: t("common.search"),
      onItems: () => {},
      fetchPage: async (filters, cursor, pageSize) => {
        const { data, meta } = await api.getInventoryMovements({
          cursor,
          page_size: pageSize,
          include_count: "true",
          q: filters.search || undefined,
          item: filters.item || undefined,
          location: filters.location || undefined,
          movement_type: asMovementType(filters.type),
          date_from: filters.from || undefined,
          date_to: filters.to || undefined,
        });
        const nextUrl = meta?.pagination?.next ?? data.next ?? null;
        return {
          items: data.results ?? [],
          nextCursor: nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined,
          totalCount: (data as { count?: number }).count,
          metadata: {
            options: { item: itemOptions, location: locationOptions, type: ["receipt", "issue", "adjustment", "transfer_in", "transfer_out", "opening"] },
            optionLabels: {
              item: itemLabels,
              location: locationLabels,
              type: {
                opening: t("movementType.opening"),
                receipt: t("movementType.receipt"),
                issue: t("movementType.issue"),
                adjustment: t("movementType.adjustment"),
                transfer_in: t("movementType.transfer_in"),
                transfer_out: t("movementType.transfer_out"),
              },
            },
          },
        };
      },
    },
  );

  const active = tab === "balances" ? balanceFilters : movementFilters;
  const loading = active.pager.loading && !active.rows.length;
  const error = active.pager.error;

  const changeTab = useCallback((value: "balances" | "movements") => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (value === "balances") next.delete("tab");
      else next.set("tab", value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  if (loading) return <PageSkeleton variant="accounting" rows={6} />;
  if (error && !active.rows.length) {
    return <ErrorState title={t("stock.tabs.balances")} message={error} action={<Button variant="outline" size="sm" onClick={() => void active.pager.refresh()}>{t("common.retry")}</Button>} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<"balances" | "movements">
          value={tab}
          onChange={changeTab}
          label={t("nav.stock")}
          items={[
            { value: "balances", label: t("stock.tabs.balances") },
            { value: "movements", label: t("stock.tabs.movements") },
          ]}
        />
      </div>

      {tab === "balances" ? (
        <>
          {balanceFilters.filters}
          <DataTable<InventoryStockLevel>
            pager={balanceFilters.pager}
            items={balanceFilters.rows}
            busy={balanceFilters.pager.loading}
            error={balanceFilters.pager.error}
            emptyLabel={t("stock.emptyBalances")}
            onInspect={setPreviewLevel}
            canEdit={false}
            columns={[
              {
                key: "item",
                label: t("stock.balanceColumns.item"),
                render: level => (
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-400"><Boxes size={15} aria-hidden="true" /></span>
                    <div className="min-w-0"><p className="truncate font-medium text-gray-900">{level.name}</p><p className="text-[11px] text-gray-500">{level.sku}{level.uom ? ` · ${inventoryUnitLabel(level.uom, t)}` : ""}</p></div>
                  </div>
                ),
              },
              { key: "location", label: t("stock.balanceColumns.location"), render: level => <div className="min-w-0"><p className="truncate text-gray-700">{level.location_name}</p><p className="font-mono text-[10px] text-gray-400">{level.location_code}</p></div> },
              { key: "quantity", label: t("stock.balanceColumns.quantity"), render: level => <span className="tabular-nums font-medium text-gray-900">{level.quantity}</span> },
              { key: "reorder", label: t("stock.balanceColumns.reorderPoint"), render: level => <span className="tabular-nums text-gray-500">{level.reorder_point}</span> },
              { key: "status", label: t("stock.balanceColumns.status"), render: level => <InventoryStatusBadge status={level.status} label={t(`status.${level.status}`)} /> },
            ]}
            actions={canEdit ? level => (
              <Button type="button" size="sm" variant="outline" onClick={() => setMovementPanel({ open: true, itemId: level.item_id, locationId: level.location_id })}>
                {t("stock.addMovement")}
              </Button>
            ) : undefined}
          />
        </>
      ) : (
        <>
          {movementFilters.filters}
          <DataTable<StockMovement>
            pager={movementFilters.pager}
            items={movementFilters.rows}
            busy={movementFilters.pager.loading}
            error={movementFilters.pager.error}
            emptyLabel={t("stock.emptyMovements")}
            onInspect={setPreviewMovement}
            canEdit={false}
            columns={[
              { key: "date", label: t("stock.movementColumns.date"), render: movement => <span className="tabular-nums text-gray-600">{formatDateFromISO(movement.occurred_at)}</span> },
              { key: "item", label: t("stock.movementColumns.item"), render: movement => <div className="min-w-0"><p className="truncate font-medium text-gray-900">{movement.name}</p><p className="text-[11px] text-gray-500">{movement.sku}{movement.uom ? ` · ${inventoryUnitLabel(movement.uom, t)}` : ""}</p></div> },
              { key: "type", label: t("stock.movementColumns.type"), render: movement => t(`movementType.${movement.movement_type}`) },
              { key: "location", label: t("stock.movementColumns.location"), render: movement => <div className="min-w-0"><p className="truncate text-gray-700">{movement.location_name}</p><p className="font-mono text-[10px] text-gray-400">{movement.location_code}</p></div> },
              { key: "quantity", label: t("stock.movementColumns.quantity"), render: movement => <span className={`tabular-nums font-medium ${movement.quantity_delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</span> },
              { key: "reference", label: t("stock.movementColumns.reference"), render: movement => <span className="block truncate text-gray-600">{movement.reference || "—"}</span> },
              { key: "reason", label: t("stock.movementColumns.reason"), render: movement => <span className="block truncate text-gray-500">{movement.reason || "—"}</span> },
              { key: "user", label: t("stock.movementColumns.user"), render: movement => movement.created_by || "—" },
            ]}
          />
        </>
      )}

      <StockMovementPanel
        isOpen={movementPanel.open}
        items={pickers.items}
        locations={pickers.locations}
        initialItemId={movementPanel.itemId}
        initialLocationId={movementPanel.locationId}
        onClose={() => setMovementPanel({ open: false })}
        onSaved={() => {
          void balanceFilters.pager.refresh();
          void movementFilters.pager.refresh();
          void pickers.reload();
        }}
        onNotify={(message, severity) => setSnack({ message, severity })}
      />

      <StockTransferPanel
        isOpen={transferPanel.open}
        items={pickers.items}
        locations={pickers.locations}
        initialItemId={transferPanel.itemId}
        initialLocationId={transferPanel.locationId}
        onClose={() => setTransferPanel({ open: false })}
        onSaved={() => {
          void balanceFilters.pager.refresh();
          void movementFilters.pager.refresh();
        }}
        onNotify={(message, severity) => setSnack({ message, severity })}
      />

      <InventoryStockLevelPreviewPanel
        level={previewLevel}
        currency={currency}
        canEdit={canEdit}
        onClose={() => setPreviewLevel(null)}
        onAdjust={level => {
          setPreviewLevel(null);
          setMovementPanel({ open: true, itemId: level.item_id, locationId: level.location_id });
        }}
      />

      <StockMovementPreviewPanel movement={previewMovement} onClose={() => setPreviewMovement(null)} />

      <Snackbar
        notificationKey={snack}
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </div>
  );
}
