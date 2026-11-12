import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Card from "@/shared/ui/Card";
import { PERSONAL_PERMISSION, type PersonalPermission } from "./permissions";
import { usePersonalAccess } from "./PersonalAccessProvider";
import { useAuthContext } from "@/hooks/useAuth";

export default function PersonalPermissionRoute({ permission, children }: { permission: PersonalPermission; children: ReactNode }) {
  const { t } = useTranslation("personal");
  const access = usePersonalAccess();
  const auth = useAuthContext();
  const superuser = auth.isSuperUser && auth.organization?.organization?.product_category === "personal";
  if (access.loading && !superuser) return <PageSkeleton rows={6}/>;
  if (access.error && !superuser) return <Card as="section" radius="xl" padding="spacious" role="alert" className="mx-auto mt-8 max-w-xl">
    <h1 className="text-base font-semibold text-gray-900">{t("access.loadErrorTitle")}</h1>
    <p className="mt-2 text-sm text-gray-600">{t("access.loadErrorDescription")}</p>
    <button type="button" onClick={() => void access.refresh()} className="mt-4 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">{t("access.retry")}</button>
  </Card>;
  if (!access.can(permission)) return <Card as="section" radius="xl" padding="spacious" className="mx-auto mt-8 max-w-xl">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{access.plan?.name || t("access.planLabel")}</p>
    <h1 className="mt-2 text-lg font-semibold text-gray-900">{t("access.unavailableTitle")}</h1>
    <p className="mt-2 text-sm leading-6 text-gray-600">{t("access.unavailableDescription")}</p>
    <Link to="/personal/settings/billing" className="mt-4 inline-flex rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">{t("access.managePlan")}</Link>
  </Card>;
  return <>{children}</>;
}

export { PERSONAL_PERMISSION };
