import type { ReactNode } from "react";
import SectionLayout from "@/shared/layout/SectionLayout";
import { PageSkeletonShell } from "@/shared/ui/Loaders/PageSkeleton";
import InventorySidebar from "@/products/business/pages/Inventory/components/InventorySidebar";

interface InventoryLayoutProps {
  children?: ReactNode;
}

export const InventoryLayout = ({ children }: InventoryLayoutProps) => (
  <SectionLayout
    sidebar={<InventorySidebar />}
    fallback={<PageSkeletonShell variant="accounting" />}
  >
    {children}
  </SectionLayout>
);

export default InventoryLayout;
