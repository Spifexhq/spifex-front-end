// src/middlewares/auth/AuthMiddleware.tsx
import { type ReactNode } from "react";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import TopProgress from "@/components/ui/Loaders/TopProgress";

export const AuthMiddleware = ({ children }: { children: ReactNode }) => {
  const { isLogged, checking } = useRequireLogin();

  if (checking) return <TopProgress active variant="center" />;
  return isLogged ? <>{children}</> : null;
};
