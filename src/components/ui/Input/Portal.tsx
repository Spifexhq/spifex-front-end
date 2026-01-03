import React from "react";
import { createPortal } from "react-dom";

type PortalProps = {
  children: React.ReactNode;
};

export default function Portal({ children }: PortalProps) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
