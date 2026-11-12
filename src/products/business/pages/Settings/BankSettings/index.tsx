import { apiErrorMessage } from "@/lib/apiErrorMessage";
import DataTable from "@/shared/ui/DataTable";
import { recordName } from "@/shared/ui/DataTable/recordName";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsFilter as Chip, SettingsClearFilters as ClearFiltersChip } from "@/shared/ui/Settings/SettingsFilter";
/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/BankSettings/index.tsx                                            */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import Badge from "@/shared/ui/Badge";
import Popover from "src/shared/ui/Popover";

import Select from "src/shared/ui/Select/Select";

import BankAccountModal from "@/shared/financial/components/BankAccountModal";

import { api } from "@/core/api/requests";
import { PermissionMiddleware } from "src/middlewares";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { BankAccount, GetBanksParams } from "@/models/settings/banking";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ Helpers ---------------------------------- */


function safeCurrency(raw: unknown) {
  const v = String(raw ?? "").trim().toUpperCase();
  return v || "USD";
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function truncate(s: string, max = 24) {
  const v = (s || "").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

/* ------------------------------ Filter types ----------------------------- */
type FilterKey = "institution" | "accountType" | "branch" | "accountNumber" | "iban" | "status" | null;

type StatusKey = "active" | "inactive";
type StatusOption = { key: StatusKey; label: string };

const ACCOUNT_TYPE_VALUES = ["checking", "savings", "investment", "cash", "petty_cash", "card"] as const;
type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number];
type AccountTypeOption = { key: AccountType; label: string };

function isAccountType(v: unknown): v is AccountType {
  return ACCOUNT_TYPE_VALUES.includes(v as AccountType);
}

function computeStatusMode(keys: StatusKey[]): "all" | "active" | "inactive" {
  const hasA = keys.includes("active");
  const hasI = keys.includes("inactive");
  if (hasA && !hasI) return "active";
  if (!hasA && hasI) return "inactive";
  return "all";
}

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetBanksParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
}

function selectedAccountTypeParamFromKeys(keys: AccountType[]): GetBanksParams["account_type"] | undefined {
  const uniqKeys = uniq(keys.filter((x) => isAccountType(x)));
  return uniqKeys.length ? uniqKeys.join(",") : undefined;
}

/* ------------------------------- Chip UI ---------------------------------- */





/* --------------------------------- Row ------------------------------------ */



/* -------------------------------------------------------------------------- */

const BankSettings: React.FC = () => {
  const { t, i18n } = useTranslation("bankSettings");
  const { organization: authOrg, isOwner, isSuperUser, permissions } = useAuthContext();

  const canViewBanks = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_bank");
  }, [isOwner, permissions]);

  const orgCurrency = useMemo(() => safeCurrency(authOrg?.organization?.currency), [authOrg]);
  const bankApiAdapter = useMemo(() => ({
    getBank: (id: string) => api.getBank(id),
    addBank: (payload: Parameters<typeof api.addBank>[0]) => api.addBank(payload),
    editBank: (id: string, payload: Parameters<typeof api.editBank>[1]) => api.editBank(id, payload),
  }), []);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);








  /* Overlay */
  const [added, setAdded] = useState<BankAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedInstitution, setAppliedInstitution] = useState("");
  const [appliedAccountTypes, setAppliedAccountTypes] = useState<AccountType[]>([]);
  const [appliedBranch, setAppliedBranch] = useState("");
  const [appliedAccountNumber, setAppliedAccountNumber] = useState("");
  const [appliedIban, setAppliedIban] = useState("");
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]);

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);
  const appliedAccountTypeParam = useMemo(
    () => selectedAccountTypeParamFromKeys(appliedAccountTypes),
    [appliedAccountTypes]
  );

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedInstitution.trim() !== "" ||
      appliedAccountTypes.length > 0 ||
      appliedBranch.trim() !== "" ||
      appliedAccountNumber.trim() !== "" ||
      appliedIban.trim() !== "" ||
      appliedStatuses.length > 0
    );
  }, [appliedInstitution, appliedAccountTypes, appliedBranch, appliedAccountNumber, appliedIban, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const [draftInstitution, setDraftInstitution] = useState("");
  const [draftAccountTypes, setDraftAccountTypes] = useState<AccountType[]>([]);
  const [draftBranch, setDraftBranch] = useState("");
  const [draftAccountNumber, setDraftAccountNumber] = useState("");
  const [draftIban, setDraftIban] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const institutionAnchorRef = useRef<HTMLDivElement | null>(null);
  const accountTypeAnchorRef = useRef<HTMLDivElement | null>(null);
  const branchAnchorRef = useRef<HTMLDivElement | null>(null);
  const accountNumberAnchorRef = useRef<HTMLDivElement | null>(null);
  const ibanAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------- Options --------------------------------- */
  const accountTypeOptions: AccountTypeOption[] = useMemo(() => {
    return ACCOUNT_TYPE_VALUES.map((k) => ({
      key: k,
      label: t(`accountType.${k}`, { defaultValue: k }),
    }));
  }, [t]);

  const statusOptions: StatusOption[] = useMemo(() => {
    return [
      { key: "active", label: t("filters.status.active", { defaultValue: "Active" }) },
      { key: "inactive", label: t("filters.status.inactive", { defaultValue: "Inactive" }) },
    ];
  }, [t]);

  /* ------------------------------ Status labels ---------------------------- */
  const allLabel = t("filters.status.all", { defaultValue: "All" });
  const activeLabel = t("filters.status.active", { defaultValue: "Active" });
  const inactiveLabel = t("filters.status.inactive", { defaultValue: "Inactive" });

  const appliedStatusValue = useMemo(() => {
    if (appliedStatusMode === "active") return activeLabel;
    if (appliedStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [appliedStatusMode, activeLabel, inactiveLabel, allLabel]);

  const draftStatusMode = useMemo(() => computeStatusMode(draftStatuses), [draftStatuses]);

  const draftStatusButtonLabel = useMemo(() => {
    if (draftStatusMode === "active") return activeLabel;
    if (draftStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [draftStatusMode, activeLabel, inactiveLabel, allLabel]);

  const selectedDraftStatusOptions = useMemo(() => {
    const selected = new Set(draftStatuses);
    return statusOptions.filter((o) => selected.has(o.key));
  }, [draftStatuses, statusOptions]);

  /* ------------------------------ Account type labels ---------------------- */
  const selectedDraftAccountTypeOptions = useMemo(() => {
    const selected = new Set(draftAccountTypes);
    return accountTypeOptions.filter((o) => selected.has(o.key));
  }, [draftAccountTypes, accountTypeOptions]);

  const draftAccountTypeButtonLabel = useMemo(() => {
    if (draftAccountTypes.length === 1) return accountTypeOptions.find((x) => x.key === draftAccountTypes[0])?.label ?? t("filters.typeAll", { defaultValue: "All" });
    if (draftAccountTypes.length > 1) return t("filters.multi", { defaultValue: "Multiple" });
    return t("filters.typeAll", { defaultValue: "All" });
  }, [draftAccountTypes, accountTypeOptions, t]);

  const appliedAccountTypeChipValue = useMemo(() => {
    if (!appliedAccountTypes.length) return "";
    if (appliedAccountTypes.length === 1) return accountTypeOptions.find((x) => x.key === appliedAccountTypes[0])?.label ?? "";
    return t("filters.multi", { defaultValue: "Multiple" });
  }, [appliedAccountTypes, accountTypeOptions, t]);

  /* --------------------------- Pagination (reusable) ----------------------- */


  const fetchBanksPage = useCallback(
    async (cursor?: string, pageSize = 20) => {
      if (!canViewBanks) {
        return { items: [] as BankAccount[], nextCursor: undefined as string | undefined };
      }




      try {
        const params: GetBanksParams = {
          cursor,
          ...{ page_size: pageSize, include_count: "true" },
          institution: appliedInstitution.trim() || undefined,
          account_type: appliedAccountTypeParam,
          branch: appliedBranch.trim() || undefined,
          account_number: appliedAccountNumber.trim() || undefined,
          iban: appliedIban.trim() || undefined,
          active: toActiveParamFromStatusKeys(appliedStatuses),
        };

        const { data, meta } = await api.getBanks(params);

        const items = (data?.results ?? []) as BankAccount[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor, totalCount: (data as unknown as { count?: number }).count };
      } catch {
        throw new Error(t("errors.fetchError"));
      }
    },
    [
      canViewBanks,
      appliedInstitution,
      appliedAccountTypeParam,
      appliedBranch,
      appliedAccountNumber,
      appliedIban,
      appliedStatuses,
      t,
    ]
  );

  const pager = useCursorPager<BankAccount>(fetchBanksPage, {
    autoLoadFirst: canViewBanks,
    deps: [
      canViewBanks,
      appliedInstitution,
      appliedAccountTypeParam,
      appliedBranch,
      appliedAccountNumber,
      appliedIban,
      appliedStatuses,
    ],
  });

  const { refresh } = pager;

  useEffect(() => {
    if (!canViewBanks) return;
    refresh();
  }, [canViewBanks, refresh]);

  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const globalBusy = isBackgroundSync  || modalOpen;

  /* ------------------------------ Filter apply/clear ------------------------ */
  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "institution") {
        const next = draftInstitution.trim();
        if (next === appliedInstitution.trim()) pager.refresh();
        else setAppliedInstitution(next);
      }

      if (key === "accountType") {
        const next = uniq(draftAccountTypes);
        const same =
          next.length === appliedAccountTypes.length &&
          next.every((x) => appliedAccountTypes.includes(x)) &&
          appliedAccountTypes.every((x) => next.includes(x));

        if (same) pager.refresh();
        else setAppliedAccountTypes(next);
      }

      if (key === "branch") {
        const next = draftBranch.trim();
        if (next === appliedBranch.trim()) pager.refresh();
        else setAppliedBranch(next);
      }

      if (key === "accountNumber") {
        const next = draftAccountNumber.trim();
        if (next === appliedAccountNumber.trim()) pager.refresh();
        else setAppliedAccountNumber(next);
      }

      if (key === "iban") {
        const next = draftIban.trim();
        if (next === appliedIban.trim()) pager.refresh();
        else setAppliedIban(next);
      }

      if (key === "status") {
        const next = uniq(draftStatuses);
        const same =
          next.length === appliedStatuses.length &&
          next.every((x) => appliedStatuses.includes(x)) &&
          appliedStatuses.every((x) => next.includes(x));

        if (same) pager.refresh();
        else setAppliedStatuses(next);
      }

      setOpenFilter(null);
    },
    [
      draftInstitution,
      draftAccountTypes,
      draftBranch,
      draftAccountNumber,
      draftIban,
      draftStatuses,
      appliedInstitution,
      appliedAccountTypes,
      appliedBranch,
      appliedAccountNumber,
      appliedIban,
      appliedStatuses,
      pager,
    ]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "institution") setAppliedInstitution("");
    if (key === "accountType") setAppliedAccountTypes([]);
    if (key === "branch") setAppliedBranch("");
    if (key === "accountNumber") setAppliedAccountNumber("");
    if (key === "iban") setAppliedIban("");
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    if (!hasAppliedFilters) {
      pager.refresh();
      return;
    }
    setAppliedInstitution("");
    setAppliedAccountTypes([]);
    setAppliedBranch("");
    setAppliedAccountNumber("");
    setAppliedIban("");
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, [hasAppliedFilters, pager]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "institution") setDraftInstitution(appliedInstitution);
    if (openFilter === "accountType") setDraftAccountTypes(appliedAccountTypes);
    if (openFilter === "branch") setDraftBranch(appliedBranch);
    if (openFilter === "accountNumber") setDraftAccountNumber(appliedAccountNumber);
    if (openFilter === "iban") setDraftIban(appliedIban);
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [
    openFilter,
    appliedInstitution,
    appliedAccountTypes,
    appliedBranch,
    appliedAccountNumber,
    appliedIban,
    appliedStatuses,
  ]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    const map: Partial<Record<Exclude<FilterKey, null>, string>> = {
      institution: "bank-filter-institution-input",
      branch: "bank-filter-branch-input",
      accountNumber: "bank-filter-account-number-input",
      iban: "bank-filter-iban-input",
    };
    const id = openFilter ? map[openFilter] : undefined;
    if (!id) return;

    requestAnimationFrame(() => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.focus();
      el?.select?.();
    });
  }, [openFilter]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesFilters = useCallback(
    (b: BankAccount) => {
      if (appliedStatusMode === "active" && b.is_active === false) return false;
      if (appliedStatusMode === "inactive" && b.is_active !== false) return false;

      if (appliedAccountTypeParam) {
        if ((b.account_type || "").toLowerCase() !== appliedAccountTypeParam.toLowerCase()) return false;
      }

      const inst = appliedInstitution.trim().toLowerCase();
      if (inst && !((b.institution || "").toLowerCase().includes(inst))) return false;

      const br = appliedBranch.trim().toLowerCase();
      if (br && !((b.branch || "").toLowerCase().includes(br))) return false;

      const an = appliedAccountNumber.trim().toLowerCase();
      if (an && !((b.account_number || "").toLowerCase().includes(an))) return false;

      const ib = appliedIban.trim().toLowerCase();
      if (ib && !((b.iban || "").toLowerCase().includes(ib))) return false;

      return true;
    },
    [appliedStatusMode, appliedAccountTypeParam, appliedInstitution, appliedBranch, appliedAccountNumber, appliedIban]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((b) => matchesFilters(b)));
  }, [matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter(matchesFilters).slice();
    const addedIds = new Set(addedFiltered.map((b) => b.id));
    const base = pager.items.filter((b) => !deletedIds.has(b.id) && !addedIds.has(b.id)).filter(matchesFilters);
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingBank(null);
    setModalOpen(true);
  };

  const openEditModal = (bank: BankAccount) => {
    setModalMode("edit");
    setEditingBank(bank);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBank(null);
  };




  /* ------------------------------ Loading --------------------------------- */
  const shouldBlockOnInitial = isInitialLoading && canViewBanks;

  if (shouldBlockOnInitial) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  /* -------------------------------- Derived UI ---------------------------- */
  const institutionChipValue = appliedInstitution.trim() ? truncate(appliedInstitution.trim(), 22) : "";
  const branchChipValue = appliedBranch.trim() ? truncate(appliedBranch.trim(), 22) : "";
  const accountNumberChipValue = appliedAccountNumber.trim() ? truncate(appliedAccountNumber.trim(), 22) : "";
  const ibanChipValue = appliedIban.trim() ? truncate(appliedIban.trim(), 22) : "";

  const accountTypeChipValue = appliedAccountTypes.length ? appliedAccountTypeChipValue : "";
  const statusChipValue = appliedStatuses.length ? appliedStatusValue : "";

  return (
    <>
      <TopProgress active={isBackgroundSync } variant="top" topOffset={64} />

      <main className="settings-page">
        <div className="settings-content ">
          <div className="settings-intro"><div className="px-5 py-4 flex items-center gap-3">


              <div className="flex items-center gap-3">


                {isBackgroundSync && (<Badge tone="neutral" variant="outline" size="md" className="backdrop-blur-sm">
                    {t("badge.syncing")}
                  </Badge>)}
              </div>
            </div></div>

          <PermissionMiddleware codeName={"view_bank"} behavior="lock">
            <section className="mt-6">
              <div className="mb-4">
                  <div className="flex items-center justify-between gap-3 settings-toolbar">
                    {/* LEFT: chips */}
                    <SettingsFilters active={hasAppliedFilters}>
                      <div ref={institutionAnchorRef}>
                        <Chip
                          label={t("filters.institutionLabel", { defaultValue: "Institution" })}
                          value={institutionChipValue ? `• ${institutionChipValue}` : undefined}
                          active={!!appliedInstitution.trim()}
                          onClick={() => togglePopover("institution")}
                          expanded={openFilter === "institution"}
                          onClear={appliedInstitution.trim() ? () => clearOne("institution") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={accountTypeAnchorRef}>
                        <Chip
                          label={t("filters.accountTypeLabel", { defaultValue: "Account type" })}
                          value={accountTypeChipValue ? `• ${accountTypeChipValue}` : undefined}
                          active={appliedAccountTypes.length > 0}
                          onClick={() => togglePopover("accountType")}
                          expanded={openFilter === "accountType"}
                          onClear={appliedAccountTypes.length ? () => clearOne("accountType") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={branchAnchorRef}>
                        <Chip
                          label={t("filters.branchLabel", { defaultValue: "Branch" })}
                          value={branchChipValue ? `• ${branchChipValue}` : undefined}
                          active={!!appliedBranch.trim()}
                          onClick={() => togglePopover("branch")}
                          expanded={openFilter === "branch"}
                          onClear={appliedBranch.trim() ? () => clearOne("branch") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={accountNumberAnchorRef}>
                        <Chip
                          label={t("filters.accountNumberLabel", { defaultValue: "Account number" })}
                          value={accountNumberChipValue ? `• ${accountNumberChipValue}` : undefined}
                          active={!!appliedAccountNumber.trim()}
                          onClick={() => togglePopover("accountNumber")}
                          expanded={openFilter === "accountNumber"}
                          onClear={appliedAccountNumber.trim() ? () => clearOne("accountNumber") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={ibanAnchorRef}>
                        <Chip
                          label={t("filters.ibanLabel", { defaultValue: "IBAN" })}
                          value={ibanChipValue ? `• ${ibanChipValue}` : undefined}
                          active={!!appliedIban.trim()}
                          onClick={() => togglePopover("iban")}
                          expanded={openFilter === "iban"}
                          onClear={appliedIban.trim() ? () => clearOne("iban") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={statusAnchorRef}>
                        <Chip
                          label={t("filters.statusLabel", { defaultValue: "Status" })}
                          value={statusChipValue ? `• ${statusChipValue}` : undefined}
                          active={appliedStatuses.length > 0}
                          onClick={() => togglePopover("status")}
                          expanded={openFilter === "status"}
                          onClear={appliedStatuses.length ? () => clearOne("status") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      {hasAppliedFilters && (
                        <ClearFiltersChip
                          label={t("filters.clearAll", { defaultValue: "Clear filters" })}
                          onClick={clearAll}
                          disabled={globalBusy}
                        />
                      )}
                    </SettingsFilters>

                    {/* RIGHT: add button */}
                    <div className="shrink-0">
                      <PermissionMiddleware codeName={"add_bank"}>
                        <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                          {t("btn.addBank")}
                        </Button>
                      </PermissionMiddleware>
                    </div>
                  </div>
                </div>
<DataTable loadPreview={async item => (await api.getBank(item.id)).data} previewColumns={[{key:"institution",label:t("preview.fields.institution"),render:item=>item.institution ?? "�"},{key:"account_type",label:t("preview.fields.account_type"),render:item=>t(`accountType.${item.account_type}`, {defaultValue:item.account_type})},{key:"branch",label:t("preview.fields.branch"),render:item=>item.branch ?? "�"},{key:"account_number",label:t("preview.fields.account_number"),render:item=>item.account_number ?? "�"},{key:"iban",label:t("preview.fields.iban"),render:item=>item.iban ?? "�"},{key:"currency",label:t("preview.fields.currency"),render:item=>item.currency ?? "�"},{key:"initial_balance",label:t("preview.fields.initial_balance"),render:item=>item.initial_balance ?? "�"},{key:"current_balance",label:t("preview.fields.current_balance"),render:item=>item.current_balance ?? "�"},{key:"consolidated_balance",label:t("preview.fields.consolidated_balance"),render:item=>item.consolidated_balance ?? "�"},{key:"is_active",label:t("preview.fields.is_active"),render:item=>t(item.is_active ? "preview.active" : "preview.inactive")}]} initialWidths={[45,27,28]} onDeleted={ids => {
                if (!ids.length) return;
                const removed = new Set(ids);
                setDeletedIds(current => new Set([...current, ...removed]));
                setAdded(current => current.filter(item => !removed.has(String(item.id))));
                return pager.refresh();
              }} pager={pager} busy={globalBusy} items={visibleItems} columns={[{key:"name",label:t("common:records.name"),render:item=>recordName(item)},{key:"account_type",label:t("common:records.fields.account_type"),render:item=>t(`accountType.${item.account_type}`,{defaultValue:item.account_type})},{key:"account_number",label:t("common:records.fields.account_number"),render:item=>String(item.account_number??"—")}]} emptyLabel={t("empty")} selectable canEdit={isOwner||isSuperUser||permissions.includes("change_bank")} canDelete={isOwner||isSuperUser||permissions.includes("delete_bank")} onEdit={openEditModal} onDelete={item=>api.deleteBank(item.id)} error={pager.error}/>
            </section>
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={["add_bank", "change_bank"]}>
          <BankAccountModal
            isOpen={modalOpen}
            mode={modalMode}
            bank={editingBank}
            orgCurrency={orgCurrency}
            apiAdapter={bankApiAdapter}
            onClose={closeModal}
            onNotify={(s) => setSnack(s)}
            onSaved={async (res) => {
              try {
                if (res.mode === "create" && res.created) {
                  setAdded((prev) => [res.created!, ...prev]);
                }
                await pager.refresh();
              } catch (notificationCause) {
                setSnack({ message: apiErrorMessage(notificationCause, t("errors.fetchError")), severity: "error" });
              }
            }}
          />
        </PermissionMiddleware>
      </main>

      {/* INSTITUTION POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "institution"}
        anchorRef={institutionAnchorRef}
        onClose={() => setOpenFilter(null)}
       title={t("filters.byInstitutionTitle")}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-institution-input"
              type="text"
              value={draftInstitution}
              onChange={(e) => setDraftInstitution(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("institution");
                }
              }}
              placeholder={t("filters.institutionPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftInstitution("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("institution")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* ACCOUNT TYPE POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "accountType"}
        anchorRef={accountTypeAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byAccountTypeTitle")}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[10060] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<AccountTypeOption>
                label={t("filters.accountTypeLabel")}
                items={accountTypeOptions}
                selected={selectedDraftAccountTypeOptions}
                onChange={(list) => setDraftAccountTypes(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftAccountTypeButtonLabel}
                customStyles={{ maxHeight: "260px" }}
                hideFilter
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500">{t("filters.typeHint")}</div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftAccountTypes([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("accountType")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* BRANCH POPOVER */}
      <Popover appearance="settings" open={openFilter === "branch"} anchorRef={branchAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.byBranchTitle")}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-branch-input"
              type="text"
              value={draftBranch}
              onChange={(e) => setDraftBranch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("branch");
                }
              }}
              placeholder={t("filters.branchPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftBranch("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("branch")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* ACCOUNT NUMBER POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "accountNumber"}
        anchorRef={accountNumberAnchorRef}
        onClose={() => setOpenFilter(null)}
       title={t("filters.byAccountNumberTitle")}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-account-number-input"
              type="text"
              value={draftAccountNumber}
              onChange={(e) => setDraftAccountNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("accountNumber");
                }
              }}
              placeholder={t("filters.accountNumberPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftAccountNumber("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("accountNumber")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* IBAN POPOVER */}
      <Popover appearance="settings" open={openFilter === "iban"} anchorRef={ibanAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.byIbanTitle")}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-iban-input"
              type="text"
              value={draftIban}
              onChange={(e) => setDraftIban(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("iban");
                }
              }}
              placeholder={t("filters.ibanPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftIban("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("iban")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* STATUS POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byStatusTitle")}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[10060] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<StatusOption>
                label={t("filters.statusLabel")}
                items={statusOptions}
                selected={selectedDraftStatusOptions}
                onChange={(list) => setDraftStatuses(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftStatusButtonLabel}
                customStyles={{ maxHeight: "240px" }}
                hideFilter
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftStatuses([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("status")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>



      <Snackbar notificationKey={snack}
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default BankSettings;
