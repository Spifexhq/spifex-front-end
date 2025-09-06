/* -------------------------------------------------------------------------- */
/*  File: src/pages/EntitySettings.tsx                                        */
/* -------------------------------------------------------------------------- */
import React, { useEffect, useState, useCallback } from "react";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import { SelectDropdown } from "@/components/SelectDropdown";

import { api } from "src/api/requests";
import type { Entity } from "src/models/enterprise_structure/domain/Entity";
import { useAuthContext } from "@/contexts/useAuthContext";
import Checkbox from "src/components/Checkbox";

/* tipos de entidade (adicione mais se necessário) */
const ENTITY_TYPES = [
  { label: "Cliente", value: "client" },
  { label: "Fornecedor", value: "supplier" },
  { label: "Funcionário", value: "employee" },
];

const emptyForm = {
  full_name: "",
  alias_name: "",
  entity_type: "client",
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

const Row = ({
  entity,
  onEdit,
  onDelete,
  canEdit,
}: {
  entity: Entity;
  onEdit: (e: Entity) => void;
  onDelete: (e: Entity) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {ENTITY_TYPES.find((t) => t.value === entity.entity_type)?.label ?? "—"}
        {entity.is_active === false ? " • Inativa" : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {entity.full_name || entity.alias_name || "(sem nome)"}
      </p>
    </div>
    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
          onClick={() => onEdit(entity)}
        >
          Editar
        </Button>
        <Button variant="common" onClick={() => onDelete(entity)}>
          Excluir
        </Button>
      </div>
    )}
  </div>
);

const EntitySettings: React.FC = () => {
  useEffect(() => {
    document.title = "Entidades";
  }, []);

  const { isOwner } = useAuthContext();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState<string>("");

  /* ------------------------------ Carrega dados (paginado) ----------------- */
  const fetchEntities = useCallback(async () => {
    try {
      const all: Entity[] = [];
      let cursor: string | undefined;
      do {
        const { data } = await api.getEntities({ page_size: 200, cursor });
        const page = (data?.results ?? []) as Entity[];
        all.push(...page);
        cursor = (data?.next ?? undefined) || undefined;
      } while (cursor);
      setEntities(all.sort(sortByName));
    } catch (err) {
      console.error("Erro ao buscar entidades", err);
      setSnackBarMessage("Erro ao buscar entidades.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

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
      entity_type: entity.entity_type ?? "client",
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

  const submitEntity = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      ssn_tax_id: formData.ssn_tax_id.trim() || null,
      ein_tax_id: formData.ein_tax_id.trim() || null,
      // (opcional) normalizar brancos em outros campos livres:
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
        await api.addEntity(payload);
      } else if (editingEntity) {
        await api.editEntity(editingEntity.id, payload);
      }
      await fetchEntities();
      closeModal();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao salvar entidade.");
    }
  };

  const deleteEntity = async (entity: Entity) => {
    if (!window.confirm(`Excluir entidade "${entity.full_name ?? entity.alias_name ?? ""}"?`))
      return;

    try {
      await api.deleteEntity(entity.id);
      await fetchEntities();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao excluir entidade.");
    }
  };

  /* ------------------------------- UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  if (loading) return <SuspenseLoader />;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="entities" />

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Configurações</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Entidades</h1>
              </div>
            </div>
          </header>

          {/* Lista */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Lista de entidades</span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      Adicionar entidade
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {entities.map((e) => (
                  <Row
                    key={e.id}
                    entity={e}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteEntity}
                  />
                ))}

                {entities.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">Nenhuma entidade cadastrada.</p>
                )}
              </div>
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
                  {mode === "create" ? "Adicionar entidade" : "Editar entidade"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form className="space-y-5" onSubmit={submitEntity}>
                {/* Identificação e contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <Input label="Nome completo" name="full_name" value={formData.full_name} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Nome fantasia / apelido" name="alias_name" value={formData.alias_name} onChange={handleChange} />
                  </div>

                  <div>
                    <SelectDropdown
                      label="Tipo de entidade"
                      items={ENTITY_TYPES}
                      selected={ENTITY_TYPES.filter((t) => t.value === formData.entity_type)}
                      onChange={(items) => items[0] && setFormData((p) => ({ ...p, entity_type: items[0].value })) }
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel="Selecione o tipo"
                    />
                  </div>

                  <div>
                    <Input label="CPF (SSN)" name="ssn_tax_id" value={formData.ssn_tax_id} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="CNPJ (EIN)" name="ein_tax_id" value={formData.ein_tax_id} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Email" name="email" value={formData.email} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Telefone" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                  <label className="col-span-1 flex items-center gap-2 text-sm pt-5">
                    <Checkbox
                      checked={formData.is_active}
                      onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                    />
                    Entidade ativa
                  </label>
                </div>

                {/* Endereço */}
                <h4 className="text-[12px] font-semibold text-gray-800">Endereço</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <Input label="Rua" name="street" value={formData.street} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Número" name="street_number" value={formData.street_number} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Cidade" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Estado" name="state" value={formData.state} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="CEP" name="postal_code" value={formData.postal_code} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="País" name="country" value={formData.country} onChange={handleChange} />
                  </div>
                </div>

                {/* Dados bancários */}
                <h4 className="text-[12px] font-semibold text-gray-800">Dados bancários</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Input label="Banco" name="bank_name" value={formData.bank_name} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Agência" name="bank_branch" value={formData.bank_branch} onChange={handleChange} />
                  </div>
                  <div>
                    <Input label="Conta corrente" name="checking_account" value={formData.checking_account} onChange={handleChange} />
                  </div>
                  <div>
                    <Input
                      label="Titular (CPF/CNPJ)"
                      name="account_holder_tax_id"
                      value={formData.account_holder_tax_id}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Input
                      label="Nome do titular"
                      name="account_holder_name"
                      value={formData.account_holder_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage("")}
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default EntitySettings;
