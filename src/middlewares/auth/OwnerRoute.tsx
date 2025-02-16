import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthContext } from "@/contexts/useAuthContext";

interface OwnerRouteProps {
  children: React.ReactElement;
}

export const OwnerRoute: React.FC<OwnerRouteProps> = ({ children }) => {
  const { isOwner, isLogged } = useAuthContext();

  if (!isLogged) {
    return <Navigate to="/signin" replace />;
  }

  if (!isOwner) {
    return <Navigate to="/enterprise" replace />;
  }

  return children;
};
