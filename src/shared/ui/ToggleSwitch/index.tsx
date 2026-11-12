import { useId, type ReactNode } from "react";
import SwitchControl from "@/shared/ui/Switch/SwitchControl";

export default function ToggleSwitch({ checked, onChange, label, description, disabled = false, id }: { checked: boolean; onChange(checked: boolean): void; label: ReactNode; description?: ReactNode; disabled?: boolean; id?: string }) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-3">
    <div className="min-w-0"><label id={`${controlId}-label`} htmlFor={controlId} className="cursor-pointer text-[13px] font-medium text-slate-700">{label}</label>{description && <p id={`${controlId}-description`} className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}</div>
    <SwitchControl
      id={controlId}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      hitArea="lg"
      ariaLabelledBy={`${controlId}-label`}
      ariaDescribedBy={description ? `${controlId}-description` : undefined}
    />
  </div>;
}
