// src\pages\LedgerAccountSettings\index.tsx
import React from "react";

import LedgerWorkspace from "./components/LedgerWorkspace";
import { getLedgerMessages } from "./messages";

import type { OrgLedgerProfileResponse } from "@/models/auth/organization";

type Props = {
  ledgerProfile: OrgLedgerProfileResponse;
};

const LedgerAccountSettingsPage: React.FC<Props> = ({ ledgerProfile }) => {
  const messages = getLedgerMessages(ledgerProfile.language_code);

  return (
    <LedgerWorkspace
      ledgerProfile={ledgerProfile}
      title={messages.workspace.titleOverview}
      description={messages.workspace.descriptionOverview}
    />
  );
};

export default LedgerAccountSettingsPage;