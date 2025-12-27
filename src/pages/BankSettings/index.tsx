/* -----------------------------------------------------------------------------
 * File: src/pages/BankSettings.tsx
 * - Currency: ALWAYS from auth org; fallback USD (never from bank/detail)
 * - Money rule: initial_balance is a MAJOR decimal string "1234.56" (API-ready)
 * - i18n: namespace "bankSettings"
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import ConfirmToast from "src/components/ui/ConfirmToast";
import { AmountInput } from "src/components/ui/AmountInput";

import { api } from "src/api/requests";
import type { BankAccount } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "src/hooks/useAuth";

/* ----------------------------- Constants/Types ---------------------------- */

const ACCOUNT_TYPE_VALUES = ["checking", "savings", "investment", "cash"] as const;
type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number];

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type Mode = "create" | "edit";

type BankForm = {
  institution: string;
  account_type: AccountType;
  branch: string;
  account_number: string;
  iban: string;
  initial_balance: string;
  is_active: boolean;
};

function getInitials() {
  return "BK";
}

function safeCurrency(raw: unknown) {
  const v = String(raw ?? "").trim().toUpperCase();
  return v || "USD";
}

function buildEmptyForm(): BankForm {
  return {
    institution: "",
    account_type: "checking",
    branch: "",
    account_number: "",
    iban: "",
    initial_balance: "0.00",
    is_active: true,
  };
}

function coerceMajorDecimalOrZero(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "0.00";
  return s;
}

/* --------------------------------- Row UI -------------------------------- */

const Row = React.memo(function Row({
  bank,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  bank: BankAccount;
  onEdit: (b: BankAccount) => void;
  onDelete: (b: BankAccount) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 ${
        busy ? "opacity-70 pointer-events-none" : ""
      }`}
      aria-busy={busy || undefined}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-900 truncate">
          {bank.institution}
        </p>
        <p className="text-[12px] text-gray-600 truncate">
          {bank.branch} / {bank.account_number}
        </p>
      </div>

      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => onEdit(bank)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(bank)} disabled={busy}>
            {t("btn.delete")}
          </Button>
        </div>
      )}
    </div>
  );
});

/* ------------------------------ Modal skeleton ---------------------------- */

const ModalSkeleton: React.FC = () => (
  <div className="space-y-3 py-1">
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="flex items-center gap-3 pt-2">
      <div className="h-5 w-5 rounded bg-gray-100 animate-pulse" />
      <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
    </div>
    <div className="flex justify-end gap-2 pt-1">
      <div className="h-9 w-24 rounded-md bg-gray-100 animate-pulse" />
      <div className="h-9 w-28 rounded-md bg-gray-100 animate-pulse" />
    </div>
  </div>
);

/* ---------------------------------- Page --------------------------------- */

const BankSettings: React.FC = () => {
  const { t, i18n } = useTranslation("bankSettings");
  const { organization: authOrg, isOwner } = useAuthContext();

  const orgCurrency = useMemo(
    () => safeCurrency(authOrg?.organization?.currency),
    [authOrg]
  );

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------ Flags/State ------------------------------ */

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBackgroundSync, setIsBackgroundSync] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [snack, setSnack] = useState<Snack>(null);

  // optimistic overlay
  const [added, setAdded] = useState<BankAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  // delete confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<BankAccount | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  // form
  const [formData, setFormData] = useState<BankForm>(() => buildEmptyForm());

  const busyGlobal = isBackgroundSync || isSubmitting || confirmBusy;

  /* ------------------------------- Fetch list ------------------------------ */

  const fetchLockRef = useRef(false);

  const fetchBanks = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (fetchLockRef.current) return;
      fetchLockRef.current = true;

      if (opts.background) setIsBackgroundSync(true);
      else setIsInitialLoading(true);

      try {
        const { data } = await api.getBanks();
        const list: BankAccount[] = data?.results ?? [];
        list.sort((a, b) => (a.institution || "").localeCompare(b.institution || ""));
        setBanks(list);
      } catch {
        setSnack({ message: t("errors.fetchError"), severity: "error" });
      } finally {
        if (opts.background) setIsBackgroundSync(false);
        else setIsInitialLoading(false);
        fetchLockRef.current = false;
      }
    },
    [t]
  );

  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  /* ---------------------------- Visible (overlay) -------------------------- */

  const visibleBanks = useMemo(() => {
    const addedIds = new Set(added.map((b) => b.id));
    const base = banks.filter((b) => !deletedIds.has(b.id) && !addedIds.has(b.id));
    return [...added, ...base];
  }, [banks, added, deletedIds]);

  /* -------------------------------- Handlers ------------------------------- */

  const openCreateModal = useCallback(() => {
    setMode("create");
    setEditingBank(null);
    setFormData(buildEmptyForm());
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback(
    async (bank: BankAccount) => {
      setMode("edit");
      setEditingBank(bank);
      setModalOpen(true);
      setIsDetailLoading(true);

      try {
        const res = await api.getBank(bank.id);
        const detail = res.data as BankAccount;

        setFormData({
          institution: detail.institution || "",
          account_type: (detail.account_type as AccountType) || "checking",
          branch: detail.branch || "",
          account_number: detail.account_number || "",
          iban: detail.iban || "",
          initial_balance: coerceMajorDecimalOrZero(detail.initial_balance),
          is_active: detail.is_active ?? true,
        });
      } catch {
        // fallback to list row data
        setFormData({
          institution: bank.institution || "",
          account_type: (bank.account_type as AccountType) || "checking",
          branch: bank.branch || "",
          account_number: bank.account_number || "",
          iban: bank.iban || "",
          initial_balance: coerceMajorDecimalOrZero(bank.initial_balance),
          is_active: bank.is_active ?? true,
        });
        setSnack({ message: t("errors.detailError"), severity: "error" });
      } finally {
        setIsDetailLoading(false);
      }
    },
    [t]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingBank(null);
    setIsDetailLoading(false);
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((p) => ({ ...p, [name]: value }));
    },
    []
  );

  const accountTypeOptions = useMemo(
    () =>
      ACCOUNT_TYPE_VALUES.map((value) => ({
        value,
        label: t(`accountType.${value}`),
      })),
    [t]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busyGlobal) return;

      setIsSubmitting(true);
      try {
        const payload = {
          institution: formData.institution,
          account_type: formData.account_type,
          currency: orgCurrency, // pinned by rule
          branch: formData.branch,
          account_number: formData.account_number,
          iban: formData.iban || "",
          initial_balance: formData.initial_balance || "0.00",
          is_active: formData.is_active,
        };

        if (mode === "create") {
          const { data: created } = await api.addBank(payload);
          setAdded((prev) => [created, ...prev]);
        } else if (mode === "edit" && editingBank) {
          await api.editBank(editingBank.id, payload);

          const updatedLocal: BankAccount = {
            ...editingBank,
            ...payload,
          } as BankAccount;

          setBanks((prev) => prev.map((b) => (b.id === updatedLocal.id ? updatedLocal : b)));
          setAdded((prev) => prev.map((b) => (b.id === updatedLocal.id ? updatedLocal : b)));
        }

        await fetchBanks({ background: true });
        closeModal();
        setSnack({ message: t("toast.saveOk"), severity: "success" });
      } catch {
        setSnack({ message: t("errors.saveError"), severity: "error" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [busyGlobal, closeModal, editingBank, fetchBanks, formData, mode, orgCurrency, t]
  );

  /* ----------------------- Delete with ConfirmToast ------------------------ */

  const requestDeleteBank = useCallback((bank: BankAccount) => {
    setDeleteCandidate(bank);
  }, []);

  const confirmText = useMemo(() => {
    if (!deleteCandidate) return "";
    return t("confirm.delete", { name: deleteCandidate.institution });
  }, [deleteCandidate, t]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteCandidate || confirmBusy) return;

    const bank = deleteCandidate;
    setConfirmBusy(true);
    setDeleteTargetId(bank.id);

    setDeletedIds((prev) => new Set(prev).add(bank.id));

    try {
      await api.deleteBank(bank.id);
      await fetchBanks({ background: true });
      setAdded((prev) => prev.filter((b) => b.id !== bank.id));
      setSnack({ message: t("toast.deleteOk"), severity: "info" });
      setDeleteCandidate(null);
    } catch {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(bank.id);
        return next;
      });
      setSnack({ message: t("errors.deleteError"), severity: "error" });
    } finally {
      setDeleteTargetId(null);
      setConfirmBusy(false);
    }
  }, [confirmBusy, deleteCandidate, fetchBanks, t]);

  /* ------------------------------- UX hooks -------------------------------- */

  useEffect(() => {
    if (!modalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* --------------------------------- Render -------------------------------- */

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  return (
    <>
      <TopProgress
        active={isBackgroundSync || isSubmitting || isDetailLoading}
        variant="top"
        topOffset={64}
      />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("header.title")}
                </h1>
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.list")}
                  </span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5" disabled={busyGlobal}>
                      {t("btn.addBank")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {visibleBanks.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500">
                    {t("empty")}
                  </p>
                ) : (
                  visibleBanks.map((b) => {
                    const rowBusy = busyGlobal || deleteTargetId === b.id || deletedIds.has(b.id);
                    return (
                      <Row
                        key={b.id}
                        bank={b}
                        canEdit={!!isOwner}
                        onEdit={openEditModal}
                        onDelete={requestDeleteBank}
                        t={t}
                        busy={rowBusy}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg overflow-y-auto max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("modal.close")}
                  disabled={busyGlobal}
                >
                  &times;
                </button>
              </header>

              {mode === "edit" && isDetailLoading ? (
                <ModalSkeleton />
              ) : (
                <form
                  className={`space-y-3 ${busyGlobal ? "opacity-70 pointer-events-none" : ""}`}
                  onSubmit={handleSubmit}
                >
                  <Input
                    label={t("field.institution")}
                    name="institution"
                    value={formData.institution}
                    onChange={handleTextChange}
                    required
                  />

                  <SelectDropdown<{ value: AccountType; label: string }>
                    label={t("field.accountType")}
                    items={accountTypeOptions}
                    selected={accountTypeOptions.filter((a) => a.value === formData.account_type)}
                    onChange={(items) =>
                      items[0] &&
                      setFormData((p) => ({
                        ...p,
                        account_type: items[0].value,
                      }))
                    }
                    getItemKey={(item) => item.value}
                    getItemLabel={(item) => item.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("btn.selectAccountType")}
                  />

                  <Input
                    label={t("field.branch")}
                    name="branch"
                    value={formData.branch}
                    onChange={handleTextChange}
                  />
                  <Input
                    label={t("field.accountNumber")}
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleTextChange}
                  />
                  <Input
                    label={t("field.iban")}
                    name="iban"
                    value={formData.iban}
                    onChange={handleTextChange}
                  />

                  <AmountInput
                    label={t("field.initialBalance")}
                    value={formData.initial_balance}
                    onValueChange={(nextMajor) =>
                      setFormData((p) => ({ ...p, initial_balance: nextMajor || "0.00" }))
                    }
                    display="currency"
                    currency={orgCurrency}
                    zeroAsEmpty
                  />

                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={formData.is_active}
                      onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                      size="sm"
                      colorClass="defaultColor"
                    />
                    <span className="text-[12px] text-gray-700">
                      {t("field.isActive")}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="cancel" type="button" onClick={closeModal} disabled={busyGlobal}>
                      {t("btn.cancel")}
                    </Button>
                    <Button type="submit" disabled={busyGlobal}>
                      {t("btn.save")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <ConfirmToast
        open={!!deleteCandidate}
        text={confirmText}
        confirmLabel={t("confirm.confirmLabel")}
        cancelLabel={t("confirm.cancelLabel")}
        variant="danger"
        busy={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return;
          setDeleteCandidate(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <Snackbar
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
