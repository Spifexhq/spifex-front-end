import { SettingsModalFrame, SettingsModalHeader } from "@/shared/ui/Settings/SettingsModalFrame";
import { SettingsModalContent } from "@/shared/ui/Settings/SettingsModalContent";
import type { ReactNode } from "react";
type Props = { isOpen: boolean; title: string; subtitle?: string; onClose(): void; children: ReactNode; recordLabel?: string; recordName?: string; contentClassName?: string };
export default function AccountingSideModal({ isOpen, title, subtitle, onClose, children, recordLabel, recordName, contentClassName = "" }: Props) {
  window.useGlobalEsc(isOpen, onClose);
  return <SettingsModalFrame isOpen={isOpen} labelledBy="accounting-side-modal-title" onBackdropClose={onClose} className="accounting-dialog">
    <SettingsModalHeader titleId="accounting-side-modal-title" title={title} subtitle={subtitle} onClose={onClose} />
    <div className="settings-modal-content"><SettingsModalContent recordLabel={recordLabel ?? title} recordName={recordName ?? subtitle}><div className={`settings-modal-inner ${contentClassName}`}>{children}</div></SettingsModalContent></div>
  </SettingsModalFrame>;
}
