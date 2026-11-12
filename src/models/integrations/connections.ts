export type IntegrationConnectionStatus = "active" | "expired";
export type IntegrationWorkspaceMode = "single" | "selected";
export type IntegrationWorkspacePermissions = {
  read: Record<string, boolean>;
  actions: Record<string, boolean>;
};

export type IntegrationConnectionPolicy = {
  configured: boolean;
  workspace_mode: IntegrationWorkspaceMode;
  workspace_ids: string[];
  permissions: {
    workspaces: Record<string, IntegrationWorkspacePermissions>;
  };
};

export type UpdateIntegrationConnectionPolicyRequest = {
  workspace_mode: IntegrationWorkspaceMode;
  workspace_ids: string[];
  permissions: IntegrationConnectionPolicy["permissions"];
};

export type IntegrationConnection = {
  application_id: string;
  client_name: string;
  registration_source: string;
  client_type: string;
  grant_type: string;
  scopes: string[];
  status: IntegrationConnectionStatus;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revocable: boolean;
  policy: IntegrationConnectionPolicy;
};

export type GetIntegrationConnectionsResponse = {
  count: number;
  results: IntegrationConnection[];
};

export type IntegrationActivity = {
  occurred_at: string;
  client_name: string;
  capability: string;
  outcome: "success" | "denied" | "invalid_request" | "rate_limited" | "error";
  row_count: number | null;
  actor: string | null;
};

export type GetIntegrationActivityResponse = {
  count: number;
  results: IntegrationActivity[];
};
