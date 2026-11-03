import { Children, isValidElement, useEffect, useId, type ReactNode } from "react";
import { SettingsModalFrame, SettingsModalHeader } from "@/shared/ui/Settings/SettingsModalFrame";
import { SettingsModalContent, SettingsModalForm } from "@/shared/ui/Settings/SettingsModalContent";

type Props = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose(): void;
  children: ReactNode;
  recordLabel?: ReactNode;
  recordName?: string;
  contentClassName?: string;
  /** Optional preview actions. Rendered in the Department-style pinned footer. */
  footer?: ReactNode;
};

/**
 * Keep the same frame and close behaviour as DepartmentModal.
 * Edit forms own their scroll/footer. Previews need a flex-column container so
 * their scrollable region is constrained to the drawer instead of growing beyond
 * the viewport.
 */
export default function AccountingSideModal({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  recordLabel,
  recordName,
  contentClassName = "",
  footer,
}: Props) {
  const generatedId = useId();
  const titleId = `accounting-side-modal-${generatedId.replace(/:/g, "")}`;

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
    (onlyChild.type === SettingsModalForm || onlyChild.type === "form");
  const isPreviewContent = isValidElement(onlyChild) && onlyChild.type === SettingsModalContent;

  return (
    <SettingsModalFrame
      isOpen={isOpen}
      labelledBy={titleId}
      className="accounting-dialog"
    >
      <SettingsModalHeader
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
              <footer
                className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:px-5"
                style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="hidden text-[12px] text-gray-600 md:block">
                    {recordLabel ?? title}: <b>{recordName?.trim() || subtitle || "—"}</b>
                  </p>
                  <div className="flex flex-wrap justify-end gap-2 md:ml-auto">
                    {footer}
                  </div>
                </div>
              </footer>
            </>
          ) : isPreviewContent ? children : (
            <SettingsModalContent recordLabel={recordLabel ?? title} recordName={recordName ?? subtitle}>
              <div className={`settings-modal-inner min-w-0 ${contentClassName}`}>
                {children}
              </div>
            </SettingsModalContent>
          )}
        </div>
      )}
    </SettingsModalFrame>
  );
}
