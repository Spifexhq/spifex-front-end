import QuotaWarning from "@/components/QuotaWarning";
// src/App.tsx
import { useRoutes } from 'react-router-dom';
import routes from './app/routing/router';
import './App.css';

import { RequestsProvider } from '@/app/providers/RequestsProvider';
import { AuthProvider } from '@/app/authentication/AuthProvider';

export const App = () => {
  const content = useRoutes(routes);

  return (
    <RequestsProvider>
      <AuthProvider>
        <div>
          <QuotaWarning />
          {content}
        </div>
      </AuthProvider>
    </RequestsProvider>
  );
};
