import { Navigate, useSearchParams } from "react-router-dom";

const legacySections: Record<string, string> = {
  profile: "personal",
  address: "personal",
  personalData: "personal",
  formats: "formats",
  currency: "currency",
  security: "security",
  notifications: "notifications",
  plans: "billing",
  billing: "billing",
  workspaces: "workspaces",
};

/** Preserve bookmarks using the former /settings?section=... URLs. */
export default function PersonalSettingsIndex() {
  const [params] = useSearchParams();
  const section = params.get("section") || "personal";
  return <Navigate to={`/personal/settings/${legacySections[section] || "personal"}`} replace />;
}
