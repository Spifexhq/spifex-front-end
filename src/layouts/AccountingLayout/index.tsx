
import type { ReactNode } from "react";
import SectionLayout from "@/layouts/SectionLayout";
import AccountingSidebar from "@/pages/Accounting/components/AccountingSidebar";

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
