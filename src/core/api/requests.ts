import type { SettlementSource } from "@/models/entries/settlements";
import type { RecurrenceEntry } from "@/models/entries/entries";
// src/api/requests.ts
import { request, http } from '@/core/api/http';
import { getAuthGeneration } from '@/core/authentication/authGeneration';
import { getOrgExternalIdStored } from '@/lib/tokens';
import type { EntryAttachment } from '@/shared/financial/types';
import type { AccountingSetupStatus, FiscalPeriod } from '@/models/settings/accountingSetup';
import type {
  AiSetupApplyRequest,
  AiSetupApplyResponse,
  AiSetupContext,
  AiSetupPreviewRequest,
  AiSetupPreviewResponse,
} from '@/models/settings/accountingAiSetup';
import type { AxiosProgressEvent } from 'axios'
import type { MfaRequiredPayload, SignInRequest, SignInResend2FARequest,
  SignInResend2FAResponse, SignInResponse, SignInVerify2FARequest, SignOutResponse,
  SignUpRequest, SignUpResponse } from '@/models/auth/auth'
import type { CookieConsentRequest, CookieConsentResponse } from '@/models/auth/cookies';
import type { EmailChangeRequest, EmailChangeResponse, PasswordChangeRequest, PasswordChangeResponse, VerifyPasswordResetRequest, VerifyPasswordResetResponse, PasswordResetRequest, PasswordResetResponse, 
  TwoFactorSettingsResponse, TwoFactorSettingsUpdateRequest, SecurityStatusResponse} from '@/models/auth/security';
import type { GetUserResponse, User, PersonalSettings, EditPersonalSettingsRequest, PersonalDataSettings, PersonalAddressSettings } from '@/models/auth/user';
import type { ConfigurationStatus } from "@/models/auth/configuration";
import type { Organization, OrgCurrencyResponse, UpdateOrgCurrencyRequest, OrgLedgerProfileResponse,
  UpdateOrgLedgerProfileRequest } from '@/models/auth/organization';
import type {
  FinancialFeaturesResponse,
  PnlConfig,
  PnlFinalizeResponse,
  PnlReportResponse,
  PnlSource,
  PnlTreatment,
  UpdateFinancialFeaturesRequest,
} from '@/models/finance/profitLoss';
import type { GetEntitlementLimitsResponse } from '@/models/auth/entitlements';
import type { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse, CreateCustomerPortalSessionRequest,
  CreateCustomerPortalSessionResponse, 
  GetSubscriptionStatusResponse,
  PlanCode} from '@/models/auth/billing';
import type { GetNotificationPreferencesResponse, UpdateNotificationPreferencesRequest,
  UpdateNotificationPreferencesResponse } from '@/models/auth/notifications';
import type { AddGroupRequest, EditGroupRequest, GetGroupPermissionsResponse, GetGroupResponse,
  GetGroupsResponse, GetPermissionsResponse, UpdateGroupPermissionsResponse, GetGroupScopesResponse,
  GetScopeResourcesResponse, GroupScopeInput } from '@/models/auth/rbac';
import type { AddMemberRequest, EditMemberRequest, GetMemberResponse, GetMembersParams, GetMembersResponse, EffectiveAccess } from '@/models/auth/members';
import type { CashflowKpis, KpiQueryParams, SettledKpis } from '@/models/components/cardKpis';
import type { OverviewData, OverviewQuery } from "@/models/finance/overview";
import type { AddViewPresetRequest, AddViewPresetResponse, EditViewPresetRequest, EditViewPresetResponse,
  GetViewPresetsResponse } from '@/models/components/viewPresets';
import type { AddEntryRequest, Entry, EntryWriteResponse, GetEntriesBulkRequest, GetEntriesBulkResponse,
  GetEntryRequest, EditEntriesBulkResponse, EditEntryRequest, GetEntryResponse,
  DeleteEntriesBulkRequest } from '@/models/entries/entries';
import type { GetSettledEntryRequest, GetSettledEntryResponse, SettledEntry, BulkSettleItem, BulkSettleResponse,
  EditSettledEntryRequest, DeleteSettledEntriesBulkRequest } from '@/models/entries/settlements';
import type { AddTransferenceRequest, Transference } from "@/models/entries/transferences";
import type { GetDocumentTypesResponse } from 'src/models/entries/documentTypes';
import type { AddBankRequest, AddBankResponse, EditBankRequest, EditBankResponse, GetBankResponse,
  GetBanksBulkRequest, GetBanksBulkResponse, GetBanksParams, GetBanksResponse, 
  GetBanksTableParams,
  GetBanksTableResponse} from '@/models/settings/banking';
import type {
  AddLedgerAccountRequest,
  DeleteAllLedgerAccountsRequest,
  DeleteAllLedgerAccountsResponse,
  EditLedgerAccountRequest,
  GetLedgerAccountsRequest,
  GetLedgerAccountsResponse,
  ImportLedgerAccountsResponse,
  ImportStandardLedgerAccountsRequest,
  ImportStandardLedgerAccountsResponse,
  LedgerAccount,
  LedgerAccountsBulkRequest,
  LedgerAccountsBulkResponse,
  LedgerAccountsExistsResponse,
  LedgerGuideRequest,
  LedgerGuideResponse,
  GetLedgerAccountsTreeRequest,
  GetLedgerAccountsTreeResponse,
} from '@/models/settings/ledgerAccounts';
import type {
  AccountingBook,
  AddAccountingBookRequest,
  EditAccountingBookRequest,
  CategoryPostingPolicy,
  UpsertCategoryPostingPolicyRequest,
  BankAccountLedgerMap,
  UpsertBankAccountLedgerMapRequest,
  JournalEntry,
  AddJournalEntryRequest,
  DeleteJournalEntryRequest,
  ReverseJournalEntryRequest,
  GetJournalEntriesParams,
  GetJournalEntriesResponse,
  GetJournalHistoryParams,
  GetJournalHistoryResponse,
  GetTrialBalanceParams,
  GetTrialBalanceResponse,
} from '@/models/settings/accounting';
import type { AddDepartmentRequest, Department, DepartmentsBulkRequest, DepartmentsBulkResponse, EditDepartmentRequest,
  GetDepartmentResponse, GetDepartmentsParams, GetDepartmentsResponse } from '@/models/settings/departments';
import type { AddProjectRequest, EditProjectRequest, GetProjectsParams, GetProjectsResponse, Project,
  ProjectsBulkRequest, ProjectsBulkResponse } from '@/models/settings/projects';
import type { AddInventoryItemRequest, AddInventoryLocationRequest, AddInventoryPriceRequest, AddStockMovementRequest,
  EditInventoryItemRequest, EditInventoryLocationRequest, EditInventoryPriceRequest, GetInventoryItemsParams,
  GetInventoryItemsResponse, GetInventoryLocationsParams, GetInventoryLocationsResponse, GetInventoryMovementsParams,
  GetInventoryMovementsResponse, GetInventoryPricesParams, GetInventoryPricesResponse, GetInventoryStockParams,
  GetInventoryStockResponse, InventoryItem, InventoryItemPrice, InventoryItemsBulkRequest, InventoryItemsBulkResponse,
  InventoryLocation, InventoryLocationOption, InventoryStockLevel, InventorySummary, StockMovement,
  TransferStockRequest } from '@/models/settings/inventory';
import type { AddEntityRequest, EditEntityRequest, EntitiesBulkRequest, EntitiesBulkResponse, Entity,
  GetEntitiesParams, GetEntitiesResponse, GetEntityResponse } from '@/models/settings/entities';
import type {
  AddCashflowCategoryRequest,
  CashflowCategory,
  EditCashflowCategoryRequest,
  GetCashflowCategoriesParams,
  GetCashflowCategoriesResponse,
  ImportCashflowCategoryDefaultsResponse,
} from '@/models/settings/categories';
import type {
  GetStatementsParams,
  GetStatementsResponse,
  TriggerStatementAnalysisResponse,
  UploadStatementResponse,
  StatementImportLookups,
  StatementImportSession,
  StatementImportRow,
  StatementImportRowsResponse,
  LatestStatementAnalysisResponse,
  PrepareStatementImportRequest,
  PrepareStatementImportResponse,
  AcceptConfidentStatementImportRowsResponse,
  CommitStatementImportSessionResponse,
  BulkUpdateStatementImportRowsRequest,
  UpdateStatementImportRowRequest,
} from "@/models/finance/imports";
import type {
  EntryAccountingPreviewEnvelope,
  EntryAccountingReadinessEnvelope,
} from '@/models/entries/accountingReadiness';
import type {
  GetIntegrationActivityResponse,
  GetIntegrationConnectionsResponse,
  IntegrationConnectionPolicy,
  UpdateIntegrationConnectionPolicyRequest,
} from '@/models/integrations/connections';


async function downloadTemplate(path: string, filename: string) {
  const res = await http.get(path, {
    responseType: 'blob',
    validateStatus: (s: number) => s >= 200 && s < 300,
  });

  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadFile(
  path: string,
  params: Record<string, unknown>,
  filename: string,
) {
  const res = await http.get(path, {
    params,
    responseType: 'blob',
    validateStatus: (s: number) => s >= 200 && s < 300,
  });

  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


export const api = {
  /* --- Auth --- */
  signIn: (payload: SignInRequest) =>
    request<SignInResponse | MfaRequiredPayload>("auth/signin/", "POST", payload),

  signUp: (payload: SignUpRequest) =>
    request<SignUpResponse>("auth/signup/", "POST", payload),

  resendVerificationEmail: (email: string) =>
    request<{ message: string; retry_after_seconds: number }>(
      "auth/signup/resend-verification/",
      "POST",
      { email },
    ),

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
  getUser: (organizationId?: string) =>
    request<GetUserResponse>("identity/profile/", "GET", undefined, { fresh: true, skipAuthGate: true, organizationId }),

  editUser:(payload: Partial<User>) =>
    request<User>("identity/profile/", "PUT", payload),

  getPersonalSettings: () =>
    request<PersonalSettings>("identity/profile/settings/", "GET"),

  editPersonalSettings:(payload: EditPersonalSettingsRequest) =>
    request<PersonalSettings>("identity/profile/settings/", "PATCH", payload),

  getPersonalData: () => request<PersonalDataSettings>("identity/profile/data/", "GET"),
  editPersonalData: (payload: Partial<PersonalDataSettings>) => request<PersonalDataSettings>("identity/profile/data/", "PATCH", payload),
  getPersonalAddress: () => request<PersonalAddressSettings>("identity/profile/address/", "GET"),
  editPersonalAddress: (payload: Partial<PersonalAddressSettings>) => request<PersonalAddressSettings>("identity/profile/address/", "PATCH", payload),

  getSecurityStatus: () =>
    request<SecurityStatusResponse>("identity/profile/security-status/", "GET"),

  getConfigurationStatus: () =>
    request<ConfigurationStatus>("identity/profile/configuration-status/", "GET"),

  /* --- Organization --- */
  getOrganization: () =>
    request<Organization>("organizations/current/", "GET"),

  editOrganization: (payload: Partial<Organization>) =>
    request<Organization>("organizations/current/", "PUT", payload),

  getOrgCurrency: () =>
    request<OrgCurrencyResponse>("organizations/current/currency/", "GET"),

  updateOrgCurrency: (payload: UpdateOrgCurrencyRequest) =>
    request<OrgCurrencyResponse>("organizations/current/currency/", "PUT", payload),

  getOrgLedgerProfile: () =>
    request<OrgLedgerProfileResponse>('organizations/current/ledger-profile/', 'GET'),

  updateOrgLedgerProfile: (payload: UpdateOrgLedgerProfileRequest) =>
    request<OrgLedgerProfileResponse>('organizations/current/ledger-profile/', 'PUT', payload),

  /* --- Financial modules --- */
  getFinancialFeatures: () =>
    request<FinancialFeaturesResponse>('organizations/current/financial-features/', 'GET'),

  updateFinancialFeatures: (payload: UpdateFinancialFeaturesRequest) =>
    request<FinancialFeaturesResponse>('organizations/current/financial-features/', 'PUT', payload),

  getProfitLossConfig: () =>
    request<PnlConfig>('business/profit-loss/config/', 'GET'),

  updateProfitLossSettings: (payload: {
    template_code?: string;
    source_mode?: PnlSource;
    acknowledge_ledger_source?: boolean;
    current_password: string;
  }) => request<PnlConfig>('business/profit-loss/config/settings/', 'PUT', payload),

  applyProfitLossTemplate: (payload: {
    template_code: string;
    replace_existing?: boolean;
    current_password: string;
  }) => request<PnlConfig>('business/profit-loss/config/apply-template/', 'POST', payload),

  updateProfitLossCategoryMappings: (payload: {
    mappings: Array<{
      category_id: string;
      treatment: PnlTreatment;
      line?: string | null;
      effective_from?: string;
    }>;
    current_password: string;
  }) => request<PnlConfig>('business/profit-loss/mappings/categories/', 'PUT', payload),

  getProfitLossReport: (params: {
    period_start: string;
    period_end: string;
    source?: PnlSource;
    book?: string;
    compare?: 'previous_period' | 'previous_year';
  }) => request<PnlReportResponse>('business/profit-loss/report/', 'GET', params),

  exportProfitLoss: (params: {
    period_start: string;
    period_end: string;
    source?: PnlSource;
    book?: string;
    filename: string;
  }) => {
    const { filename, ...query } = params;
    return downloadFile('business/profit-loss/report/export/', query, filename);
  },

  finalizeProfitLossPeriod: (payload: {
    period_start: string;
    period_end: string;
    source?: PnlSource;
    book?: string;
    current_password: string;
  }) => request<PnlFinalizeResponse>('business/profit-loss/periods/finalize/', 'POST', payload),

  /* --- Entitlements --- */
  getEntitlementLimits:() =>
    request<GetEntitlementLimitsResponse>("entitlements/limits/", "GET"),

  /* --- Subscriptions --- */
  getSubscriptionStatus: () =>
    request<GetSubscriptionStatusResponse>("billing/subscription/", "GET"),

  createCheckoutSession: (plan_code: PlanCode, country_code?: string) =>
    request<CreateCheckoutSessionResponse>("billing/checkout-session/", "POST", {
      plan_code,
      country_code,
    } satisfies CreateCheckoutSessionRequest),

  createCustomerPortalSession: (planChange?: { plan_code: string; country_code?: string; billing_interval?: "month" | "year" }) =>
    request<CreateCustomerPortalSessionResponse>(`billing/customer-portal-session/`, 'POST',
      planChange ?? ({} satisfies CreateCustomerPortalSessionRequest)),

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

  updateGroupPermissions: (groupId: string, permission_codes: string[], scopes?: GroupScopeInput[]) =>
    request<UpdateGroupPermissionsResponse>(`rbac/groups/${groupId}/permissions/`, "POST", {
      permission_codes,
      ...(scopes !== undefined ? { scopes } : {}),
    }),

  getGroupScopes: (groupId: string) =>
    request<GetGroupScopesResponse>(`rbac/groups/${groupId}/scopes/`, "GET"),

  getScopeResources: (permissionCode: string, resourceType: string, search = "") =>
    request<GetScopeResourcesResponse>(
      `rbac/groups/scope-resources/?permission_code=${encodeURIComponent(permissionCode)}&resource_type=${encodeURIComponent(resourceType)}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      "GET",
    ),
  
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
    request<GetMembersResponse>("business/members/", "GET", params),

  getMember: (memberId: string) =>
    request<GetMemberResponse>(`business/members/${memberId}/`, "GET"),

  getMemberEffectiveAccess: (memberId: string) =>
    request<EffectiveAccess>(`business/members/${memberId}/effective-access/`, "GET"),

  addMember: (payload: AddMemberRequest) =>
    request<GetMemberResponse>("business/members/", "POST", payload),

  editMember: (memberId: string, payload: EditMemberRequest) =>
    request<GetMemberResponse>(`business/members/${memberId}/`, "PATCH", payload),

  deleteMember: (memberId: string) =>
    request<void>(`business/members/${memberId}/`, "DELETE"),

  /* --- KPIs --- */
  getCashflowKpis: (params: KpiQueryParams) =>
    request<CashflowKpis>("cashflow/kpis/cashflow/", "GET", params),

  getSettledKpis: (params: KpiQueryParams) =>
    request<SettledKpis>("cashflow/kpis/settled/", "GET", params),

  /* --- Overview --- */
  getOverview: (params: OverviewQuery) =>
    request<OverviewData>("cashflow/overview/", "GET", params),

  /* --- View Presets --- */
  getViewPresets: (settlementStatus: boolean) =>
    request<GetViewPresetsResponse>(
      `cashflow/view-preset/?settlement_status=${settlementStatus ? "true" : "false"}`,
      "GET"
    ),

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

  exportFinancialActivity: (payload: {
    scope: "business" | "personal";
    settled: boolean;
    format: "csv" | "xlsx";
    params: Record<string, unknown>;
    filename: string;
  }) => {
    const path =
      payload.scope === "personal"
        ? payload.settled
          ? "personal/transactions/settled-activity/export/"
          : "personal/transactions/export/"
        : payload.settled
          ? "cashflow/settlements/export/"
          : "cashflow/entries/export/";
    return downloadFile(
      path,
      { ...payload.params, export_format: payload.format },
      payload.filename,
    );
  },

  getEntry: (id: string) =>
    request<Entry>(`cashflow/entries/${id}/`, "GET"),

  getEntryRecurrence: (id: string, params?: { cursor?: string; include_count?: boolean }) =>
    request<{ results: RecurrenceEntry[]; next: string | null; count?: number; current: RecurrenceEntry; selection_version: string }>(`cashflow/entries/${id}/recurrence/`, "GET", params),
  editEntryRecurrence: (id: string, ids: string[], versions: Record<string, string>, data: Partial<EditEntryRequest>, selection?: { select_all: boolean; exclude_ids: string[]; selection_version?: string }) =>
    request<EntryWriteResponse | { updated_count: number }>(`cashflow/entries/${id}/recurrence/`, "PATCH", { ids: selection?.select_all ? [] : ids, versions, data, ...selection }),

  getSettlementDrafts: (ids: string[]) =>
    request<SettlementSource[]>("cashflow/entries/settlement-drafts/", "GET", { ids: ids.join(",") }),

  getEntriesBulk: (ids: string[]) =>
    request<GetEntriesBulkResponse>(`cashflow/entries/bulk/get/`, "POST", {
      ids
    } satisfies GetEntriesBulkRequest),

  addEntry: (payload: AddEntryRequest) =>
    request<EntryWriteResponse>(`cashflow/entries/`, "POST", payload),

  getEntryAttachments: (id: string) =>
    request<{ results: EntryAttachment[]; max_files: number; max_bytes: number }>(`cashflow/entries/${id}/attachments/`, "GET"),

  uploadEntryAttachment: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<EntryAttachment>(`cashflow/entries/${id}/attachments/`, "POST", form);
  },

  removeEntryAttachment: (id: string, attachment: string) =>
    request<void>(`cashflow/entries/${id}/attachments/${attachment}/`, "DELETE"),

  shareEntryAttachments: (id: string, attachmentIds: string[], entryIds: string[]) =>
    request<{ results: EntryAttachment[] }>(`cashflow/entries/${id}/share-attachments/`, "POST", { attachment_ids: attachmentIds, entry_ids: entryIds }),

  downloadEntryAttachment: async (id: string, attachment: string, signal?: AbortSignal) => {
    const generation = getAuthGeneration(), workspace = getOrgExternalIdStored();
    const response = await http.get<Blob>(`cashflow/entries/${id}/attachments/${attachment}/download/`, { responseType: "blob", signal });
    if (generation !== getAuthGeneration() || workspace !== getOrgExternalIdStored()) throw new Error("Workspace changed during file download");
    return response.data;
  },

  editEntry: (id: string, payload: Partial<EditEntryRequest>, version?: string) =>
    request<EntryWriteResponse>(`cashflow/entries/${id}/`, "PATCH", payload, { ifMatch: version }),

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
    return request<SettledEntry[]>(`cashflow/settlements/bulk/get/`, "GET", params, { fresh: true })},

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
      { ...(payload?.active !== undefined ? { active: payload.active } : {}), ...(payload?.include_history ? { include_history: true } : {}) };

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

  /* --- AI connections (remote MCP) --- */
  getIntegrationConnections: () =>
    request<GetIntegrationConnectionsResponse>("integrations/connections/", "GET", undefined, { fresh: true }),

  revokeIntegrationConnection: (applicationId: string) =>
    request<void>(
      `integrations/connections/${encodeURIComponent(applicationId)}/`,
      "DELETE",
    ),

  updateIntegrationConnectionPolicy: (applicationId: string, payload: UpdateIntegrationConnectionPolicyRequest) =>
    request<IntegrationConnectionPolicy>(
      `integrations/connections/${encodeURIComponent(applicationId)}/policy/`,
      "PUT",
      payload,
    ),

  getIntegrationActivity: (limit = 50) =>
    request<GetIntegrationActivityResponse>("integrations/activity/", "GET", { limit }, { fresh: true }),

  /* --- Document Types --- */
  getDocumentTypes: (params?: { cursor?: string; page_size?: number }) =>
    request<GetDocumentTypesResponse>(`cashflow/document-types/`, "GET", params),

  /* --- Ledger Acccounts --- */
  getLedgerAccounts: (params?: GetLedgerAccountsRequest) =>
    request<GetLedgerAccountsResponse>('business/ledger/accounts/', 'GET', params, { fresh: true }),

  getLedgerAccountsBulk: (ids: string[]) =>
    request<LedgerAccountsBulkResponse>('business/ledger/accounts/bulk/get/', 'POST', {
      ids,
    } satisfies LedgerAccountsBulkRequest),

  getLedgerAccount: (ledgerAccountId: string) =>
    request<LedgerAccount>(`business/ledger/accounts/${ledgerAccountId}/`, 'GET'),

  getLedgerAccountsExists: () =>
    request<LedgerAccountsExistsResponse>('business/ledger/accounts/exists/', 'GET'),

  getLedgerAccountsTree: (params?: GetLedgerAccountsTreeRequest) =>
    request<GetLedgerAccountsTreeResponse>('business/ledger/accounts/tree/', 'GET', params),

  addLedgerAccount: (payload: AddLedgerAccountRequest) =>
    request<LedgerAccount>('business/ledger/accounts/', 'POST', payload),

  addLedgerAccountsBulk: (payload: AddLedgerAccountRequest[]) =>
    request<LedgerAccount[]>('business/ledger/accounts/bulk/create/', 'POST', payload),

  editLedgerAccount: (ledgerAccountId: string, payload: EditLedgerAccountRequest) =>
    request<LedgerAccount>(`business/ledger/accounts/${ledgerAccountId}/`, 'PATCH', payload),

  deleteAllLedgerAccounts: () =>
    request<DeleteAllLedgerAccountsResponse>('business/ledger/accounts/delete-all/', 'POST', {
      confirm_delete_all: true,
    } satisfies DeleteAllLedgerAccountsRequest),

  deleteLedgerAccount: (ledgerAccountId: string) =>
    request<void>(`business/ledger/accounts/${ledgerAccountId}/`, 'DELETE'),

  importLedgerAccounts: (formData: FormData) =>
    request<ImportLedgerAccountsResponse>("business/ledger/accounts/import/", "POST", formData),

  importStandardLedgerAccounts: (plan: "organizational") =>
    request<ImportStandardLedgerAccountsResponse>("business/ledger/accounts/import-standard/", "POST", {
      plan,
    } satisfies ImportStandardLedgerAccountsRequest),

  generateLedgerGuide: (payload: LedgerGuideRequest) =>
    request<LedgerGuideResponse>("business/ledger/accounts/ai-guide/", "POST", payload),

  downloadLedgerCsvTemplate: () =>
    downloadTemplate("business/ledger/accounts/template/csv/", "template_ledger_accounts.csv"),

  downloadLedgerXlsxTemplate: () =>
    downloadTemplate("business/ledger/accounts/template/xlsx/", "template_ledger_accounts.xlsx"),

  /* --- Accounting --- */
  getAccountingSetup: () => request<AccountingSetupStatus>('business/ledger/setup/', 'GET', undefined, { fresh: true }),
  startAccountingSetup: () => request<AccountingSetupStatus>('business/ledger/setup/start/', 'POST', {}),
  activateAccounting: (revision: string) => request<AccountingSetupStatus>('business/ledger/setup/activate/', 'POST', { revision }),
  getAccountingAiSetupContext: () => request<AiSetupContext>('business/ledger/setup/ai-guide/context/', 'GET', undefined, { fresh: true }),
  previewAccountingAiSetup: (payload: AiSetupPreviewRequest) => request<AiSetupPreviewResponse>('business/ledger/setup/ai-guide/preview/', 'POST', payload, { timeout: 120_000 }),
  applyAccountingAiSetup: (payload: AiSetupApplyRequest) => request<AiSetupApplyResponse>('business/ledger/setup/ai-guide/apply/', 'POST', payload, { timeout: 120_000 }),
  deleteAccountingBook: (id: string) => request(`business/ledger/books/${id}/`, "DELETE"),
  deleteBankAccountLedgerMap: (id: string) => request(`business/ledger/bank-account-maps/${id}/`, "DELETE"),
  deleteCategoryPostingPolicy: (id: string) => request(`business/ledger/category-policies/${id}/`, "DELETE"),
  deleteFiscalPeriod: (id: string) => request(`business/ledger/periods/${id}/`, "DELETE"),
  getAccountingList: <T>(resource: string, params: Record<string, string | number | undefined>) => request<{ results: T[]; next: string | null; count?: number; filters: Record<string, string[]>; filter_labels?: Record<string, Record<string,string>> }>(`business/ledger/lists/${resource}/`, "GET", params),
  getFiscalPeriods: () => request<FiscalPeriod[]>('business/ledger/periods/', 'GET', undefined, { fresh: true }),
  addFiscalPeriod: (payload: Omit<FiscalPeriod, 'id' | 'book' | 'has_journals'> & { book_id: string }) => request<FiscalPeriod>('business/ledger/periods/', 'POST', payload),
  updateFiscalPeriod: (id: string, status: FiscalPeriod['status']) => request<FiscalPeriod>(`business/ledger/periods/${id}/`, 'PATCH', { status }),
  editFiscalPeriod: (id: string, payload: Partial<Omit<FiscalPeriod, 'id' | 'book' | 'has_journals'>>) => request<FiscalPeriod>(`business/ledger/periods/${id}/`, 'PATCH', payload),
  getAccountingBooks: (params?: { cursor?: string }) => request<AccountingBook[]>('business/ledger/books/', 'GET', params, { fresh: true }),

  addAccountingBook: (payload: AddAccountingBookRequest) =>
    request<AccountingBook>('business/ledger/books/', 'POST', payload),

  editAccountingBook: (bookId: string, payload: EditAccountingBookRequest) =>
    request<AccountingBook>(`business/ledger/books/${bookId}/`, 'PATCH', payload),

  getCategoryPostingPolicies: () =>
    request<CategoryPostingPolicy[]>('business/ledger/category-policies/', 'GET', undefined, { fresh: true }),

  upsertCategoryPostingPolicy: (payload: UpsertCategoryPostingPolicyRequest) =>
    request<CategoryPostingPolicy>('business/ledger/category-policies/', 'POST', payload),

  getBankAccountLedgerMaps: () =>
    request<BankAccountLedgerMap[]>('business/ledger/bank-account-maps/', 'GET', undefined, { fresh: true }),

  upsertBankAccountLedgerMap: (payload: UpsertBankAccountLedgerMapRequest) =>
    request<BankAccountLedgerMap>('business/ledger/bank-account-maps/', 'POST', payload),

  getJournalEntries: (params?: GetJournalEntriesParams) =>
    request<GetJournalEntriesResponse>('business/ledger/journals/', 'GET', params, { fresh: true }),

  getJournalEntry: (journalId: string) =>
    request<JournalEntry>(`business/ledger/journals/${journalId}/`, 'GET'),

  createJournalEntry: (payload: AddJournalEntryRequest) =>
    request<JournalEntry>('business/ledger/journals/', 'POST', payload),

  reverseJournalEntry: (journalId: string, payload: ReverseJournalEntryRequest = {}) =>
    request<JournalEntry>(`business/ledger/journals/${journalId}/reverse/`, 'POST', payload),

  deleteJournalEntry: (journalId: string, payload: DeleteJournalEntryRequest = {}) =>
    request<void>(`business/ledger/journals/${journalId}/`, 'DELETE', payload),

  getJournalHistory: (params?: GetJournalHistoryParams) =>
    request<GetJournalHistoryResponse>('business/ledger/journals/history/', 'GET', params, { fresh: true }),

  getTrialBalance: (params?: GetTrialBalanceParams) =>
    request<GetTrialBalanceResponse>('business/ledger/journals/trial-balance/', 'GET', params, { fresh: true }),

  getCashflowCategories: (params?: GetCashflowCategoriesParams) =>
    request<GetCashflowCategoriesResponse>("business/categories/", "GET", params),

  getCashflowCategory: (categoryId: string) =>
    request<CashflowCategory>(`business/categories/${categoryId}/`, "GET"),

  addCashflowCategory: (payload: AddCashflowCategoryRequest) =>
    request<CashflowCategory>("business/categories/", "POST", payload),

  editCashflowCategory: (categoryId: string, payload: EditCashflowCategoryRequest) =>
    request<CashflowCategory>(`business/categories/${categoryId}/`, "PATCH", payload),

  deleteCashflowCategory: (categoryId: string) =>
    request<void>(`business/categories/${categoryId}/`, "DELETE"),

  bulkDeleteCashflowCategories: (ids: string[]) =>
    request<{ deleted: string[] }>("business/categories/bulk-delete/", "POST", { ids }),

  importCashflowCategoryDefaults: (language?: string) =>
    request<ImportCashflowCategoryDefaultsResponse>("business/categories/import-defaults/", "POST", language ? { language } : {}),

  getEntryAccountingReadiness: (entryId: string) =>
    request<EntryAccountingReadinessEnvelope>(`cashflow/entries/${entryId}/accounting-readiness/`, 'GET'),

  getEntriesAccountingReadinessBulk: (ids: string[]) =>
    request<EntryAccountingReadinessEnvelope[]>(`cashflow/entries/accounting-readiness/bulk/`, 'POST', { ids }),

  previewEntryAccounting: (entryId: string) =>
    request<EntryAccountingPreviewEnvelope>(`cashflow/entries/${entryId}/accounting-preview/`, 'GET'),

  /* --- Departments --- */
  getDepartments: (params?: GetDepartmentsParams) =>
    request<GetDepartmentsResponse>(`business/departments/`, "GET", params),

  getDepartmentsOptions: (params?: GetDepartmentsParams) =>
    request<GetDepartmentsResponse>(`business/departments/options/`, "GET", params),

  getDepartment: (departmentId: string) =>
    request<GetDepartmentResponse>(`business/departments/${departmentId}/`, "GET"),

  getDepartmentsBulk: (ids: string[]) =>
    request<DepartmentsBulkResponse>(`business/departments/bulk/get/`, "POST", {
      ids
    } satisfies DepartmentsBulkRequest),

  addDepartment: (payload: AddDepartmentRequest) =>
    request<Department>(`business/departments/`, "POST", payload),

  editDepartment: (departmentId: string, payload: Partial<EditDepartmentRequest>, version?: string) =>
    request<Department>(`business/departments/${departmentId}/`, "PATCH", payload, { ifMatch: version }),

  deleteDepartment: (departmentId: string, version?: string) =>
    request<void>(`business/departments/${departmentId}/`, "DELETE", undefined, { ifMatch: version }),

  /* --- Projects --- */
  getProjects: (params?: GetProjectsParams) =>
    request<GetProjectsResponse>(`business/projects/`, "GET", params),

  getProjectsOptions: (params?: GetProjectsParams) =>
    request<GetProjectsResponse>(`business/projects/options/`, "GET", params),

  getProjectsBulk: (ids: string[]) =>
    request<ProjectsBulkResponse>(`business/projects/bulk/get/`, "POST", {
      ids
    } satisfies ProjectsBulkRequest),

  getProject: (projectId: string) =>
    request<Project>(`business/projects/${projectId}/`, "GET"),

  addProject: (payload: AddProjectRequest) =>
    request<Project>(`business/projects/`, "POST", payload),

  editProject: (projectId: string, payload: EditProjectRequest, version?: string) =>
    request<Project>(`business/projects/${projectId}/`, "PATCH", payload, { ifMatch: version }),

  deleteProject: (projectId: string, version?: string) =>
    request<void>(`business/projects/${projectId}/`, "DELETE", undefined, { ifMatch: version }),

  /* --- Inventory --- */
  getInventoryItems: (params?: GetInventoryItemsParams) =>
    request<GetInventoryItemsResponse>(`business/inventory/items/`, "GET", params),

  getInventoryOptions: (params?: GetInventoryItemsParams) =>
    request<GetInventoryItemsResponse>(`business/inventory/items/options/`, "GET", params),

  getInventoryItemsBulk: (ids: string[]) =>
    request<InventoryItemsBulkResponse>(`business/inventory/items/bulk/get/`, "POST", {
      ids
    } satisfies InventoryItemsBulkRequest),

  getInventoryItem: (id: string) =>
    request<InventoryItem>(`business/inventory/items/${id}/`, "GET"),

  addInventoryItem: (payload: AddInventoryItemRequest) =>
    request<InventoryItem>(`business/inventory/items/`, "POST", payload),

  editInventoryItem: (id: string, payload: EditInventoryItemRequest, version?: string) =>
    request<InventoryItem>(`business/inventory/items/${id}/`, "PATCH", payload, { ifMatch: version }),

  deleteInventoryItem: (id: string, version?: string) =>
    request<void>(`business/inventory/items/${id}/`, "DELETE", undefined, { ifMatch: version }),

  getInventoryItemStock: (id: string) =>
    request<InventoryStockLevel[]>(`business/inventory/items/${id}/stock/`, "GET"),

  getInventoryPrices: (params?: GetInventoryPricesParams) =>
    request<GetInventoryPricesResponse>(`business/inventory/prices/`, "GET", params),

  addInventoryPrice: (payload: AddInventoryPriceRequest) =>
    request<InventoryItemPrice>(`business/inventory/prices/`, "POST", payload),

  editInventoryPrice: (id: string, payload: EditInventoryPriceRequest, version?: string) =>
    request<InventoryItemPrice>(`business/inventory/prices/${id}/`, "PATCH", payload, { ifMatch: version }),

  getInventorySummary: () =>
    request<InventorySummary>(`business/inventory/summary/`, "GET"),

  getInventoryStock: (params?: GetInventoryStockParams) =>
    request<GetInventoryStockResponse>(`business/inventory/stock/`, "GET", params),

  getInventoryMovements: (params?: GetInventoryMovementsParams) =>
    request<GetInventoryMovementsResponse>(`business/inventory/movements/`, "GET", params),

  addInventoryMovement: (payload: AddStockMovementRequest) =>
    request<StockMovement>(`business/inventory/movements/`, "POST", payload),

  transferInventoryStock: (payload: TransferStockRequest) =>
    request<StockMovement[]>(`business/inventory/movements/transfer/`, "POST", payload),

  getInventoryLocations: (params?: GetInventoryLocationsParams) =>
    request<GetInventoryLocationsResponse>(`business/inventory/locations/`, "GET", params),

  getInventoryLocationOptions: () =>
    request<InventoryLocationOption[]>(`business/inventory/locations/options/`, "GET"),

  getInventoryLocation: (id: string) =>
    request<InventoryLocation>(`business/inventory/locations/${id}/`, "GET"),

  addInventoryLocation: (payload: AddInventoryLocationRequest) =>
    request<InventoryLocation>(`business/inventory/locations/`, "POST", payload),

  editInventoryLocation: (id: string, payload: EditInventoryLocationRequest, version?: string) =>
    request<InventoryLocation>(`business/inventory/locations/${id}/`, "PATCH", payload, { ifMatch: version }),

  deleteInventoryLocation: (id: string, version?: string) =>
    request<void>(`business/inventory/locations/${id}/`, "DELETE", undefined, { ifMatch: version }),

  /* --- Entities --- */
  getEntities: (params?: GetEntitiesParams) =>
    request<GetEntitiesResponse>(`business/crm/entities/`, "GET", params),

  getEntitiesTable: (params?: GetEntitiesParams) =>
    request<GetEntitiesResponse>(`business/crm/entities/table/`, "GET", params),

  getEntitiesOptions: (params?: GetEntitiesParams) =>
    request<GetEntitiesResponse>(`business/crm/entities/options/`, "GET", params),
  
  getEntity: (id: string) =>
    request<GetEntityResponse>(`business/crm/entities/${id}/`, "GET"),

  getEntitiesBulk: (ids: string[]) =>
    request<EntitiesBulkResponse>(`business/crm/entities/bulk/get/`, "POST", {
      ids
    } satisfies EntitiesBulkRequest),

  addEntity: (payload: AddEntityRequest) =>
    request<Entity>(`business/crm/entities/`, "POST", payload),

  editEntity: (id: string, payload: EditEntityRequest, version?: string) =>
    request<Entity>(`business/crm/entities/${id}/`, "PATCH", payload, { ifMatch: version }),

  deleteEntity: (id: string, version?: string) =>
    request<void>(`business/crm/entities/${id}/`, "DELETE", undefined, { ifMatch: version }),

  // -------------- Statements / AI Import Flow --------------
  getStatement: async (id: string) => {
    const res = await request<UploadStatementResponse>(`banking/statements/${id}/`, "GET");
    return res.data;
  },
  getStatements: async (params?: GetStatementsParams) => {
    const res = await request<GetStatementsResponse>("banking/statements/", "GET", params);
    return res.data;
  },

  uploadStatement: async (form: FormData, onProgress?: (pct: number) => void) => {
    const res = await http.post("banking/statements/", form, {
      onUploadProgress: (evt: AxiosProgressEvent) => {
        if (!onProgress || !evt.total) return;
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      },
    });

    return (res.data?.data ?? res.data) as UploadStatementResponse;
  },

  deleteStatement: async (statementId: string) => {
    await request<void>(`banking/statements/${statementId}/`, "DELETE");
  },

  triggerStatementAnalysis: async (statementId: string) => {
    const res = await request<TriggerStatementAnalysisResponse>(
      `banking/statements/${statementId}/analyze/`,
      "POST",
      {}
    );
    return res.data;
  },

  getLatestStatementAnalysis: async (statementId: string) => {
    const res = await request<LatestStatementAnalysisResponse>(
      `banking/statements/${statementId}/analysis/latest/`,
      "GET"
    );
    return res.data;
  },

  prepareStatementImport: async (
    statementId: string,
    payload?: PrepareStatementImportRequest
  ) => {
    const res = await request<PrepareStatementImportResponse>(
      `banking/statements/${statementId}/prepare-import/`,
      "POST",
      payload ?? {}
    );
    return res.data;
  },

  getStatementImportSession: async (sessionId: string) => {
    const res = await request<StatementImportSession>(
      `banking/statement-import-sessions/${sessionId}/`,
      "GET", { include_rows: false }
    );
    return res.data;
  },

  getStatementImportRows: async (
    sessionId: string,
    params?: Record<string, string | number | boolean | undefined>
  ) => {
    const res = await request<StatementImportRowsResponse>(
      `banking/statement-import-sessions/${sessionId}/rows/`,
      "GET",
      params
    );
    return res.data;
  },

  updateStatementImportRow: async (
    sessionId: string,
    rowId: string,
    payload: UpdateStatementImportRowRequest
  ) => {
    const res = await request<StatementImportRow>(
      `banking/statement-import-sessions/${sessionId}/rows/${rowId}/`,
      "PATCH",
      payload
    );
    return res.data;
  },

  bulkUpdateStatementImportRows: async (
    sessionId: string,
    payload: BulkUpdateStatementImportRowsRequest
  ) => {
    const res = await request<StatementImportRow[]>(
      `banking/statement-import-sessions/${sessionId}/rows/bulk/`,
      "PATCH",
      payload
    );
    return res.data;
  },

  acceptConfidentStatementImportRows: async (sessionId: string) => {
    const res = await request<AcceptConfidentStatementImportRowsResponse>(
      `banking/statement-import-sessions/${sessionId}/accept-confident/`,
      "POST",
      {}
    );
    return res.data;
  },

  commitStatementImportSession: async (sessionId: string) => {
    const res = await request<CommitStatementImportSessionResponse>(
      `banking/statement-import-sessions/${sessionId}/commit/`,
      "POST",
      {}
    );
    return res.data;
  },

  getStatementImportLookups: async (sessionId: string) => {
    const res = await request<StatementImportLookups>(
      `banking/statement-import-sessions/${sessionId}/lookups/`,
      "GET"
    );
    return res.data;
  },




}
