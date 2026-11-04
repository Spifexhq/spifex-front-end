import type { LedgerAccount } from "@/models/settings/ledgerAccounts";

export type AccountRow = { account: LedgerAccount; depth: number };
export type AccountView = "tree" | "list";
export const accountSections = ["asset", "liability", "equity", "income", "expense", "off_balance", "statistical"] as const;
export const sortAccounts = (a: LedgerAccount, b: LedgerAccount) =>
  a.code.localeCompare(b.code, undefined, { numeric: true }) || a.name.localeCompare(b.name);

/** Filtering may remove ancestors. Such accounts remain visible as roots. */
export function buildAccountRows(items: LedgerAccount[], closed: ReadonlySet<string>, view: AccountView) {
  const sorted = [...items].sort(sortAccounts);
  const byId = new Map(sorted.map(account => [account.id, account]));
  const children = new Map<string, LedgerAccount[]>();
  const roots: LedgerAccount[] = [];
  for (const account of sorted) {
    if (account.parent_id && account.parent_id !== account.id && byId.has(account.parent_id)) {
      children.set(account.parent_id, [...(children.get(account.parent_id) ?? []), account]);
    } else roots.push(account);
  }
  const rows: AccountRow[] = [];
  const seen = new Set<string>();
  // Iteration protects the UI from very deep or malformed legacy hierarchies.
  const append = (root: LedgerAccount) => {
    const stack: AccountRow[] = [{ account: root, depth: 0 }];
    while (stack.length) {
      const row = stack.pop()!;
      if (seen.has(row.account.id)) continue;
      seen.add(row.account.id);
      rows.push(row);
      if (!closed.has(row.account.id)) {
        for (const account of [...(children.get(row.account.id) ?? [])].reverse()) {
          stack.push({ account, depth: row.depth + 1 });
        }
      }
    }
  };
  if (view === "list") sorted.forEach(account => rows.push({ account, depth: 0 }));
  else {
    roots.forEach(append);
    // Include malformed cyclic components for repair instead of hiding them.
    const reachable = new Set<string>();
    const stack = [...roots];
    while (stack.length) {
      const account = stack.pop()!;
      if (reachable.has(account.id)) continue;
      reachable.add(account.id);
      stack.push(...(children.get(account.id) ?? []));
    }
    sorted.filter(account => !reachable.has(account.id)).forEach(append);
  }
  return { rows, childIds: new Set(children.keys()) };
}

/** Parent pickers must exclude the edited account and every descendant. */
export function descendantIds(items: LedgerAccount[], id?: string) {
  const result = new Set<string>();
  if (!id) return result;
  result.add(id);
  let previous = -1;
  while (previous !== result.size) {
    previous = result.size;
    items.forEach(account => { if (account.parent_id && result.has(account.parent_id)) result.add(account.id); });
  }
  return result;
}
