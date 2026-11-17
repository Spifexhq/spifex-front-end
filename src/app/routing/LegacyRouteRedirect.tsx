import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";
import Status404 from "@/pages/Status/Status404";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { buildProductPath, legacyProductPath } from "./productPaths";

/**
 * Removed root-level product paths (for example `/overview` or `/settings/banks`)
 * upgrade to the canonical `/{userExternalId}/{p|b}/{organizationExternalId}/...`
 * URL. Unknown paths still render the 404 page.
 */
export default function LegacyRouteRedirect() {
  const { user, organization, isAuthResolved } = useAuthContext();
  const location = useLocation();
  const legacy = legacyProductPath(location.pathname);

  if (!legacy) return <Status404 />;
  if (!isAuthResolved) return <TopProgress active variant="center" />;

  const workspace = organization?.organization;
  if (!user?.id || !workspace?.id) {
    return <Navigate replace to="/signin" state={{ from: location.pathname }} />;
  }

  return (
    <Navigate
      replace
      to={{
        pathname: buildProductPath(user.id, legacy.product, workspace.id, legacy.suffix),
        search: location.search,
        hash: location.hash,
      }}
    />
  );
}
