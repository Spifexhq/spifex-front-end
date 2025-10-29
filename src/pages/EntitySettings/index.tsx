/* --------------------------------------------------------------------------
 * File: src/pages/EntitySettings.tsx
 * Pagination: cursor + arrow-only, click-to-search via "Buscar"
 * Dinâmica: overlay local p/ add/delete + refresh do pager
 * i18n: group "entity" inside the "settings" namespace
 * -------------------------------------------------------------------------- */
import React, { useEffect, useState, useCallback, useMemo } from "react";

import { SuspenseLoader } from "@/components/Loaders";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import ConfirmToast from "src/components/ui/ConfirmToast";

import { api } from "src/api/requests";
import type { Entity } from "src/models/enterprise_structure/domain/Entity";
import { useAuthContext } from "@/contexts/useAuthContext";
import Checkbox from "src/components/ui/Checkbox";

import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";
import { useTranslation } from "react-i18next";

/* Snackbar type */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* tipos de entidade: somente valores; labels vêm do i18n */
const ENTITY_TYPE_VALUES = ["client", "supplier", "employee"] as const;
type EntityTypeValue = typeof ENTITY_TYPE_VALUES[number];

const ENTITY_TYPE_ITEMS: { value: EntityTypeValue }[] =
  ENTITY_TYPE_VALUES.map((v) => ({ value: v }));

const emptyForm = {
  full_name: "",
  alias_name: "",
  entity_type: "client" as EntityTypeValue,
  is_active: true,

  ssn_tax_id: "",
  ein_tax_id: "",
  email: "",
  phone: "",

  street: "",
  street_number: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",

  bank_name: "",
  bank_branch: "",
  checking_account: "",
  account_holder_tax_id: "",
  account_holder_name: "",
};
type FormState = typeof emptyForm;

function getInitials() {
  return "EN";
}

function sortByName(a: Entity, b: Entity) {
  const an = (a.full_name || a.alias_name || "").trim();
  const bn = (b.full_name || b.alias_name || "").trim();
  return an.localeCompare(bn, "pt-BR");
}

/* Linha */
const Row = ({
  entity,
  onEdit,
  onDelete,
  canEdit,
  t,
}: {
  entity: Entity;
  onEdit: (e: Entity) => void;
  onDelete: (e: Entity) => void;
  canEdit: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const typeKey = `settings:entity.types.${entity.entity_type || "client"}`;
  const typeLabel = t(typeKey);
  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-600">
          {typeLabel} {entity.is_active === false ? ` ${t("settings:entity.row.inactive")}` : ""}
        </p>
        <p className="text-[13px] font-medium text-gray-900 truncate">
          {entity.full_name || entity.alias_name || t("settings:entity.row.untitled")}
        </p>
      </div>
      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
            onClick={() => onEdit(entity)}
          >
            {t("settings:entity.btn.edit")}
          </Button>
          <Button variant="common" onClick={() => onDelete(entity)}>
            {t("settings:entity.btn.delete")}
          </Button>
        </div>
      )}
    </div>
  );
};

const EntitySettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  useEffect(() => { document.title = t("settings:entity.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const { isOwner } = useAuthContext();

  /* ------------------------------- Modal state ----------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* Overlay dinâmico: adicionados e excluídos (UI imediata) */
  const [added, setAdded] = useState<Entity[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Filtro (click-to-search) ---------------- */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* --------------------------- Confirm Toast state ------------------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* ------------------------------- Página por cursores --------------------- */
  const fetchEntitiesPage = useCallback(
    async (cursor?: string) => {
      const { data, meta } = await api.getEntities({
        page_size: 100,
        cursor,
        q: appliedQuery || undefined,
      });
      const items = ((data?.results ?? []) as Entity[]).slice().sort(sortByName);
      const nextUrl = meta?.pagination?.next ?? data?.next ?? null;
      const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;
      return { items, nextCursor };
    },
    [appliedQuery]
  );

  const pager = useCursorPager<Entity>(fetchEntitiesPage, {
    autoLoadFirst: true,
    deps: [appliedQuery],
  });

  const { refresh } = pager;
  const onSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) refresh();
    else setAppliedQuery(trimmed);
  }, [query, appliedQuery, refresh]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingEntity(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (entity: Entity) => {
    setMode("edit");
    setEditingEntity(entity);
    setFormData({
      full_name: entity.full_name ?? "",
      alias_name: entity.alias_name ?? "",
      entity_type: (entity.entity_type as EntityTypeValue) ?? "client",
      is_active: entity.is_active ?? true,

      ssn_tax_id: entity.ssn_tax_id ?? "",
      ein_tax_id: entity.ein_tax_id ?? "",
      email: entity.email ?? "",
      phone: entity.phone ?? "",

      street: entity.street ?? "",
      street_number: entity.street_number ?? "",
      city: entity.city ?? "",
      state: entity.state ?? "",
      postal_code: entity.postal_code ?? "",
      country: entity.country ?? "",

      bank_name: entity.bank_name ?? "",
      bank_branch: entity.bank_branch ?? "",
      checking_account: entity.checking_account ?? "",
      account_holder_tax_id: entity.account_holder_tax_id ?? "",
      account_holder_name: entity.account_holder_name ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEntity(null);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesQuery = useCallback((e: Entity, q: string) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (e.full_name || "").toLowerCase().includes(s) ||
      (e.alias_name || "").toLowerCase().includes(s)
    );
  }, []);

  useEffect(() => {
    setAdded((prev) => prev.filter((e) => matchesQuery(e, appliedQuery)));
  }, [appliedQuery, matchesQuery]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter((e) => matchesQuery(e, appliedQuery));
    const addedIds = new Set(addedFiltered.map((e) => e.id));
    const base = pager.items.filter((e) => !deletedIds.has(e.id) && !addedIds.has(e.id));
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

  const submitEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      ssn_tax_id: formData.ssn_tax_id.trim() || null,
      ein_tax_id: formData.ein_tax_id.trim() || null,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      bank_name: formData.bank_name.trim(),
      bank_branch: formData.bank_branch.trim(),
      checking_account: formData.checking_account.trim(),
      account_holder_tax_id: formData.account_holder_tax_id.trim(),
      account_holder_name: formData.account_holder_name.trim(),
    };

    try {
      if (mode === "create") {
        const { data: created } = await api.addEntity(payload);
        setAdded((prev) => [created, ...prev]);
      } else if (editingEntity) {
        await api.editEntity(editingEntity.id, payload);
      }
      await pager.refresh();
      closeModal();
      setSnack({
        message: t("settings:entity.toast.saveOk", "Entidade salva com sucesso."),
        severity: "success",
      });
    } catch (err) {
      setSnack({
        message:
          err instanceof Error ? err.message : t("settings:entity.errors.saveError"),
        severity: "error",
      });
    }
  };

  /* ---------- ConfirmToast wrapper ---------- */
  const requestDeleteEntity = (entity: Entity) => {
    const name = entity.full_name ?? entity.alias_name ?? "";
    setConfirmText(t("settings:entity.confirm.deleteTitle", { name }));
    setConfirmAction(() => async () => {
      try {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(entity.id);
          return next;
        });

        await api.deleteEntity(entity.id);
        await pager.refresh();
        setAdded((prev) => prev.filter((e) => e.id !== entity.id));
        setSnack({
          message: t("settings:entity.toast.deleteOk", "Entidade removida."),
          severity: "info",
        });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(entity.id);
          return next;
        });
        setSnack({
          message:
            err instanceof Error ? err.message : t("settings:entity.errors.deleteError"),
          severity: "error",
        });
      } finally {
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
  };

  /* ------------------------------- UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  if (pager.loading && pager.items.length === 0) return <SuspenseLoader />;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("settings:entity.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:entity.header.entities")}
                </h1>
              </div>
            </div>
          </header>

          {/* Lista */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:entity.section.list")}
                  </span>

                  {/* Busca */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      placeholder={t("settings:entity.search.placeholder")}
                      aria-label={t("settings:entity.search.aria")}
                    />
                    <Button onClick={onSearch} variant="outline">
                      {t("settings:entity.search.button")}
                    </Button>
                    {isOwner && (
                      <Button onClick={openCreateModal} className="!py-1.5">
                        {t("settings:entity.btn.add")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">
                    {t("settings:entity.errors.loadFailedTitle")}
                  </p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh}>
                    {t("settings:entity.btn.retry")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {visibleItems.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">
                        {t("settings:entity.empty")}
                      </p>
                    ) : (
                      visibleItems.map((e) => (
                        <Row
                          key={e.id}
                          entity={e}
                          canEdit={!!isOwner}
                          onEdit={openEditModal}
                          onDelete={requestDeleteEntity}
                          t={t}
                        />
                      ))
                    )}
                  </div>

                  <PaginationArrows
                    onPrev={pager.prev}
                    onNext={pager.next}
                    disabledPrev={!pager.canPrev}
                    disabledNext={!pager.canNext}
                    label={t("settings:entity.pagination.label", {
                      index: pager.index + 1,
                      total: pager.reachedEnd ? pager.knownPages : `${pager.knownPages}+`,
                    })}
                  />
                </>
              )}
            </div>
          </section>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-4xl overflow-y-auto max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? t("settings:entity.modal.createTitle") : t("settings:entity.modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:entity.modal.close")}
                >
                  &times;
                </button>
              </header>

              <form className="space-y-5" onSubmit={submitEntity}>
                {/* Identificação e contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <Input
                      label={t("settings:entity.field.full_name")}
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.alias_name")}
                      name="alias_name"
                      value={formData.alias_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <SelectDropdown<{ value: EntityTypeValue }>
                      label={t("settings:entity.field.entity_type")}
                      items={ENTITY_TYPE_ITEMS}
                      selected={ENTITY_TYPE_ITEMS.filter((tItem) => tItem.value === formData.entity_type)}
                      onChange={(items) =>
                        items[0] &&
                        setFormData((p) => ({
                          ...p,
                          entity_type: items[0].value,
                        }))
                      }
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => t(`settings:entity.types.${item.value}`)}
                      singleSelect
                      hideCheckboxes
                      buttonLabel={t("settings:entity.field.entity_type")}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.ssn_tax_id")}
                      name="ssn_tax_id"
                      value={formData.ssn_tax_id}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.ein_tax_id")}
                      name="ein_tax_id"
                      value={formData.ein_tax_id}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.email")}
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.phone")}
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <label className="col-span-1 flex items-center gap-2 text-sm pt-5">
                    <Checkbox
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    {t("settings:entity.field.is_active")}
                  </label>
                </div>

                {/* Endereço */}
                <h4 className="text-[12px] font-semibold text-gray-800">{t("settings:entity.header.entities")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <Input
                      label={t("settings:entity.field.street")}
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.street_number")}
                      name="street_number"
                      value={formData.street_number}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.city")}
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.state")}
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.postal_code")}
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.country")}
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Dados bancários */}
                <h4 className="text-[12px] font-semibold text-gray-800">{t("settings:entity.field.bank_name")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Input
                      label={t("settings:entity.field.bank_name")}
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.bank_branch")}
                      name="bank_branch"
                      value={formData.bank_branch}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.checking_account")}
                      name="checking_account"
                      value={formData.checking_account}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Input
                      label={t("settings:entity.field.account_holder_tax_id")}
                      name="account_holder_tax_id"
                      value={formData.account_holder_tax_id}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Input
                      label={t("settings:entity.field.account_holder_name")}
                      name="account_holder_name"
                      value={formData.account_holder_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    {t("settings:entity.btn.cancel")}
                  </Button>
                  <Button type="submit">{t("settings:entity.btn.save")}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Toast (reutilizável) */}
      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("settings:entity.btn.confirmDelete")}
        cancelLabel={t("settings:entity.btn.cancel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction
            ?.()
            .catch(() => {
              setSnack({ message: t("settings:entity.errors.confirmFailed"), severity: "error" });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      {/* Snackbar (no Alert) */}
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

export default EntitySettings;
