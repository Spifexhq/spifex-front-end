import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import PersonalPermissionRoute from "../access/PersonalPermissionRoute";
import { PERSONAL_PERMISSION } from "../access/permissions";
const Layout = lazy(() => import("../layouts/PersonalLayout"));
const SettingsLayout = lazy(() => import("../layouts/PersonalSettingsLayout"));
const Overview = lazy(() => import("../pages/Overview"));
const Reports = lazy(() => import("../pages/Reports"));
const Transactions = lazy(() => import("../pages/Transactions"));
const BankAccounts = lazy(() => import("../pages/BankAccounts"));
const Categories = lazy(() => import("../pages/Categories"));
const Budgets = lazy(() => import("../pages/Budgets"));
const Goals = lazy(() => import("../pages/Goals"));
const Transfers = lazy(() => import("../pages/Transfers"));
const SettingsIndex = lazy(() => import("../pages/PersonalSettings"));
const PersonalSettings = lazy(() => import("@/features/account-settings/pages/PersonalSettings"));
const Security = lazy(() => import("@/features/account-settings/pages/SecurityAndPrivacy"));
const Notifications = lazy(() => import("@/features/account-settings/pages/NotificationSettings"));
const Formats = lazy(() => import("@/features/account-settings/pages/FormatSettings"));
const Currency = lazy(() => import("@/features/account-settings/pages/CurrencySettings"));
const Billing = lazy(() => import("@/features/workspaces/components/WorkspaceBillingSettings"));
const Workspaces = lazy(() => import("@/features/workspaces/pages/WorkspaceManagementPage"));
const Help = lazy(() => import("@/pages/Help"));

export const personalRoutes: RouteObject[] = [{ path: "personal", element: <Layout/>, children: [
  { index: true, element: <Navigate to="overview" replace/> },
  { path: "overview", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.overview}><Overview/></PersonalPermissionRoute> },
  { path: "reports", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.reports}><Reports/></PersonalPermissionRoute> },
  { path: "transactions", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.transactions}><Transactions/></PersonalPermissionRoute> },
  { path: "accounts", element: <Navigate to="/personal/settings/accounts" replace/> },
  { path: "categories", element: <Navigate to="/personal/settings/categories" replace/> },
  { path: "budgets", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.budgets}><Budgets/></PersonalPermissionRoute> },
  { path: "goals", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.goals}><Goals/></PersonalPermissionRoute> },
  { path: "transfers", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.settledTransactions}><Transfers/></PersonalPermissionRoute> },
  { path: "settings", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.settings}><SettingsLayout/></PersonalPermissionRoute>, children: [
    { index: true, element: <SettingsIndex/> },
    { path: "personal", element: <PersonalSettings product="personal"/> },
    { path: "profile", element: <Navigate to="/personal/settings/personal" replace/> },
    { path: "address", element: <Navigate to="/personal/settings/personal" replace/> },
    { path: "personal-data", element: <Navigate to="/personal/settings/personal" replace/> },
    { path: "security", element: <Security/> },
    { path: "notifications", element: <Notifications/> },
    { path: "accounts", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.bankAccounts}><BankAccounts/></PersonalPermissionRoute> },
    { path: "categories", element: <PersonalPermissionRoute permission={PERSONAL_PERMISSION.categories}><Categories/></PersonalPermissionRoute> },
    { path: "formats", element: <Formats/> },
    { path: "currency", element: <Currency/> },
    { path: "billing", element: <Billing/> },
    { path: "workspaces", element: <Workspaces/> },
    { path: "*", element: <Navigate to="/personal/settings/personal" replace/> },
  ] },
  { path: "help", element: <Help/> },
  { path: "*", element: <Navigate to="/personal/overview" replace/> },
] }];
