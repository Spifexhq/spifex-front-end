import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Subscription } from '@/models/Auth';
import { useRequests } from '@/api';

interface SubscriptionContextProps {
  subscription: Subscription | null;
  fetchSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextProps | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { getSubscriptionStatus } = useRequests();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const fetchSubscription = async () => {
    try {
      const response = await getSubscriptionStatus();
      if (response.data) {
        const { status, stripe_subscription_id, plan_id } = response.data;
        // Garante que os campos sejam strings (mesmo que vazias)
        setSubscription({
          status,
          stripe_subscription_id: stripe_subscription_id ?? "",
          plan_id: plan_id ?? "",
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(null);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ subscription, fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscriptionContext = (): SubscriptionContextProps => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscriptionContext must be used within a SubscriptionProvider");
  }
  return context;
};
