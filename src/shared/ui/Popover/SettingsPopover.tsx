import { SettingsUiContext } from "../Settings/SettingsUiContext";
import { useId, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
import type { PopoverProps } from "./Popover";
import { settingsPopoverPosition } from "./settingsPopoverPosition";

export default function SettingsPopover({ open, onClose, children, anchorRef, width = 280, height, isMobile, title, className }: PopoverProps) {
  const { t } = useTranslation("common");
  const owner = useId();
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
      const preferredWidth = typeof width === "number" ? Math.min(width, 320) : element.getBoundingClientRect().width;
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
      if ((target as Element).closest?.("[data-filter-owner]")?.getAttribute("data-filter-owner") === owner) return;
      if (!panel.current?.contains(target) && !anchorRef?.current?.contains(target)) onClose();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, onClose, anchorRef, owner]);
  return createPortal(<AnimatePresence>{open && <>
    {mobile && <div className="fixed inset-0 z-[10020] bg-gray-950/25 backdrop-blur-[2px]" aria-hidden="true" />}
    <motion.div initial={{ opacity: 0, y: mobile ? 12 : -4, scale: mobile ? 1 : .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: mobile ? 12 : -4, scale: mobile ? 1 : .985 }} transition={{ duration: .15, ease: "easeOut" }} ref={panel} role="dialog" aria-modal={mobile || undefined} aria-label={title} tabIndex={-1} data-popover-open="true"
      className={`settings-popover [--settings-border:#e3e6eb] [--settings-muted:#687385] [--settings-ink:#202936] [color:var(--settings-ink)] [font-size:13px] [&_[data-ui=button]]:[border-radius:6px] [&_[data-ui=button]]:[font-size:12px] [&_[data-ui=button]]:[font-weight:500] [&_[data-ui=button]]:[min-height:32px] [&_[data-ui=button]]:[white-space:nowrap] [&_[data-ui=button][data-variant=outline]]:[border:1px_solid_var(--settings-border)] [&_[data-ui=button][data-variant=outline]]:[background:white] [&_[data-ui=button][data-variant=outline]]:[color:#465164] [&_:is(input:not([type=checkbox]):not([type=radio]),_textarea)]:[font-size:13px] [&_:is(input:not([type=checkbox]):not([type=radio]),_textarea)]:[border-radius:6px] [&_:is(input:not([type=checkbox]):not([type=radio]),_textarea)]:[border-color:#d8dee7] [&_:is(button,_input,_select,_textarea):focus-visible]:[outline:none]! [&_:is(button,_input,_select,_textarea):focus-visible]:[outline-offset:0] [&_button:focus-visible]:[box-shadow:none]! [&_button:disabled]:[cursor:not-allowed] [&_button:disabled]:[opacity:.55] [border-radius:8px] [border:1px_solid_#dce1e8] [box-shadow:0_8px_28px_#26334d1f] [background:white] max-md:[border-radius:12px_12px_0_0] motion-reduce:[&_*]:[transition-duration:0ms]! [&_>_div:last-child_>_.p-4]:[padding:0] max-md:[&_[data-ui=button]]:[min-height:40px] [&_>_div:last-child_>_div.p-4]:[padding:0] [border:1px_solid_#dce1e8] [border-radius:8px] [box-shadow:0_6px_24px_#26334d18] [&_>_div:first-child]:[padding:8px_12px] [&_>_div:first-child]:[min-height:40px] [&_>_div:first-child_button]:[height:24px] [&_>_div:first-child_button]:[width:24px] [&_>_div:last-child]:[padding:12px] [&_input]:[min-height:32px] [&_label]:[font-size:12px] [&_[data-ui=button]]:[min-height:30px] [&_[data-ui=button]]:[height:30px] [&_[data-ui=button]]:[font-size:12px] [&_.mt-3]:[margin-top:10px] max-md:[border-radius:12px_12px_0_0] max-md:[&_[data-ui=button]]:[min-height:40px] [border-color:#dce1e8] [border-radius:8px] [box-shadow:0_6px_24px_#26334d18] fixed z-[10021] overflow-y-auto overscroll-contain ${mobile ? "inset-x-0 bottom-0 max-h-[85dvh] pb-[env(safe-area-inset-bottom)]" : ""} ${className ?? ""}`}
      style={mobile ? undefined : { ...position, height }}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <span className="text-xs font-semibold text-gray-800">{title}</span>
        <button type="button" onClick={onClose} aria-label={t("modal.close")} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><X size={16} /></button>
      </div>
      <SettingsUiContext.Provider value={{ settings: true, owner }}><div className="p-3">{children}</div></SettingsUiContext.Provider>
    </motion.div>
  </>}</AnimatePresence>, document.body);
}
