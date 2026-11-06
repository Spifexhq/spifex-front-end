import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { QUOTA_WARNING_EVENT, quotaErrorMessage, type QuotaIssue } from "@/lib/apiErrorMessage";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";
import Snackbar from "@/shared/ui/Snackbar";

/** Fallback feedback for all requests, even when a local handler swallows errors. */
export default function QuotaWarning() {
  const { t } = useTranslation("common");
  const { isOwner, isSuperUser, permissions, user, organization } = useAuthContext();
  const canViewUsage = isOwner || isSuperUser || permissions.includes("view_limits_and_usage_page");
  const [warning, setWarning] = useState<{ issue: QuotaIssue; id: number } | null>(null);
  useEffect(() => { setWarning(null); }, [user?.id, organization?.organization?.id]);
  useEffect(() => {
    const receive = (event: Event) => setWarning({ issue: (event as CustomEvent<QuotaIssue>).detail, id: Date.now() });
    window.addEventListener(QUOTA_WARNING_EVENT, receive);
    return () => window.removeEventListener(QUOTA_WARNING_EVENT, receive);
  }, []);

  return <Snackbar open={!!warning} notificationKey={warning?.id} message={warning ? <div><p>{quotaErrorMessage({code:warning.issue.code,limit:warning.issue.limit,remaining:warning.issue.remaining,reset_at:warning.issue.resetAt})}</p>{canViewUsage && <Link className="mt-2 inline-block text-xs font-medium underline underline-offset-4" to="/settings/limits" onClick={() => setWarning(null)}>{t("quota.viewUsage")}</Link>}</div> : ""} severity="warning" autoHideDuration={9000} onClose={() => setWarning(null)} anchor={{vertical:"top",horizontal:"center"}} showCloseButton/>;
}
