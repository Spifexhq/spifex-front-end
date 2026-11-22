import type { FinancialActivityRecord, FinancialActivityRow } from "./FinancialActivityTable";

export function buildFinancialActivityRows<T>(records: FinancialActivityRecord<T>[], hasMore = false, newestFirst = false): FinancialActivityRow<T>[] {
  const unique = [...new Map(records.map(record => [record.id, record])).values()];
  // The API computes running balances in date + creation order, so keep that
  // order within a date. Re-sorting by external id breaks the balance sequence.
  unique.sort((a, b) => a.date.localeCompare(b.date));
  if (newestFirst) unique.reverse();
  const rows: FinancialActivityRow<T>[] = [];
  let month = "", totalMinor = 0, balance: number | null = null;
  const closeMonth = (partial = false) => {
    if (month) rows.push({ id: `month-${month}`, kind: "summary", date: `${month}-01`, amount: totalMinor / 100, balance, partial });
  };
  for (const record of unique) {
    const nextMonth = record.date.slice(0, 7);
    if (month && month !== nextMonth) { closeMonth(); totalMinor = 0; }
    month = nextMonth;
    if (record.direction !== "transfer") totalMinor += Math.round(record.amount * 100);
    balance = record.balance;
    rows.push({ id: record.id, kind: "record", record, date: record.date, amount: record.amount, balance });
  }
  closeMonth(hasMore);
  return rows;
}
