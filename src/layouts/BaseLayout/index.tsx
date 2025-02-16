import { FC, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface BaseLayoutProps {
  children?: ReactNode;
}

const BaseLayout: FC<BaseLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        flex: 1,
        height: '100%'
      }}
    >
      {children || <Outlet />}
    </div>
  );
};

export default BaseLayout;
