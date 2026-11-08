import type { FinancialActivityRecord, FinancialActivityRow } from "./FinancialActivityTable";

export function buildFinancialActivityRows<T>(records: FinancialActivityRecord<T>[], hasMore = false, newestFirst = false): FinancialActivityRow<T>[] {
  const unique = [...new Map(records.map(record => [record.id, record])).values()]
    .sort((a, b) => newestFirst
      ? b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
      : a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
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
