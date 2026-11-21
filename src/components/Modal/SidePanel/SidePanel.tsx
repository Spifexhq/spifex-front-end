import { Suspense, Children, isValidElement, useId, type ReactNode, type RefObject } from "react";
import { SidePanelFrame, SidePanelHeader } from "./SidePanelFrame";
import { SidePanelForm, SidePanelFooter, SidePanelHint } from "./SidePanelForm";
import { SidePanelContext } from "./SidePanelContext";
import SidePanelFooterClose from "./SidePanelFooterClose";

import PreviewSkeleton from "./PreviewSkeleton";

type Props = {
  loading?: boolean;
  skeletonVariant?: "list" | "detail";
  skeletonRows?: number;
  isOpen: boolean;
  title: ReactNode;
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
  /** Preview stack depth; >0 narrows the drawer to reveal the previous page edge. */
  stackDepth?: number;
  /** Optional preview actions. Rendered in the pinned footer. */
  footer?: ReactNode;
};

/** Mirrors the real footer buttons so nothing appears once data resolves. */
function FooterActionsSkeleton() {
  return <div className="settings-modal-footer-skeleton" aria-hidden="true">
    <span className="h-[34px] w-[88px] rounded-md bg-gray-100 motion-safe:animate-pulse" />
    <span className="h-[34px] w-[132px] rounded-md bg-gray-100 motion-safe:animate-pulse" />
  </div>;
}

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
  eyebrow,
  onClose,
  children,
  recordLabel,
  recordName,
  contentClassName = "",
  className,
  footer,
  mode, busy = false, tabs, dialogRef, overlay, stackDepth = 0,
}: Props) {
  const generatedId = useId();
  const titleId = `side-panel-${generatedId.replace(/:/g, "")}`;

  const nodes = Children.toArray(children);
  const isForm = nodes.some(node => isValidElement(node) && (node.type === SidePanelForm || node.type === "form"));
  const editing = mode === "edit" || isForm;

  return (
    <SidePanelContext.Provider value={{ onClose, busy }}>
      <SidePanelFrame
        isOpen={isOpen}
        labelledBy={titleId}
        className={className}
        dialogRef={dialogRef}
        stackDepth={stackDepth}
        onClose={onClose}
        closeOnBackdrop={!editing && !busy}
        busy={busy}
        overlay={overlay}
        header={
          <SidePanelHeader
            titleId={titleId}
            title={title}
            eyebrow={eyebrow}
            onClose={onClose}
            disabled={busy}
          >{tabs}</SidePanelHeader>
        }
      >
        {editing ? children : (
          <div className="settings-modal-form flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="settings-modal-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
              <div className={`settings-modal-inner min-w-0 ${contentClassName}`}>{loading ? <PreviewSkeleton variant={skeletonVariant} rows={skeletonRows} /> : <Suspense fallback={<PreviewSkeleton variant={skeletonVariant} rows={skeletonRows} />}>{children}</Suspense>}</div>
            </div>
            <SidePanelFooter>
              <div className="settings-modal-footer-layout">
                <SidePanelHint recordLabel={recordLabel ?? title} recordName={recordName} />
                <div className="settings-modal-action-buttons">
                  {loading ? <FooterActionsSkeleton /> : footer}
                </div>
                <SidePanelFooterClose />
              </div>
            </SidePanelFooter>
          </div>
        )}
      </SidePanelFrame>
    </SidePanelContext.Provider>
  );
}
