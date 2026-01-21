import React from "react";

export const QuickButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = "",
  ...props
}) => (
  <button
    {...props}
    className={`text-[11px] border border-gray-300 rounded px-2 py-[3px] bg-white hover:bg-gray-50 ${className}`}
    type="button"
  />
);
