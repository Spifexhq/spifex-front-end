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
export function SettingsModalHint({ recordLabel, recordName, editable = false }: RecordHintProps & { editable?: boolean }) {
  const { t } = useTranslation("common");
  return <p className="settings-modal-hint">{recordLabel && <span>{recordLabel}: <b>{recordName?.trim() || "—"}</b></span>}<span>{t(editable ? "modalHints.editShortcuts" : "modalHints.previewShortcuts")}</span></p>;
}
export function SettingsModalForm({ children, className = "", recordLabel, recordName, onKeyDown, ...props }: FormHTMLAttributes<HTMLFormElement> & RecordHintProps) {
  const { body, actions } = splitActions(children);
  return <form {...props} onKeyDown={event => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    const submitter = event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]:not(:disabled)');
    if (submitter) event.currentTarget.requestSubmit(submitter);
  }} className="settings-modal-form"><div className={`settings-modal-scroll ${className}`}>{body}</div>{actions && <SettingsModalFooter className="settings-modal-footer"><div className="settings-modal-footer-layout"><SettingsModalHint recordLabel={recordLabel} recordName={recordName} editable /><div className="settings-modal-action-buttons">{actions}</div></div></SettingsModalFooter>}</form>;
}
/** Preview content shares the same scroll region and pinned footer as forms. */
export function SettingsModalContent({ children, recordLabel, recordName }: { children: ReactNode } & RecordHintProps) {
  const parts = Children.toArray(children);
  const wrapper = parts.length === 1 && isValidElement(parts[0]) && parts[0].type === "div" ? parts[0] as Container : null;
  const split = splitActions(wrapper ? wrapper.props.children : children);
  return <><div className="settings-modal-scroll">{wrapper ? cloneElement(wrapper, { children: split.body }) : split.body}</div>{split.actions && <footer className="settings-modal-footer"><div className="settings-modal-footer-layout"><SettingsModalHint recordLabel={recordLabel} recordName={recordName} /><div className="settings-modal-action-buttons">{split.actions}</div></div></footer>}</>;
}

/** Use the same action labels and secondary-button treatment as Departments. */
export function SettingsModalFooter({ children, ...props }: HTMLAttributes<HTMLElement>) {
  const { t } = useTranslation("departmentSettings");
  function standardize(nodes: ReactNode): ReactNode {
    return Children.map(nodes, node => {
      if (!isValidElement(node)) return node;
      const element = node as ReactElement<{ type?: string; variant?: string; children?: ReactNode }>;
      if (element.props.type === "submit") return cloneElement(element, { children: t("buttons.save") });
      if (element.props.type === "button" && ["cancel", "outline"].includes(element.props.variant ?? "")) return cloneElement(element, { variant: "cancel", children: t("buttons.cancel") });
      return element.props.children ? cloneElement(element, { children: standardize(element.props.children) }) : element;
    });
  }
  return <footer {...props}>{standardize(children)}</footer>;
}
