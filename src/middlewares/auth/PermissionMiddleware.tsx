import { ReactNode, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/api";

type Props = {
  children: ReactNode;
  codeName: string | string[];
  isPage?: boolean;
  redirectTo?: string;
};

export const PermissionMiddleware = ({ children, codeName, isPage, redirectTo }: Props) => {
  const navigate = useNavigate();
  const { handlePermissionExists } = useAuth();

  const hasPermission = useMemo(() => {
    return Array.isArray(codeName)
      ? codeName.some((cn) => handlePermissionExists(cn))
      : handlePermissionExists(codeName);
  }, [codeName, handlePermissionExists]);

  useEffect(() => {
    if (!hasPermission && !isPage) {
      navigate(redirectTo ?? "/");
    }
  }, [hasPermission, isPage, navigate, redirectTo]);

  if (!hasPermission) {
    if (isPage) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center">
            <img
              alt="lock"
              src="src/assets/Images/status/lock.svg"
              className="my-6 h-52"
            />
            <h1 className="text-lg font-semibold">
              Você ainda não tem permissão para acessar essa área!
            </h1>
            <h2 className="mb-6 text-sm font-medium">
              Se você solicitou para a administração, clique no botão abaixo e atualize a página!
            </h2>
            <button
              type="button"
              onClick={() => navigate(0)}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm border border-gray-200 bg-gray-900 text-white hover:opacity-90 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
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
