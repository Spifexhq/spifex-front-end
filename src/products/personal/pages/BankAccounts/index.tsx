import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { formatCurrency } from "@/lib";
import type { AddBankRequest, BankAccount, EditBankRequest } from "@/models/settings/banking";
import { personalApi } from "@/products/personal/services/api";
import type { PersonalAccount } from "@/products/personal/types";
import { useCashflowBalance } from "@/products/personal/hooks/useCashflowBalance";
import { readonlyWorkspace } from "@/products/personal/services/personalData";
import AccountBalancePanel from "@/shared/financial/components/AccountBalancePanel";
import BankAccountModal from "@/shared/financial/components/BankAccountModal";
import Button from "@/shared/ui/Button";
import DataTable from "@/shared/ui/DataTable";
import type { Column } from "@/shared/ui/DataTable";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import Snackbar from "@/shared/ui/Snackbar";

const ACCOUNT_TYPES = ["checking", "savings", "investment", "cash", "petty_cash", "card", "other"] as const;

function toBankAccount(account: PersonalAccount): BankAccount {
  return {
    id: account.id,
    institution: account.institution || account.name,
    account_type: account.account_type,
    currency: account.currency,
    branch: account.branch || "",
    account_number: account.account_number || "",
    iban: account.iban || "",
    initial_balance: account.initial_balance,
    current_balance: account.current_balance,
    consolidated_balance: account.consolidated_balance || account.balance,
    is_active: account.is_active,
  };
}

function personalPayload(payload: AddBankRequest | EditBankRequest) {
  const values = payload as Partial<BankAccount> & { initial_balance?: string };
  return {
    ...(values.institution !== undefined ? { name: values.institution } : {}),
    ...(values.account_type !== undefined ? { account_type: values.account_type } : {}),
    ...(values.currency !== undefined ? { currency: values.currency } : {}),
    ...(values.branch !== undefined ? { branch: values.branch } : {}),
    ...(values.account_number !== undefined ? { account_number: values.account_number } : {}),
    ...(values.iban !== undefined ? { iban: values.iban } : {}),
    ...(values.initial_balance !== undefined ? { initial_balance: values.initial_balance } : {}),
    ...(values.is_active !== undefined ? { is_active: values.is_active } : {}),
  };
}

export default function PersonalBankAccountsPage() {
  const { t: personalT } = useTranslation("personal");
  const { t: bankT } = useTranslation("bankSettings");
  const { organization, permissions, isOwner, isSuperUser } = useAuthContext();
  const workspace = organization?.organization;
  const currency = (workspace?.currency || "EUR").toUpperCase();
  const readOnly = readonlyWorkspace(workspace?.lifecycle);
  const canView = isOwner || isSuperUser || permissions.includes("view_bank");
  const canCreate = !readOnly && (isOwner || isSuperUser || permissions.includes("add_bank"));
  const canEdit = !readOnly && (isOwner || isSuperUser || permissions.includes("change_bank"));
  const canDelete = !readOnly && (isOwner || isSuperUser || permissions.includes("delete_bank"));

  const [searchDraft, setSearchDraft] = useState("");
  const [branchDraft, setBranchDraft] = useState("");
  const [accountNumberDraft, setAccountNumberDraft] = useState("");
  const [ibanDraft, setIbanDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [applied, setApplied] = useState({ search: "", account_type: "", is_active: "", branch: "", account_number: "", iban: "" });
  const [modal, setModal] = useState<{ mode: "create" | "edit"; bank: BankAccount | null } | null>(null);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<{ message: ReactNode; severity: "success" | "error" | "warning" | "info" } | null>(null);
  const balances = useCashflowBalance(canView, {}, revision);

  const pager = useCursorPager<PersonalAccount>(async (cursor, pageSize = 20) => {
    if (!canView) return { items: [], nextCursor: undefined, totalCount: 0 };
    const page = cursor || "1";
    const { data } = await personalApi.list<PersonalAccount>("accounts", {
      ...applied,
      page,
      page_size: pageSize,
    });
    const nextCursor = data.next ? new URL(data.next, window.location.origin).searchParams.get("page") || undefined : undefined;
    return { items: data.results, nextCursor, totalCount: data.count };
  }, {
    autoLoadFirst: canView,
    deps: [canView, applied.search, applied.account_type, applied.is_active, applied.branch, applied.account_number, applied.iban, workspace?.id, workspace?.lifecycle, permissions.join("|"), isOwner, isSuperUser],
  });

  const apiAdapter = useMemo(() => ({
    getBank: async (id: string) => {
      const { data } = await personalApi.account(id);
      return { data: toBankAccount(data) };
    },
    addBank: async (payload: AddBankRequest) => {
      const { data } = await personalApi.create("accounts", personalPayload(payload));
      return { data: toBankAccount(data as PersonalAccount) };
    },
    editBank: async (id: string, payload: EditBankRequest) => {
      await personalApi.edit("accounts", id, personalPayload(payload));
    },
  }), []);

  const columns = useMemo<Column<PersonalAccount>[]>(() => [
    { key: "name", label: personalT("name"), render: account => account.name },
    { key: "account_type", label: personalT("account_type"), render: account => bankT(`accountType.${account.account_type}`, { defaultValue: account.account_type }) },
    { key: "account_number", label: bankT("field.accountNumber"), render: account => account.account_number || "∅" },
    { key: "balance", label: personalT("balance"), mobile: true, mobileWidth: "132px", render: account => <span className="tabular-nums">{formatCurrency(account.balance, currency)}</span> },
    { key: "status", label: personalT("status"), mobile: true, render: account => <span className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${account.is_active ? "bg-emerald-500" : "bg-gray-300"}`}/>{personalT(account.is_active ? "active" : "inactive")}</span> },
  ], [bankT, currency, personalT]);

  const previewColumns = useMemo<Column<PersonalAccount>[]>(() => [
    { key: "institution", label: bankT("preview.fields.institution"), render: account => account.institution || account.name },
    { key: "account_type", label: bankT("preview.fields.account_type"), render: account => bankT(`accountType.${account.account_type}`, { defaultValue: account.account_type }) },
    { key: "branch", label: bankT("preview.fields.branch"), render: account => account.branch || "∅" },
    { key: "account_number", label: bankT("preview.fields.account_number"), render: account => account.account_number || "∅" },
    { key: "iban", label: bankT("preview.fields.iban"), render: account => account.iban || "∅" },
    { key: "currency", label: bankT("preview.fields.currency"), render: account => account.currency },
    { key: "initial_balance", label: bankT("preview.fields.initial_balance"), render: account => formatCurrency(account.initial_balance, currency) },
    { key: "current_balance", label: bankT("preview.fields.current_balance"), render: account => formatCurrency(account.current_balance, currency) },
    { key: "consolidated_balance", label: bankT("preview.fields.consolidated_balance"), render: account => formatCurrency(account.consolidated_balance || account.balance, currency) },
    { key: "is_active", label: bankT("preview.fields.is_active"), render: account => personalT(account.is_active ? "active" : "inactive") },
  ], [bankT, currency, personalT]);

  const accountTypeOptions = useMemo(() => [
    { value: "", label: bankT("filters.typeAll") },
    ...ACCOUNT_TYPES.map(value => ({ value, label: bankT(`accountType.${value}`, { defaultValue: value }) })),
  ], [bankT]);
  const statusOptions = useMemo(() => [
    { value: "", label: bankT("filters.status.all") },
    { value: "true", label: bankT("filters.status.active") },
    { value: "false", label: bankT("filters.status.inactive") },
  ], [bankT]);

  const refreshAfterMutation = async () => {
    setRevision(value => value + 1);
    await pager.refresh();
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{personalT("accounts")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{personalT("accountsDescription")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/personal/transfers" className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"><ArrowLeftRight size={14}/>{personalT("transfers")}</Link>
        {canCreate && <Button type="button" onClick={() => setModal({ mode: "create", bank: null })}>{bankT("btn.addBank")}</Button>}
      </div>
    </header>

    {canView ? <>
      <AccountBalancePanel {...balances}/>
      <form onSubmit={event => { event.preventDefault(); setApplied({ search: searchDraft.trim(), account_type: typeDraft, is_active: statusDraft, branch: branchDraft.trim(), account_number: accountNumberDraft.trim(), iban: ibanDraft.trim() }); }} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3 sm:flex-row sm:items-end sm:bg-white sm:p-0 sm:border-0">
        <div className="min-w-0 flex-1"><Input kind="text" label={personalT("search")} placeholder={personalT("bankSearchPlaceholder")} value={searchDraft} onChange={event => setSearchDraft(event.target.value)}/></div>
        <div className="w-full sm:w-48"><Select label={bankT("filters.accountTypeLabel")} items={accountTypeOptions} selected={accountTypeOptions.filter(option => option.value === typeDraft)} onChange={items => setTypeDraft(items[0]?.value || "")} getItemKey={option => option.value} getItemLabel={option => option.label} singleSelect hideCheckboxes buttonLabel={bankT("filters.typeAll")}/></div>
        <div className="w-full sm:w-40"><Select label={bankT("filters.statusLabel")} items={statusOptions} selected={statusOptions.filter(option => option.value === statusDraft)} onChange={items => setStatusDraft(items[0]?.value || "")} getItemKey={option => option.value} getItemLabel={option => option.label} singleSelect hideCheckboxes buttonLabel={bankT("filters.status.all")}/></div>
        <Button type="submit" variant="outline" className="shrink-0">{bankT("filters.apply")}</Button>
        <details className="w-full border-t border-gray-200 pt-2 sm:border-0 sm:pt-0">
          <summary className="cursor-pointer px-1 py-1 text-xs font-medium text-gray-600 hover:text-gray-900">{bankT("filters.more")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Input kind="text" label={bankT("filters.branchLabel")} placeholder={bankT("filters.branchPlaceholder")} value={branchDraft} onChange={event => setBranchDraft(event.target.value)}/>
            <Input kind="text" label={bankT("filters.accountNumberLabel")} placeholder={bankT("filters.accountNumberPlaceholder")} value={accountNumberDraft} onChange={event => setAccountNumberDraft(event.target.value)}/>
            <Input kind="text" label={bankT("filters.ibanLabel")} placeholder={bankT("filters.ibanPlaceholder")} value={ibanDraft} onChange={event => setIbanDraft(event.target.value)}/>
          </div>
        </details>
      </form>
      <DataTable
        items={pager.items}
        columns={columns}
        previewColumns={previewColumns}
        initialWidths={[24, 18, 16, 17, 15]}
        pager={pager}
        busy={pager.loading}
        error={pager.error}
        emptyLabel={bankT("empty")}
        editLabel={personalT("edit")}
        selectable
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={account => setModal({ mode: "edit", bank: toBankAccount(account) })}
        onDelete={account => personalApi.remove("accounts", account.id)}
        onDeleted={refreshAfterMutation}
        onInspect={undefined}
        loadPreview={async account => account}
      />
    </> : <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">{personalT("bankAccessUnavailable")}</div>}

    {modal && <BankAccountModal
      isOpen
      mode={modal.mode}
      bank={modal.bank}
      orgCurrency={currency}
      apiAdapter={apiAdapter}
      onClose={() => setModal(null)}
      onNotify={setNotice}
      onSaved={() => { void refreshAfterMutation(); }}
    />}
    <Snackbar notificationKey={notice} open={!!notice} onClose={() => setNotice(null)} autoHideDuration={6000} message={notice?.message} severity={notice?.severity} anchor={{ vertical: "bottom", horizontal: "center" }} pauseOnHover showCloseButton/>
  </div>;
}
