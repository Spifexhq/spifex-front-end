// src\pages\LedgerAccountSettings\index.tsx
import React from "react";

import LedgerWorkspace from "./LedgerWorkspace";

import type { OrgLedgerProfileResponse } from "@/models/auth/organization";

type Props = {
  ledgerProfile: OrgLedgerProfileResponse;
};

const LedgerAccountSettingsPage: React.FC<Props> = ({ ledgerProfile }) => {
  return <LedgerWorkspace ledgerProfile={ledgerProfile} />;
};

export default LedgerAccountSettingsPage;
