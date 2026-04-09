/* -------------------------------------------------------------------------- */
/* File: src/pages/ProjectSettings/ProjectModal.tsx                           */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import Shimmer from "@/shared/ui/Loaders/Shimmer";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { api } from "@/api/requests";

import type { Project } from "@/models/settings/projects";

/* ------------------------- Types / constants ----------------------------- */
const PROJECT_TYPE_VALUES = [
  "internal",
  "client",
  "research",
  "operational",
  "marketing",
  "product",
  "it",
  "event",
  "capex",
] as const;

type ProjectType = (typeof PROJECT_TYPE_VALUES)[number];
type TypeOption = { label: string; value: ProjectType };

function isProjectType(v: unknown): v is ProjectType {
  return PROJECT_TYPE_VALUES.includes(v as ProjectType);
}

type Mode = "create" | "edit";

type FormState = {
  name: string;
  code: string;
  type: ProjectType;
  description: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  code: "",
  type: "internal",
  description: "",
  is_active: true,
};

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

export type ProjectModalProps = {
  isOpen: boolean;
  mode: Mode;
  project?: Project | null;

  onClose: () => void;
  onNotify?: (snack: Snack) => void;
  onSaved?: (result: { mode: Mode; created?: Project }) => void;
};

const ModalSkeleton: React.FC = () => (
  <div className="space-y-4 py-1">
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <div className="flex items-center gap-2 pt-2">
      <Shimmer className="h-5 w-5 rounded" />
      <Shimmer className="h-4 w-28 rounded" />
    </div>
    <div className="flex justify-end gap-2 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

function normalizeComparable(form: FormState) {
  const trim = (v: string) => (v ?? "").trim();
  return {
    name: trim(form.name),
    code: trim(form.code),
    type: isProjectType(form.type) ? form.type : "internal",
    description: trim(form.description),
    is_active: !!form.is_active,
  };
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  mode,
  project,
  onClose,
  onNotify,
  onSaved,
}) => {
  const { t } = useTranslation("projectSettings");

  const projectId = project?.id ?? null;

  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef<string>(JSON.stringify(normalizeComparable(emptyForm)));

  const typeOptions = useMemo<TypeOption[]>(
    () =>
      PROJECT_TYPE_VALUES.map((value) => ({
        value,
        label: t(`types.${value}`),
      })),
    [t]
  );

  const title = useMemo(() => {
    return mode === "create" ? t("modal.createTitle") : t("modal.editTitle");
  }, [mode, t]);

  const badge = "PJ";
  const effectiveBusy = isSubmitting || isDetailLoading;

  const isDirty = useMemo(() => {
    const now = JSON.stringify(normalizeComparable(formData));
    return now !== baselineRef.current;
  }, [formData]);

  const isSaveDisabled = useMemo(() => {
    if (effectiveBusy) return true;
    if (!formData.name.trim()) return true;
    if (!isProjectType(formData.type)) return true;
    return false;
  }, [effectiveBusy, formData.name, formData.type]);

  const resetInternalState = useCallback(() => {
    setFormData(emptyForm);
    setIsDetailLoading(false);
    setIsSubmitting(false);
    setShowCloseConfirm(false);
    setWarning(null);
    baselineRef.current = JSON.stringify(normalizeComparable(emptyForm));
  }, []);

  const handleClose = useCallback(() => {
    resetInternalState();
    onClose();
  }, [onClose, resetInternalState]);

  const attemptClose = useCallback(() => {
    if (effectiveBusy) return;

    if (warning) {
      setWarning(null);
      return;
    }

    if (showCloseConfirm) return;

    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }

    handleClose();
  }, [effectiveBusy, handleClose, isDirty, showCloseConfirm, warning]);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      resetInternalState();

      if (mode === "create") {
        requestAnimationFrame(() => nameRef.current?.focus());
        return;
      }

      if (!projectId) return;

      setIsDetailLoading(true);

      try {
        const res = await api.getProject(projectId);
        const detail = res.data as Project;
        if (!alive) return;

        const next: FormState = {
          name: detail.name ?? "",
          code: detail.code ?? "",
          type: isProjectType(detail.type) ? detail.type : "internal",
          description: detail.description ?? "",
          is_active: detail.is_active ?? true,
        };

        setFormData(next);
        baselineRef.current = JSON.stringify(normalizeComparable(next));
        requestAnimationFrame(() => nameRef.current?.focus());
      } catch {
        if (!alive) return;

        const fallback: FormState = {
          name: project?.name ?? "",
          code: project?.code ?? "",
          type: isProjectType(project?.type) ? (project!.type as ProjectType) : "internal",
          description: project?.description ?? "",
          is_active: project?.is_active ?? true,
        };

        setFormData(fallback);
        baselineRef.current = JSON.stringify(normalizeComparable(fallback));
        onNotify?.({ message: t("errors.detailError"), severity: "error" });
        requestAnimationFrame(() => nameRef.current?.focus());
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, projectId, resetInternalState, onNotify, t, project]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.getElementById("projectModalForm") as HTMLFormElement | null)?.requestSubmit();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = formData.name.trim();

      if (!name) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationName") });
        return;
      }

      if (!isProjectType(formData.type)) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationType") });
        return;
      }

      const payload = {
        name,
        code: (formData.code ?? "").trim(),
        type: formData.type,
        description: (formData.description ?? "").trim(),
        is_active: !!formData.is_active,
      };

      setIsSubmitting(true);

      try {
        if (mode === "create") {
          const { data: created } = await api.addProject(payload);
          onNotify?.({ message: t("toast.saved"), severity: "success" });
          onSaved?.({ mode: "create", created: created as Project });
          handleClose();
          return;
        }

        if (!projectId) return;

        await api.editProject(projectId, payload);
        onNotify?.({ message: t("toast.saved"), severity: "success" });
        onSaved?.({ mode: "edit" });
        handleClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("errors.saveError");
        onNotify?.({ message: msg, severity: "error" });
        setWarning({ title: t("errors.saveError"), message: msg });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, mode, projectId, onNotify, onSaved, handleClose, t]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 md:grid md:place-items-center" >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className={[
          "relative bg-white shadow-2xl flex flex-col w-full overflow-hidden",
          "h-[100dvh] max-h-[100dvh] rounded-none border-0 fixed inset-x-0 bottom-0",
          "md:static md:w-[860px] md:max-w-[95vw] md:h-auto md:max-h-[calc(100vh-4rem)]",
          "md:rounded-lg md:border md:border-gray-200",
        ].join(" ")}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <header className="border-b border-gray-200 bg-white shrink-0">
          <div className="px-4 md:px-5 pt-2 md:pt-4 pb-3 md:pb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700 shrink-0">
                {badge}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                <h1 id="project-modal-title" className="text-[16px] font-semibold text-gray-900 leading-snug truncate">
                  {title}
                </h1>
              </div>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center disabled:opacity-50 shrink-0"
              onClick={attemptClose}
              aria-label={t("modal.close")}
              disabled={effectiveBusy}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form
          id="projectModalForm"
          className="flex flex-1 min-h-0 flex-col md:block md:flex-none"
          onSubmit={submit}
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:block md:max-h-none md:overflow-visible md:px-5">
            {mode === "edit" && isDetailLoading ? (
              <ModalSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  kind="text"
                  label={t("field.name")}
                  name="name"
                  ref={nameRef}
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                  disabled={effectiveBusy}
                />

                <Input
                  kind="text"
                  label={t("field.code")}
                  name="code"
                  value={formData.code}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                  disabled={effectiveBusy}
                />

                <div className="md:col-span-2">
                  <SelectDropdown<TypeOption>
                    label={t("field.type")}
                    items={typeOptions}
                    selected={typeOptions.filter((opt) => opt.value === formData.type)}
                    onChange={(items) => items[0] && setFormData((p) => ({ ...p, type: items[0].value }))}
                    getItemKey={(i) => i.value}
                    getItemLabel={(i) => i.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("btnLabel.type")}
                    customStyles={{ maxHeight: "240px" }}
                    disabled={effectiveBusy}
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    kind="text"
                    label={t("field.description")}
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    disabled={effectiveBusy}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <Checkbox
                    checked={!!formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                    disabled={effectiveBusy}
                  />
                  {t("field.isActive")}
                </label>
              </div>
            )}
          </div>

          <footer
            className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-[12px] text-gray-600 hidden md:block">
                {formData.name.trim() ? (
                  <>
                    {t("footer.project")} <b>{formData.name.trim()}</b>
                  </>
                ) : (
                  <>{t("footer.enterName")}</>
                )}
                <span className="ml-3 text-gray-400">{t("footer.shortcuts")}</span>
              </p>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button variant="cancel" type="button" onClick={attemptClose} disabled={effectiveBusy} className="w-full md:w-auto">
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" disabled={isSaveDisabled} className="w-full md:w-auto">
                  {t("btn.save")}
                </Button>
              </div>
            </div>
          </footer>
        </form>

        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("confirmDiscard.title")}</h2>
                <p className="mt-1 text-[12px] text-gray-600">{t("confirmDiscard.message")}</p>
              </div>
              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="outline"
                  className="w-full md:w-auto !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  {t("btn.cancel")}
                </Button>
                <Button variant="danger" className="w-full md:w-auto !bg-red-500 hover:!bg-red-600" onClick={handleClose}>
                  {t("actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {warning && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 className="text-[15px] font-semibold text-amber-800">{warning.title}</h2>
                <p className="mt-1 text-[12px] text-amber-700">{warning.message}</p>
              </div>
              <div
                className="px-5 py-4 flex justify-end"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="primary"
                  className="w-full md:w-auto"
                  onClick={() => {
                    setWarning(null);
                    requestAnimationFrame(() => nameRef.current?.focus());
                  }}
                >
                  {t("actions.ok")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectModal;