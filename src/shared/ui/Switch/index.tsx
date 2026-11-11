import { useId } from "react";

/**
 * Compact row switch. Use it at the start of a list row when the row itself
 * already provides the visible label.
 */
export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = "",
}: {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  return (
    <button
      id={controlId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accentPrimary)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-150 motion-reduce:transition-none ${
          checked
            ? "border-[var(--accentPrimary)] bg-[var(--accentPrimary)]"
            : "border-slate-300 bg-slate-200"
        }`}
      >
        <span
          className={`size-4 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none ${
            checked ? "translate-x-[17px]" : "translate-x-px"
          }`}
        />
      </span>
    </button>
  );
}
