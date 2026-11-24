import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuthContext } from "@/hooks/useAuth";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

type FinancialModule = "accounting" | "pnl";

type Props = {
  module: FinancialModule;
  children: ReactNode;
  redirectTo?: string;
};

/**
 * Blocks an optional financial module that is not active for the workspace.
 *
 * The module state comes from the workspace bootstrap. When an older payload
 * has no feature state, the route stays reachable so existing accounting
 * workspaces never lose access during a rolling deployment.
 */
export const FinancialModuleMiddleware = ({
  module,
  children,
  redirectTo = "/b/cashflow",
}: Props) => {
  const { user, organization } = useAuthContext();
  const features = organization?.organization?.financial_features;

  if (!user) return <TopProgress active variant="center" />;
  if (!features) return <>{children}</>;

  const enabled =
    module === "accounting"
      ? !!features.accounting_enabled
      : !!features.pnl_enabled;

  if (!enabled) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};
