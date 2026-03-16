export type OnboardingStatus = {
  personal_locale_setup: boolean;
  org_locale_setup: boolean;
  personal_info_setup: boolean;
  org_info_setup: boolean;
  ledger_accounts_setup: boolean;
  completed: boolean;
};