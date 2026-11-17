import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { productPathname } from "@/app/routing/productPaths";

import InventoryOverviewPage from "./pages/InventoryOverviewPage";
import InventoryItemsPage from "./pages/InventoryItemsPage";
import InventoryStockPage from "./pages/InventoryStockPage";
import InventoryLocationsPage from "./pages/InventoryLocationsPage";

const InventoryWorkspace = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation("inventory");
  const page = productPathname(pathname).split("/")[3] || "overview";

  return (
    <main className="min-w-0 px-4 py-6 text-gray-900 md:px-7">
      <div className="mx-auto w-full max-w-[1440px] space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t(`nav.${page}`)}</h1>
        </header>
        <div className="min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="/b/inventory/overview" replace />} />
            <Route path="overview" element={<InventoryOverviewPage />} />
            <Route path="items" element={<InventoryItemsPage />} />
            <Route path="stock" element={<InventoryStockPage />} />
            <Route path="locations" element={<InventoryLocationsPage />} />
            <Route path="*" element={<Navigate to="/b/inventory/overview" replace />} />
          </Routes>
        </div>
      </div>
    </main>
  );
};

export default function Inventory() {
  return <InventoryWorkspace />;
}
