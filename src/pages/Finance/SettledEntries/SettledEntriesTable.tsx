import { forwardRef } from "react";
import EntryTable, { type EntryTableHandle, type EntryTableProps } from "../components/EntryTable";
export type SettledEntriesTableHandle = EntryTableHandle;
export type SettledEntriesTableProps = Omit<EntryTableProps, "settled" | "onEdit" | "onSettle">;
export const SettledEntriesTable = forwardRef<SettledEntriesTableHandle, SettledEntriesTableProps>((props, ref) => <EntryTable {...props} ref={ref} settled/>);
SettledEntriesTable.displayName = "SettledEntriesTable";
