/* --------------------------------------------------------------------------
 * File: src/pages/PersonalSettings.tsx
 * Navbar fixa + SidebarSettings (sem tabs)
 * Respeita alturas: Navbar (h-16) => pt-16 no conteúdo
 * Borda leve (gray-200), sem overflow horizontal
 * Select de fuso horário somente dentro do modal
 * -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";

import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Checkbox from "@/components/Checkbox";
import { SelectDropdown } from "@/components/SelectDropdown";
import { SuspenseLoader } from "@/components/Loaders";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";
import { User, Enterprise } from "src/models/auth";
import { TIMEZONES, formatTimezoneLabel } from "src/lib/location";

/* ----------------------------- Helpers/Types ----------------------------- */
type EditableUserField =
  | "name"
  | "email"
  | "phone_number"
  | "job_title"
  | "department"
  | "user_timezone"
  | "user_country";

function getInitials(name?: string) {
  if (!name) return "US";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/* Linha sem bordas próprias; o container usa divide-y */
const Row = ({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value || "—"}</p>
    </div>
    {action}
  </div>
);

const PersonalSettings: React.FC = () => {
  useEffect(() => { document.title = "Configurações Pessoais"; }, []);

  const { isOwner } = useAuthContext();

  const [user, setUser] = useState<User | null>(null);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  // Timezone (apenas no modal)
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    job_title: "",
    department: "",
    user_timezone: "",
    user_country: "",
  });

  /* ------------------------------ Load data ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const userResp = await api.getUser();
        const u = userResp.data.user as User;

        setUser(u);
        setFormData({
          name: u.name,
          email: u.email,
          phone_number: u.phone_number,
          job_title: u.job_title,
          department: u.department,
          user_timezone: u.user_timezone,
          user_country: u.user_country,
        });

        if (u.is_owner) {
          const entResp = await api.getEnterprise();
          setEnterprise(entResp.data);
        }

        const tzObj = TIMEZONES.find((t) => t.value === u.user_timezone);
        setSelectedTimezone(tzObj ? [tzObj] : []);
        setUseDeviceTz(u.user_timezone === deviceTz);
      } catch (e) {
        console.error(e);
        setSnackBarMessage("Erro ao buscar dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [deviceTz]);

  /* ------------------------------- Handlers ------------------------------ */
  const openModal = (field?: EditableUserField) => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        job_title: user.job_title,
        department: user.department,
        user_timezone: user.user_timezone,
        user_country: user.user_country,
      });
      setUseDeviceTz(user.user_timezone === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === user.user_timezone);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        job_title: user.job_title,
        department: user.department,
        user_timezone: user.user_timezone,
        user_country: user.user_country,
      });
      setUseDeviceTz(user.user_timezone === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === user.user_timezone);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }
    setEditingField(null);
    setModalOpen(false);
  }, [user, deviceTz]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const payload = editingField !== null ? { [editingField]: formData[editingField] } : formData;

    try {
      const res = await api.editUser(payload);
      if (!res.data) throw new Error("Erro ao atualizar dados.");
      const updated = await api.getUser();
      setUser(updated.data.user);
      closeModal();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao atualizar dados.");
    }
  };

  /* ------------------------------ Modal UX ------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  /* -------------------------------- Render ------------------------------- */
  if (loading) return <SuspenseLoader />;

  return (
    <>
      {/* Navbar fixa (h-16) */}
      <Navbar />

      {/* Sidebar de Settings (fixa abaixo da Navbar). 
          Essa Sidebar já é do projeto; mantemos para alinhamento visual. */}
      <SidebarSettings userName={user?.name} activeItem="personal" />

      {/* Conteúdo: desloca do topo (pt-16) e da sidebar (lg:ml-64). 
          Clip horizontal para evitar overflow lateral. */}
      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(user?.name)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Configurações</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Pessoais</h1>
              </div>
            </div>
          </header>

          {/* Grid principal */}
          <section className="mt-6 grid grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {/* Empresa (owner) */}
              {isOwner && enterprise && (
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                    <span className="text-[11px] uppercase tracking-wide text-gray-700">Empresa</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    <Row label="Nome da empresa" value={enterprise.name || "—"} />
                  </div>
                </div>
              )}

              {/* Dados pessoais */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Dados pessoais</span>
                </div>
                <div className="divide-y divide-gray-200">
                  <Row
                    label="Nome completo"
                    value={user?.name ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("name")}>
                        Atualizar nome
                      </Button>
                    }
                  />
                  <Row
                    label="Email principal"
                    value={user?.email ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("email")}>
                        Atualizar email
                      </Button>
                    }
                  />
                  <Row
                    label="Telefone"
                    value={user?.phone_number ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("phone_number")}>
                        Atualizar telefone
                      </Button>
                    }
                  />
                  <Row
                    label="Cargo"
                    value={user?.job_title ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("job_title")}>
                        Atualizar cargo
                      </Button>
                    }
                  />
                  <Row
                    label="Departamento"
                    value={user?.department ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("department")}>
                        Atualizar departamento
                      </Button>
                    }
                  />
                  <Row
                    label="País"
                    value={user?.user_country ?? ""}
                    action={
                      <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50" onClick={() => openModal("user_country")}>
                        Atualizar país
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              {/* Fuso horário (apenas texto + botão aqui) */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Fuso horário</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">Atual</p>
                      <p className="text-[13px] font-medium text-gray-900">
                        {formatTimezoneLabel(user?.user_timezone ?? "")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={() => openModal("user_timezone")}
                    >
                      Atualizar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Segurança (atalho) */}
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Segurança</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-gray-700">Gerencie senha, sessões e dispositivos conectados.</p>
                  <div className="mt-3">
                    <Button variant="outline" className="!border-gray-200 !text-gray-700 hover:!bg-gray-50">
                      Gerenciar segurança
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal ------------------------------ */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">Editar informações</h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                {(editingField === null || editingField === "name") && (
                  <Input label="Nome completo" name="name" value={formData.name} onChange={handleChange} required />
                )}
                {(editingField === null || editingField === "email") && (
                  <Input label="Email principal" name="email" type="email" value={formData.email} onChange={handleChange} required />
                )}
                {(editingField === null || editingField === "phone_number") && (
                  <Input label="Telefone" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} />
                )}
                {(editingField === null || editingField === "job_title") && (
                  <Input label="Cargo" name="job_title" value={formData.job_title} onChange={handleChange} />
                )}
                {(editingField === null || editingField === "department") && (
                  <Input label="Departamento" name="department" value={formData.department} onChange={handleChange} />
                )}
                {(editingField === null || editingField === "user_country") && (
                  <Input label="País" name="user_country" value={formData.user_country} onChange={handleChange} />
                )}

                {(editingField === null || editingField === "user_timezone") && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] text-gray-700">Usar fuso do dispositivo</label>
                      <Checkbox
                        checked={useDeviceTz}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseDeviceTz(checked);
                          setFormData((p) => ({
                            ...p,
                            user_timezone: checked ? deviceTz : p.user_timezone,
                          }));
                          if (checked) {
                            const tzObj = TIMEZONES.find((t) => t.value === deviceTz);
                            setSelectedTimezone(tzObj ? [tzObj] : []);
                          }
                        }}
                        size="sm"
                        colorClass="defaultColor"
                      />
                    </div>

                    <SelectDropdown
                      label="Fuso horário"
                      items={TIMEZONES}
                      selected={selectedTimezone}
                      onChange={(tz) => {
                        setSelectedTimezone(tz);
                        if (tz.length > 0) {
                          setFormData((p) => ({ ...p, user_timezone: tz[0].value }));
                        }
                      }}
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      singleSelect
                      hideCheckboxes
                      clearOnClickOutside={false}
                      buttonLabel="Selecione o fuso horário"
                      customStyles={{ maxHeight: "250px" }}
                      disabled={useDeviceTz}
                    />
                  </>
                )}

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

      <Snackbar open={!!snackBarMessage} autoHideDuration={6000} onClose={() => setSnackBarMessage("")}>
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default PersonalSettings;
