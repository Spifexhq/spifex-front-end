import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
import type { PopoverProps } from "./Popover";
import { settingsPopoverPosition } from "./settingsPopoverPosition";

export default function SettingsPopover({ open, onClose, children, anchorRef, width = 320, height, isMobile, title, className }: PopoverProps) {
  const { t } = useTranslation("common");
  const panel = useRef<HTMLDivElement>(null);
  const [smallScreen, setSmallScreen] = useState(() => matchMedia("(max-width: 767px)").matches);
  const mobile = smallScreen || !!isMobile;
  const [position, setPosition] = useState({ top: 80, left: 12, width: 320, maxHeight: 500 });
  useEffect(() => {
    const media = matchMedia("(max-width: 767px)");
    const update = () => setSmallScreen(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useDialogFocus(open, panel);
  window.useGlobalEsc(open, onClose);
  useLayoutEffect(() => {
    if (!open || mobile) return;
    const update = () => {
      const anchor = anchorRef?.current?.getBoundingClientRect();
      const element = panel.current;
      if (!element) return;
      const preferredWidth = typeof width === "number" ? width : element.getBoundingClientRect().width;
      const next = settingsPopoverPosition(anchor ?? { left: 12, top: 64, bottom: 64 }, { width: preferredWidth, height: element.scrollHeight }, { width: innerWidth, height: innerHeight });
      setPosition(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, mobile, anchorRef, width]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !anchorRef?.current?.contains(target)) onClose();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  return createPortal(<>
    {mobile && <div className="fixed inset-0 z-[10020] bg-gray-950/25 backdrop-blur-[2px]" aria-hidden="true" />}
    <div ref={panel} role="dialog" aria-modal={mobile || undefined} aria-label={title} tabIndex={-1} data-popover-open="true"
      className={`settings-popover fixed z-[10021] overflow-y-auto overscroll-contain ${mobile ? "inset-x-0 bottom-0 max-h-[85dvh] pb-[env(safe-area-inset-bottom)]" : ""} ${className ?? ""}`}
      style={mobile ? undefined : { ...position, height }}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <span className="text-xs font-semibold text-gray-800">{title}</span>
        <button type="button" onClick={onClose} aria-label={t("modal.close")} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><X size={16} /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </>, document.body);
}
