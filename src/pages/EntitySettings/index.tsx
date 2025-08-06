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
      const res = await api.getAllEntities(); // ApiSuccess<{ entities: Entity[] }>
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
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
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao salvar entidade."
      );
    }
  };

  const deleteEntity = async (entity: Entity) => {
    if (!window.confirm(`Excluir entidade "${entity.full_name ?? entity.alias_name ?? ""}"?`))
      return;

    try {
      await api.deleteEntity([entity.id]);
      await fetchEntities();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao excluir entidade."
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (modalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ------------------------------ UI helpers ------------------------------- */
  const Row = ({ entity }: { entity: Entity }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <div>
        <p className="text-sm text-gray-500">{ENTITY_TYPES.find(t => t.value === entity.entity_type)?.label ?? ""}</p>
        <p className="text-base font-medium text-gray-900">
          {entity.full_name || entity.alias_name || "(sem nome)"}
        </p>
      </div>
      {isOwner && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditModal(entity)}>
            Editar
          </Button>
          <Button variant="common" onClick={() => deleteEntity(entity)}>
            Excluir
          </Button>
        </div>
      )}
    </div>
  );

  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="entities" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-5xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Entidades</h3>
            {isOwner && <Button onClick={openCreateModal}>Adicionar entidade</Button>}
          </div>

          <div className="border rounded-lg divide-y">
            {entities.map(e => (
              <Row key={e.id} entity={e} />
            ))}
            {entities.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">
                Nenhuma entidade cadastrada.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl overflow-y-auto max-h-[90vh]"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "create" ? "Adicionar entidade" : "Editar entidade"}
              </h3>
              <button
                className="text-2xl text-gray-400 hover:text-gray-700"
                onClick={closeModal}
              >
                &times;
              </button>
            </header>

            <form className="space-y-6" onSubmit={submitEntity}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome completo"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                />
                <Input
                  label="Nome fantasia / apelido"
                  name="alias_name"
                  value={formData.alias_name}
                  onChange={handleChange}
                />
                <Input
                  label="CPF (SSN)"
                  name="ssn_tax_id"
                  value={formData.ssn_tax_id}
                  onChange={handleChange}
                />
                <Input
                  label="CNPJ (EIN)"
                  name="ein_tax_id"
                  value={formData.ein_tax_id}
                  onChange={handleChange}
                />

                <Input
                  label="DDD"
                  name="area_code"
                  value={formData.area_code}
                  onChange={handleChange}
                />
                <Input
                  label="Telefone"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
                <Input
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />

                <SelectDropdown
                  label="Tipo de entidade"
                  items={ENTITY_TYPES}
                  selected={ENTITY_TYPES.filter(t => t.value === formData.entity_type)}
                  onChange={items =>
                    items[0] &&
                    setFormData(p => ({ ...p, entity_type: items[0].value }))
                  }
                  getItemKey={item => item.value}
                  getItemLabel={item => item.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Selecione o tipo"
                />
              </div>

              <h4 className="text-md font-semibold text-gray-800 pt-2">Endereço</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Rua"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                />
                <Input
                  label="Número"
                  name="street_number"
                  value={formData.street_number}
                  onChange={handleChange}
                />
                <Input
                  label="Cidade"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
                <Input
                  label="Estado"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                />
                <Input
                  label="CEP"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                />
              </div>

              <h4 className="text-md font-semibold text-gray-800 pt-2">Dados bancários</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Banco"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                />
                <Input
                  label="Agência"
                  name="bank_branch"
                  value={formData.bank_branch}
                  onChange={handleChange}
                />
                <Input
                  label="Conta corrente"
                  name="checking_account"
                  value={formData.checking_account}
                  onChange={handleChange}
                />
                <Input
                  label="Titular (CPF/CNPJ)"
                  name="account_holder_tax_id"
                  value={formData.account_holder_tax_id}
                  onChange={handleChange}
                />
                <Input
                  label="Nome do titular"
                  name="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={handleChange}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="cancel" type="button" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
