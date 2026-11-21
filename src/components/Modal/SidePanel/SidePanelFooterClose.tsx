import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";
import { useSidePanel } from "./SidePanelContext";

/**
 * Footer close. Desktop keeps the actions right-aligned with Close as the
 * rightmost button; on small screens the main actions move to the left and this
 * button stays on the right edge.
 */
export default function SidePanelFooterClose() {
  const { t } = useTranslation("common");
  const context = useSidePanel();
  if (!context) return null;
  return (
    <Button
      variant="ghost"
      className="settings-modal-footer-close"
      disabled={context.busy}
      onClick={context.onClose}
    >
      {t("modal.close")}
    </Button>
  );
}
