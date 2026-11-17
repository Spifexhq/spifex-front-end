import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { buildProductPath, type ProductSegment } from "./productPaths";

/**
 * `/p/...` and `/b/...` remain accepted as entry points and are upgraded to the
 * canonical `/{userExternalId}/{p|b}/{organizationExternalId}/...` URL.
 */
export default function LegacyProductRedirect() {
  const { user, organization, isAuthResolved } = useAuthContext();
  const location = useLocation();

  if (!isAuthResolved) return <TopProgress active variant="center" />;

  const workspace = organization?.organization;
  if (!user?.id || !workspace?.id) {
    return <Navigate replace to="/signin" state={{ from: location.pathname }} />;
  }

  const canonicalProduct: ProductSegment = workspace.product_category === "personal" ? "p" : "b";
  const requestedProduct = location.pathname.split("/")[1];
  const rest = location.pathname.replace(/^\/[pb](?=\/|$)/, "");
  const suffix = requestedProduct === canonicalProduct ? (rest || "/overview") : "/overview";

  return (
    <Navigate
      replace
      to={{
        pathname: buildProductPath(user.id, canonicalProduct, workspace.id, suffix),
        search: location.search,
        hash: location.hash,
      }}
    />
  );
}
