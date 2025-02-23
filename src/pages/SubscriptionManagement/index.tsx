import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useAuth } from 'src/api';
import { useAuthContext } from "@/contexts/useAuthContext";

import Navbar from 'src/components/Navbar';
import { InlineLoader, SuspenseLoader } from 'src/components/Loaders';
import PaymentButton from 'src/components/SubscriptionButtons/PaymentButton';
import ManageSubscriptionLink from 'src/components/SubscriptionButtons/ManageSubscriptionLink';
import './styles.css';

const SubscriptionManagement: React.FC = () => {
  const { isLogged, handleInitUser } = useAuth();
  const { isSubscribed, activePlanId } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const availablePlans = import.meta.env.VITE_ENVIRONMENT === 'development'
  ? [
    { priceId: 'price_1Q01ZhJP9mPoGRyfBocieoN0', label: 'Plano Básico - R$50,00/mês' },
    { priceId: 'price_1Q0BQ0JP9mPoGRyfvnYKUjCy', label: 'Plano Premium - R$150,00/mês' }
  ]
  : [
    { priceId: 'price_1Q00r4JP9mPoGRyfZjHpSZul', label: 'Plano Básico - R$50,00/mês' },
    { priceId: 'price_1Q6OSrJP9mPoGRyfjaNSlrhX', label: 'Plano Premium - R$150,00/mês' }
    ];
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      await handleInitUser();
      setLoading(false);
    };
    init();
  }, [handleInitUser]);

  const handlePlanChange = (priceId: string) => {
    setSelectedPlanId(priceId);
  };

  if (!isLogged) {
    navigate('/signin');
    return null;
  }

  if (loading) {
    return <SuspenseLoader />;
  }

  return (
    <>
      <Navbar />
      <div className="subscription-management">
        <h1 className="subscription-management__title">Gerenciar Assinatura</h1>

        {isSubscribed ? (
          <div className="subscription-management__content">
            <h2 className="subscription-management__subtitle">
              Você está atualmente inscrito no plano: {activePlanId === 'price_1Q01ZhJP9mPoGRyfBocieoN0' ? 'Básico' : 'Premium'}
            </h2>
            <ul className="subscription-management__plans-list">
              {availablePlans.map((plan) => (
                <li className="plans-list__item" key={plan.priceId}>
                  <button
                    className={`item__button ${plan.priceId === activePlanId ? 'current-plan' : ''}`}
                    disabled={plan.priceId === activePlanId}
                    onClick={() => handlePlanChange(plan.priceId)}
                  >
                    {plan.label} {plan.priceId === activePlanId ? '(Atual)' : ''}
                  </button>
                </li>
              ))}
            </ul>
            <div className="subscription-management__actions">
              <ManageSubscriptionLink />
              <Link to="/enterprise" className="manage-subscription-button">
                Configurações
              </Link>
            </div>
          </div>
        ) : (
          <div className="subscription-management__content">
            <p className="subscription-management__text">
              Selecione um plano para assinar.
            </p>
            <ul className="subscription-management__plans-list">
              {availablePlans.map((plan) => (
                <li className="plans-list__item" key={plan.priceId}>
                  <PaymentButton priceId={plan.priceId} label={plan.label} />
                </li>
              ))}
            </ul>
            <div className="subscription-management__actions">
              <ManageSubscriptionLink />
              <Link to="/enterprise" className="manage-subscription-button">
                Configurações
              </Link>
            </div>
          </div>
        )}

        {selectedPlanId && (
          <div
            className={`modal ${isProcessing ? 'modal--processing' : ''}`}
            onClick={() => {
              if (!isProcessing) setSelectedPlanId('');
            }}
          >
            <div className="modal__content" onClick={(e) => e.stopPropagation()}>
              {isProcessing ? (
                <div className="modal__loader">
                  <InlineLoader />
                </div>
              ) : (
                <>
                  <h3 className="modal__title">Confirmar Alteração de Plano</h3>
                  <p className="modal__description">
                    Tem certeza de que deseja alterar para este plano? Sua assinatura atual será atualizada.
                  </p>
                  <div className="modal__actions">
                    <button
                      className="modal__cancel-button"
                      onClick={() => setSelectedPlanId('')}
                      disabled={isProcessing}
                    >
                      Cancelar
                    </button>
                    <PaymentButton
                      priceId={selectedPlanId}
                      label="Confirmar"
                      onProcessingChange={setIsProcessing}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SubscriptionManagement;
