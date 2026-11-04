import type { Entry } from "@/models/entries/entries";
import type { SettledEntry } from "@/models/entries/settlements";
import type { EntryFilters } from "@/models/components/filterBar";
export type FinancialEntry = Entry | SettledEntry;
export const isSettlement = (entry: FinancialEntry): entry is SettledEntry => "external_id" in entry;
export const entryId = (entry: FinancialEntry) => isSettlement(entry) ? entry.external_id : entry.id;
export const sourceEntryId = (entry: FinancialEntry) => isSettlement(entry) ? entry.entry_id : entry.id;
export const entryDate = (entry: FinancialEntry) => isSettlement(entry) ? entry.value_date : entry.due_date;
export const signedAmount = (entry: FinancialEntry) => String(entry.tx_type).toLowerCase().includes("credit") ? Number(entry.amount) || 0 : -(Number(entry.amount) || 0);
export type EntryRow = {
    id: string;
    kind: "record" | "summary";
    entry?: FinancialEntry;
    date: string;
    amount: number;
    balance: number | null;
    partial?: boolean;
};
/** Keep balances authoritative: a missing server balance is unknown, never a fabricated zero. */
export function buildEntryRows(entries: FinancialEntry[], hasMore = false): EntryRow[] {
    const unique = [...new Map(entries.map(entry => [entryId(entry), entry])).values()].sort((a, b) => entryDate(a).localeCompare(entryDate(b)) || entryId(a).localeCompare(entryId(b)));
    const rows: EntryRow[] = [];
    let month = "", total = 0, balance: number | null = null;
    const closeMonth = (partial = false) => { if (month)
        rows.push({ partial, id: `month-${month}`, kind: "summary", date: `${month}-01`, amount: total / 100, balance }); };
    for (const entry of unique) {
        const date = entryDate(entry), next = date.slice(0, 7);
        if (month && next !== month) {
            closeMonth();
            total = 0;
        }
        month = next;
        const amount = signedAmount(entry);
        total += Math.round(amount * 100);
        const raw = entry.running_balance;
        balance = raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
        rows.push({ id: entryId(entry), kind: "record", entry, date, amount, balance });
    }
    closeMonth(hasMore);
    return rows;
}
function optionalAmount(value: unknown) { const text = String(value ?? "").trim().replace(/[^\d.,-]/g, ""); if (!text)
    return undefined; const normalized = text.includes(",") && text.includes(".") ? text.replace(/\./g, "").replace(",", ".") : text.replace(",", "."); const number = Number(normalized); return Number.isFinite(number) ? number : undefined; }
export function entryQuery(filters: EntryFilters | undefined, settled: boolean) {
    const start = filters?.start_date || undefined, end = filters?.end_date || undefined;
    return { ...(settled ? { value_from: start, value_to: end, include_inactive: true } : { date_from: start, date_to: end }), description: filters?.description || undefined, observation: filters?.observation || undefined, q: [filters?.description, filters?.observation].filter(Boolean).join(" ").trim() || undefined, cashflow_category: filters?.cashflow_category_id?.length ? filters.cashflow_category_id.join(",") : undefined, bank: filters?.bank_id?.length ? filters.bank_id.join(",") : undefined, tx_type: filters?.tx_type === "credit" ? 1 : filters?.tx_type === "debit" ? -1 : undefined, amount_min: optionalAmount(filters?.amount_min), amount_max: optionalAmount(filters?.amount_max) };
}
