import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/api";

type Props = {
    children: ReactNode
}

export const AuthMiddleware = ({ children }: Props) => {
    const navigate = useNavigate();
    const { isLogged } = useAuth();

    useEffect(() => {
        if (!isLogged) navigate('/signin');
    }, [isLogged, navigate]);

    return (
        <>
            {children}
        </>
    );
}
