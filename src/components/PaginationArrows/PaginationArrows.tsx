import React from "react";
import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";

type Props = {
  onPrev: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  disabledPrev?: boolean;
  disabledNext?: boolean;
  className?: string;
};

const PaginationArrows: React.FC<Props> = ({
  onPrev,
  onNext,
  disabledPrev,
  disabledNext,
  className,
}) => {
  const { t } = useTranslation("common");
  return (
  <div
    className={`flex items-center justify-end px-3 py-2 border-t border-gray-200 bg-white ${className || ""}`}
  >
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="!h-8"
        disabled={!!disabledPrev}
        onClick={onPrev}
        aria-label={t("pagination.previous")}
        title={t(disabledPrev ? "pagination.noPrevious" : "pagination.previous")}
      >
        ←
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="!h-8"
        disabled={!!disabledNext}
        onClick={onNext}
        aria-label={t("pagination.next")}
        title={t(disabledNext ? "pagination.noNext" : "pagination.next")}
      >
        →
      </Button>
    </div>
  </div>
  );
};

export default PaginationArrows;
