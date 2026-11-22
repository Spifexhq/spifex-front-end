import { useTranslation } from "react-i18next";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode, type HTMLAttributes, type FormHTMLAttributes } from "react";
function splitActions(children: ReactNode) {
  const parts = Children.toArray(children);
  const last = parts[parts.length - 1];
  const actions = isValidElement(last) && typeof (last.props as { className?: string }).className === "string" && /justify-end/.test((last.props as { className: string }).className);
  return { body: actions ? parts.slice(0, -1) : parts, actions: actions ? (last as ReactElement<{ children?: ReactNode }>) : null };
}
/**
 * The dismiss button leads the action group in every form footer. Move it to
 * the end so it keeps the right-most slot the old footer Close used to own.
 */
function dismissLast(actions: ReactElement<{ children?: ReactNode }>) {
  const parts = Children.toArray(actions.props.children);
  const index = parts.findIndex(part => isValidElement(part) && (part.props as { type?: string }).type === "button");
  if (index < 0 || index === parts.length - 1) return actions;
  const [dismiss] = parts.splice(index, 1);
  return cloneElement(actions, undefined, ...parts, dismiss);
}
type RecordHintProps = { recordLabel?: ReactNode; recordName?: string };
export function SidePanelHint({ recordLabel, recordName, editable = false }: RecordHintProps & { editable?: boolean }) {
  const { t } = useTranslation("common");
  const name = recordName?.trim();
  return <p className="settings-modal-hint">{recordLabel && name ? <span>{recordLabel}: <b>{name}</b></span> : null}<span>{t(editable ? "modalHints.editShortcuts" : "modalHints.previewShortcuts")}</span></p>;
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
  }} className="settings-modal-form"><div className={`settings-modal-scroll ${className}`}>{body}</div>{actions && <SidePanelFooter><div className="settings-modal-footer-layout settings-modal-footer-layout--actions-only"><SidePanelHint recordLabel={recordLabel} recordName={recordName} editable /><div className="settings-modal-action-buttons">{dismissLast(actions)}</div></div></SidePanelFooter>}</form>;
}
/** Layout only: each feature owns its action labels and button variants. */
export function SidePanelFooter({ children, ...props }: Omit<HTMLAttributes<HTMLElement>, "className" | "style">) {
  return <footer {...props} className="settings-modal-footer">{children}</footer>;
}
