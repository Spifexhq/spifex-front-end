import axios from 'axios';
import { request } from '@/lib/http'
import {
    GetUserResponse,
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    Subscription
} from '@/models/auth/dto'
import { User } from 'src/models/auth'
import { Enterprise } from 'src/models/auth/domain'
import { Entry, SettledEntry, Transference } from 'src/models/Entries/domain'
import { GetEntry, GetEntryParams, GetSettledEntry, GetSettledEntryParams,
  AddEntryPayload, EditEntryPayload, EditSettledEntryPayload, AddTransferencePayload
} from '@/models/Entries/dto'
import { GetBank } from 'src/models/enterprise_structure/dto';
import { Bank } from 'src/models/enterprise_structure/domain';


export const api = {
  /* --- Auth --- */
  signIn: (payload: SignInRequest) =>
    request<SignInResponse>('auth/signin', 'POST', payload),

  signUp: (payload: SignUpRequest) =>
    request<SignUpResponse>('auth/signup', 'POST', payload),

  verifyEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-email/${uidb64}/${token}/`, "GET"),

  verifyNewEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-pending-email/${uidb64}/${token}/`, "GET"),

  /* --- User --- */
  getUser: () =>
    request<GetUserResponse>('auth/user', "GET"),

  editUser:(payload: Partial<User>) =>
    request<User>('auth/user', 'PUT', payload),

  /* --- Password --- */
  changePassword: (payload: { current_password: string; new_password: string }) =>
    request<unknown>('auth/password-change/', 'PUT', payload),

  requestPasswordReset: (email: string) =>
    axios.post('auth/password-reset/', { email }),

  confirmPasswordReset: (uid: string, token: string, password: string) =>
    axios.post(`auth/password-reset/${uid}/${token}/`, { password }),

  /* --- Subscriptions --- */
  getSubscriptionStatus: () =>
    request<Subscription>('payments/get-subscription-status', 'GET'),
  
  createCheckoutSession: (price_id: string) =>
    request<{ url?: string; message?: string }>('payments/create-checkout-session/', 'POST', { price_id }),

  createCustomerPortalSession: () =>
    request<{ url?: string }>('payments/create-customer-portal-session/', 'POST', {}),

  /* --- Enterprise --- */
  getEnterprise: () =>
    request<Enterprise>('companies/enterprise', "GET"),

  editEnterprise: (payload: Partial<Enterprise>) =>
    request<Enterprise>('companies/enterprise', 'PUT', payload),

  /* --- Cash-flow Entries --- */
  getEntries: (payload: GetEntryParams) =>
    request<GetEntry>("cashflow/entries/paginated", "GET", payload),

  getAllEntries: () =>
    request<GetEntry>("cashflow/entries", "GET"),

  getEntry: (ids: number[], payload: GetEntryParams) =>
    request<GetEntry>(`cashflow/entries/${ids.join(',')}`, "GET", payload),

  addEntry: (payload: AddEntryPayload) =>
    request<Entry>("cashflow/entries", "POST", payload),

  editEntry: (ids: number[], payload: Partial<EditEntryPayload>) =>
    request<Entry>(`cashflow/entries/${ids.join(',')}`, 'PUT', payload),

  deleteAllEntries: () =>
    request<Entry>("cashflow/entries", 'DELETE'),

  deleteEntry: (ids: number[]) =>
    request<Entry>(`cashflow/entries/${ids.join(',')}`, 'DELETE'),

  /* --- Settled Entries --- */
  getSettledEntries: (payload: GetSettledEntryParams) =>
    request<GetSettledEntry>("cashflow/settled-entries/paginated", "GET", payload),

  getAllSettledEntries: () =>
    request<GetSettledEntry>("cashflow/settled-entries", "GET"),

  getSettledEntry: (ids: number[], payload: GetSettledEntryParams) =>
    request<GetSettledEntry>(`cashflow/settled-entries/${ids.join(',')}`, "GET", payload),

  editSettledEntry: (ids: number[], payload: Partial<EditSettledEntryPayload>) =>
    request<SettledEntry>(`cashflow/settled-entries/${ids.join(',')}`, 'PATCH', payload),

  deleteAllSettledEntries: () =>
    request<SettledEntry>("cashflow/settled-entries", 'DELETE'),

  deleteSettledEntry: (ids: number[]) =>
    request<SettledEntry>(`cashflow/settled-entries/${ids.join(',')}`, 'DELETE'),

  /* --- Transferences --- */
  addTransference: (payload: AddTransferencePayload) =>
    request<Transference>("cashflow/transferences", "POST", payload),

  /* --- Banks --- */
  getAllBanks: () =>
    request<GetBank>("enterprise_structure/banks", "GET"),

  getBank: (ids: number[]) =>
    request<GetBank>(`enterprise_structure/banks/${ids.join(',')}`, "GET"),

  addBank: (payload: Bank) =>
    request<Bank>("enterprise_structure/banks", 'POST', payload),

  editBank: (ids: number[], payload: Partial<Bank>) =>
    request<Bank>(`enterprise_structure/banks/${ids.join(',')}`, 'PUT', payload),

  deleteAllBanks: () =>
    request<Bank>("enterprise_structure/banks", 'DELETE'),

  deleteBank: (ids: number[]) =>
    request<Bank>(`enterprise_structure/banks/${ids.join(',')}`, 'DELETE'),
}
