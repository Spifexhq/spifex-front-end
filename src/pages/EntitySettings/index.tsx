/* -------------------------------------------------------------------------- */
/*  File: src/pages/EntitySettings.tsx                                        */
/*  Style: Navbar fixa + SidebarSettings, light borders, compact labels       */
/*  Notes: no backdrop-close; honors fixed heights; no horizontal overflow    */
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
import { Entity } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

const ENTITY_TYPES = [
  { label: "Cliente", value: "client" },
  { label: "Fornecedor", value: "supplier" },
  { label: "Funcionário", value: "employee" },
];

const emptyForm = {
  full_name: "",
  ssn_tax_id: "",
  ein_tax_id: "",
  alias_name: "",
  area_code: "",
  phone_number: "",
  street: "",
  street_number: "",
  state: "",
  city: "",
  postal_code: "",
  email: "",
  bank_name: "",
  bank_branch: "",
  checking_account: "",
  account_holder_tax_id: "",
  account_holder_name: "",
  entity_type: "client",
};
type FormState = typeof emptyForm;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "EN";
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

/* -------------------------------------------------------------------------- */
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

  /* ------------------------------ Carrega dados ----------------------------- */
  const fetchEntities = async () => {
    try {
      const res = await api.getAllEntities();
      const sorted = res.data.entities.sort((a, b) => a.id - b.id);
      setEntities(sorted);
    } catch (err) {
      console.error("Erro ao buscar entidades", err);
      setSnackBarMessage("Erro ao buscar entidades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

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
      ssn_tax_id: entity.ssn_tax_id ?? "",
      ein_tax_id: entity.ein_tax_id ?? "",
      alias_name: entity.alias_name ?? "",
      area_code: entity.area_code ?? "",
      phone_number: entity.phone_number ?? "",
      street: entity.street ?? "",
      street_number: entity.street_number ?? "",
      state: entity.state ?? "",
      city: entity.city ?? "",
      postal_code: entity.postal_code ?? "",
      email: entity.email ?? "",
      bank_name: entity.bank_name ?? "",
      bank_branch: entity.bank_branch ?? "",
      checking_account: entity.checking_account ?? "",
      account_holder_tax_id: entity.account_holder_tax_id ?? "",
      account_holder_name: entity.account_holder_name ?? "",
      entity_type: entity.entity_type ?? "client",
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
    try {
      if (mode === "create") {
        await api.addEntity(formData);
      } else if (editingEntity) {
        await api.editEntity([editingEntity.id], formData);
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
      await api.deleteEntity([entity.id]);
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

      {/* Conteúdo: abaixo da Navbar (pt-16) e ao lado da sidebar; sem overflow lateral */}
      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
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

          {/* Card principal */}
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

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            {/* Sem onClick no backdrop → não fecha ao clicar fora */}
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-2xl overflow-y-auto max-h-[90vh]"
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

              <form className="space-y-3" onSubmit={submitEntity}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nome completo" name="full_name" value={formData.full_name} onChange={handleChange} />
                  <Input label="Nome fantasia / apelido" name="alias_name" value={formData.alias_name} onChange={handleChange} />
                  <Input label="CPF (SSN)" name="ssn_tax_id" value={formData.ssn_tax_id} onChange={handleChange} />
                  <Input label="CNPJ (EIN)" name="ein_tax_id" value={formData.ein_tax_id} onChange={handleChange} />

                  <Input label="DDD" name="area_code" value={formData.area_code} onChange={handleChange} />
                  <Input label="Telefone" name="phone_number" value={formData.phone_number} onChange={handleChange} />
                  <Input label="Email" name="email" value={formData.email} onChange={handleChange} />

                  <SelectDropdown
                    label="Tipo de entidade"
                    items={ENTITY_TYPES}
                    selected={ENTITY_TYPES.filter((t) => t.value === formData.entity_type)}
                    onChange={(items) => items[0] && setFormData((p) => ({ ...p, entity_type: items[0].value }))}
                    getItemKey={(item) => item.value}
                    getItemLabel={(item) => item.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel="Selecione o tipo"
                  />
                </div>

                <h4 className="text-[12px] font-semibold text-gray-800 pt-1">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Rua" name="street" value={formData.street} onChange={handleChange} />
                  <Input label="Número" name="street_number" value={formData.street_number} onChange={handleChange} />
                  <Input label="Cidade" name="city" value={formData.city} onChange={handleChange} />
                  <Input label="Estado" name="state" value={formData.state} onChange={handleChange} />
                  <Input label="CEP" name="postal_code" value={formData.postal_code} onChange={handleChange} />
                </div>

                <h4 className="text-[12px] font-semibold text-gray-800 pt-1">Dados bancários</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Banco" name="bank_name" value={formData.bank_name} onChange={handleChange} />
                  <Input label="Agência" name="bank_branch" value={formData.bank_branch} onChange={handleChange} />
                  <Input label="Conta corrente" name="checking_account" value={formData.checking_account} onChange={handleChange} />
                  <Input label="Titular (CPF/CNPJ)" name="account_holder_tax_id" value={formData.account_holder_tax_id} onChange={handleChange} />
                  <Input label="Nome do titular" name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} />
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

      {/* ----------------------------- Snackbar ------------------------------ */}
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
