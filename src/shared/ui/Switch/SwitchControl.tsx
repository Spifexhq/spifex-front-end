type HitArea = "sm" | "lg";

type SwitchControlProps = {
  id?: string;
  checked: boolean;
  onChange(checked: boolean): void;
  disabled?: boolean;
  hitArea?: HitArea;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  title?: string;
  className?: string;
};

/**
 * Shared switch control: one track/thumb geometry and one behavior.
 * The hit area varies by presentation (compact row vs settings row), and grows
 * to 44px on mobile for the compact variant.
 */
export default function SwitchControl({
  id,
  checked,
  onChange,
  disabled = false,
  hitArea = "sm",
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  title,
  className = "",
}: SwitchControlProps) {
  const hit = hitArea === "lg" ? "size-11" : "size-9 max-md:size-11";

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group inline-flex ${hit} shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accentPrimary)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-150 motion-reduce:transition-none ${
          checked
            ? "border-[var(--accentPrimary)] bg-[var(--accentPrimary)] group-hover:bg-[var(--accentPrimaryHover)]"
            : "border-slate-300 bg-slate-200 group-hover:bg-slate-300"
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
