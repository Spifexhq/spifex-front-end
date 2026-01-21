import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";

import SelectDropdown from "@/shared/ui/SelectDropdown/SelectDropdown";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";

import { api } from "@/api/requests";
import type { ApiResponse } from "@/models/Api";
import type { LocalFilters, Visualization } from "@/models/components/filterBar";
import { isApiError, toEntryFilters } from "../FilterBar.utils";
import { ModalShell } from "../ui/ModalShell";

export const SaveViewModal: React.FC<{
  t: TFunction;
  open: boolean;
  onClose: () => void;

  scopedViews: Visualization[];
  localFilters: LocalFilters;

  onRefreshViews: () => Promise<void>;
}> = ({ t, open, onClose, scopedViews, localFilters, onRefreshViews }) => {
  const [busy, setBusy] = useState(false);

  const [saveName, setSaveName] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const [saveMode, setSaveMode] = useState<"create" | "overwrite">("create");
  const [overwriteView, setOverwriteView] = useState<Visualization | null>(null);

  const reset = useCallback(() => {
    setSaveName("");
    setSaveDefault(false);
    setSaveMode("create");
    setOverwriteView(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const canSave = useMemo(() => {
    const nameOk = !!saveName.trim();
    const overwriteOk = saveMode !== "overwrite" || !!overwriteView;
    return nameOk && overwriteOk && !busy;
  }, [busy, overwriteView, saveMode, saveName]);

  const saveView = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;

    const payload = {
      name,
      is_default: saveDefault,
      settlement_status: !!localFilters.settlement_status,
      filters: toEntryFilters(localFilters),
    };

    try {
      setBusy(true);

      if (saveMode === "overwrite" && overwriteView) {
        const r: ApiResponse<unknown> = await api.editViewPreset(overwriteView.id, payload);
        if (isApiError(r)) throw r.error;
      } else {
        const sameName = scopedViews.find((v) => v.name.toLowerCase() === name.toLowerCase());
        if (sameName) {
          const r: ApiResponse<unknown> = await api.editViewPreset(sameName.id, payload);
          if (isApiError(r)) throw r.error;
        } else {
          const r: ApiResponse<unknown> = await api.addViewPreset(payload);
          if (isApiError(r)) throw r.error;
        }
      }

      await onRefreshViews();
      onClose();
      reset();
    } catch (err) {
      console.error("Failed to save visualization", err);
    } finally {
      setBusy(false);
    }
  }, [localFilters, onClose, onRefreshViews, overwriteView, reset, saveDefault, saveMode, saveName, scopedViews]);

  if (!open) return null;

  return (
    <ModalShell
      busy={busy}
      title={t("filterBar:saveModal.title")}
      onClose={() => {
        onClose();
        reset();
      }}
      maxWidthClass="max-w-md"
    >
      <div className={busy ? "pointer-events-none opacity-60" : ""}>
        <div className="space-y-4 text-xs text-gray-700">
          <p className="text-[12px] text-gray-600">{t("filterBar:saveModal.description")}</p>

          <label className="block space-y-1">
            <Input
              kind="text"
              label={t("filterBar:saveModal.name")}
              value={saveName}
              onChange={(e) => setSaveName(e.currentTarget.value)}
              placeholder={t("filterBar:saveModal.namePlaceholder")}
            />
          </label>

          <label className="inline-flex items-center gap-2">
            <Checkbox checked={saveDefault} size="small" onChange={(e) => setSaveDefault(e.target.checked)} />
            <span>{t("filterBar:saveModal.setDefault")}</span>
          </label>

          <div className="space-y-2">
            <div className="font-semibold text-[12px]">{t("filterBar:saveModal.modeTitle")}</div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  size="small"
                  checked={saveMode === "create"}
                  onChange={() => {
                    setSaveMode("create");
                    setOverwriteView(null);
                  }}
                />
                <span>{t("filterBar:saveModal.create")}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  size="small"
                  checked={saveMode === "overwrite"}
                  onChange={() => setSaveMode("overwrite")}
                />
                <span>{t("filterBar:saveModal.overwrite")}</span>
              </label>
            </div>

            {saveMode === "overwrite" && (
              <div className="mt-2 space-y-1">
                <SelectDropdown<Visualization>
                  label={t("filterBar:saveModal.chooseView")}
                  items={scopedViews}
                  selected={overwriteView ? [overwriteView] : []}
                  onChange={(list) => setOverwriteView(list[0] ?? null)}
                  getItemKey={(item) => item.id}
                  getItemLabel={(item) =>
                    item.is_default ? `${item.name} (${t("filterBar:saveModal.defaultShort")})` : item.name
                  }
                  buttonLabel={t("filterBar:saveModal.choosePlaceholder")}
                  singleSelect
                  hideCheckboxes
                  customStyles={{ maxHeight: "240px" }}
                />
                <p className="text-[11px] text-gray-500">{t("filterBar:saveModal.overwriteHint")}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              className="bg-white hover:bg-gray-50"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              {t("filterBar:saveModal.cancel")}
            </Button>

            <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" disabled={!canSave} onClick={() => void saveView()}>
              {t("filterBar:saveModal.save")}
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
