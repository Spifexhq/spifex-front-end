import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, Plus } from "lucide-react";
import { api } from "@/core/api/requests";
import { formatCurrency } from "@/lib";
import { getCursorFromUrl } from "@/lib/list";
import { useAuthContext } from "@/hooks/useAuth";
import DataTable from "@/shared/ui/DataTable";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
import { ErrorState } from "@/shared/ui/State";
import InventoryItemPanel, { type InventorySnack } from "../components/InventoryItemPanel";
import InventoryItemPreviewPanel, { type ItemPreviewTarget } from "../components/InventoryItemPreviewPanel";
import InventoryPriceFormPanel from "../components/InventoryPriceFormPanel";
import StockMovementPanel from "../components/StockMovementPanel";
import InventoryStatusBadge from "../components/InventoryStatusBadge";
import { useInventoryPermissions } from "../permissions";
import { useInventoryPickers } from "../useInventoryPickers";
import { INVENTORY_UNIT_CODES, inventoryUnitLabel } from "../units";
import type { InventoryItem, InventoryItemPrice } from "@/models/settings/inventory";

export default function InventoryItemsPage() {
  const { t } = useTranslation("inventory");
  const { organization } = useAuthContext();
  const currency = organization?.organization?.currency || "EUR";
  const { canView, canCreate, canEdit, canDelete } = useInventoryPermissions();
  const pickers = useInventoryPickers(canView);
  const [snack, setSnack] = useState<InventorySnack>(null);
  const [panel, setPanel] = useState<{ open: boolean; mode: "create" | "edit"; item: InventoryItem | null }>({ open: false, mode: "create", item: null });
  const [previewStack, setPreviewStack] = useState<ItemPreviewTarget[]>([]);
  const [stockPanel, setStockPanel] = useState<{ open: boolean; itemId?: string }>({ open: false });
  const [priceForm, setPriceForm] = useState<{ open: boolean; item: InventoryItem | null; price: InventoryItemPrice | null }>({ open: false, item: null, price: null });

  const controls = [
    { key: "status", label: t("items.filters.status"), value: (item: InventoryItem) => item.is_active ? "active" : "inactive" },
    { key: "stock", label: t("items.filters.stock"), value: (item: InventoryItem) => item.stock_status },
    { key: "uom", label: t("items.filters.uom"), value: (item: InventoryItem) => item.uom || "" },
  ];

  const recordFilters = useRecordFilters<InventoryItem>(
    [],
    controls,
    item => `${item.sku} ${item.name} ${item.description ?? ""}`,
    {
      key: "items",
      enabled: canView,
      placeholder: t("common.search"),
      onItems: () => {},
      fetchPage: async (filters, cursor, pageSize) => {
        const { data, meta } = await api.getInventoryItems({
          cursor,
          page_size: pageSize,
          include_count: "true",
          q: filters.search || undefined,
          active: filters.status === "active" ? "true" : filters.status === "inactive" ? "false" : undefined,
          stock_status: filters.stock === "ok" || filters.stock === "low" || filters.stock === "out" ? filters.stock : undefined,
          uom: filters.uom || undefined,
        });
        const nextUrl = meta?.pagination?.next ?? data.next ?? null;
        return {
          items: data.results ?? [],
          nextCursor: nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined,
          totalCount: (data as { count?: number }).count,
          metadata: {
            options: { status: ["active", "inactive"], stock: ["ok", "low", "out"], uom: INVENTORY_UNIT_CODES },
            optionLabels: {
              status: { active: t("common.active"), inactive: t("common.inactive") },
              stock: { ok: t("status.ok"), low: t("status.low"), out: t("status.out") },
              uom: Object.fromEntries(INVENTORY_UNIT_CODES.map(code => [code, inventoryUnitLabel(code, t)])),
            },
          },
        };
      },
    },
    canCreate ? (
      <Button type="button" className="gap-2" onClick={() => setPanel({ open: true, mode: "create", item: null })}>
        <Plus size={15} aria-hidden="true" />{t("items.add")}
      </Button>
    ) : undefined,
  );

  const refresh = useCallback(() => {
    void recordFilters.pager.refresh();
  }, [recordFilters.pager]);

  const notify = useCallback((message: string, severity: "success" | "error") => {
    setSnack({ message, severity });
  }, []);

  const loading = recordFilters.pager.loading && !recordFilters.rows.length;
  const error = recordFilters.pager.error;

  if (loading) return <PageSkeleton variant="accounting" rows={6} />;
  if (error && !recordFilters.rows.length) {
    return <ErrorState title={t("items.empty")} message={error} action={<Button variant="secondary" size="sm" onClick={refresh}>{t("common.retry")}</Button>} />;
  }

  return (
    <div className="space-y-5">
      {recordFilters.filters}

      <DataTable<InventoryItem>
        pager={recordFilters.pager}
        items={recordFilters.rows}
        busy={recordFilters.pager.loading}
        error={error}
        emptyLabel={t("items.empty")}
        canEdit={canEdit}
        canDelete={canDelete}
        editLabel={t("common.edit")}
        deleteLabel={t("common.delete")}
        onInspect={item => setPreviewStack([{ kind: "item", item }])}
        onEdit={item => setPanel({ open: true, mode: "edit", item })}
        onDelete={item => api.deleteInventoryItem(item.id, item.version)}
        onDeleted={() => {
          setPreviewStack([]);
          setSnack({ message: t("items.toast.deleted"), severity: "success" });
          refresh();
        }}
        columns={[
          {
            key: "item",
            label: t("items.columns.item"),
            render: item => (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-400"><Package size={15} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{item.name}</p>
                  <p className="text-[11px] text-gray-500">{item.sku}</p>
                </div>
              </div>
            ),
          },
          { key: "sku", label: t("items.columns.sku"), render: item => <span className="font-mono text-[11px] text-gray-600">{item.sku}</span> },
          { key: "description", label: t("items.columns.description"), render: item => <span className="block truncate text-gray-600">{item.description || "—"}</span> },
          { key: "uom", label: t("items.columns.uom"), render: item => item.uom ? inventoryUnitLabel(item.uom, t) : t("units.none") },
          { key: "quantity", label: t("items.columns.quantity"), render: item => <span className="tabular-nums font-medium text-gray-900">{item.quantity_on_hand}</span> },
          { key: "reorder", label: t("items.columns.reorderPoint"), render: item => <span className="tabular-nums text-gray-500">{item.reorder_point}</span> },
          { key: "cost", label: t("items.columns.unitCost"), render: item => <span className="tabular-nums text-gray-600">{formatCurrency(item.unit_cost || "0", currency)}</span> },
          { key: "status", label: t("common.status"), render: item => <InventoryStatusBadge status={item.stock_status} label={t(`status.${item.stock_status}`)} /> },
        ]}
        actions={item => canEdit ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setStockPanel({ open: true, itemId: item.id })}>{t("stock.addMovement")}</Button>
        ) : undefined}
      />

      <InventoryItemPanel
        isOpen={panel.open}
        mode={panel.mode}
        item={panel.item}
        onClose={() => setPanel(previous => ({ ...previous, open: false }))}
        onNotify={setSnack}
        onSaved={refresh}
      />

      <InventoryItemPreviewPanel
        stack={previewStack}
        currency={currency}
        canEdit={canEdit}
        onClose={() => setPreviewStack(previous => previous.length > 1 ? previous.slice(0, -1) : [])}
        onEdit={item => { setPreviewStack([]); setPanel({ open: true, mode: "edit", item }); }}
        onAdjust={item => { setPreviewStack([]); setStockPanel({ open: true, itemId: item.id }); }}
        onPushPrices={item => setPreviewStack(previous => previous.length ? [...previous, { kind: "prices", item }] : [{ kind: "item", item }, { kind: "prices", item }])}
        onAddPrice={item => {
          setPreviewStack([]);
          setPriceForm({ open: true, item, price: null });
        }}
        onCorrectPrice={(item, price) => {
          setPreviewStack([]);
          setPriceForm({ open: true, item, price });
        }}
      />

      <InventoryPriceFormPanel
        isOpen={priceForm.open}
        item={priceForm.item}
        price={priceForm.price}
        currency={currency}
        onClose={() => {
          const item = priceForm.item;
          setPriceForm({ open: false, item: null, price: null });
          if (item) setPreviewStack([{ kind: "item", item }, { kind: "prices", item }]);
        }}
        onSaved={refresh}
        onNotify={notify}
      />

      <StockMovementPanel
        isOpen={stockPanel.open}
        items={pickers.items}
        locations={pickers.locations}
        initialItemId={stockPanel.itemId}
        initialLocationId={pickers.locations.find(location => location.is_default)?.id}
        onClose={() => setStockPanel({ open: false })}
        onSaved={() => { refresh(); void pickers.reload(); }}
        onNotify={notify}
      />

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
