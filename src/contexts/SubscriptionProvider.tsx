/* -------------------------------------------------------------------------- */
/*  File: src/contexts/SubscriptionProvider.tsx                               */
/* -------------------------------------------------------------------------- */

import { useState, useEffect, useCallback, ReactNode } from "react";
import { SubscriptionContext } from "./SubscriptionContext";
import { Subscription } from "src/models/auth";
import { api } from "src/api/requests";             // ← usa API central

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const resp = await api.getSubscriptionStatus();
      if (resp.data) {
        const { status, stripe_subscription_id, plan_id } = resp.data;
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
  }, []);

  /* first load */
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
