import React from "react";

type TopProgressProps = {
  active: boolean;
  variant?: "top" | "center";
  topOffset?: number;
  height?: number;
};

export const TopProgress: React.FC<TopProgressProps> = ({
  active,
  variant = "top",
  topOffset = 64,
  height = 2,
}) => {
  const isTop = variant === "top";

  // Center variant: mount only when active so no shadow sticks around.
  if (!active && !isTop) return null;

  return (
    <>
      <style>{`
        @keyframes tprog-slide {
          0%   { transform: translateX(-60%); }
          50%  { transform: translateX(20%); }
          100% { transform: translateX(110%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tprog-anim { animation: none !important; transform: translateX(0) !important; }
        }
      `}</style>

      {isTop ? (
        <div
          className={`fixed left-0 right-0 z-[9999] overflow-hidden pointer-events-none ${
            active ? "" : "hidden"
          }`}
          style={{ top: `${topOffset}px`, height }}
          aria-hidden={!active}
          aria-busy={active}
        >
          <div
            className="h-full w-1/2 bg-[var(--brand,#f97316)] transition-opacity duration-200 ease-out tprog-anim"
            style={{ opacity: active ? 1 : 0, animation: active ? "tprog-slide 1.2s ease-in-out infinite" : "none" }}
          />
        </div>
      ) : (
        <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden={!active} aria-busy={active}>
          <div
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-full"
            style={{
              width: "10vw",
              height,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 1px 6px rgba(0,0,0,0.08)",
              background: "transparent",
            }}
          >
            <div
              className="h-full w-1/2 bg-[var(--brand,#f97316)] transition-opacity duration-200 ease-out tprog-anim"
              style={{ opacity: 1, animation: "tprog-slide 1.2s ease-in-out infinite" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default TopProgress;
