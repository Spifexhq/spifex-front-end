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
      className: onRowOpen && !empty ? "settings-clickable-table-row cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-400" : undefined,
      onClick: (event: MouseEvent<HTMLTableRowElement>) => { if (onRowOpen && !empty && !(event.target as Element).closest("button,a,input,select,textarea")) onRowOpen(index * size + rowIndex); },
      onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => { if (onRowOpen && !empty && event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); onRowOpen(index * size + rowIndex); } },
      children: elements(row.props.children).map((cell, index) => cell.type !== "td" ? cell : cloneElement(cell, {
        className: `${cell.props.className ?? ""} ${cell.props.colSpan && cell.props.colSpan > 1 ? "settings-empty-cell" : ""}`,
        children: <>{labels[index] && !cell.props.colSpan && <span className="settings-cell-label mb-1 block text-[11px] font-medium text-gray-500 md:hidden" aria-hidden="true">{labels[index]}</span>}<div className="settings-cell-value min-w-0 break-words">{cell.props.children}</div></>,
      })),
    })),
  }));
  return <table {...props} className={`settings-record-table w-full border-collapse text-xs text-slate-700 [&_th]:border-b [&_th]:border-gray-200 [&_th]:bg-white! [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:whitespace-nowrap [&_th]:text-slate-500 [&_td]:border-b [&_td]:border-gray-100 [&_td]:px-4 [&_td]:py-2.5 [&_td]:align-middle [&_td:first-child]:font-medium [&_td:first-child]:text-slate-800 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-gray-50 [&_tbody_tr:last-child_td]:border-b-0 max-md:block max-md:[&_thead]:sr-only max-md:[&_tbody]:block max-md:[&_tbody_tr]:grid max-md:[&_tbody_tr]:grid-cols-2 max-md:[&_tbody_tr]:gap-x-4 max-md:[&_tbody_tr]:gap-y-3 max-md:[&_tbody_tr]:border-b max-md:[&_tbody_tr]:border-gray-200 max-md:[&_tbody_tr]:p-4 max-md:[&_td]:block max-md:[&_td]:border-0 max-md:[&_td]:p-0! max-md:[&_td]:whitespace-normal max-md:[&_td:first-child]:col-span-full max-md:[&_td:last-child]:col-span-full ${className}`}>{body}</table>;
}

export default function SettingsTable(props: SettingsTableProps) { return <SettingsList className="settings-table-list min-w-0 rounded-lg border border-gray-200 bg-white shadow-xs"><SettingsTableContent {...props} /></SettingsList>; }
