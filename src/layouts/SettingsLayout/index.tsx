// src/layouts/SettingsLayout.tsx
import { FC, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SidebarSettings from "@/components/layout/Sidebar/SidebarSettings";

export const SettingsLayout: FC = () => {
  const location = useLocation();

  const activeItem = useMemo(() => {
    const [, root, slug] = location.pathname.split("/");
    return root === "settings" ? (slug || "personal") : "personal";
  }, [location.pathname]);

  return (
    <>
      <SidebarSettings activeItem={activeItem} topOffsetPx={64} />
      <div className="ml-64">
        <Outlet />
      </div>
    </>
  );
};

export default SettingsLayout;
