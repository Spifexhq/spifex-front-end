import { Children, isValidElement, useEffect, useId, type ReactNode } from "react";
import { SidePanelFrame, SidePanelHeader } from "./SidePanelFrame";
import { SidePanelContent, SidePanelForm, SidePanelHint } from "./SidePanelContent";

type Props = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose(): void;
  children: ReactNode;
  recordLabel?: ReactNode;
  recordName?: string;
  contentClassName?: string;
  className?: string;
  /** Optional preview actions. Rendered in the pinned footer. */
  footer?: ReactNode;
};

/**
 * A sliding dialog with a fixed header, scrollable body, and pinned actions.
 * Edit forms own their scroll/footer. Previews need a flex-column container so
 * their scrollable region is constrained to the drawer instead of growing beyond
 * the viewport.
 */
export default function SidePanel({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  recordLabel,
  recordName,
  contentClassName = "",
  className,
  footer,
}: Props) {
  const generatedId = useId();
  const titleId = `side-panel-${generatedId.replace(/:/g, "")}`;

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const nodes = Children.toArray(children);
  const onlyChild = nodes.length === 1 ? nodes[0] : null;
  const isForm = isValidElement(onlyChild) &&
    (onlyChild.type === SidePanelForm || onlyChild.type === "form");
  const isPreviewContent = isValidElement(onlyChild) && onlyChild.type === SidePanelContent;

  return (
    <SidePanelFrame
      isOpen={isOpen}
      labelledBy={titleId}
      className={className}
    >
      <SidePanelHeader
        titleId={titleId}
        title={title}
        subtitle={subtitle}
        onClose={onClose}
      />
      {isForm ? children : (
        <div className="settings-modal-form flex min-h-0 flex-1 flex-col overflow-hidden">
          {footer ? (
            <>
              <div className="settings-modal-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
                <div className={`settings-modal-inner min-w-0 ${contentClassName}`}>{children}</div>
              </div>
              <footer className="settings-modal-footer">
                <div className="settings-modal-footer-layout">
                  <SidePanelHint recordLabel={recordLabel ?? title} recordName={recordName ?? subtitle} />
                  <div className="settings-modal-action-buttons">
                    {footer}
                  </div>
                </div>
              </footer>
            </>
          ) : isPreviewContent ? children : (
            <SidePanelContent recordLabel={recordLabel ?? title} recordName={recordName ?? subtitle}>
              <div className={`settings-modal-inner min-w-0 ${contentClassName}`}>
                {children}
              </div>
            </SidePanelContent>
          )}
        </div>
      )}
    </SidePanelFrame>
  );
}
