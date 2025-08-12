/* -------------------------------------------------------------------------- */
/*  File: src/pages/CompanySettings.tsx                                       */
/*  Style: light borders, compact labels; Navbar + SidebarSettings            */
/*  Honors fixed heights (Navbar h-16) => pt-16; no horizontal overflow       */
/*  Timezone Select ONLY inside modal                                         */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Checkbox from "@/components/Checkbox";
import { SelectDropdown } from "@/components/SelectDropdown";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";
import { Enterprise } from "src/models/auth/domain";
import { formatTimezoneLabel, TIMEZONES } from "src/lib";

type EditableUserField = "none" | "name" | "timezone" | "address";

/* --------------------------------- Helpers -------------------------------- */
function getInitials(name?: string) {
  if (!name) return "EM";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/* Row sem bordas próprias; o container usa divide-y */
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
      <p className="text-[13px] font-medium text-gray-900 truncate">{value ?? "—"}</p>
    </div>
    {action}
  </div>
);

const CompanySettings: React.FC = () => {
  useEffect(() => {
    document.title = "Configurações da Empresa";
  }, []);

  const { isOwner } = useAuthContext();

  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [useDeviceTz, setUseDeviceTz] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<{ label: string; value: string }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    enterprise_timezone: "UTC",
    address_line1: "",
    address_line2: "",
    country: "",
    city: "",
    zip_code: "",
  });

  /* ------------------------------ Carrega dados --------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const response = await api.getEnterprise(); // ApiSuccess<Enterprise>
        const enterpriseData = response.data;

        setEnterprise(enterpriseData);
        setFormData({
          name: enterpriseData.name,
          enterprise_timezone: enterpriseData.enterprise_timezone,
          address_line1: enterpriseData.address_line1 ?? "",
          address_line2: enterpriseData.address_line2 ?? "",
          country: enterpriseData.country ?? "",
          city: enterpriseData.city ?? "",
          zip_code: enterpriseData.zip_code ?? "",
        });

        const tzObj = TIMEZONES.find((t) => t.value === enterpriseData.enterprise_timezone);
        setSelectedTimezone(tzObj ? [tzObj] : []);
        setUseDeviceTz(enterpriseData.enterprise_timezone === deviceTz);
      } catch (err) {
        console.error("Erro ao buscar dados da empresa", err);
        setSnackBarMessage("Erro ao buscar dados da empresa.");
      } finally {
        setLoading(false);
      }
    })();
  }, [deviceTz]);

  /* ------------------------------ Handlers ------------------------------- */
  const openModal = (field?: EditableUserField) => {
    if (enterprise) {
      setFormData({
        name: enterprise.name,
        enterprise_timezone: enterprise.enterprise_timezone,
        address_line1: enterprise.address_line1 ?? "",
        address_line2: enterprise.address_line2 ?? "",
        country: enterprise.country ?? "",
        city: enterprise.city ?? "",
        zip_code: enterprise.zip_code ?? "",
      });

      setUseDeviceTz(enterprise.enterprise_timezone === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === enterprise.enterprise_timezone);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }
    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (enterprise) {
      setFormData({
        name: enterprise.name,
        enterprise_timezone: enterprise.enterprise_timezone,
        address_line1: enterprise.address_line1 ?? "",
        address_line2: enterprise.address_line2 ?? "",
        country: enterprise.country ?? "",
        city: enterprise.city ?? "",
        zip_code: enterprise.zip_code ?? "",
      });

      setUseDeviceTz(enterprise.enterprise_timezone === deviceTz);
      const tzObj = TIMEZONES.find((t) => t.value === enterprise.enterprise_timezone);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }

    setEditingField(null);
    setModalOpen(false);
  }, [enterprise, deviceTz]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submitPartial = async (partialData: Partial<typeof formData>) => {
    try {
      if (!enterprise || !enterprise.owner) {
        setSnackBarMessage("Os dados da empresa não estão disponíveis.");
        return;
      }

      const requestBody = {
        name: formData.name,
        enterprise_timezone: formData.enterprise_timezone,
        address: {
          line1: formData.address_line1,
          line2: formData.address_line2,
          city: formData.city,
          country: formData.country,
          zip_code: formData.zip_code,
        },
        ...partialData,
        owner: enterprise.owner,
      };

      const res = await api.editEnterprise(requestBody);
      if (!res.data) throw new Error("Erro ao atualizar empresa.");

      const updated = await api.getEnterprise();
      setEnterprise(updated.data);
      closeModal();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao atualizar empresa.");
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
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ------------------------------ Modal content -------------------------- */
  const renderModalContent = () => {
    switch (editingField) {
      case "name":
        return (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitPartial({ name: formData.name });
            }}
          >
            <Input
              label="Nome da empresa"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="cancel" type="button" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        );

      case "timezone":
        return (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitPartial({ enterprise_timezone: formData.enterprise_timezone });
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-gray-700">Usar fuso do dispositivo</label>
              <Checkbox
                checked={useDeviceTz}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseDeviceTz(checked);
                  setFormData((p) => ({
                    ...p,
                    enterprise_timezone: checked ? deviceTz : p.enterprise_timezone,
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
                  setFormData((p) => ({ ...p, enterprise_timezone: tz[0].value }));
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

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="cancel" type="button" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        );

      case "address":
        return (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submitPartial({
                address_line1: formData.address_line1,
                address_line2: formData.address_line2,
                city: formData.city,
                country: formData.country,
                zip_code: formData.zip_code,
              });
            }}
          >
            <Input label="Endereço linha 1" name="address_line1" value={formData.address_line1} onChange={handleChange} />
            <Input label="Endereço linha 2" name="address_line2" value={formData.address_line2} onChange={handleChange} />
            <Input label="Cidade" name="city" value={formData.city} onChange={handleChange} />
            <Input label="País" name="country" value={formData.country} onChange={handleChange} />
            <Input label="CEP" name="zip_code" value={formData.zip_code} onChange={handleChange} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="cancel" type="button" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  if (loading) return <SuspenseLoader />;

  return (
    <>
      {/* Navbar fixa */}
      <Navbar />
      {/* Sidebar fixa de Settings */}
      <SidebarSettings userName={enterprise?.name} activeItem="company-settings" />

      {/* Conteúdo: abaixo da Navbar (pt-16) e ao lado da sidebar (lg:ml-64);
          evitar overflow horizontal. */}
      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials(enterprise?.name)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Configurações</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Empresa</h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">Informações da empresa</span>
              </div>

              <div className="divide-y divide-gray-200">
                <Row
                  label="Nome da empresa"
                  value={enterprise?.name}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("name")}
                      >
                        Atualizar nome
                      </Button>
                    )
                  }
                />

                <Row
                  label="Fuso horário"
                  value={formatTimezoneLabel(enterprise?.enterprise_timezone ?? "")}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("timezone")}
                      >
                        Atualizar fuso horário
                      </Button>
                    )
                  }
                />

                <Row
                  label="Endereço linha 1"
                  value={enterprise?.address_line1}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        Atualizar
                      </Button>
                    )
                  }
                />
                <Row
                  label="Endereço linha 2"
                  value={enterprise?.address_line2}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        Atualizar
                      </Button>
                    )
                  }
                />
                <Row
                  label="Cidade"
                  value={enterprise?.city}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        Atualizar cidade
                      </Button>
                    )
                  }
                />
                <Row
                  label="País"
                  value={enterprise?.country}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        Atualizar país
                      </Button>
                    )
                  }
                />
                <Row
                  label="CEP"
                  value={enterprise?.zip_code}
                  action={
                    isOwner && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => openModal("address")}
                      >
                        Atualizar CEP
                      </Button>
                    )
                  }
                />
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && editingField !== null && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {editingField === "name" && "Editar nome"}
                  {editingField === "timezone" && "Editar fuso horário"}
                  {editingField === "address" && "Editar endereço"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              {renderModalContent()}
            </div>
          </div>
        )}
      </main>

      {/* ----------------------------- Snackbar ----------------------------- */}
      <Snackbar open={!!snackBarMessage} autoHideDuration={6000} onClose={() => setSnackBarMessage("")}>
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default CompanySettings;
