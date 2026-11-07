import { useEffect, useState } from "react";
import { AUTH_SYNC_EVENT } from "@/core/api/http";

/** Revalidate reads after access/billing changes without remounting user drafts. */
export function usePersonalReadRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = (event: Event) => {
      const reason = (event as CustomEvent<{reason?: string}>).detail?.reason || "";
      if (["ws:permissions.updated", "ws:subscription.updated", "ws:subscription.deleted", "ws:profile.updated", "connection_recovered"].includes(reason)) setRevision(value => value + 1);
    };
    window.addEventListener(AUTH_SYNC_EVENT, update);
    return () => window.removeEventListener(AUTH_SYNC_EVENT, update);
  }, []);
  return revision;
}
