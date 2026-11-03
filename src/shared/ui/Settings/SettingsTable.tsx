import { Children, cloneElement, isValidElement, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
type Cell = ReactElement<{ children?: ReactNode; className?: string; colSpan?: number }>;
function elements(children: ReactNode): Cell[] { return Children.toArray(children).filter(isValidElement) as Cell[]; }
/** Keep table semantics on desktop and show labelled record cards on mobile. */
export default function SettingsTable({ children, className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  const sections = elements(children);
  const head = sections.find(section => section.type === "thead");
  const labels = elements(elements(head?.props.children)[0]?.props.children).map(cell => cell.props.children);
  const body = sections.map(section => section.type !== "tbody" ? section : cloneElement(section, {
    children: elements(section.props.children).map(row => row.type !== "tr" ? row : cloneElement(row, {
      children: elements(row.props.children).map((cell, index) => cell.type !== "td" ? cell : cloneElement(cell, {
        className: `${cell.props.className ?? ""} ${cell.props.colSpan && cell.props.colSpan > 1 ? "settings-empty-cell" : ""}`,
        children: <>{labels[index] && !cell.props.colSpan && <span className="settings-cell-label" aria-hidden="true">{labels[index]}</span>}<div className="settings-cell-value">{cell.props.children}</div></>,
      })),
    })),
  }));
  return <table {...props} className={`settings-record-table ${className}`}>{body}</table>;
}
