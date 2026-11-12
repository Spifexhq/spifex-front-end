export default function AccountingStatus({ active, label }: { active: boolean; label: string }) {
 return <span className={`inline-flex items-center gap-1.5 text-xs ${active ? "text-gray-600" : "text-gray-500"}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`} />{label}</span>;
}
