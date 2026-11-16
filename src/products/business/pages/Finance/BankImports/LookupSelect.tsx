import { Select } from "@/shared/ui/Select";
import type { LookupOption } from "@/models/finance/imports";

export default function LookupSelect({ label, value, items, onChange, disabled = false, hideLabel = false, panelZIndex }: {
  label: string; value: string; items: LookupOption[]; onChange(value: string): void; disabled?: boolean; hideLabel?: boolean; panelZIndex?: number;
}) {
  return <Select label={hideLabel ? undefined : label} ariaLabel={label} buttonLabel={label} items={items} selected={items.filter(item => item.id === value)} getItemKey={item => item.id} getItemLabel={item => item.label} onChange={selected => onChange(selected[0]?.id ?? "")} singleSelect hideCheckboxes disabled={disabled} size="sm" panelZIndex={panelZIndex} />;
}
