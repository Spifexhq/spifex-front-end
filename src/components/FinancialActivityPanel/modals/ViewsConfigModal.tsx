import { apiErrorMessage } from "@/lib/apiErrorMessage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";

import Button from "@/shared/ui/Button";
import Switch from "@/shared/ui/Switch";
import { ErrorState } from "@/shared/ui/State";
import { Pencil } from "lucide-react";

import { api } from "@/core/api/requests";
import type { ApiResponse } from "@/models/Api";
import type { Visualization } from "@/models/components/filterBar";
import { isApiError } from "../FilterBar.utils";
import { ModalShell } from "../ui/ModalShell";
import { PermissionMiddleware } from "src/middlewares";

export const ViewsConfigModal: React.FC<{
  t: TFunction;
  open: boolean;
  onClose: () => void;

  scopedViews: Visualization[];
  onApplyViewToForm: (view: Visualization) => void;
  onRefreshViews: () => Promise<void>;
}> = ({ t, open, onClose, scopedViews, onApplyViewToForm, onRefreshViews }) => {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setRenamingId(null);
      setRenamingName("");
      setBusy(false);
    }
  }, [open]);

  const viewById = useMemo(() => new Map(scopedViews.map((v) => [v.id, v])), [scopedViews]);

  const toggleDefaultView = useCallback(
    async (view: Visualization) => {
      // Freeze checkboxes while renaming any view
      if (renamingId) return;

      try {
        setBusy(true);
        setError("");

        const r1: ApiResponse<unknown> = await api.editViewPreset(view.id, { is_default: !view.is_default });
        if (isApiError(r1)) throw r1.error;

        if (!view.is_default) {
          const others = scopedViews.filter((o) => o.id !== view.id && o.is_default);
          if (others.length) {
            await Promise.all(
              others.map(async (o) => {
                const r: ApiResponse<unknown> = await api.editViewPreset(o.id, { is_default: false });
                if (isApiError(r)) throw r.error;
              })
            );
          }
        }

        await onRefreshViews();
      } catch (err) {
        console.error("Failed to toggle default view", err);
        setError(apiErrorMessage(err, t("filterBar:saveModal.failed")));
      } finally {
        setBusy(false);
      }
    },
    [onRefreshViews, scopedViews, renamingId, t]
  );

  const renameView = useCallback(async () => {
    const id = renamingId;
    const name = renamingName.trim();
    if (!id || !name) return;

    try {
      setBusy(true);
      setError("");
      const r: ApiResponse<unknown> = await api.editViewPreset(id, { name });
      if (isApiError(r)) throw r.error;
      await onRefreshViews();
      setRenamingId(null);
      setRenamingName("");
    } catch (err) {
      console.error("Failed to rename view", err);
      setError(apiErrorMessage(err, t("filterBar:saveModal.failed")));
    } finally {
      setBusy(false);
    }
  }, [onRefreshViews, renamingId, renamingName, t]);

  const deleteView = useCallback(
    async (id: string) => {
      try {
        setBusy(true);
        setError("");
        const r: ApiResponse<unknown> = await api.deleteViewPreset(id);
        if (isApiError(r)) throw r.error;
        await onRefreshViews();
      } catch (err) {
        console.error("Failed to delete view", err);
        setError(apiErrorMessage(err, t("filterBar:saveModal.failed")));
      } finally {
        setBusy(false);
      }
    },
    [onRefreshViews, t]
  );

  if (!open) return null;

  const isRenamingAny = renamingId != null;

  return (
    <ModalShell busy={busy} title={t("filterBar:configModal.title")} onClose={onClose}>
      {error && <ErrorState message={error} tone="warning" size="sm" className="mb-4 leading-5" />}
      <div className={busy ? "pointer-events-none opacity-60" : ""}>
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {scopedViews.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">{t("filterBar:configModal.empty")}</div>
          )}

          {scopedViews.map((v) => {
            const isRenaming = renamingId === v.id;

            return (
              <div key={v.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <Switch
                  checked={!!v.is_default}
                  onChange={() => void toggleDefaultView(v)}
                  label={`${t("filterBar:saveModal.setDefault")}: ${v.name}`}
                  disabled={busy || isRenamingAny}
                />

                <div className="min-w-0 flex-1">
                  {isRenaming ? (
                    <input
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      value={renamingName}
                      onChange={(e) => setRenamingName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-800">{v.name}</span>
                  )}
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {isRenaming ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || !renamingName.trim()}
                        className="bg-white hover:bg-gray-50"
                        onClick={() => void renameView()}
                      >
                        {t("filterBar:configModal.saveName")}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        className="bg-white hover:bg-gray-50"
                        onClick={() => {
                          setRenamingId(null);
                          setRenamingName("");
                        }}
                      >
                        {t("filterBar:configModal.cancel")}
                      </Button>
                    </>
                  ) : (
                    <PermissionMiddleware codeName="change_entry_view">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setRenamingId(v.id);
                          setRenamingName(v.name);
                        }}
                        className="inline-flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        {t("filterBar:configModal.rename")}
                      </Button>
                    </PermissionMiddleware>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      const fresh = viewById.get(v.id) ?? v;
                      onApplyViewToForm(fresh);
                    }}
                  >
                    {t("filterBar:configModal.apply")}
                  </Button>
                  <PermissionMiddleware codeName="delete_entry_view">
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void deleteView(v.id)}>
                      {t("filterBar:configModal.delete")}
                    </Button>
                  </PermissionMiddleware>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-3">
          <Button variant="outline" size="sm" disabled={busy} className="bg-white hover:bg-gray-50" onClick={onClose}>
            {t("filterBar:configModal.footerClose")}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};
