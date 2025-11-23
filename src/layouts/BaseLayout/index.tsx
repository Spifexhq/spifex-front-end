import { FC, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { CookieBanner } from "@/components/Cookies/CookieBanner";

interface BaseLayoutProps {
  children?: ReactNode;
}

export const BaseLayout: FC<BaseLayoutProps> = ({ children }) => {
  return (
    <div style={{ flex: 1, height: "100%" }}>
      {children || <Outlet />}
      <CookieBanner />
    </div>
  );
};

export default BaseLayout;
