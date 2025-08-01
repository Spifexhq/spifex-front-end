import { createContext } from 'react';
import { Subscription } from 'src/models/auth';

export interface SubscriptionContextProps {
  subscription: Subscription | null;
  fetchSubscription: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextProps | undefined>(undefined);
