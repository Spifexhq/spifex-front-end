
import type { ReactNode } from "react";
import SectionLayout from "@/shared/layout/SectionLayout";
import { PageSkeletonShell } from "@/shared/ui/Loaders/PageSkeleton";
import AccountingSidebar from "@/products/business/pages/Accounting/components/AccountingSidebar";

interface AccountingLayoutProps {
  children?: ReactNode;
}

export const AccountingLayout = ({
  children,
}: AccountingLayoutProps) => {
  return (
    <SectionLayout sidebar={<AccountingSidebar />} fallback={<PageSkeletonShell variant="accounting" />}>
      {children}
    </SectionLayout>
  );
};

export default AccountingLayout;
