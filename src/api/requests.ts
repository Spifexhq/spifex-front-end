// src/api/requests.ts
import { request, http } from '@/lib/http';
import type { AxiosProgressEvent, AxiosResponse } from 'axios'
import type { MfaRequiredPayload, SignInRequest, SignInResend2FARequest,
  SignInResend2FAResponse, SignInResponse, SignInVerify2FARequest, SignOutResponse,
  SignUpRequest, SignUpResponse } from '@/models/auth/auth'
import type { CookieConsentRequest, CookieConsentResponse } from '@/models/auth/cookies';
import type { EmailChangeRequest, EmailChangeResponse, PasswordChangeRequest, PasswordChangeResponse, VerifyPasswordResetRequest, VerifyPasswordResetResponse, PasswordResetRequest, PasswordResetResponse, 
  TwoFactorSettingsResponse, TwoFactorSettingsUpdateRequest, SecurityStatusResponse} from '@/models/auth/security';
import type { GetUserResponse, User, PersonalSettings, EditPersonalSettingsRequest } from '@/models/auth/user';
import type { Organization, OrgCurrencyResponse, UpdateOrgCurrencyRequest } from '@/models/auth/organization';
import type { GetEntitlementLimitsResponse } from '@/models/auth/entitlements';
import type { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse, CreateCustomerPortalSessionRequest,
  CreateCustomerPortalSessionResponse, 
  GetSubscriptionStatusResponse} from '@/models/auth/billing';
import type { GetNotificationPreferencesResponse, UpdateNotificationPreferencesRequest,
  UpdateNotificationPreferencesResponse } from '@/models/auth/notifications';
import type { AddGroupRequest, EditGroupRequest, GetGroupPermissionsResponse, GetGroupResponse,
  GetGroupsResponse, GetPermissionsResponse, UpdateGroupPermissionsResponse } from '@/models/auth/rbac';
import type { AddMemberRequest, EditMemberRequest, GetMemberResponse, GetMembersParams, GetMembersResponse } from '@/models/auth/members';
import type { CashflowKpis, KpiQueryParams, SettledKpis } from '@/models/components/cardKpis';
import type { DashboardOverview } from '@/models/components/dashboard';
import type { ReportsSummaryParams, ReportsSummary } from '@/models/components/reports';
import type { AddViewPresetRequest, AddViewPresetResponse, EditViewPresetRequest, EditViewPresetResponse,
  GetViewPresetsResponse } from '@/models/components/viewPresets';
import type { AddEntryRequest, Entry, EntryWriteResponse, GetEntriesBulkRequest, GetEntriesBulkResponse,
  GetEntryRequest, EditEntriesBulkResponse, EditEntryRequest, GetEntryResponse,
  DeleteEntriesBulkRequest } from '@/models/entries/entries';
import type { GetSettledEntryRequest, GetSettledEntryResponse, SettledEntry, BulkSettleItem, BulkSettleResponse,
  EditSettledEntryRequest, DeleteSettledEntriesBulkRequest } from '@/models/entries/settlements';
import type { AddTransferenceRequest, Transference } from "@/models/entries/transferences";
import type { AddBankRequest, AddBankResponse, EditBankRequest, EditBankResponse, GetBankResponse,
  GetBanksBulkRequest, GetBanksBulkResponse, GetBanksParams, GetBanksResponse, 
  GetBanksTableParams,
  GetBanksTableResponse} from '@/models/settings/banking';
import type { AddLedgerAccountRequest, DeleteAllLedgerAccountsRequest, DeleteAllLedgerAccountsResponse,
  EditLedgerAccountRequest, GetLedgerAccountsRequest, GetLedgerAccountsResponse, ImportLedgerAccountsResponse,
  ImportStandardLedgerAccountsRequest, ImportStandardLedgerAccountsResponse, LedgerAccount, LedgerAccountsBulkRequest,
  LedgerAccountsBulkResponse, LedgerAccountsExistsResponse } from '@/models/settings/ledgerAccounts';
import type { AddDepartmentRequest, Department, DepartmentsBulkRequest, DepartmentsBulkResponse, EditDepartmentRequest,
  GetDepartmentResponse, GetDepartmentsParams, GetDepartmentsResponse } from '@/models/settings/departments';
import type { AddProjectRequest, EditProjectRequest, GetProjectsParams, GetProjectsResponse, Project,
  ProjectsBulkRequest, ProjectsBulkResponse } from '@/models/settings/projects';
import type { AddInventoryItemRequest, EditInventoryItemRequest, GetInventoryItemsParams, GetInventoryItemsResponse,
  InventoryItem, InventoryItemsBulkRequest, InventoryItemsBulkResponse } from '@/models/settings/inventory';
import type { AddEntityRequest, EditEntityRequest, EntitiesBulkRequest, EntitiesBulkResponse, Entity,
  GetEntitiesParams, GetEntitiesResponse, GetEntityResponse } from '@/models/settings/entities';
import { GetStatementsParams, GetStatementsResponse, TriggerStatementAnalysisResponse, UploadStatementResponse } from '@/models/settings/statements';


async function downloadTemplate(path: string, filename: string) {
  const res = await http.get(path, {
    responseType: "blob",
    validateStatus: (s: number) => s >= 200 && s < 300,
  });

  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}


function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


function filenameFromContentDisposition(
  contentDisposition: string | undefined,
  fallback: string
) {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? fallback;
}


export const api = {
  /* --- Auth --- */
  signIn: (payload: SignInRequest) =>
    request<SignInResponse | MfaRequiredPayload>("auth/signin/", "POST", payload),

  signUp: (payload: SignUpRequest) =>
    request<SignUpResponse>("auth/signup/", "POST", payload),

  signOut: () =>
    request<SignOutResponse>("auth/signout/", "POST"),

  saveCookieConsent: (payload: CookieConsentRequest) =>
    request<CookieConsentResponse>("cookies/consent/", "POST", payload),

  /* --- 2FA Sign-in --- */
  signInVerify2FA: (payload: SignInVerify2FARequest) =>
    request<SignInResponse>("auth/signin/verify-2fa/", "POST", payload),

  signInResend2FA: (payload: SignInResend2FARequest) =>
    request<SignInResend2FAResponse>("auth/signin/resend-2fa/", "POST", payload),

  /* --- Email verifications --- */
  checkEmailAvailability: (email: string) =>
    request<{ available: boolean }>("identity/emails/check/", "POST", { email }),

  verifyEmail: <T>(uidb64: string, token: string) =>
    request<T>(`identity/emails/verify/${uidb64}/${token}/`, "GET"),

  verifyNewEmail: <T>(changeId: string, token: string) =>
    request<T>(`identity/emails/verify-change/${changeId}/${token}/`, "GET"),

  cancelEmailChange: <T>(changeId: string, token: string) =>
    request<T>(`identity/emails/cancel-change/${changeId}/${token}/`, "GET"),

  /* --- 2FA --- */
  getTwoFactorSettings: () =>
    request<TwoFactorSettingsResponse>("identity/profile/two-factor/", "GET"),

  updateTwoFactorSettings: (payload: TwoFactorSettingsUpdateRequest) =>
    request<TwoFactorSettingsResponse>("identity/profile/two-factor/", "PATCH", payload),

  /* --- Email / Password security --- */
  emailChange: (payload: EmailChangeRequest) =>
    request<EmailChangeResponse>("identity/emails/change/", "POST", payload),

  passwordChange: (payload: PasswordChangeRequest) =>
    request<PasswordChangeResponse>("identity/password/change/", "PUT", payload),

  verifyPasswordChange: <T>(changeId: string, token: string) =>
    request<T>(`identity/password/verify-change/${changeId}/${token}/`, "GET"),

  /* --- Password reset --- */
  passwordReset: (email: string) =>
    request<PasswordResetResponse>("identity/password/reset/", "POST", {
      email
    } satisfies PasswordResetRequest),

  verifyPasswordReset: (uidb64: string, token: string, password: string) =>
    request<VerifyPasswordResetResponse>(`identity/password/reset/${uidb64}/${token}/`, "POST", {
      password,
      password_confirm: password,
    } satisfies VerifyPasswordResetRequest),

  /* --- User --- */
  getUser: () =>
    request<GetUserResponse>("identity/profile/", "GET"),

  editUser:(payload: Partial<User>) =>
    request<User>("identity/profile/", "PUT", payload),

  getPersonalSettings: () =>
    request<PersonalSettings>("identity/profile/settings/", "GET"),

  editPersonalSettings:(payload: EditPersonalSettingsRequest) =>
    request<PersonalSettings>("identity/profile/settings/", "PATCH", payload),

  getSecurityStatus: () =>
    request<SecurityStatusResponse>("identity/profile/security-status/", "GET"),

  /* --- Organization --- */
  getOrganization: () =>
    request<Organization>("organizations/current/", "GET"),

  editOrganization: (payload: Partial<Organization>) =>
    request<Organization>("organizations/current/", "PUT", payload),

  getOrgCurrency: () =>
    request<OrgCurrencyResponse>("organizations/current/currency/", "GET"),

  updateOrgCurrency: (payload: UpdateOrgCurrencyRequest) =>
    request<OrgCurrencyResponse>("organizations/current/currency/", "PUT", payload),

  /* --- Entitlements --- */
  getEntitlementLimits:() =>
    request<GetEntitlementLimitsResponse>("entitlements/limits/", "GET"),

  /* --- Subscriptions --- */
  getSubscriptionStatus: () =>
    request<GetSubscriptionStatusResponse>("billing/subscription/", "GET"),

  createCheckoutSession: (price_id: string) =>
    request<CreateCheckoutSessionResponse>("billing/checkout-session/", "POST", {
      price_id
    } satisfies CreateCheckoutSessionRequest),

  createCustomerPortalSession: () =>
    request<CreateCustomerPortalSessionResponse>(`billing/customer-portal-session/`, 'POST',
      {} satisfies CreateCustomerPortalSessionRequest),

  /* --- Notifications --- */
  getNotificationPreferences: () =>
    request<GetNotificationPreferencesResponse>("identity/notifications/preferences/", "GET"),

  updateNotificationPreferences: (payload: UpdateNotificationPreferencesRequest) =>
    request<UpdateNotificationPreferencesResponse>("identity/notifications/preferences/", "PUT", payload),

  /* --- Permissions --- */
  getPermissions: () =>
    request<GetPermissionsResponse>("rbac/permissions/", "GET"),

  getPermission: (code: string) =>
    request<GetPermissionsResponse>(`rbac/permissions/${code}/`, "GET"),

  /* --- Group permissions --- */
  getGroupPermissions: (groupId: string) =>
    request<GetGroupPermissionsResponse>(`rbac/groups/${groupId}/permissions/`, "GET"),

  updateGroupPermissions: (groupId: string, permission_codes: string[]) =>
    request<UpdateGroupPermissionsResponse>(`rbac/groups/${groupId}/permissions/`, "POST", {
      permission_codes
    }),
  
  /* --- Groups --- */
  getGroups: () =>
    request<GetGroupsResponse>("rbac/groups/", "GET"),

  getGroup: (groupId: string) =>
    request<GetGroupResponse>(`rbac/groups/${groupId}/`, "GET"),

  addGroup: (payload: AddGroupRequest) =>
    request<GetGroupResponse>("rbac/groups/", "POST", payload),

  editGroup: (groupId: string, payload: Partial<EditGroupRequest>) =>
    request<GetGroupResponse>(`rbac/groups/${groupId}/`, "PATCH", payload),

  deleteAllGroups: () =>
    request<void>("rbac/groups/", "DELETE"),

  deleteGroup: (groupId: string) =>
    request<void>(`rbac/groups/${groupId}/`, "DELETE"),

  /* --- Members --- */
  getMembers: (params?: GetMembersParams) =>
    request<GetMembersResponse>("organizations/members/", "GET", params),

  getMember: (memberId: string) =>
    request<GetMemberResponse>(`organizations/members/${memberId}/`, "GET"),

  addMember: (payload: AddMemberRequest) =>
    request<GetMemberResponse>("organizations/members/", "POST", payload),

  editMember: (memberId: string, payload: EditMemberRequest) =>
    request<GetMemberResponse>(`organizations/members/${memberId}/`, "PATCH", payload),

  deleteMember: (memberId: string) =>
    request<void>(`organizations/members/${memberId}/`, "DELETE"),

  /* --- KPIs --- */
  getCashflowKpis: (params: KpiQueryParams) =>
    request<CashflowKpis>("cashflow/kpis/cashflow/", "GET", params),

  getSettledKpis: (params: KpiQueryParams) =>
    request<SettledKpis>("cashflow/kpis/settled/", "GET", params),

  /* --- Dashboard --- */
  getCashflowDashboard: () =>
    request<DashboardOverview>(`cashflow/dashboard/`, "GET"),

  /* --- Reports --- */
  getReportsSummary: (params: ReportsSummaryParams) =>
    request<ReportsSummary>("cashflow/reports/summary/", "GET", params),

  /* --- View Presets --- */
  getViewPresets: () =>
    request<GetViewPresetsResponse>("cashflow/view-preset/", "GET"),

  addViewPreset: (payload: AddViewPresetRequest) =>
    request<AddViewPresetResponse>("cashflow/view-preset/", "POST", payload),

  editViewPreset: (viewId: string, payload: EditViewPresetRequest) =>
    request<EditViewPresetResponse>(`cashflow/view-preset/${viewId}/`, "PATCH", payload),

  deleteViewPreset: (viewId: string) =>
    request<void>(`cashflow/view-preset/${viewId}/`, "DELETE"),
  
  /* --- Cash-flow Entries --- */
  getEntries: (payload: GetEntryRequest) =>
    request<GetEntryResponse>(`cashflow/entries/`, "GET", payload),

  getEntriesTable: (payload: GetEntryRequest) =>
    request<GetEntryResponse>(`cashflow/entries/table/`, "GET", payload),

  getEntry: (id: string) =>
    request<Entry>(`cashflow/entries/${id}/`, "GET"),

  getEntriesBulk: (ids: string[]) =>
    request<GetEntriesBulkResponse>(`cashflow/entries/bulk/get/`, "POST", {
      ids
    } satisfies GetEntriesBulkRequest),

  addEntry: (payload: AddEntryRequest) =>
    request<EntryWriteResponse>(`cashflow/entries/`, "POST", payload),

  editEntry: (id: string, payload: Partial<EditEntryRequest>) =>
    request<EntryWriteResponse>(`cashflow/entries/${id}/`, "PATCH", payload),

  editEntriesBulk: (ids: string[], data: Partial<EditEntryRequest>, atomic: boolean = true) =>
    request<EditEntriesBulkResponse>(`cashflow/entries/bulk/update/`, "PATCH",
      { ids, data, atomic }),

  deleteEntry: (id: string) =>
    request<void>(`cashflow/entries/${id}/`, "DELETE"),

  deleteEntriesBulk: (ids: string[]) =>
    request<void>(`cashflow/entries/bulk/delete/`, "POST", { ids } satisfies DeleteEntriesBulkRequest),

  /* --- Settle Process --- */
  // * Analyze \/
  ddSettlement: (
    id: string,
    payload: { bank_id: string; amount_minor?: number; amount?: string; value_date: string }
  ) => {
    return request<Entry>(
      `cashflow/entries/${id}/settlements/`,
      "POST",
      payload
    );
  },
  // ** Analyze /\

  /* --- Settled Entries --- */
  getSettledEntries: (payload: GetSettledEntryRequest) => {
    const params = { include_inactive: true, ...payload };
    return request<GetSettledEntryResponse>(`cashflow/settlements/`, "GET", params)},

  getSettledEntriesTable: (payload: GetSettledEntryRequest) => {
    const params = { include_inactive: true, ...payload };
    return request<GetSettledEntryResponse>(`cashflow/settlements/table/`, "GET", params)},

  getSettledEntriesBulk: (ids: string[], payload?: GetSettledEntryRequest) => {
    const params = { include_inactive: true, ...(payload || {}), ids: ids.join(",") };
    return request<SettledEntry[]>(`cashflow/settlements/bulk/get/`, "POST", params)},

  addSettlementsBulk: (items: BulkSettleItem[], atomic: boolean = true) =>
    request<BulkSettleResponse>(`cashflow/settlements/bulk/settle/`, "POST", { items, atomic }),

  editSettledEntry: (id: string, payload: Partial<EditSettledEntryRequest>) =>
    request<SettledEntry>(`cashflow/settlements/${id}/`, "PATCH", payload),
  
  deleteSettledEntry: (id: string) =>
    request<Entry>(`cashflow/settlements/${id}/`, "DELETE"),
  
  deleteSettledEntriesBulk: (ids: string[]) =>
    request<void>(`cashflow/settlements/bulk/delete/`, "POST", { ids } satisfies DeleteSettledEntriesBulkRequest),

  /* --- Transferences --- */
  addTransference: (payload: AddTransferenceRequest) =>
    request<Transference>(`cashflow/transfers/`, 'POST', payload),

  /* --- Banks --- */
  getBanks: (params?: GetBanksParams) => {
    return request<GetBanksResponse>(`banking/accounts/`, "GET", params);
  },

  getBanksBulk: (ids: string[]) =>
    request<GetBanksBulkResponse>(`banking/accounts/bulk/get/`, "POST", {
      ids
    } satisfies GetBanksBulkRequest),

  getBanksTable: (payload?: GetBanksTableParams) => {
    const ids = (payload?.ids ?? []).map(String).map((s) => s.trim()).filter(Boolean);

    // If ids are provided => POST (no HTTP caching)
    if (ids.length > 0) {
      return request<GetBanksTableResponse>("banking/accounts/table/", "POST", {
        ...(payload?.active !== undefined ? { active: payload.active } : {}),
        ids,
      });
    }

    // No ids => GET (HTTP cache + ETag/304 possible)
    const params =
      payload?.active !== undefined ? { active: payload.active } : undefined;

    return request<GetBanksTableResponse>("banking/accounts/table/", "GET", params);
  },

  getBank: (bankId: string) =>
    request<GetBankResponse>(`banking/accounts/${bankId}/`, "GET"),

  addBank: (payload: AddBankRequest) =>
    request<AddBankResponse>(`banking/accounts/`, "POST", payload),

  editBank: (bankId: string, payload: EditBankRequest) =>
    request<EditBankResponse>(`banking/accounts/${bankId}/`, "PATCH", payload),

  deleteBank: (bankId: string) =>
    request<void>(`banking/accounts/${bankId}/`, "DELETE"),

  /* --- Ledger Acccounts --- */
  getLedgerAccounts: (params?: GetLedgerAccountsRequest) =>
    request<GetLedgerAccountsResponse>(`ledger/accounts/`, "GET", params),

  getLedgerAccountsBulk: (ids: string[]) =>
    request<LedgerAccountsBulkResponse>(`ledger/accounts/bulk/get/`, "POST", {
      ids
    } satisfies LedgerAccountsBulkRequest),

  getLedgerAccount: (ledgerAccountId: string) =>
    request<LedgerAccount>(`ledger/accounts/${ledgerAccountId}/`, "GET"),

  getLedgerAccountsExists: () =>
    request<LedgerAccountsExistsResponse>(`ledger/accounts/exists/`, "GET"),

  importLedgerAccounts: (formData: FormData) =>
    request<ImportLedgerAccountsResponse>(`ledger/accounts/import/`, "POST", formData),

  importStandardLedgerAccounts: (plan: "personal" | "business") =>
    request<ImportStandardLedgerAccountsResponse>(`ledger/accounts/import-standard/`, "POST", {
      plan
    } satisfies ImportStandardLedgerAccountsRequest),

  downloadLedgerCsvTemplate: () =>
    downloadTemplate(`ledger/accounts/template/csv/`, "template_ledger_accounts.csv"),

  downloadLedgerXlsxTemplate: () =>
    downloadTemplate(`ledger/accounts/template/xlsx/`, "template_ledger_accounts.xlsx"),

  addLedgerAccount: (payload: AddLedgerAccountRequest) =>
    request<LedgerAccount>(`ledger/accounts/`, "POST", payload),

  addLedgerAccountsBulk: (payload: AddLedgerAccountRequest[]) =>
    request<LedgerAccount[]>(`ledger/accounts/bulk/create/`, "POST", payload),

  editLedgerAccount: (ledgerAccountId: string, payload: EditLedgerAccountRequest) =>
    request<LedgerAccount>(`ledger/accounts/${ledgerAccountId}/`, "PATCH", payload),

  deleteAllLedgerAccounts: () =>
    request<DeleteAllLedgerAccountsResponse>(`ledger/accounts/delete/all/`, "DELETE", {
      confirm_delete_all: true
    } satisfies DeleteAllLedgerAccountsRequest),

  deleteLedgerAccount: (ledgerAccountId: string) =>
    request<void>(`ledger/accounts/${ledgerAccountId}/`, "DELETE"),

  /* --- Departments --- */
  getDepartments: (params?: GetDepartmentsParams) =>
    request<GetDepartmentsResponse>(`departments/`, "GET", params),

  getDepartmentsOptions: (params?: GetDepartmentsParams) =>
    request<GetDepartmentsResponse>(`departments/options/`, "GET", params),

  getDepartment: (departmentId: string) =>
    request<GetDepartmentResponse>(`departments/${departmentId}/`, "GET"),

  getDepartmentsBulk: (ids: string[]) =>
    request<DepartmentsBulkResponse>(`departments/bulk/get/`, "POST", {
      ids
    } satisfies DepartmentsBulkRequest),

  addDepartment: (payload: AddDepartmentRequest) =>
    request<Department>(`departments/`, "POST", payload),

  editDepartment: (departmentId: string, payload: Partial<EditDepartmentRequest>) =>
    request<Department>(`departments/${departmentId}/`, "PATCH", payload),

  deleteDepartment: (departmentId: string) =>
    request<void>(`departments/${departmentId}/`, "DELETE"),

  /* --- Projects --- */
  getProjects: (params?: GetProjectsParams) =>
    request<GetProjectsResponse>(`projects/`, "GET", params),

  getProjectsOptions: (params?: GetProjectsParams) =>
    request<GetProjectsResponse>(`projects/options/`, "GET", params),

  getProjectsBulk: (ids: string[]) =>
    request<ProjectsBulkResponse>(`projects/bulk/get/`, "POST", {
      ids
    } satisfies ProjectsBulkRequest),

  getProject: (projectId: string) =>
    request<Project>(`projects/${projectId}/`, "GET"),

  addProject: (payload: AddProjectRequest) =>
    request<Project>(`projects/`, "POST", payload),

  editProject: (projectId: string, payload: EditProjectRequest) =>
    request<Project>(`projects/${projectId}/`, "PATCH", payload),

  deleteProject: (projectId: string) =>
    request<void>(`projects/${projectId}/`, "DELETE"),

  /* --- Inventory --- */
  getInventoryItems: (params?: GetInventoryItemsParams) =>
    request<GetInventoryItemsResponse>(`inventory/items/`, "GET", params),

  getInventoryOptions: (params?: GetInventoryItemsParams) =>
    request<GetInventoryItemsResponse>(`inventory/items/options/`, "GET", params),

  getInventoryItemsBulk: (ids: string[]) =>
    request<InventoryItemsBulkResponse>(`inventory/items/bulk/get/`, "POST", {
      ids
    } satisfies InventoryItemsBulkRequest),

  getInventoryItem: (id: string) =>
    request<InventoryItem>(`inventory/items/${id}/`, "GET"),

  addInventoryItem: (payload: AddInventoryItemRequest) =>
    request<InventoryItem>(`inventory/items/`, "POST", payload),

  editInventoryItem: (id: string, payload: EditInventoryItemRequest) =>
    request<InventoryItem>(`inventory/items/${id}/`, "PATCH", payload),

  deleteInventoryItem: (id: string) =>
    request<void>(`inventory/items/${id}/`, "DELETE"),

  /* --- Entities --- */
  getEntities: (params?: GetEntitiesParams) =>
    request<GetEntitiesResponse>(`crm/entities/`, "GET", params),

  getEntitiesTable: (params?: GetEntitiesParams) =>
    request<GetEntitiesResponse>(`crm/entities/table/`, "GET", params),

  getEntitiesOptions: (params?: GetEntitiesParams) =>
    request<GetEntitiesResponse>(`crm/entities/options/`, "GET", params),
  
  getEntity: (id: string) =>
    request<GetEntityResponse>(`crm/entities/${id}/`, "GET"),

  getEntitiesBulk: (ids: string[]) =>
    request<EntitiesBulkResponse>(`crm/entities/bulk/get/`, "POST", {
      ids
    } satisfies EntitiesBulkRequest),

  addEntity: (payload: AddEntityRequest) =>
    request<Entity>(`crm/entities/`, "POST", payload),

  editEntity: (id: string, payload: EditEntityRequest) =>
    request<Entity>(`crm/entities/${id}/`, "PATCH", payload),

  deleteEntity: (id: string) =>
    request<void>(`crm/entities/${id}/`, "DELETE"),

  // -------------- Statements (PDF) --------------
  getStatements: (params?: GetStatementsParams) =>
    request<GetStatementsResponse>(`banking/statements/`, "GET", params),

  uploadStatement: (form: FormData, onProgress?: (pct: number) => void) => {
    return http.post(`banking/statements/`, form,
      {
        onUploadProgress: (evt: AxiosProgressEvent) => {
          if (!onProgress || !evt.total) return;
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      }
    )
    .then((r: AxiosResponse) => r.data as UploadStatementResponse);
  },

  deleteStatement: (statementId: string) =>
    request<void>(`banking/statements/${statementId}/`, "DELETE"),

  triggerStatementAnalysis: (statementId: string) =>
    request<TriggerStatementAnalysisResponse>(`banking/statements/${statementId}/analyze/`, "POST", {}),

  downloadStatement: async (statementId: string) => {
    const res = await http.get(`banking/statements/${statementId}/download/`, {
      responseType: "blob",
      validateStatus: (s: number) => s >= 200 && s < 300
    });

    downloadBlob(res.data as Blob, "extrato.pdf");
  },

  downloadStatementJson: async (statementId: string) => {
    const res = await http.get(`banking/statements/${statementId}/download-json/`, {
      responseType: "blob",
      validateStatus: (s: number) => s >= 200 && s < 300
    });

    const cd = res.headers?.["content-disposition"] as string | undefined;
    const filename = filenameFromContentDisposition(cd, `statement_${statementId}.json`);

    downloadBlob(new Blob([res.data], { type: "application/json" }), filename);
  },

}
