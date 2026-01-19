// src/components/Table/CashFlowTable/CashFlowTable.tsx
import { forwardRef, useEffect, useState } from "react";

import CashFlowTableDesktop from "./CashFlowTable.desktop";
import CashFlowTableMobile from "./CashFlowTable.mobile";

import type { EntryFilters } from "@/models/components/filterBar";
import type { Entry } from "@/models/entries/entries";

export type CashFlowTableHandle = {
  clearSelection: () => void;
  refresh: () => void;
};

export interface CashFlowTableProps {
  filters?: EntryFilters;
  onEdit(entry: Entry): void;
  onSelectionChange?: (ids: string[], entries: Entry[]) => void;
}

const MOBILE_MQL = "(max-width: 639px)";

const CashFlowTable = forwardRef<CashFlowTableHandle, CashFlowTableProps>((props, ref) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_MQL).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(MOBILE_MQL);
    const apply = () => setIsMobile(mql.matches);

    apply();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }

    // legacy fallback
    const legacy = mql as unknown as {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };

    if (typeof legacy.addListener === "function") legacy.addListener(apply);
    return () => {
      if (typeof legacy.removeListener === "function") legacy.removeListener(apply);
    };
  }, []);

  return isMobile ? <CashFlowTableMobile ref={ref} {...props} /> : <CashFlowTableDesktop ref={ref} {...props} />;
});

export default CashFlowTable;
