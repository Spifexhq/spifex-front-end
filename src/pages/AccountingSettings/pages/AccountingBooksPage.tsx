import React from "react";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import Snackbar from "@/shared/ui/Snackbar";
import { api } from "@/api";
import AccountingSideModal from "../components/AccountingSideModal";

import type {
  AccountingBook,
  AccountingBookBasis,
  AddAccountingBookRequest,
} from "@/models/settings/accounting";

type SnackbarState = {
  severity: "error" | "success";
  message: string;
} | null;

type BookFormState = {
  id?: string;
  code: string;
  name: string;
  basis: AccountingBookBasis;
  currency_code: string;
  is_primary: boolean;
  is_active: boolean;
};

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  const directKeys = ["results", "items", "data", "books"];
  for (const key of directKeys) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    const nested = extractCollection<T>(obj.data);
    if (nested.length || Array.isArray(obj.data)) return nested;
  }

  return [];
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-2 text-[20px] font-semibold text-gray-900">{value}</div>
      <p className="mt-1 text-[12px] text-gray-600">{detail}</p>
    </article>
  );
}

const BASIS_OPTIONS: AccountingBookBasis[] = ["management", "cash", "accrual", "tax"];

const EMPTY_FORM: BookFormState = {
  code: "",
  name: "",
  basis: "management",
  currency_code: "EUR",
  is_primary: false,
  is_active: true,
};

const AccountingBooksPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState<AccountingBook[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<BookFormState>(EMPTY_FORM);

  const selectedBasis = React.useMemo(
    () => BASIS_OPTIONS.filter((basis) => basis === form.basis),
    [form.basis]
  );

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAccountingBooks();
      const nextItems = extractCollection<AccountingBook>(
        (response as { data?: unknown })?.data ?? response
      );
      setItems(nextItems);
    } catch {
      setItems([]);
      setSnackbar({ severity: "error", message: "Failed to load accounting books." });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: AccountingBook) => {
    setForm({
      id: item.id,
      code: item.code ?? "",
      name: item.name ?? "",
      basis: item.basis ?? "management",
      currency_code: item.currency_code ?? "EUR",
      is_primary: !!item.is_primary,
      is_active: !!item.is_active,
    });
    setModalOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim() || !form.currency_code.trim()) {
      setSnackbar({ severity: "error", message: "Code, name, and currency are required." });
      return;
    }

    try {
      setSaving(true);

      const payload: AddAccountingBookRequest = {
        code: form.code.trim(),
        name: form.name.trim(),
        basis: form.basis,
        currency_code: form.currency_code.trim().toUpperCase(),
        is_primary: form.is_primary,
        is_active: form.is_active,
        metadata: {},
      };

      if (form.id) {
        await api.editAccountingBook(form.id, payload);
        setSnackbar({ severity: "success", message: "Accounting book updated." });
      } else {
        await api.addAccountingBook(payload);
        setSnackbar({ severity: "success", message: "Accounting book created." });
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setSnackbar({ severity: "error", message: "Failed to save accounting book." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <>
      <section className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Accounting books</div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-[16px] font-semibold text-gray-900">Book registry</h2>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">
                  Maintain the accounting books used for posting basis, primary selection,
                  and transaction currency.
                </p>
              </div>

              <Button type="button" onClick={openCreate}>
                New book
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Books"
                value={items.length}
                detail="Total books currently configured."
              />
              <MetricCard
                label="Primary"
                value={items.filter((item) => item.is_primary).length}
                detail="Books marked as the primary accounting base."
              />
              <MetricCard
                label="Active"
                value={items.filter((item) => item.is_active).length}
                detail="Books available for operational posting flows."
              />
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Book list</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {["Code", "Name", "Basis", "Currency", "Primary", "Active", "Actions"].map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-[10px] uppercase tracking-wide text-gray-600"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{item.code || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-900">{item.name || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.basis || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.currency_code || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.is_primary ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}

                {!items.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-gray-500">
                      No accounting books found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {snackbar ? (
          <Snackbar
            open={!!snackbar}
            onClose={() => setSnackbar(null)}
            autoHideDuration={6000}
            message={snackbar?.message}
            severity={snackbar?.severity}
            anchor={{ vertical: "bottom", horizontal: "center" }}
            pauseOnHover
            showCloseButton
          />
        ) : null}
      </section>

      <AccountingSideModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit accounting book" : "New accounting book"}
        subtitle="Create or update the accounting basis and posting currency."
        contentClassName="pb-4 md:pb-6"
      >
        <form onSubmit={submit} className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">Identity</div>
            </div>

            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <Input
                kind="text"
                label="Code"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              />
              <Input
                kind="text"
                label="Name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">Configuration</div>
            </div>

            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <SelectDropdown<AccountingBookBasis>
                label="Basis"
                items={BASIS_OPTIONS}
                selected={selectedBasis}
                onChange={(selected: AccountingBookBasis[]) =>
                  setForm((prev) => ({
                    ...prev,
                    basis: (selected[0] ?? "management") as AccountingBookBasis,
                  }))
                }
                getItemKey={(item: AccountingBookBasis) => item}
                getItemLabel={(item: AccountingBookBasis) =>
                  item.charAt(0).toUpperCase() + item.slice(1)
                }
                buttonLabel="Select basis"
                singleSelect
                hideCheckboxes
              />

              <Input
                kind="text"
                label="Currency"
                value={form.currency_code}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    currency_code: event.target.value.toUpperCase(),
                  }))
                }
              />
            </div>

            <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-[13px] text-gray-700">
                <Checkbox
                  checked={form.is_primary}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_primary: event.target.checked }))
                  }
                  size="small"
                />
                <span className="font-medium text-gray-900">Primary book</span>
              </label>

              <label className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-[13px] text-gray-700">
                <Checkbox
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                  size="small"
                />
                <span className="font-medium text-gray-900">Active</span>
              </label>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : form.id ? "Save changes" : "Create book"}
            </Button>
          </div>
        </form>
      </AccountingSideModal>
    </>
  );
};

export default AccountingBooksPage;
