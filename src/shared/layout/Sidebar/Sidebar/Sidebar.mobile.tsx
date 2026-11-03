import { useEffect, useState } from "react";
import SidebarNavigation, { type SidebarNavigationProps } from "./SidebarNavigation";
const MOBILE_SIDEBAR_EVENT = "spifex:mobileSidebar:setHidden";
declare global {
  interface Window {
    __SPX_MOBILE_SIDEBAR_HIDDEN__?: boolean;
  }
}


export default function SidebarMobile(props: SidebarNavigationProps) {
  const { isOpen, toggleSidebar } = props;
  const [hidden, setHidden] = useState(() => !!window.__SPX_MOBILE_SIDEBAR_HIDDEN__);
  useEffect(() => {
    const listener = (event: Event) => {
      const next = !!(event as CustomEvent<{ hidden?: boolean }>).detail?.hidden;
      window.__SPX_MOBILE_SIDEBAR_HIDDEN__ = next;
      setHidden(next);
    };
    window.addEventListener(MOBILE_SIDEBAR_EVENT, listener);
    return () => window.removeEventListener(MOBILE_SIDEBAR_EVENT, listener);
  }, []);
  useEffect(() => { if (hidden && isOpen) toggleSidebar(); }, [hidden, isOpen, toggleSidebar]);
  if (hidden) return null;
  return <SidebarNavigation {...props} mobile />;
}
