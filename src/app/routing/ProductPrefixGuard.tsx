import type { ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { buildProductPath, productSuffix, type ProductSegment } from "./productPaths";

/**
 * Keeps the user/workspace IDs in the URL aligned with the authenticated
 * session and the workspace product, without changing the visible route shape.
 */
export default function ProductPrefixGuard({ product, children }: { product: ProductSegment; children: ReactNode }) {
  const { user, organization, isAuthResolved } = useAuthContext();
  const { userExternalId, organizationExternalId } = useParams();
  const location = useLocation();
  const workspace = organization?.organization;

  if (!isAuthResolved) return <TopProgress active variant="center" />;
  if (!user?.id) return <>{children}</>;
  if (!workspace?.id) return <Navigate replace to="/signin" />;

  const canonicalProduct: ProductSegment = workspace.product_category === "personal" ? "p" : "b";
  const aligned = userExternalId === user.id
    && organizationExternalId === workspace.id
    && product === canonicalProduct;

  if (!aligned) {
    const suffix = product === canonicalProduct ? productSuffix(location.pathname) : "";
    return (
      <Navigate
        replace
        to={{
          pathname: buildProductPath(user.id, canonicalProduct, workspace.id, suffix || "/overview"),
          search: location.search,
          hash: location.hash,
        }}
      />
    );
  }

  return <>{children}</>;
}
