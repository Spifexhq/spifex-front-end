export type LiveSyncSchemaVersion = 1;

export type LiveSyncEventType =
  | "livesync.hello"
  | "livesync.pong"
  | "subscription.updated"
  | "subscription.deleted"
  | "payment.failed"
  | "payment.succeeded"
  | "permissions.updated"
  | "profile.updated"
  | "notification.created"
  | "admin.action";

export type LiveSyncEnvelope<
  TType extends LiveSyncEventType = LiveSyncEventType,
  TData = unknown
> = {
  v: LiveSyncSchemaVersion;
  id: string;
  type: TType;
  ts: string;
  scope: {
    user_external_id?: string;
    org_external_id?: string;
    [k: string]: unknown;
  };
  data: TData;
  meta: {
    source?: string;
    [k: string]: unknown;
  };
};

export function isLiveSyncEnvelope(x: unknown): x is LiveSyncEnvelope {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.v === "number" && typeof o.type === "string" && typeof o.id === "string";
}
