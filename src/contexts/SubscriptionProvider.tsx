import { useState, useEffect, useCallback, ReactNode } from "react";
import { SubscriptionContext } from "./SubscriptionContext";
import { Subscription } from "src/models/auth";
import { api } from "src/api/requests";

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const resp = await api.getSubscriptionStatus();

      if (resp.data) {
        setSubscription(resp.data); // ✅ já vem tipado como Subscription
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
