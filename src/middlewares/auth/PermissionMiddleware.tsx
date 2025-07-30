import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/api";
import './styles.css';

type Props = {
  children: ReactNode;
  codeName: string | string[];
  isPage?: boolean;
  redirectTo?: string;
};

export const PermissionMiddleware = ({ children, codeName, isPage, redirectTo }: Props) => {
  const navigate = useNavigate();
  const { handlePermissionExists } = useAuth();

  useEffect(() => {
    let hasPermission = false;
    if (Array.isArray(codeName)) {
      hasPermission = codeName.some((cn) => handlePermissionExists(cn));
    } else {
      hasPermission = handlePermissionExists(codeName);
    }

    if (!hasPermission) {
      navigate(redirectTo ?? '/');
    }
  }, [codeName, handlePermissionExists, navigate, redirectTo]);

  let hasPermission = false;
  if (Array.isArray(codeName)) {
    hasPermission = codeName.some((cn) => handlePermissionExists(cn));
  } else {
    hasPermission = handlePermissionExists(codeName);
  }

  if (!hasPermission) {
    if (isPage) {
      return (
        <div className="permission-middleware__container">
          <div className="permission-middleware__content">
            <img
              className="lock-image"
              alt="lock"
              height={200}
              src="src/assets/Images/status/lock.svg"
            />
            <h1>Você ainda não tem permissão para acessar essa área!</h1>
            <h2>
              Se você solicitou para a administração, clique no botão abaixo e atualize a página!
            </h2>
            <button className="button-primary" onClick={() => navigate(0)}>
              Atualizar página
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
};
