import { useTranslation } from "react-i18next";
import { Children, isValidElement, type ReactNode, type HTMLAttributes, type FormHTMLAttributes } from "react";
function splitActions(children: ReactNode) {
  const parts = Children.toArray(children);
  const last = parts[parts.length - 1];
  const actions = isValidElement(last) && typeof (last.props as { className?: string }).className === "string" && /justify-end/.test((last.props as { className: string }).className);
  return { body: actions ? parts.slice(0, -1) : parts, actions: actions ? last : null };
}
type RecordHintProps = { recordLabel?: ReactNode; recordName?: string };
export function SidePanelHint({ recordLabel, recordName, editable = false }: RecordHintProps & { editable?: boolean }) {
  const { t } = useTranslation("common");
  return <p className="settings-modal-hint">{recordLabel && <span>{recordLabel}: <b>{recordName?.trim() || "—"}</b></span>}<span>{t(editable ? "modalHints.editShortcuts" : "modalHints.previewShortcuts")}</span></p>;
}
export function SidePanelForm({ children, className = "", recordLabel, recordName, onKeyDown, ...props }: FormHTMLAttributes<HTMLFormElement> & RecordHintProps) {
  const { body, actions } = splitActions(children);
  // Ctrl/Cmd+S submit shortcut; form semantics stay with the native element.
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
  return <form {...props} onKeyDown={event => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    const submitter = event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]:not(:disabled)');
    if (submitter) event.currentTarget.requestSubmit(submitter);
  }} className="settings-modal-form"><div className={`settings-modal-scroll ${className}`}>{body}</div>{actions && <SidePanelFooter><div className="settings-modal-footer-layout"><SidePanelHint recordLabel={recordLabel} recordName={recordName} editable /><div className="settings-modal-action-buttons">{actions}</div></div></SidePanelFooter>}</form>;
}
/** Layout only: each feature owns its action labels and button variants. */
export function SidePanelFooter({ children, ...props }: Omit<HTMLAttributes<HTMLElement>, "className" | "style">) {
  return <footer {...props} className="settings-modal-footer">{children}</footer>;
}
