import { useId } from "react";
import SwitchControl from "./SwitchControl";

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
    <SwitchControl
      id={controlId}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      hitArea="sm"
      ariaLabel={label}
      title={label}
      className={className}
    />
  );
}
