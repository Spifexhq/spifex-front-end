import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useRequests } from '@/api';
import { useAuthContext } from "@/contexts/useAuthContext";
import Navbar from "@/components/Navbar";
import { Enterprise } from "src/models/Auth/Enterprise";
import { SuspenseLoader } from '@/components/Loaders';
import './styles.css';
import Button from 'src/components/Button';

const EnterprisePanel: React.FC = () => {
  const { isOwner } = useAuthContext();
  const { getEnterprise, editEnterprise } = useRequests();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
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
            ownerEmail: response.data.enterprise.owner.email,
          });
        } else {
          console.error(response.detail);
        }
      } catch (error) {
        console.error('Error fetching enterprise data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterprise();
  }, [getEnterprise]);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    try {
      await editEnterprise({
        name: formData.name,
        owner: { name: formData.ownerName, email: formData.ownerEmail },
      });
      const response = await getEnterprise();
      if (response.data) {
        setEnterprise(response.data.enterprise);
        handleCloseModal();
      } else {
        console.error(response.detail);
      }
    } catch (error) {
      console.error('Error updating enterprise information:', error);
    }
  };

  if (loading) {
    return <SuspenseLoader />;
  }

  return (
    <>
      <Navbar />
      <div className="enterprise-panel">
        <div className="enterprise-panel__container">
          <h2 className="enterprise-panel__title">Informações da Empresa</h2>
          <div className="enterprise-panel__details">
            <div className="enterprise-panel__detail">
              <span className="enterprise-panel__label">Nome da empresa:</span>
              <span className="enterprise-panel__value">{enterprise?.name || 'Not available'}</span>
            </div>
            <div className="enterprise-panel__detail">
              <span className="enterprise-panel__label">Dono:</span>
              <span className="enterprise-panel__value">{enterprise?.owner.name || 'Not available'}</span>
            </div>
            <div className="enterprise-panel__detail">
              <span className="enterprise-panel__label">Email principal:</span>
              <span className="enterprise-panel__value">{enterprise?.owner.email || 'Not available'}</span>
            </div>
          </div>
          {isOwner ? (
            <>
              <div className="enterprise-panel__actions">
                <Button className="btn btn--link" onClick={handleOpenModal}>
                  Editar
                </Button>
              </div>
              <Link to="/subscription-management" className="btn btn--link">
                Plano
              </Link>
            </>
          ) : null}
        </div>

        {/* Edit Modal */}
        {modalOpen && (
          <div className="modal" onClick={handleCloseModal}>
            <div className="modal__content" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h3 className="modal__title">Edit Enterprise Information</h3>
                <button className="modal__close" onClick={handleCloseModal}>
                  &times;
                </button>
              </div>
              <form className="modal__form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div className="modal__section">
                  <label htmlFor="name">Nome da empresa: </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="modal__section">
                  <label htmlFor="ownerName">Dono: </label>
                  <input
                    type="text"
                    id="ownerName"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="modal__section">
                  <label htmlFor="ownerEmail">Email principal: </label>
                  <input
                    type="email"
                    id="ownerEmail"
                    name="ownerEmail"
                    value={formData.ownerEmail}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="modal__actions">
                  <button type="button" className="btn btn--cancel" onClick={handleCloseModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn--save">
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EnterprisePanel;
