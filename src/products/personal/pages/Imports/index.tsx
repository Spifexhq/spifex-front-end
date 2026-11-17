import { useCallback } from "react";
import BankImports from "@/products/business/pages/Finance/BankImports";
import type { BankLoader } from "@/products/business/pages/Finance/BankImports/types";
import { allPersonal } from "../../services/personalData";
import { usePersonalAccess } from "../../access/PersonalAccessProvider";
import { PERSONAL_PERMISSION } from "../../access/permissions";
import type { PersonalAccount } from "../../types";

/** Personal workspaces reuse the shared statement import flow with Personal data. */
export default function PersonalImportsPage() {
  const access = usePersonalAccess();
  const canViewBanks = access.can(PERSONAL_PERMISSION.bankAccounts);
  const loadBanks = useCallback<BankLoader>(async activeOnly => {
    if (!canViewBanks) return [];
    const accounts = await allPersonal<PersonalAccount>("accounts");
    return accounts
      .filter(account => !activeOnly || account.is_active)
      .map(account => ({
        id: account.id,
        institution: account.institution || account.name,
        account_number: account.account_number,
        iban: account.iban,
        currency: account.currency,
      }));
  }, [canViewBanks]);
  return <BankImports
    product="personal"
    basePath="/p/imports"
    loadBanks={loadBanks}
    permissions={{
      add: access.can(PERSONAL_PERMISSION.addTransaction),
      change: access.can(PERSONAL_PERMISSION.addTransaction) || access.can(PERSONAL_PERMISSION.changeTransaction),
      delete: access.can(PERSONAL_PERMISSION.deleteTransaction),
      viewBanks: access.can(PERSONAL_PERMISSION.bankAccounts),
    }}
  />;
}
