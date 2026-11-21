import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Warehouse } from "lucide-react";
import { api } from "@/core/api/requests";
import { getCursorFromUrl } from "@/lib/list";
import DataTable from "@/shared/ui/DataTable";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
import { ErrorState } from "@/shared/ui/State";
import Badge from "@/shared/ui/Badge";
import StatusDot from "@/shared/ui/StatusDot";
import InventoryLocationPanel from "../components/InventoryLocationPanel";
import InventoryLocationPreviewPanel from "../components/InventoryLocationPreviewPanel";
import { useInventoryPermissions } from "../permissions";
import type { InventoryLocation } from "@/models/settings/inventory";

export default function InventoryLocationsPage() {
  const { t } = useTranslation("inventory");
  const { canView, canCreate, canEdit, canDelete } = useInventoryPermissions();
  const [snack, setSnack] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [panel, setPanel] = useState<{ open: boolean; mode: "create" | "edit"; location: InventoryLocation | null }>({ open: false, mode: "create", location: null });
  const [preview, setPreview] = useState<InventoryLocation | null>(null);

  const recordFilters = useRecordFilters<InventoryLocation>(
    [],
    [
      { key: "status", label: t("common.status"), value: location => location.is_active ? "active" : "inactive" },
      { key: "default", label: t("locations.filters.default"), value: location => location.is_default ? "true" : "false" },
    ],
    location => `${location.code} ${location.name} ${location.description ?? ""}`,
    {
      key: "locations",
      enabled: canView,
      placeholder: t("common.search"),
      onItems: () => {},
      fetchPage: async (filters, cursor, pageSize) => {
        const { data, meta } = await api.getInventoryLocations({
          cursor,
          page_size: pageSize,
          include_count: "true",
          q: filters.search || undefined,
          active: filters.status === "active" ? "true" : filters.status === "inactive" ? "false" : undefined,
          is_default: filters.default === "true" ? "true" : filters.default === "false" ? "false" : undefined,
        });
        const nextUrl = meta?.pagination?.next ?? data.next ?? null;
        return {
          items: data.results ?? [],
          nextCursor: nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined,
          totalCount: (data as { count?: number }).count,
          metadata: {
            options: { status: ["active", "inactive"], default: ["true", "false"] },
            optionLabels: {
              status: { active: t("common.active"), inactive: t("common.inactive") },
              default: { true: t("common.default"), false: t("locations.filters.custom") },
            },
          },
        };
      },
    },
    canCreate ? (
      <Button type="button" className="gap-2" onClick={() => setPanel({ open: true, mode: "create", location: null })}>
        <Plus size={15} aria-hidden="true" />{t("locations.add")}
      </Button>
    ) : undefined,
  );

  const refresh = useCallback(() => { void recordFilters.pager.refresh(); }, [recordFilters.pager]);

  if (recordFilters.pager.loading && !recordFilters.rows.length) return <PageSkeleton variant="accounting" rows={5} />;
  if (recordFilters.pager.error && !recordFilters.rows.length) {
    return <ErrorState title={t("locations.empty")} message={recordFilters.pager.error} action={<Button variant="secondary" size="sm" onClick={refresh}>{t("common.retry")}</Button>} />;
  }

  return (
    <div className="space-y-5">
      {recordFilters.filters}

      <DataTable<InventoryLocation>
        pager={recordFilters.pager}
        items={recordFilters.rows}
        busy={recordFilters.pager.loading}
        error={recordFilters.pager.error}
        emptyLabel={t("locations.empty")}
        onInspect={setPreview}
        canEdit={canEdit}
        canDelete={canDelete}
        editLabel={t("common.edit")}
        deleteLabel={t("common.delete")}
        onEdit={location => setPanel({ open: true, mode: "edit", location })}
        onDelete={location => api.deleteInventoryLocation(location.id, location.version)}
        onDeleted={() => {
          setPreview(null);
          setSnack({ message: t("locations.toast.deleted"), severity: "success" });
          refresh();
        }}
        columns={[
          {
            key: "code",
            label: t("locations.columns.code"),
            render: location => (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-400"><Warehouse size={15} aria-hidden="true" /></span>
                <div className="min-w-0"><p className="font-mono text-[12px] font-medium text-gray-900">{location.code}</p><p className="truncate text-[11px] text-gray-500">{location.name}</p></div>
              </div>
            ),
          },
          { key: "name", label: t("locations.columns.name"), render: location => <span className="block truncate font-medium text-gray-900">{location.name}</span> },
          { key: "description", label: t("locations.columns.description"), render: location => <span className="block truncate text-gray-600">{location.description || "—"}</span> },
          { key: "stock", label: t("locations.columns.stock"), render: location => <span className="tabular-nums font-medium text-gray-900">{location.stock_quantity}</span> },
          { key: "default", label: t("locations.columns.default"), render: location => location.is_default ? <Badge tone="neutral" size="md">{t("common.default")}</Badge> : <span className="text-gray-400">—</span> },
          { key: "status", label: t("locations.columns.status"), render: location => <StatusDot active={location.is_active} label={t(location.is_active ? "common.active" : "common.inactive")} /> },
        ]}
      />

      <InventoryLocationPreviewPanel
        location={preview}
        canEdit={canEdit}
        onClose={() => setPreview(null)}
        onEdit={location => { setPreview(null); setPanel({ open: true, mode: "edit", location }); }}
      />

      <InventoryLocationPanel
        isOpen={panel.open}
        mode={panel.mode}
        location={panel.location}
        onClose={() => setPanel(previous => ({ ...previous, open: false }))}
        onSaved={refresh}
        onNotify={(message, severity) => setSnack({ message, severity })}
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
