import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/api';
import { useAuthContext } from '@/contexts/useAuthContext';

import Navbar from '@/components/Navbar';
import SidebarSettings from '@/components/Sidebar/SidebarSettings';
import { InlineLoader, SuspenseLoader } from '@/components/Loaders';
import PaymentButton from '@/components/SubscriptionButtons/PaymentButton';
import ManageSubscriptionLink from '@/components/SubscriptionButtons/ManageSubscriptionLink';
import Button from '@/components/Button';

const SubscriptionManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isLogged, handleInitUser } = useAuth();
  const { isSubscribed, activePlanId, user } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const availablePlans = import.meta.env.VITE_ENVIRONMENT === 'development'
    ? [
        { priceId: 'price_1Q01ZhJP9mPoGRyfBocieoN0', label: 'Plano Básico - R$50,00/mês' },
        { priceId: 'price_1Q0BQ0JP9mPoGRyfvnYKUjCy', label: 'Plano Premium - R$150,00/mês' },
      ]
    : [
        { priceId: 'price_1Q00r4JP9mPoGRyfZjHpSZul', label: 'Plano Básico - R$50,00/mês' },
        { priceId: 'price_1Q6OSrJP9mPoGRyfjaNSlrhX', label: 'Plano Premium - R$150,00/mês' },
      ];

  useEffect(() => {
    const init = async () => {
      await handleInitUser();
      setLoading(false);
    };
    init();
  }, [handleInitUser]);

  if (!isLogged) {
    navigate('/signin');
    return null;
  }

  if (loading) return <SuspenseLoader />;

  const planName = activePlanId
    ? activePlanId.includes('1Q01ZhJP9mPoGRyfBocieoN0') ? 'Básico' : 'Premium' : null;

  return (
    <>
      <Navbar />

      <SidebarSettings
        userName={user?.name}
        activeItem="plan"
        onSelect={(id) => {
          if (id === 'plan') return navigate('/subscription-management');
          if (id === 'personal-settings') return navigate('/settings/personal');
          navigate(`/${id}`);
        }}
      />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-3xl mx-auto p-8">
          <h1 className="text-xl font-semibold mb-6">Gerenciar Assinatura</h1>

          {isSubscribed ? (
            <div className="space-y-6">
              <p className="text-base">
                Você está atualmente inscrito no plano:
                <strong> {planName}</strong>
              </p>

              <div className="border rounded-lg divide-y">
                {availablePlans.map((plan) => (
                  <div key={plan.priceId} className="flex items-center justify-between p-4">
                    <span>{plan.label}</span>
                    <Button
                      variant="outline"
                      disabled={plan.priceId === activePlanId}
                      onClick={() => setSelectedPlanId(plan.priceId)}
                    >
                      {plan.priceId === activePlanId ? 'Atual' : 'Selecionar'}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <ManageSubscriptionLink />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-base">Selecione um plano para assinar:</p>
              <div className="border rounded-lg divide-y">
                {availablePlans.map((plan) => (
                  <div key={plan.priceId} className="flex items-center justify-between p-4">
                    <span>{plan.label}</span>
                    <PaymentButton priceId={plan.priceId} label="Assinar" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {selectedPlanId && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => !isProcessing && setSelectedPlanId('')}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center h-32">
                <InlineLoader />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-2">Confirmar alteração</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tem certeza de que deseja alterar para este plano?
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedPlanId('')}>
                    Cancelar
                  </Button>
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
    </>
  );
};

export default SubscriptionManagement;
