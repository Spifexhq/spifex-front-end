import React from "react";

type ShimmerProps = React.HTMLAttributes<HTMLDivElement> & {
  rounded?: string; // e.g. "rounded-md"
};

export const Shimmer: React.FC<ShimmerProps> = ({ className = "", rounded = "rounded", ...rest }) => (
  <div
    className={`relative overflow-hidden bg-gray-200 ${rounded} ${className}`}
    {...rest}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent)]" />
    {/* Tailwind keyframes (global): add to your CSS if needed */}
    {/* @keyframes shimmer { 100% { transform: translateX(100%); } } */}
  </div>
);
export default Shimmer;
