import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import classNames from "classnames";
import RequiredMark from "./RequiredMark";

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & {
  label?: ReactNode;
  errorMessage?: ReactNode;
  required?: boolean;
  containerClassName?: string;
};

/**
 * Multi-line field matching Input's border, focus, disabled and error treatment.
 * With neither label nor errorMessage it renders the bare textarea so existing
 * label wrappers keep their layout.
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, errorMessage, required = false, className, containerClassName, id: idProp, rows = 3, ...rest }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = errorMessage ? `${id}-err` : undefined;

    const field = (
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={!!errorMessage}
        aria-describedby={errorId}
        aria-required={required || undefined}
        className={classNames(
          "w-full min-w-0 resize-y rounded-md border bg-white px-3 py-3 text-[13px] text-gray-900",
          "placeholder:text-gray-400 transition-colors hover:bg-gray-50 focus:bg-gray-50",
          "disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400",
          errorMessage ? "border-red-500" : "border-gray-300",
          className
        )}
        {...rest}
      />
    );

    if (!label && !errorMessage) return field;

    return (
      <div className={classNames("flex w-full min-w-0 flex-col gap-1.5", containerClassName)}>
        {label ? (
          <label htmlFor={id} className="min-w-0 select-none font-semibold text-[11px] text-gray-700">
            {label}
            {required ? <RequiredMark /> : null}
          </label>
        ) : null}
        {field}
        {errorMessage ? (
          <span id={errorId} className="text-[11px] leading-tight text-red-600">
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
