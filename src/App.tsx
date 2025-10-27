// src/App.tsx
import { useRoutes } from 'react-router-dom';
import routes from './router';
import './app.css';

import { RequestsProvider } from '@/contexts/RequestsProvider';
import { AuthProvider } from '@/contexts/AuthProvider';

export const App = () => {
  const content = useRoutes(routes);

  return (
    <RequestsProvider>
      <AuthProvider>
        <div>
          {content}
        </div>
      </AuthProvider>
    </RequestsProvider>
  );
};
