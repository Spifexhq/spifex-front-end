import { useMemo, useState } from "react";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import { buildAccountRows, type AccountView } from "./accountHierarchy";

export function useAccountHierarchy(items: LedgerAccount[], view: AccountView) {
  const [section, setSection] = useState("");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const filtered = useMemo(() => items.filter(account => !section || account.statement_section === section), [items, section]);
  const hierarchy = useMemo(() => buildAccountRows(filtered, closed, view), [filtered, closed, view]);
  const toggle = (id: string) => setClosed(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return {
    ...hierarchy, filtered, section, setSection, closed, toggle,
    expandAll: () => setClosed(new Set()),
    collapseAll: () => setClosed(new Set(items.filter(account => account.account_type === "header").map(account => account.id))),
  };
}
