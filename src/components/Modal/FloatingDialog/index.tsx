import type { FormEventHandler, ReactNode, RefObject } from "react";
import DialogShell from "@/shared/ui/DialogShell";

type Props = {
  isOpen: boolean;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  closeLabel: string;
  onClose(): void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  formId?: string;
  formRef?: RefObject<HTMLFormElement>;
  /** Fixed desktop dimensions, clamped to the available viewport. */
  width?: number;
  height?: number;
  busy?: boolean;
  loading?: boolean;
  tabs?: ReactNode;
  footer: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
};

/** Centered, fixed-size form dialog. The form scrolls; its header/actions stay visible. */
export default function FloatingDialog({ isOpen, title, description, eyebrow, closeLabel, onClose, onSubmit, formId, formRef, width = 800, height = 640, busy = false, loading = false, tabs, footer, overlay, children }: Props) {
  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      closeLabel={closeLabel}
      title={title}
      description={description}
      eyebrow={eyebrow}
      tabs={tabs}
      width={width}
      height={height}
      busy={busy}
      escapeEnabled={!overlay}
      overlay={overlay}
    >
      <form id={formId} ref={formRef} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <fieldset disabled={busy || loading} aria-busy={loading} className="m-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain border-0 px-4 py-5 sm:px-6 sm:py-6">{children}</fieldset>
        <footer className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] [&_button]:min-h-11 sm:px-6 sm:[&_button]:min-h-9">{footer}</footer>
      </form>
    </DialogShell>
  );
}

export function DialogSkeleton({ fields = 6, label }: { fields?: number; label: string }) {
  return <div role="status" aria-label={label} className="grid grid-cols-1 gap-x-5 gap-y-6 motion-safe:animate-pulse sm:grid-cols-2">
    <span className="sr-only">{label}</span>
    {Array.from({ length: fields }, (_, i) => <div key={i} aria-hidden="true" className={i === fields - 1 ? "sm:col-span-2" : ""}><div className="mb-2 h-3 w-24 rounded bg-slate-100" /><div className={`rounded-md border border-slate-100 bg-slate-50 ${i === fields - 1 ? "h-20" : "h-10"}`} /></div>)}
  </div>;
}
