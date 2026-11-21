import { useEffect, useState } from "react";
import QuotaWarning from "@/components/QuotaWarning";
// src/App.tsx
import { useRoutes } from 'react-router-dom';
import routes from './app/routing/router';
import './App.css';

import { RequestsProvider } from '@/app/providers/RequestsProvider';
import { AuthProvider } from '@/app/authentication/AuthProvider';
import { FeedbackStackProvider } from '@/shared/ui/FeedbackStack';
import { FORMATS_CHANGED_EVENT } from '@/lib/formatEvents';

export const App = () => {
  const content = useRoutes(routes);
  // Date/number formats are read from storage at render time, so a change has
  // to re-render the tree for every open screen to pick it up.
  const [, setFormatVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setFormatVersion((value) => value + 1);
    window.addEventListener(FORMATS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FORMATS_CHANGED_EVENT, refresh);
  }, []);

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
