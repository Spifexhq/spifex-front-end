import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Ban, Check, X } from "lucide-react";
import type { LookupOption } from "@/models/finance/imports";
import Button from "@/shared/ui/Button";
import SelectionBar from "@/shared/ui/SelectionBar";
import { SELECTION_BAR_SELECT_PANEL_Z_INDEX } from "@/shared/ui/Select/sizes";
import LookupSelect from "./LookupSelect";

type BulkSelection = {
  ids: string[];
  clear(): void;
};

/**
 * Finance bulk bar for statement review. It keeps the canonical selection-bar
 * anatomy: summary + clear, an action row, and an alertdialog confirmation for
 * the destructive exclude action instead of a fourth confirmation pattern.
 */
export default function ImportBulkSelectionBar({ open, selection, categories, busy, onApply, onExclude }: {
  open: boolean;
  selection: BulkSelection;
  categories: LookupOption[];
  busy: boolean;
  onApply(ids: string[], category: string): Promise<boolean>;
  onExclude(ids: string[]): Promise<boolean>;
}) {
  const { t } = useTranslation("statements");
  const reduced = useReducedMotion();
  const [category, setCategory] = useState("");
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const excludeRef = useRef<HTMLButtonElement>(null);
  const count = selection.ids.length;
  const idsKey = selection.ids.join("|");
  const confirmText = t("workspace.confirmExclude", { count });

  useEffect(() => {
    setConfirming(false);
  }, [idsKey]);

  useEffect(() => {
    if (!open) {
      setConfirming(false);
      setCategory("");
    }
  }, [open]);

  const cancel = () => {
    setConfirming(false);
    window.requestAnimationFrame(() => excludeRef.current?.focus({ preventScroll: true }));
  };

  const apply = async () => {
    if (!category) return;
    const saved = await onApply(selection.ids, category);
    if (saved) setCategory("");
  };

  const exclude = async () => {
    if (await onExclude(selection.ids)) setConfirming(false);
  };

  return <SelectionBar
    open={open}
    layout
    role={confirming ? "alertdialog" : "region"}
    label={confirming ? confirmText : t("workspace.selected", { count })}
    className="max-w-3xl"
    onKeyDown={event => {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      event.stopPropagation();
      if (confirming) cancel();
      else selection.clear();
    }}
  >
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-semibold text-gray-900">{t("workspace.selected", { count })}</p>
      <button type="button" disabled={busy} aria-label={t("workspace.clear")} title={t("workspace.clear")} onClick={selection.clear} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-800">
        <X size={15} aria-hidden="true" />
      </button>
    </div>
    <AnimatePresence mode="wait" initial={false}>
      {confirming ? <motion.div
        key="exclude-confirm"
        initial={{ opacity: 0, y: reduced ? 0 : 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -4 }}
        transition={{ duration: reduced ? 0 : 0.15, ease: "easeOut" }}
        onAnimationComplete={() => { if (!busy) cancelRef.current?.focus({ preventScroll: true }); }}
        className="mt-3 space-y-3 border-t border-gray-100 pt-3"
      >
        <p role="status" className="text-xs leading-5 text-gray-700">{confirmText}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button ref={cancelRef} type="button" size="sm" variant="outline" disabled={busy} onClick={cancel}>{t("workspace.cancel")}</Button>
          <Button type="button" size="sm" variant="danger" className="gap-1.5" isLoading={busy} disabled={busy} onClick={() => void exclude()}>
            <Ban size={13} aria-hidden="true" />{t("workspace.exclude")}
          </Button>
        </div>
      </motion.div> : <motion.div
        key="actions"
        initial={{ opacity: 0, y: reduced ? 0 : 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -4 }}
        transition={{ duration: reduced ? 0 : 0.15, ease: "easeOut" }}
        className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-gray-100 pt-3"
      >
        <div className="min-w-48 max-w-xs flex-1">
          <LookupSelect
            label={t("workspace.category")}
            hideLabel
            value={category}
            items={categories}
            onChange={setCategory}
            disabled={busy}
            panelZIndex={SELECTION_BAR_SELECT_PANEL_Z_INDEX}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" size="sm" variant="primary" className="gap-1.5" disabled={busy || !category} onClick={() => void apply()}>
            <Check size={13} aria-hidden="true" />{t("workspace.apply")}
          </Button>
          <Button ref={excludeRef} type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => setConfirming(true)}>
            <Ban size={13} aria-hidden="true" />{t("workspace.exclude")}
          </Button>
        </div>
      </motion.div>}
    </AnimatePresence>
  </SelectionBar>;
}
