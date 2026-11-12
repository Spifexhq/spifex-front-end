import QuotaWarning from "@/components/QuotaWarning";
// src/App.tsx
import { useRoutes } from 'react-router-dom';
import routes from './app/routing/router';
import './App.css';

import { RequestsProvider } from '@/app/providers/RequestsProvider';
import { AuthProvider } from '@/app/authentication/AuthProvider';
import { FeedbackStackProvider } from '@/shared/ui/FeedbackStack';

export const App = () => {
  const content = useRoutes(routes);

  return (
    <RequestsProvider>
      <AuthProvider>
        <FeedbackStackProvider>
          <div>
            <QuotaWarning />
            {content}
          </div>
        </FeedbackStackProvider>
      </AuthProvider>
    </RequestsProvider>
  );
};
