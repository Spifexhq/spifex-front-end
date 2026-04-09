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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Accounting books</h2>
            <p className="mt-1 text-sm text-gray-600">
              Control the accounting basis, primary book, and posting currency.
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            New book
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Books</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{items.length}</div>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Primary books</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {items.filter((item) => item.is_primary).length}
            </div>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Active books</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {items.filter((item) => item.is_active).length}
            </div>
          </article>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Basis</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Primary</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.basis}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.currency_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.is_primary ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                    No accounting books found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

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
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              kind="text"
              label="Code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
            <Input
              kind="text"
              label="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectDropdown<AccountingBookBasis>
              label="Basis"
              items={BASIS_OPTIONS}
              selected={selectedBasis}
              onChange={(selected: AccountingBookBasis[]) =>
                setForm((p) => ({
                  ...p,
                  basis: (selected[0] ?? "management") as AccountingBookBasis,
                }))
              }
              getItemKey={(item: AccountingBookBasis) => item}
              getItemLabel={(item: AccountingBookBasis) => item.charAt(0).toUpperCase() + item.slice(1)}
              buttonLabel="Select basis"
              singleSelect
              hideCheckboxes
            />

            <Input
              kind="text"
              label="Currency"
              value={form.currency_code}
              onChange={(e) => setForm((p) => ({ ...p, currency_code: e.target.value.toUpperCase() }))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
              <Checkbox
                checked={form.is_primary}
                onChange={(e) => setForm((p) => ({ ...p, is_primary: e.target.checked }))}
                size="small"
              />
              <span>Primary book</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
              <Checkbox
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                size="small"
              />
              <span>Active</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 pb-4 md:pb-6">
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