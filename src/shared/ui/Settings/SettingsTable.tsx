import SettingsList from "./SettingsList";
import { ListContext } from "./SettingsListContext";
import { useContext, useEffect } from "react";
import { Children, cloneElement, isValidElement, type MouseEvent, type KeyboardEvent, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
type SettingsTableProps = HTMLAttributes<HTMLTableElement> & { onRowOpen?: (index: number) => void };
type Cell = ReactElement<{ children?: ReactNode; className?: string; colSpan?: number }>;
function elements(children: ReactNode): Cell[] { return Children.toArray(children).filter(isValidElement) as Cell[]; }
/** Keep table semantics on desktop and show labelled record cards on mobile. */
function SettingsTableContent({ children, className = "", onRowOpen, ...props }: SettingsTableProps) {
  const sections = elements(children);
  const head = sections.find(section => section.type === "thead");
  const labels = elements(elements(head?.props.children)[0]?.props.children).map(cell => cell.props.children);
  const { index, size, setCount } = useContext(ListContext);
  const allRows = elements(sections.find(section => section.type === "tbody")?.props.children);
  const empty = allRows.length === 1 && elements(allRows[0].props.children).some(cell => (cell.props.colSpan ?? 1) > 1);
  const count = empty ? 0 : allRows.length;
  useEffect(() => setCount(count), [count, setCount]);
  const body = sections.map(section => section.type !== "tbody" ? section : cloneElement(section, {
    children: (empty ? allRows : allRows.slice(index * size, (index + 1) * size)).map((row, rowIndex) => row.type !== "tr" ? row : cloneElement(row as ReactElement<HTMLAttributes<HTMLTableRowElement>>, {
      tabIndex: onRowOpen && !empty ? 0 : undefined,
      className: onRowOpen && !empty ? "settings-clickable-table-row" : undefined,
      onClick: (event: MouseEvent<HTMLTableRowElement>) => { if (onRowOpen && !empty && !(event.target as Element).closest("button,a,input,select,textarea")) onRowOpen(index * size + rowIndex); },
      onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => { if (onRowOpen && !empty && event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); onRowOpen(index * size + rowIndex); } },
      children: elements(row.props.children).map((cell, index) => cell.type !== "td" ? cell : cloneElement(cell, {
        className: `${cell.props.className ?? ""} ${cell.props.colSpan && cell.props.colSpan > 1 ? "settings-empty-cell" : ""}`,
        children: <>{labels[index] && !cell.props.colSpan && <span className="settings-cell-label" aria-hidden="true">{labels[index]}</span>}<div className="settings-cell-value">{cell.props.children}</div></>,
      })),
    })),
  }));
  return <table {...props} className={`settings-record-table ${className}`}>{body}</table>;
}

export default function SettingsTable(props: SettingsTableProps) { return <SettingsList className="settings-table-list"><SettingsTableContent {...props} /></SettingsList>; }
