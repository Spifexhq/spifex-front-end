/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useCallback } from "react";
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
  useNavigate as useRouterNavigate,
  type LinkProps,
  type NavLinkProps,
  type NavigateFunction,
  type NavigateOptions,
  type NavigateProps,
  type To,
} from "react-router";
import { getOrgExternalIdStored, getUserIdStored } from "@/lib/tokens";
import { withProductIds } from "./productPaths";

export * from "react-router";
export { HydratedRouter, RouterProvider, type RouterProviderProps } from "react-router/dom";

/**
 * Product links are authored as `/p/...` or `/b/...`. The adapter injects the
 * current user and workspace external IDs so every rendered URL is canonical:
 * `/{userExternalId}/{p|b}/{organizationExternalId}/...`.
 */
export function resolveProductTo(to: To): To {
  const userId = getUserIdStored();
  const organizationId = getOrgExternalIdStored();
  if (!userId || !organizationId) return to;

  if (typeof to === "string") return withProductIds(to, userId, organizationId);
  if (to && typeof to === "object" && typeof to.pathname === "string") {
    const pathname = withProductIds(to.pathname, userId, organizationId);
    return pathname === to.pathname ? to : { ...to, pathname };
  }
  return to;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => (
  <RouterLink {...props} ref={ref} to={resolveProductTo(props.to)} />
));
Link.displayName = "ProductLink";

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>((props, ref) => (
  <RouterNavLink {...props} ref={ref} to={resolveProductTo(props.to)} />
));
NavLink.displayName = "ProductNavLink";

export function Navigate(props: NavigateProps) {
  return <RouterNavigate {...props} to={resolveProductTo(props.to)} />;
}

export function useNavigate(): NavigateFunction {
  const navigate = useRouterNavigate();
  return useCallback(
    ((to: To | number, options?: NavigateOptions) =>
      typeof to === "number" ? navigate(to) : navigate(resolveProductTo(to), options)) as NavigateFunction,
    [navigate],
  );
}
