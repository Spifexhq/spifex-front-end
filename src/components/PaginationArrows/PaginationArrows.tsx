import React from "react";
import Button from "src/components/ui/Button";

type Props = {
  onPrev: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  disabledPrev?: boolean;
  disabledNext?: boolean;
  /** optional right-aligned label like “Page 3 of 5+” */
  label?: string;
  className?: string;
};

const PaginationArrows: React.FC<Props> = ({
  onPrev,
  onNext,
  disabledPrev,
  disabledNext,
  label,
  className,
}) => (
  <div className={`flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-white ${className || ""}`}>
    <div className="text-[11px] text-gray-600 select-none">{label}</div>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="!h-8"
        disabled={!!disabledPrev}
        onClick={onPrev}
        aria-label="Previous page"
        title={disabledPrev ? "No previous page" : "Previous page"}
      >
        ←
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="!h-8"
        disabled={!!disabledNext}
        onClick={onNext}
        aria-label="Next page"
        title={disabledNext ? "No next page" : "Next page"}
      >
        →
      </Button>
    </div>
  </div>
);

export default PaginationArrows;
