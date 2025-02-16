import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from "@/contexts/useAuthContext";

interface Props {
    children: React.ReactElement;
}

export const SuccessRouteMiddleware: React.FC<Props> = ({ children }) => { // 🔹 Agora é named export
    const { isSubscribed, isLogged, isOwner } = useAuthContext();
    const location = useLocation();

    const query = new URLSearchParams(location.search);
    const sessionId = query.get('session_id');

    if (!sessionId) {
        return isLogged ? <Navigate to="/enterprise" replace /> : <Navigate to="/signin" replace />;
    }

    if (!isLogged || (!isSubscribed && !isOwner)) {
        return isLogged ? <Navigate to="/enterprise" replace /> : <Navigate to="/signin" replace />;
    }

    return children;
};
