import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import { Pencil } from "lucide-react";

import { api } from "@/api/requests";
import type { ApiResponse } from "@/models/Api";
import type { Visualization } from "@/models/components/filterBar";
import { isApiError } from "../FilterBar.utils";
import { ModalShell } from "../ui/ModalShell";

export const ViewsConfigModal: React.FC<{
  t: TFunction;
  open: boolean;
  onClose: () => void;

  scopedViews: Visualization[];
  onApplyViewToForm: (view: Visualization) => void;
  onRefreshViews: () => Promise<void>;
}> = ({ t, open, onClose, scopedViews, onApplyViewToForm, onRefreshViews }) => {
  const [busy, setBusy] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  useEffect(() => {
    if (!open) {
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
      } finally {
        setBusy(false);
      }
    },
    [onRefreshViews, scopedViews, renamingId]
  );

  const renameView = useCallback(async () => {
    const id = renamingId;
    const name = renamingName.trim();
    if (!id || !name) return;

    try {
      setBusy(true);
      const r: ApiResponse<unknown> = await api.editViewPreset(id, { name });
      if (isApiError(r)) throw r.error;
      await onRefreshViews();
    } catch (err) {
      console.error("Failed to rename view", err);
    } finally {
      setBusy(false);
      setRenamingId(null);
      setRenamingName("");
    }
  }, [onRefreshViews, renamingId, renamingName]);

  const deleteView = useCallback(
    async (id: string) => {
      try {
        setBusy(true);
        const r: ApiResponse<unknown> = await api.deleteViewPreset(id);
        if (isApiError(r)) throw r.error;
        await onRefreshViews();
      } catch (err) {
        console.error("Failed to delete view", err);
      } finally {
        setBusy(false);
      }
    },
    [onRefreshViews]
  );

  if (!open) return null;

  const isRenamingAny = renamingId != null;

  return (
    <ModalShell busy={busy} title={t("filterBar:configModal.title")} onClose={onClose}>
      <div className={busy ? "pointer-events-none opacity-60" : ""}>
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {scopedViews.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">{t("filterBar:configModal.empty")}</div>
          )}

          {scopedViews.map((v) => {
            const isRenaming = renamingId === v.id;

            return (
              <div key={v.id} className="px-3 py-2 flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <Checkbox
                    checked={!!v.is_default}
                    size="small"
                    disabled={busy || isRenamingAny} // freeze while renaming
                    onChange={() => void toggleDefaultView(v)}
                  />

                  {isRenaming ? (
                    <input
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      value={renamingName}
                      onChange={(e) => setRenamingName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-800">{v.name}</span>
                  )}
                </label>

                <div className="ml-auto flex items-center gap-2">
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

                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void deleteView(v.id)}>
                    {t("filterBar:configModal.delete")}
                  </Button>
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
