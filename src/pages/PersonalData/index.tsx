import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import SidebarSettings from '@/components/Sidebar/SidebarSettings';
import { useRequests } from '@/api';
import { useAuthContext } from '@/contexts/useAuthContext';
import Navbar from '@/components/Navbar';
import { Enterprise } from 'src/models/Auth/Enterprise';
import { SuspenseLoader } from '@/components/Loaders';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Snackbar from '@/components/Snackbar';
import Alert from '@/components/Alert';

const PersonalData: React.FC = () => {
  const { isOwner } = useAuthContext();
  const { getEnterprise, editEnterprise } = useRequests();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerEmail: ''
  });

  useEffect(() => {
    const fetchEnterprise = async () => {
      try {
        const response = await getEnterprise();
        if (response.data) {
          setEnterprise(response.data.enterprise);
          setFormData({
            name: response.data.enterprise.name,
            ownerName: response.data.enterprise.owner.name,
            ownerEmail: response.data.enterprise.owner.email
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados da empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterprise();
  }, [getEnterprise]);

  const handleOpenModal = () => setModalOpen(true);

  const handleCloseModal = () => {
    if (enterprise) {
      setFormData({
        name: enterprise.name,
        ownerName: enterprise.owner.name,
        ownerEmail: enterprise.owner.email
      });
    }
    setModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await editEnterprise({
        name: formData.name,
        owner: { name: formData.ownerName, email: formData.ownerEmail }
      });

      if (response.status === 'error') {
        throw new Error(response.message);
      }

      const updated = await getEnterprise();
      if (updated.data) {
        setEnterprise(updated.data.enterprise);
        handleCloseModal();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao atualizar os dados.';
      setSnackBarMessage(message);
    }
  };

  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings userName="Edgar Moraes" activeItem="personal-settings" />
      <div className="min-h-screen text-gray-900 px-8 py-20">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
          <h2 className="text-3xl font-semibold mb-10">Configurações Pessoais</h2>

          <div className="space-y-6 border-b border-gray-200 pb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Nome da empresa</p>
                <p className="text-base font-medium">
                  {enterprise?.name || 'Não disponível'}
                </p>
              </div>
              {isOwner && (
                <Button variant="outline" onClick={handleOpenModal}>
                  Editar
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Proprietário</p>
                <p className="text-base font-medium">
                  {enterprise?.owner.name || 'Não disponível'}
                </p>
              </div>
              {isOwner && (
                <Button variant="outline" onClick={handleOpenModal}>
                  Editar
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Email principal</p>
                <p className="text-base font-medium">
                  {enterprise?.owner.email || 'Não disponível'}
                </p>
              </div>
              {isOwner && (
                <Button variant="outline" onClick={handleOpenModal}>
                  Editar
                </Button>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="mt-6">
              <Link
                to="/subscription-management"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Acessar Plano
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Editar informações</h3>
              <button
                className="text-gray-400 hover:text-gray-700 text-2xl"
                onClick={handleCloseModal}
              >
                &times;
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <Input
                label="Nome da empresa"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Proprietário"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                required
              />
              <Input
                label="Email principal"
                name="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={handleChange}
                required
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleCloseModal} type="button">
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackBarMessage !== ''}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage('')}
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default PersonalData;
