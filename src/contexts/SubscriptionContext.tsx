import { createContext } from 'react';
import { Subscription } from '@/models/Auth';

export interface SubscriptionContextProps {
  subscription: Subscription | null;
  fetchSubscription: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextProps | undefined>(undefined);
