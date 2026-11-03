import { useTranslation } from "react-i18next";
import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode, type HTMLAttributes, type FormHTMLAttributes } from "react";
type Container = ReactElement<{ children?: ReactNode; className?: string }>;
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
  return <form {...props} onKeyDown={event => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    const submitter = event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]:not(:disabled)');
    if (submitter) event.currentTarget.requestSubmit(submitter);
  }} className="settings-modal-form"><div className={`settings-modal-scroll ${className}`}>{body}</div>{actions && <SidePanelFooter className="settings-modal-footer"><div className="settings-modal-footer-layout"><SidePanelHint recordLabel={recordLabel} recordName={recordName} editable /><div className="settings-modal-action-buttons">{actions}</div></div></SidePanelFooter>}</form>;
}
/** Preview content shares the same scroll region and pinned footer as forms. */
export function SidePanelContent({ children, recordLabel, recordName }: { children: ReactNode } & RecordHintProps) {
  const parts = Children.toArray(children);
  const wrapper = parts.length === 1 && isValidElement(parts[0]) && parts[0].type === "div" ? parts[0] as Container : null;
  const split = splitActions(wrapper ? wrapper.props.children : children);
  return <><div className="settings-modal-scroll">{wrapper ? cloneElement(wrapper, { children: split.body }) : split.body}</div>{split.actions && <footer className="settings-modal-footer"><div className="settings-modal-footer-layout"><SidePanelHint recordLabel={recordLabel} recordName={recordName} /><div className="settings-modal-action-buttons">{split.actions}</div></div></footer>}</>;
}

/** Layout only: each feature owns its action labels and button variants. */
export function SidePanelFooter({ children, ...props }: HTMLAttributes<HTMLElement>) {
  return <footer {...props}>{children}</footer>;
}
