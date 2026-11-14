import React from "react";
import { useTranslation } from "react-i18next";

type TopProgressProps = {
  active: boolean;
  variant?: "top" | "center";
  height?: number;
  label?: string;
};

export const TopProgress: React.FC<TopProgressProps> = ({
  active,
  variant = "top",
  height = 2,
  label,
}) => {
  const { t } = useTranslation("common");
  const accessibleLabel = label ?? t("loading");
  const isTop = variant === "top";

  // The center state blocks bootstrap/auth work, so it only mounts while active.
  if (!active && !isTop) return null;

  return isTop ? (
    <div
      role="progressbar"
      aria-label={accessibleLabel}
      aria-busy={active}
      aria-hidden={!active}
      className={`sticky top-0 z-20 overflow-hidden bg-gray-100/80 transition-opacity duration-150 ease-out motion-reduce:transition-none ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ height, marginBottom: -height }}
    >
      <span className="tprog-sweep absolute inset-y-0 left-0 w-2/5 rounded-full bg-[linear-gradient(90deg,transparent_0%,var(--accentPrimary)_45%,var(--accentPrimaryHover)_85%,transparent_100%)]" />
    </div>
  ) : (
    <div className="pointer-events-none fixed inset-0 z-30 grid place-items-center" aria-hidden={!active} aria-busy={active}>
      <div
        role="progressbar"
        aria-label={accessibleLabel}
        className="relative h-1 w-28 max-w-[calc(100vw-2rem)] overflow-hidden rounded-full bg-gray-200/80"
      >
        <span className="tprog-sweep absolute inset-y-0 left-0 w-1/2 rounded-full bg-[linear-gradient(90deg,transparent_0%,var(--accentPrimary)_45%,var(--accentPrimaryHover)_85%,transparent_100%)]" />
      </div>
    </div>
  );
};

export default TopProgress;
