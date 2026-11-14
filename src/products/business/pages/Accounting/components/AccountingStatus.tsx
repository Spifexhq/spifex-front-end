import StatusDot from "@/shared/ui/StatusDot";

/** Accounting keeps its historical module path while sharing the status dot. */
export default function AccountingStatus({ active, label }: { active: boolean; label: string }) {
  return <StatusDot active={active} label={label} />;
}
