import { forwardRef } from "react";
import EntryTable, { type EntryTableHandle, type EntryTableProps } from "../components/EntryTable";
export type CashFlowTableHandle = EntryTableHandle;
export type CashFlowTableProps = Omit<EntryTableProps, "settled">;
export const CashFlowTable = forwardRef<CashFlowTableHandle, CashFlowTableProps>((props, ref) => <EntryTable {...props} ref={ref} settled={false}/>);
CashFlowTable.displayName = "CashFlowTable";
