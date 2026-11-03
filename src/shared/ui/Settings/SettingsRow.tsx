import type { ReactNode } from "react";
import { useAuthContext } from "@/hooks/useAuth";
/** Row activation never swallows embedded actions or bypasses edit permissions. */
export default function SettingsRow({ children, className = "", onOpen, disabled, permission }: { children: ReactNode; className?: string; onOpen(): void; disabled?: boolean; permission: string }) {
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const enabled = !disabled && (isOwner || isSuperUser || permissions.includes(permission));
  return <div className={`settings-row settings-record-row ${className}`} role={enabled ? "button" : undefined} tabIndex={enabled ? 0 : undefined} onClick={event => {
    if (!enabled || (event.target as Element).closest('button,a,input,select,textarea,[role="checkbox"]')) return;
    onOpen();
  }} onKeyDown={event => { if (enabled && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpen(); } }}>{children}</div>;
}
