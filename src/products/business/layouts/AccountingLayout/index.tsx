
import type { ReactNode } from "react";
import SectionLayout from "@/shared/layout/SectionLayout";
import AccountingSidebar from "@/products/business/pages/Accounting/components/AccountingSidebar";

interface AccountingLayoutProps {
  children?: ReactNode;
}

export const AccountingLayout = ({
  children,
}: AccountingLayoutProps) => {
  return (
    <SectionLayout sidebar={<AccountingSidebar />}>
      {children}
    </SectionLayout>
  );
};

export default AccountingLayout;
