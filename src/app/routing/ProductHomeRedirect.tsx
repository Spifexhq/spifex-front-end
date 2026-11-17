import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { buildProductPath, type ProductSegment } from "./productPaths";

/** Send the signed-in user to the canonical overview for their workspace. */
export default function ProductHomeRedirect() {
  const { user, organization, isAuthResolved } = useAuthContext();

  if (!isAuthResolved) return <TopProgress active variant="center" />;

  const workspace = organization?.organization;
  if (!user?.id || !workspace?.id) return <Navigate replace to="/signin" />;

  const product: ProductSegment = workspace.product_category === "personal" ? "p" : "b";
  return <Navigate replace to={buildProductPath(user.id, product, workspace.id, "/overview")} />;
}
