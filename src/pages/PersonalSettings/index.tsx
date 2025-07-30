// src/pages/PersonalSettings.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';

import Navbar from '@/components/Navbar';
import SidebarSettings from '@/components/Sidebar/SidebarSettings';
import { SuspenseLoader } from '@/components/Loaders';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Snackbar from '@/components/Snackbar';
import Alert from '@/components/Alert';

import { useRequests } from '@/api';
import { useAuthContext } from '@/contexts/useAuthContext';
import { User, Enterprise } from 'src/models/Auth';
/* -------------------------------------------------------------------------- */

type EditableUserField = 'name' | 'email' | 'phone_number' | 'job_title' | 'department';

const PersonalSettings: React.FC = () => {
  const navigate = useNavigate();
  const { isOwner } = useAuthContext();
  const { getUser, getEnterprise, editUser } = useRequests();

  const [user, setUser]             = useState<User | null>(null);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading]       = useState(true);

  const [modalOpen, setModalOpen]           = useState(false);
  const [editingField, setEditingField] = useState<EditableUserField | null>(null);
  const [snackBarMessage, setSnackBarMessage] = useState('');

  const [formData, setFormData] = useState({
    name        : '',
    email       : '',
    phone_number: '',
    job_title   : '',
    department  : '',
  });

  /* ------------------------------ Carrega dados --------------------------- */
  useEffect(() => {
    (async () => {
      try {
        /* ---------- USER ---------- */
        const { data: userResp } = await getUser();
        if (userResp) {
          setUser(userResp.user);
          setFormData({
            name        : userResp.user.name,
            email       : userResp.user.email,
            phone_number: userResp.user.phone_number,
            job_title   : userResp.user.job_title,
            department  : userResp.user.department,
          });

          /* ---------- ENTERPRISE (só owner) ---------- */
          if (userResp.user.is_owner) {
            const { data: entResp } = await getEnterprise();
            if (entResp) setEnterprise(entResp.enterprise);
          }
        }
      } catch (e) {
        console.error('Erro ao buscar dados', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [getUser, getEnterprise]);

  /* ------------------------------- Handlers ------------------------------- */
  const openModal = (field?: EditableUserField) => {
    if (user) {
      setFormData({
        name        : user.name,
        email       : user.email,
        phone_number: user.phone_number,
        job_title   : user.job_title,
        department  : user.department,
      });
    }

    setEditingField(field ?? null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (user) {
      setFormData({
        name        : user.name,
        email       : user.email,
        phone_number: user.phone_number,
        job_title   : user.job_title,
        department  : user.department,
      });
    }
    setEditingField(null);
    setModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    // Envia só o campo em edição, ou o diff completo quando for “Editar tudo”
    const payload =
      editingField !== null
        ? { [editingField]: formData[editingField] }
        : formData;             // modal foi aberto em modo “todos os campos”

    try {
      const res = await editUser(payload);
      if (res.status === 'error') throw new Error(res.message);

      const updated = await getUser();      // refetch
      if (updated.data) {
        setUser(updated.data.user);
        closeModal();
      }
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : 'Erro ao atualizar dados.',
      );
    }
  };

  /* ----------------------------- UI helpers ------------------------------ */
  const Row = ({
    label, value, field, btnLabel
  }: { label: string; value: string; field: EditableUserField; btnLabel: string }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-base font-medium text-gray-900">
          {value || 'Não disponível'}
        </p>
      </div>
      {isOwner && (
        <Button variant="outline" onClick={() => openModal(field)}>
          {btnLabel}
        </Button>
      )}
    </div>
  );

  if (loading) return <SuspenseLoader />;

  /* ----------------------------------------------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings
        userName={user?.name}
        activeItem="personal"
      />
      <Outlet />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-3xl mx-auto p-8">

          {/* ---------------------- DADOS DA EMPRESA (somente owner) ---------------------- */}
          {isOwner && enterprise && (
            <>
              <h3 className="text-lg font-semibold mb-2">Dados da empresa</h3>
              <div className="border rounded-lg divide-y">
                <div className="flex items-center justify-between py-4 px-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome da empresa</p>
                    <p className="text-base font-medium text-gray-900">
                      {enterprise.name || 'Não disponível'}
                    </p>
                  </div>
                  {/* Para editar, redireciona ao Company settings */}
                  <Button
                    variant="outline"
                    onClick={() => navigate('/settings/company-settings')}
                  >
                    Gerenciar
                  </Button>
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-10 mb-2">Dados pessoais</h3>
            </>
          )}

          {/* ---------------------- DADOS DO USUÁRIO ---------------------- */}
          <div className="border rounded-lg divide-y">
            <Row label="Nome completo"  value={user?.name  ?? ''} field="name"        btnLabel="Atualizar nome" />
            <Row label="Email principal" value={user?.email ?? ''} field="email"       btnLabel="Atualizar email" />
            <Row label="Telefone"        value={user?.phone_number ?? ''} field="phone_number" btnLabel="Atualizar telefone" />
            <Row label="Cargo"           value={user?.job_title ?? ''} field="job_title"   btnLabel="Atualizar cargo" />
            <Row label="Departamento"    value={user?.department ?? ''} field="department"  btnLabel="Atualizar departamento" />
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Editar informações
              </h3>
              <button
                className="text-2xl text-gray-400 hover:text-gray-700"
                onClick={closeModal}
              >
                &times;
              </button>
            </header>

            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            >
              {(editingField === null || editingField === 'name') && (
                <Input label="Nome completo" name="name"
                       value={formData.name} onChange={handleChange} required />
              )}
              {(editingField === null || editingField === 'email') && (
                <Input label="Email principal" name="email" type="email"
                       value={formData.email} onChange={handleChange} required />
              )}
              {(editingField === null || editingField === 'phone_number') && (
                <Input label="Telefone" name="phone_number" type="tel"
                       value={formData.phone_number} onChange={handleChange} />
              )}
              {(editingField === null || editingField === 'job_title') && (
                <Input label="Cargo" name="job_title"
                       value={formData.job_title} onChange={handleChange} />
              )}
              {(editingField === null || editingField === 'department') && (
                <Input label="Departamento" name="department"
                       value={formData.department} onChange={handleChange} />
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button className="px-4 py-2" variant="outline" type="button" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button className="px-4 py-2" type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------- Snackbar ----------------------------- */}
      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage('')}
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default PersonalSettings;
