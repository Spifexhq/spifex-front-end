import React, { useEffect, useState } from "react";

import SelectionActionsBarMobile from "./SelectionActionsBar.mobile";
import SelectionActionsBarDesktop from "./SelectionActionsBar.desktop";
import type { SelectionActionsBarProps } from "./SelectionActionsBar.desktop";

export type {
  MinimalEntry,
  SelectionActionsBarProps,
  SelectionActionsContext,
} from "./SelectionActionsBar.desktop";

const SelectionActionsBar: React.FC<SelectionActionsBarProps> = (props) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mql.matches);

    apply();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }

    const legacy = mql as unknown as {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };

    legacy.addListener?.(apply);
    return () => legacy.removeListener?.(apply);
  }, []);

  return isMobile ? <SelectionActionsBarMobile {...props} /> : <SelectionActionsBarDesktop {...props} />;
};

export default SelectionActionsBar;
