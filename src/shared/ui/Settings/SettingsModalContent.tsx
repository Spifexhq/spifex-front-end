import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode, type FormHTMLAttributes } from "react";
type Container = ReactElement<{ children?: ReactNode; className?: string }>;
function splitActions(children: ReactNode) {
  const parts = Children.toArray(children);
  const last = parts[parts.length - 1];
  const actions = isValidElement(last) && typeof (last.props as { className?: string }).className === "string" && /justify-end/.test((last.props as { className: string }).className);
  return { body: actions ? parts.slice(0, -1) : parts, actions: actions ? last : null };
}
export function SettingsModalForm({ children, className = "", ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const { body, actions } = splitActions(children);
  return <form {...props} className="settings-modal-form"><div className={`settings-modal-scroll ${className}`}>{body}</div>{actions && <footer className="settings-modal-footer">{actions}</footer>}</form>;
}
/** Preview content shares the same scroll region and pinned footer as forms. */
export function SettingsModalContent({ children }: { children: ReactNode }) {
  const parts = Children.toArray(children);
  const wrapper = parts.length === 1 && isValidElement(parts[0]) && parts[0].type === "div" ? parts[0] as Container : null;
  const split = splitActions(wrapper ? wrapper.props.children : children);
  return <><div className="settings-modal-scroll">{wrapper ? cloneElement(wrapper, { children: split.body }) : split.body}</div>{split.actions && <footer className="settings-modal-footer">{split.actions}</footer>}</>;
}
