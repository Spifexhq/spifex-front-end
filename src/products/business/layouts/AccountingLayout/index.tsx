
import type { ReactNode } from "react";
import SectionLayout from "@/shared/layout/SectionLayout";
import { PageSkeletonShell } from "@/shared/ui/Loaders/PageSkeleton";
import AccountingSidebar from "@/products/business/pages/Accounting/components/AccountingSidebar";
import { AccountingSetupProvider } from "@/products/business/pages/Accounting/setup/AccountingSetupProvider";
import { AccountingAiSetupProvider } from "@/products/business/pages/Accounting/setup/guided/AccountingAiSetupContext";
import { AccountingReviewGuideProvider } from "@/products/business/pages/Accounting/setup/review/AccountingReviewGuideProvider";
import { useAuthContext } from "@/hooks/useAuth";

interface AccountingLayoutProps {
  children?: ReactNode;
}

export const AccountingLayout = ({
  children,
}: AccountingLayoutProps) => {
  const { organization } = useAuthContext();
  return (
    <AccountingSetupProvider key={organization?.organization?.id}>
      <AccountingAiSetupProvider>
        <AccountingReviewGuideProvider>
          <SectionLayout sidebar={<AccountingSidebar />} fallback={<PageSkeletonShell variant="accounting" />}>
            {children}
          </SectionLayout>
        </AccountingReviewGuideProvider>
      </AccountingAiSetupProvider>
    </AccountingSetupProvider>
  );
};

export default AccountingLayout;
