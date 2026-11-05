import { Suspense, Children, isValidElement, useEffect, useId, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";
import { SidePanelFrame, SidePanelHeader } from "./SidePanelFrame";
import { SidePanelForm, SidePanelHint } from "./SidePanelForm";

import PreviewSkeleton from "./PreviewSkeleton";

type Props = {
  loading?: boolean;
  skeletonVariant?: "list" | "detail";
  skeletonRows?: number;
  isOpen: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  mode?: "preview" | "edit";
  busy?: boolean;
  tabs?: ReactNode;
  dialogRef?: RefObject<HTMLDivElement>;
  overlay?: ReactNode;
  onClose(): void;
  children: ReactNode;
  recordLabel?: ReactNode;
  recordName?: string;
  contentClassName?: string;
  className?: string;
  /** Optional preview actions. Rendered in the pinned footer. */
  footer?: ReactNode;
  showFooterHint?: boolean;
};

/**
 * A sliding dialog with a fixed header, scrollable body, and pinned actions.
 * Edit forms own their scroll/footer. Previews need a flex-column container so
 * their scrollable region is constrained to the drawer instead of growing beyond
 * the viewport.
 */
export default function SidePanel({
  isOpen,
  loading = false,
  skeletonVariant = "list",
  skeletonRows = 7,
  title,
  subtitle,
  eyebrow,
  onClose,
  children,
  recordLabel,
  recordName,
  contentClassName = "",
  className,
  footer,
  showFooterHint = false,
  mode, busy = false, tabs, dialogRef, overlay,
}: Props) {
  const { t } = useTranslation("common");
  const generatedId = useId();
  const titleId = `side-panel-${generatedId.replace(/:/g, "")}`;

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      if (!busy) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, busy]);

  const nodes = Children.toArray(children);
  const isForm = nodes.some(node => isValidElement(node) && (node.type === SidePanelForm || node.type === "form"));
  const editing = mode === "edit" || isForm;

  return (
    <SidePanelFrame
      isOpen={isOpen}
      labelledBy={titleId}
      className={className}
      dialogRef={dialogRef}
      onBackdropClose={!editing && !busy ? onClose : undefined}
    >
      <SidePanelHeader
        titleId={titleId}
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        onClose={onClose}
        disabled={busy}
      >{tabs}</SidePanelHeader>
      {editing ? children : (
        <div className="settings-modal-form flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="settings-modal-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
            <div className={`settings-modal-inner min-w-0 ${contentClassName}`}>{loading ? <PreviewSkeleton variant={skeletonVariant} rows={skeletonRows} /> : <Suspense fallback={<PreviewSkeleton variant={skeletonVariant} rows={skeletonRows} />}>{children}</Suspense>}</div>
          </div>
          <footer className={`settings-modal-footer ${!footer ? "md:hidden!" : ""}`}>
            <div className="settings-modal-footer-layout" style={!showFooterHint ? { justifyContent: "flex-end" } : undefined}>
              {showFooterHint && <SidePanelHint recordLabel={recordLabel ?? title} recordName={recordName ?? (typeof subtitle === "string" ? subtitle : undefined)} />}
              <div className="settings-modal-action-buttons">
                <span className="md:hidden!"><Button variant="cancel" disabled={busy} onClick={onClose}>{t("modal.close")}</Button></span>
                {footer}
              </div>
            </div>
          </footer>
        </div>
      )}
      {overlay}
    </SidePanelFrame>
  );
}
