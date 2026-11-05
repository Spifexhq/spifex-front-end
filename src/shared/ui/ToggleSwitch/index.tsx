import { useId, type ReactNode } from "react";

export default function ToggleSwitch({ checked, onChange, label, description, disabled = false, id }: { checked: boolean; onChange(checked: boolean): void; label: ReactNode; description?: ReactNode; disabled?: boolean; id?: string }) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-3">
    <div className="min-w-0"><label id={`${controlId}-label`} htmlFor={controlId} className="cursor-pointer text-[13px] font-medium text-slate-700">{label}</label>{description && <p id={`${controlId}-description`} className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}</div>
    <button id={controlId} type="button" role="switch" aria-checked={checked} aria-labelledby={`${controlId}-label`} aria-describedby={description ? `${controlId}-description` : undefined} disabled={disabled} onClick={() => onChange(!checked)} className="group grid size-11 shrink-0 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">
      <span aria-hidden="true" className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors duration-150 motion-reduce:transition-none ${checked ? "border-[var(--accentPrimary)] bg-[var(--accentPrimary)]" : "border-slate-300 bg-slate-200 group-hover:bg-slate-300"}`}><span className={`size-4 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none ${checked ? "translate-x-[17px]" : "translate-x-px"}`} /></span>
    </button>
  </div>;
}
