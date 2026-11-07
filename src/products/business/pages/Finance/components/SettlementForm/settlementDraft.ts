import type { SettlementSource } from "@/models/entries/settlements";
import type { BankAccount } from "@/models/settings/banking";
export type SettlementDraft = { id: string; version: string; description: string; dueDate: string; tx: "credit" | "debit"; remaining: string; amount: string; date: string; bankId: string };
export function cents(raw: string): bigint | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw.trim())) return null;
  const [whole, fraction = ""] = raw.trim().split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function decimal(value: bigint): string { const sign = value < 0n ? "-" : ""; const n = value < 0n ? -value : value; return `${sign}${n / 100n}.${String(n % 100n).padStart(2, "0")}`; }
export function localToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
export function makeDraft(entry: SettlementSource): SettlementDraft {
  if (!entry.version || entry.open_amount == null || cents(entry.open_amount) == null) throw new Error("Missing remaining balance");
  return { id: entry.id, version: entry.version, description: entry.description || "", dueDate: entry.due_date, tx: String(entry.tx_type).toLowerCase() === "credit" ? "credit" : "debit", remaining: entry.open_amount, amount: entry.open_amount, date: localToday(), bankId: "" };
}
export function draftIssue(row: SettlementDraft, banks: BankAccount[]): "bank" | "amount" | "date" | null {
  if (!banks.some(bank => bank.id === row.bankId && bank.is_active !== false)) return "bank";
  const value = cents(row.amount), remaining = cents(row.remaining);
  if (value == null || remaining == null || value <= 0n || value > remaining) return "amount";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(`${row.date}T12:00:00Z`)) || new Date(`${row.date}T12:00:00Z`).toISOString().slice(0,10) !== row.date) return "date";
  return null;
}
export function applyPercentage(row: SettlementDraft, raw: string): SettlementDraft {
  const percent = cents(raw), remaining = cents(row.remaining);
  if (percent == null || remaining == null || percent <= 0n || percent > 10000n) return row;
  return { ...row, amount: decimal((remaining * percent + 5000n) / 10000n) };
}
export function settlementPayload(rows: SettlementDraft[], banks: BankAccount[]) {
  if (!rows.length || new Set(rows.map(row => row.id)).size !== rows.length || rows.some(row => draftIssue(row, banks))) throw new Error("Invalid settlement batch");
  return rows.map(row => ({ entry_id: row.id, expected_version: row.version, bank_id: row.bankId, amount: row.amount, value_date: row.date }));
}
export function bankSummary(rows: SettlementDraft[], bankId: string) {
  const group = rows.filter(row => row.bankId === bankId);
  let incoming = 0n, outgoing = 0n;
  for (const row of group) { const amount = cents(row.amount) ?? 0n; if (row.tx === "credit") incoming += amount; else outgoing += amount; }
  return { count: group.length, incoming: decimal(incoming), outgoing: decimal(outgoing), net: decimal(incoming-outgoing) };
}

export function applySettlementDate(row: SettlementDraft, mode: "custom" | "due", date: string): SettlementDraft {
  return { ...row, date: mode === "due" ? row.dueDate : date };
}
