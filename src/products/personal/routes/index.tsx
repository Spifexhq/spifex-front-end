import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
const Layout = lazy(() => import("../layouts/PersonalLayout"));
const Overview = lazy(() => import("../pages/PersonalOverview"));
const Collection = lazy(() => import("../pages/PersonalCollectionPage"));
const Settings = lazy(() => import("../pages/PersonalSettings"));
const Help = lazy(() => import("@/pages/Help"));

export const personalRoutes: RouteObject[] = [{ path: "personal", element: <Layout/>, children: [
  { index: true, element: <Navigate to="overview" replace/> },
  { path: "overview", element: <Overview/> },
  { path: "reports", element: <Overview reports/> },
  ...(["transactions", "accounts", "categories", "budgets", "goals"] as const).map(collection => ({ path: collection, element: <Collection key={collection} collection={collection}/> })),
  { path: "transfers", element: <Navigate to="/personal/transactions?kind=transfer" replace/> },
  { path: "settings", element: <Settings/> },
  { path: "help", element: <Help/> },
  { path: "*", element: <Navigate to="/personal/overview" replace/> },
] }];
