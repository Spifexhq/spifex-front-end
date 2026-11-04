import React from "react";

export const QuickButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = "",
  ...props
}) => (
  <button
    {...props}
    className={`rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-gray-400 ${className}`}
    type="button"
  />
);
