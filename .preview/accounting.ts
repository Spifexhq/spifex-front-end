import { api } from "@/api/requests";
import type { AccountingSetupStatus } from "@/models/settings/accountingSetup";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { AccountingBook } from "@/models/settings/accounting";

export function installAccountingPreviewMocks() {
  const scenario = new URLSearchParams(location.search).get("scenario") || "active";
  const sample: LedgerAccount[] = [
    { id: "assets", code: "1", name: "Ativos", account_type: "header", statement_section: "asset", normal_balance: "debit", is_active: true, is_system: false, is_bank_control: false, allows_manual_posting: false, parent_id: null },
    { id: "bank-account", code: "1100", name: "Conta bancária principal", account_type: "posting", statement_section: "asset", normal_balance: "debit", is_active: true, is_system: false, is_bank_control: true, allows_manual_posting: true, parent_id: "assets", currency_code: "EUR", report_group: "Disponibilidades" },
    { id: "receivables", code: "1200", name: "Contas a receber", account_type: "posting", statement_section: "asset", normal_balance: "debit", is_active: true, is_system: false, is_bank_control: false, allows_manual_posting: true, parent_id: "assets" },
    { id: "equity", code: "3", name: "Patrimônio líquido", account_type: "header", statement_section: "equity", normal_balance: "credit", is_active: true, is_system: false, is_bank_control: false, allows_manual_posting: false, parent_id: null },
    { id: "capital", code: "3100", name: "Capital social", account_type: "posting", statement_section: "equity", normal_balance: "credit", is_active: true, is_system: false, is_bank_control: false, allows_manual_posting: true, parent_id: "equity", report_group: "Capital" },
  ];
  let accounts = ["new", "profile"].includes(scenario) ? [] : sample;
  let books: AccountingBook[] = ["new", "profile", "partial"].includes(scenario) ? [] : [{ id: "book", code: "MAIN", name: "Livro principal", basis: "management", currency_code: "EUR", is_primary: true, is_active: scenario !== "invalid" }];
  let active = ["active", "legacy", "invalid", "readonly"].includes(scenario);
  let revision = 1;
  const computeStatus = (): AccountingSetupStatus => {
    const profile = scenario !== "profile";
    const chart = profile && accounts.some(account => account.is_active && account.account_type === "posting");
    const book = chart && books.filter(book => book.is_active && book.is_primary).length === 1;
    return {
      status: book && active ? "active" : scenario === "invalid" ? "needs_attention" : book ? "ready" : accounts.length ? "configuring" : "draft",
      operational: book && active, can_activate: book, legacy: scenario === "legacy",
      current_phase: !profile ? "profile" : !chart ? "chart" : !book ? "books" : "review",
      revision: String(revision).padStart(64, "0"), activated_at: active ? "2026-11-03T10:00:00Z" : null,
      primary_book_id: books.find(book => book.is_primary && book.is_active)?.id || null,
      profile: { mode: "organizational", currency: profile ? "EUR" : "" },
      steps: [
        { key: "profile", complete: profile, available: true, issues: profile ? [] : [{ code: "missing_currency" }] },
        { key: "chart", complete: chart, available: profile, issues: accounts.length ? [] : [{ code: "missing_posting_accounts" }] },
        { key: "books", complete: book, available: chart, issues: book ? [] : [{ code: "primary_book_required" }] },
        { key: "review", complete: book && active, available: book, issues: [] },
      ],
    };
  };
  api.getAccountingSetup = async () => { if (scenario === "error") throw new Error("Falha de conexão. Tente novamente."); return { data: computeStatus() } as never; };
  api.startAccountingSetup = async () => ({ data: computeStatus() } as never);
  api.activateAccounting = async submitted => { if (submitted !== computeStatus().revision) throw { fields: { message: "A configuração mudou. Revise antes de ativar." } }; active = true; return { data: computeStatus() } as never; };
  api.getLedgerAccounts = async () => ({ data: accounts } as never);
  api.getLedgerAccount = async id => ({ data: accounts.find(account => account.id === id) } as never);
  api.addLedgerAccount = async payload => { const account = { ...payload, id: `account-${++revision}` } as LedgerAccount; accounts = [...accounts, account]; return { data: account } as never; };
  api.editLedgerAccount = async (id, payload) => { const account = { ...accounts.find(account => account.id === id), ...payload, id } as LedgerAccount; accounts = accounts.map(row => row.id === id ? account : row); revision++; return { data: account } as never; };
  api.deleteLedgerAccount = async id => { accounts = accounts.filter(account => account.id !== id); revision++; return {} as never; };
  api.importStandardLedgerAccounts = async () => { accounts = sample; revision++; return { data: { created_count: sample.length, accounts } } as never; };
  api.getAccountingBooks = async () => ({ data: books } as never);
  api.addAccountingBook = async payload => { const book = { ...payload, id: `book-${++revision}` } as AccountingBook; books = [...books, book]; return { data: book } as never; };
  api.editAccountingBook = async (id, payload) => { const book = { ...books.find(book => book.id === id), ...payload, id } as AccountingBook; books = books.map(row => row.id === id ? book : row); revision++; return { data: book } as never; };
  api.getAccountingList = async (resource, params) => {
    let rows: any[] = resource === "books" && scenario === "pagination" ? Array.from({length:27},(_,i)=>({id:`book-${i}`,code:`B${String(i).padStart(2,"0")}`,name:`Book ${String(i).padStart(2,"0")}`,basis:"management",currency_code:"EUR",is_active:i!==26,is_primary:i===0})) : resource === "books" ? books : resource === "accounts" ? accounts : [];
    if(params.search)rows=rows.filter(row=>`${row.name} ${row.code}`.toLowerCase().includes(String(params.search).toLowerCase()));
    if(params.status)rows=rows.filter(row=>String(row.is_active)===params.status);
    const start=Number(params.cursor||0),size=Number(params.page_size||20);
    return {data:{results:rows.slice(start,start+size),count:rows.length,next:start+size<rows.length?String(start+size):null,filters:{status:["true","false"],basis:["management"],currency:["EUR"],primary:["true","false"]}}} as never;
  };
  api.getJournalEntries = async () => ({ data: [] } as never);
  api.getFiscalPeriods = async () => ({ data: [] } as never);
}
