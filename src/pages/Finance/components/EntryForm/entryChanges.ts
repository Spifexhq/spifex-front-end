import type { Entry, EditEntryRequest } from "@/models/entries/entries";
import type { FormData, IntervalMonths } from "./types";

function decimal(value: unknown) {
  const [whole = "0", fraction = ""] = String(value ?? "0").split(".");
  return `${whole.replace(/^0+(?=\d)/, "") || "0"}.${fraction.replace(/0+$/, "")}`;
}
function allocations(rows: Array<{ department_id: string | null; percent: unknown }>) {
  return JSON.stringify(rows.map(row => [row.department_id || "", decimal(row.percent)]).sort((a, b) => a[0].localeCompare(b[0])));
}
export function entryHasSettlements(entry: { last_settled_on?: string | null; settled_count?: number; is_settled?: boolean }) {
  return Boolean(entry.last_settled_on || entry.settled_count || entry.is_settled);
}
export function entryFinancialLocked(entry: { last_settled_on?: string | null; settled_count?: number; is_settled?: boolean; financial_locked?: boolean }) { return entryHasSettlements(entry) || Boolean(entry.financial_locked); }
export function getEntryChanges(entry: Entry, form: FormData): Partial<EditEntryRequest> {
  const changes: Partial<EditEntryRequest> = {};
  if (entry.due_date !== form.details.dueDate) changes.due_date = form.details.dueDate;
  for (const key of ["description", "observation", "notes"] as const) if ((entry[key] || "") !== form.details[key]) changes[key] = form.details[key];
  if ((entry.document_type || "") !== form.details.documentType) changes.document_type = form.details.documentType || null;
  if (!entryFinancialLocked(entry)) {
    if (decimal(entry.amount) !== decimal(form.details.amount)) changes.amount = form.details.amount;
    if ((entry.cashflow_category || "") !== form.details.cashflowCategory) changes.cashflow_category = form.details.cashflowCategory || null;
    if ((entry.project || "") !== form.costCenters.projects) changes.project = form.costCenters.projects || null;
    if ((entry.entity || "") !== form.entities.entity) changes.entity = form.entities.entity || null;
    const departments = form.costCenters.departments.map((id, i) => ({ department_id: id, percent: form.costCenters.department_percentage[i] || "0" }));
    if (allocations(entry.departments || []) !== allocations(departments)) changes.departments = departments;
    // The existing editor supports one inventory line. Preserve multi-line records untouched.
    if ((entry.items?.length || 0) <= 1) {
      const original = entry.items?.[0];
      if ((original?.item_id || "") !== form.inventory.product || (form.inventory.product && decimal(original?.quantity) !== decimal(form.inventory.quantity))) changes.items = form.inventory.product ? [{ item_id: form.inventory.product, quantity: form.inventory.quantity }] : [];
    }
    if ((entry.installment_count || 1) <= 1 && form.recurrence.recurrence === 1 && Number(form.recurrence.installments) > 1) {
      changes.installment_count = Number(form.recurrence.installments);
      changes.interval_months = form.recurrence.periods as IntervalMonths;
      if (form.recurrence.weekend) changes.weekend_action = form.recurrence.weekend;
    }
  }
  return changes;
}
export function touchesFinancialFields(changes: Partial<EditEntryRequest>) {
  return ["amount", "cashflow_category", "project", "entity", "departments", "items"].some(key => key in changes);
}
