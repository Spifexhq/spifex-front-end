/* -------------------------------------------------------------------------- */
/*  File: src/pages/CompanySettings.tsx                                       */
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

import { api } from "@/api/requests2";
import { useAuthContext } from "@/contexts/useAuthContext";
import { Enterprise } from "src/models/auth/domain";
import { TIMEZONES } from "@/utils/timezones-list";
import { formatTimezoneLabel } from "@/utils/timezone";

type EditableUserField = "none" | "name" | "timezone" | "address";

const CompanySettings: React.FC = () => {
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
        const response = await api.getEnterprise();        // ApiSuccess<Enterprise>
        const enterpriseData = response.data;              // ← objeto Enterprise

        setEnterprise(enterpriseData);
        setFormData({
          name: enterpriseData.name,
          enterprise_timezone: enterpriseData.enterprise_timezone,
          address_line1: enterpriseData.address_line1 ?? "",
          address_line2: enterpriseData.address_line2 ?? "",
          country:       enterpriseData.country       ?? "",
          city:          enterpriseData.city          ?? "",
          zip_code:      enterpriseData.zip_code      ?? "",
        });

        const tzObj = TIMEZONES.find(t => t.value === enterpriseData.enterprise_timezone);
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
        country:       enterprise.country       ?? "",
        city:          enterprise.city          ?? "",
        zip_code:      enterprise.zip_code      ?? "",
      });

      setUseDeviceTz(enterprise.enterprise_timezone === deviceTz);
      const tzObj = TIMEZONES.find(t => t.value === enterprise.enterprise_timezone);
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
        country:       enterprise.country       ?? "",
        city:          enterprise.city          ?? "",
        zip_code:      enterprise.zip_code      ?? "",
      });

      setUseDeviceTz(enterprise.enterprise_timezone === deviceTz);
      const tzObj = TIMEZONES.find(t => t.value === enterprise.enterprise_timezone);
      setSelectedTimezone(tzObj ? [tzObj] : []);
    }

    setEditingField(null);
    setModalOpen(false);
  }, [enterprise, deviceTz]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

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
          city:  formData.city,
          country: formData.country,
          zip_code: formData.zip_code,
        },
        ...partialData,
        owner: enterprise.owner,
      };

      const res = await api.editEnterprise(requestBody);
      if (!res.data) throw new Error("Erro ao atualizar empresa.");

      const updated = await api.getEnterprise();
      setEnterprise(updated.data);                    // ← sem .enterprise
      closeModal();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao atualizar empresa.");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (modalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
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

  /* ------------------------------ UI helpers ------------------------------ */
  const Row = ({
    label, value, onEdit, btnLabel
  }:{ label: string; value: string | null | undefined; btnLabel: string; onEdit: () => void }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-base font-medium text-gray-900">{value || "Não disponível"}</p>
      </div>
      {isOwner && (
        <Button variant="outline" onClick={onEdit}>
          {btnLabel}
        </Button>
      )}
    </div>
  );

  const renderModalContent = () => {
    switch (editingField) {
      case "name":
        return (
          <form
            className="space-y-4"
            onSubmit={e => {
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

            <div className="flex justify-end gap-3 pt-4">
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
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              submitPartial({ enterprise_timezone: formData.enterprise_timezone });
            }}
          >
            {/* ---------- Toggle ---------- */}
            <div className="flex items-center justify-between">
              <label htmlFor="tz-toggle" className="font-medium text-gray-700">
                Usar fuso do dispositivo
              </label>
              <Checkbox
                checked={useDeviceTz}
                onChange={e => {
                  const checked = e.target.checked;
                  setUseDeviceTz(checked);
                  setFormData(p => ({
                    ...p,
                    enterprise_timezone: checked ? deviceTz : p.enterprise_timezone,
                  }));
                  if (checked) {
                    const tzObj = TIMEZONES.find(t => t.value === deviceTz);
                    setSelectedTimezone(tzObj ? [tzObj] : []);
                  }
                }}
                size="sm"
                colorClass="defaultColor"
              />
            </div>

            {/* ---------- SelectDropdown ---------- */}
            <SelectDropdown
              label="Fuso horário"
              items={TIMEZONES}
              selected={selectedTimezone}
              onChange={tz => {
                setSelectedTimezone(tz);
                if (tz.length > 0) {
                  setFormData(p => ({ ...p, enterprise_timezone: tz[0].value }));
                }
              }}
              getItemKey={item => item.value}
              getItemLabel={item => item.label}
              singleSelect
              hideCheckboxes
              clearOnClickOutside={false}
              buttonLabel="Selecione o fuso horário"
              customStyles={{
                maxHeight: "250px",
              }}
              disabled={useDeviceTz}
            />

            <div className="flex justify-end gap-3 pt-4">
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
            className="space-y-4"
            onSubmit={e => {
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
            <Input
              label="Endereço linha 1"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
            />
            <Input
              label="Endereço linha 2"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
            />
            <Input label="Cidade" name="city" value={formData.city} onChange={handleChange} />
            <Input label="País" name="country" value={formData.country} onChange={handleChange} />
            <Input label="CEP" name="zip_code" value={formData.zip_code} onChange={handleChange} />

            <div className="flex justify-end gap-3 pt-4">
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
      <Navbar />
      <SidebarSettings userName={enterprise?.name} activeItem="company-settings" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-3xl mx-auto p-8">
          <h3 className="text-lg font-semibold mb-2">Informações da empresa</h3>

          <div className="border rounded-lg divide-y">
            <Row label="Nome da empresa" value={enterprise?.name} onEdit={() => openModal("name")} btnLabel="Atualizar nome" />
            <Row
              label="Fuso horário"
              value={formatTimezoneLabel(enterprise?.enterprise_timezone ?? "")}
              onEdit={() => openModal("timezone")}
              btnLabel="Atualizar fuso horário"
            />
            <Row label="Endereço linha 1" value={enterprise?.address_line1} onEdit={() => openModal("address")} btnLabel="Atualizar" />
            <Row label="Endereço linha 2" value={enterprise?.address_line2} onEdit={() => openModal("address")} btnLabel="Atualizar" />
            <Row label="Cidade" value={enterprise?.city} onEdit={() => openModal("address")} btnLabel="Atualizar cidade" />
            <Row label="País" value={enterprise?.country} onEdit={() => openModal("address")} btnLabel="Atualizar país" />
            <Row label="CEP" value={enterprise?.zip_code} onEdit={() => openModal("address")} btnLabel="Atualizar CEP" />
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && editingField !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {editingField === "name" && "Editar nome"}
                {editingField === "timezone" && "Editar fuso horário"}
                {editingField === "address" && "Editar endereço"}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-700" onClick={closeModal}>
                &times;
              </button>
            </header>

            {renderModalContent()}
          </div>
        </div>
      )}

      {/* ----------------------------- Snackbar ----------------------------- */}
      <Snackbar open={!!snackBarMessage} autoHideDuration={6000} onClose={() => setSnackBarMessage("")}>
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default CompanySettings;
