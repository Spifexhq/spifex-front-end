import { useState, useEffect, useCallback, ReactNode } from 'react';
import { SubscriptionContext } from './SubscriptionContext';
import { Subscription } from '@/models/Auth';
import { useRequests } from '@/api';

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { getSubscriptionStatus } = useRequests();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await getSubscriptionStatus();
      if (response.data) {
        const { status, stripe_subscription_id, plan_id } = response.data;
        setSubscription({
          status,
          stripe_subscription_id: stripe_subscription_id ?? '',
          plan_id: plan_id ?? '',
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    }
  }, [getSubscriptionStatus]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
