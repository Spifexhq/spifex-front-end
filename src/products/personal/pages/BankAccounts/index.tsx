import { useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { formatCurrency } from "@/lib";
import type { AddBankRequest, BankAccount, EditBankRequest } from "@/models/settings/banking";
import { personalApi } from "@/products/personal/services/api";
import type { PersonalAccount } from "@/products/personal/types";
import { readonlyWorkspace } from "@/products/personal/services/personalData";
import BankAccountModal from "@/shared/financial/components/BankAccountModal";
import Button from "@/shared/ui/Button";
import DataTable from "@/shared/ui/DataTable";
import type { Column } from "@/shared/ui/DataTable";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import Popover from "@/shared/ui/Popover";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsFilter as FilterChip, SettingsClearFilters as ClearFiltersChip } from "@/shared/ui/Settings/SettingsFilter";
import SettingsSurface from "@/shared/ui/Settings/SettingsSurface";
import Snackbar from "@/shared/ui/Snackbar";
import { usePersonalAccess } from "@/products/personal/access/PersonalAccessProvider";
import { PERSONAL_PERMISSION } from "@/products/personal/access/permissions";

const ACCOUNT_TYPES = ["checking", "savings", "investment", "cash", "petty_cash", "card", "other"] as const;
type FilterKey = "institution" | "accountType" | "branch" | "accountNumber" | "iban" | "status" | null;
type BankFilters = { search: string; account_type: string; is_active: string; branch: string; account_number: string; iban: string };
const EMPTY_FILTERS: BankFilters = { search: "", account_type: "", is_active: "", branch: "", account_number: "", iban: "" };

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
  const { organization } = useAuthContext();
  const access = usePersonalAccess();
  const workspace = organization?.organization;
  const currency = (workspace?.currency || "EUR").toUpperCase();
  const readOnly = readonlyWorkspace(workspace?.lifecycle);
  const canView = access.can(PERSONAL_PERMISSION.bankAccounts);
  const canEdit = !readOnly && access.can(PERSONAL_PERMISSION.changeBankAccount);
  const canDelete = !readOnly && access.can(PERSONAL_PERMISSION.deleteBankAccount);

  const [draft, setDraft] = useState<BankFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<BankFilters>(EMPTY_FILTERS);
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);
  const anchors = {
    institution: useRef<HTMLDivElement>(null), accountType: useRef<HTMLDivElement>(null), branch: useRef<HTMLDivElement>(null),
    accountNumber: useRef<HTMLDivElement>(null), iban: useRef<HTMLDivElement>(null), status: useRef<HTMLDivElement>(null),
  };
  const [modal, setModal] = useState<{ mode: "create" | "edit"; bank: BankAccount | null } | null>(null);
  const [notice, setNotice] = useState<{ message: ReactNode; severity: "success" | "error" | "warning" | "info" } | null>(null);

  const pager = useCursorPager<PersonalAccount, { activeCount: number }>(async (cursor, pageSize = 20) => {
    if (!canView) return { items: [], nextCursor: undefined, totalCount: 0 };
    const page = cursor || "1";
    const { data } = await personalApi.list<PersonalAccount>("accounts", {
      ...applied,
      page,
      page_size: pageSize,
    });
    const nextCursor = data.next ? new URL(data.next, window.location.origin).searchParams.get("page") || undefined : undefined;
    return { items: data.results, nextCursor, totalCount: data.count, metadata: { activeCount: data.active_count ?? 0 } };
  }, {
    autoLoadFirst: canView,
    deps: [canView, applied.search, applied.account_type, applied.is_active, applied.branch, applied.account_number, applied.iban, workspace?.id, workspace?.lifecycle],
  });
  const activeAccountCount = pager.metadata?.activeCount;
  const canCreate = !readOnly && !pager.loading && activeAccountCount !== undefined &&
    access.canUse(PERSONAL_PERMISSION.addBankAccount, 1, activeAccountCount);
  const addBankEntitlement = access.entitlement(PERSONAL_PERMISSION.addBankAccount);

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
  ], [bankT, personalT]);

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
    await pager.refresh();
    await access.refresh();
  };

  return <SettingsSurface><div className="settings-content min-w-0">
    {canView ? <>
      <div className="settings-toolbar mb-4">
        <SettingsFilters active={Object.values(applied).some(Boolean)}>
          {(["institution", "accountType", "branch", "accountNumber", "iban", "status"] as const).map(key => {
            const field: keyof BankFilters = key === "institution" ? "search" : key === "accountType" ? "account_type" : key === "accountNumber" ? "account_number" : key === "status" ? "is_active" : key;
            const label = key === "institution" ? bankT("filters.institutionLabel") : key === "accountType" ? bankT("filters.accountTypeLabel") : key === "branch" ? bankT("filters.branchLabel") : key === "accountNumber" ? bankT("filters.accountNumberLabel") : key === "iban" ? bankT("filters.ibanLabel") : bankT("filters.statusLabel");
            const value = key === "accountType" ? applied.account_type.split(",").filter(Boolean).map(type => accountTypeOptions.find(option => option.value === type)?.label).filter(Boolean).join(", ") : key === "status" ? statusOptions.find(option => option.value === applied[field])?.label : applied[field];
            return <div key={key} ref={anchors[key]}><FilterChip label={label} value={value ? `• ${value}` : undefined} active={!!applied[field]} expanded={openFilter === key} onClick={() => { setDraft(applied); setOpenFilter(current => current === key ? null : key); }} onClear={applied[field] ? () => { setApplied(previous => ({ ...previous, [field]: "" })); setDraft(previous => ({ ...previous, [field]: "" })); } : undefined}/></div>;
          })}
          {Object.values(applied).some(Boolean) && <ClearFiltersChip label={bankT("filters.clearAll")} onClick={() => { setApplied(EMPTY_FILTERS); setDraft(EMPTY_FILTERS); }}/ >}
        </SettingsFilters>
        {canCreate && <Button type="button" onClick={() => setModal({ mode: "create", bank: null })}>{bankT("btn.addBank")}</Button>}
        {!readOnly && canView && !canCreate && !pager.loading && activeAccountCount !== undefined && addBankEntitlement?.limits.limit !== null && addBankEntitlement?.limits.limit !== undefined && activeAccountCount >= addBankEntitlement.limits.limit && <p className="w-full text-right text-xs text-gray-500">{personalT("access.capacityReached", { limit: addBankEntitlement.limits.limit })}</p>}
      </div>
      <DataTable
        items={pager.items}
        columns={columns}
        previewColumns={previewColumns}
        initialWidths={[45, 27, 28]}
        pager={pager}
        busy={pager.loading}
        error={pager.error}
        emptyLabel={bankT("empty")}
        editLabel={personalT("edit")}
        selectable
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={account => setModal({ mode: "edit", bank: toBankAccount(account) })}
        onDelete={async account => { await personalApi.remove("accounts", account.id); await access.refresh(); }}
        onDeleted={refreshAfterMutation}
        onInspect={undefined}
        loadPreview={async account => account}
      />
      <Popover appearance="settings" open={!!openFilter} anchorRef={openFilter ? anchors[openFilter] : undefined} onClose={() => setOpenFilter(null)} title={openFilter === "institution" ? bankT("filters.byInstitutionTitle") : openFilter === "accountType" ? bankT("filters.byAccountTypeTitle") : openFilter === "branch" ? bankT("filters.byBranchTitle") : openFilter === "accountNumber" ? bankT("filters.byAccountNumberTitle") : openFilter === "iban" ? bankT("filters.byIbanTitle") : bankT("filters.byStatusTitle")}>
        <div className="space-y-3 p-4">
          {openFilter === "institution" && <Input kind="text" label={bankT("filters.institutionLabel")} placeholder={bankT("filters.institutionPlaceholder")} value={draft.search} onChange={event => setDraft(previous => ({ ...previous, search: event.target.value }))}/>}
          {openFilter === "accountType" && <Select label={bankT("filters.accountTypeLabel")} items={accountTypeOptions.filter(option => option.value)} selected={accountTypeOptions.filter(option => draft.account_type.split(",").includes(option.value))} onChange={items => setDraft(previous => ({ ...previous, account_type: items.map(option => option.value).join(",") }))} getItemKey={option => option.value} getItemLabel={option => option.label} buttonLabel={bankT("filters.typeAll")}/>}
          {openFilter === "status" && <Select label={bankT("filters.statusLabel")} items={statusOptions} selected={statusOptions.filter(option => option.value === draft.is_active)} onChange={items => setDraft(previous => ({ ...previous, is_active: items[0]?.value || "" }))} getItemKey={option => option.value} getItemLabel={option => option.label} singleSelect hideCheckboxes buttonLabel={bankT("filters.status.all")}/>}
          {openFilter === "branch" && <Input kind="text" label={bankT("filters.branchLabel")} placeholder={bankT("filters.branchPlaceholder")} value={draft.branch} onChange={event => setDraft(previous => ({ ...previous, branch: event.target.value }))}/>}
          {openFilter === "accountNumber" && <Input kind="text" label={bankT("filters.accountNumberLabel")} placeholder={bankT("filters.accountNumberPlaceholder")} value={draft.account_number} onChange={event => setDraft(previous => ({ ...previous, account_number: event.target.value }))}/>}
          {openFilter === "iban" && <Input kind="text" label={bankT("filters.ibanLabel")} placeholder={bankT("filters.ibanPlaceholder")} value={draft.iban} onChange={event => setDraft(previous => ({ ...previous, iban: event.target.value }))}/>}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3"><button type="button" className="text-xs text-gray-500 hover:text-gray-900" onClick={() => { if (openFilter) { const field: keyof BankFilters = openFilter === "institution" ? "search" : openFilter === "accountType" ? "account_type" : openFilter === "accountNumber" ? "account_number" : openFilter === "status" ? "is_active" : openFilter; setDraft(previous => ({ ...previous, [field]: "" })); } }}>{bankT("filters.clear")}</button><Button size="sm" onClick={() => { setApplied(draft); setOpenFilter(null); }}>{bankT("filters.apply")}</Button></div>
        </div>
      </Popover>
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
  </div></SettingsSurface>;
}
