export type InventoryUnitGroup = "count" | "weight" | "volume" | "length" | "area" | "time" | "energy" | "other";

export type InventoryUnit = { code: string; group: InventoryUnitGroup };

/**
 * Mirror of `inventory.units.UnitOfMeasure`. The backend enforces this closed
 * vocabulary with a database check constraint.
 */
export const INVENTORY_UNITS: InventoryUnit[] = [
  { code: "pcs", group: "count" },
  { code: "unit", group: "count" },
  { code: "pair", group: "count" },
  { code: "set", group: "count" },
  { code: "dozen", group: "count" },
  { code: "pack", group: "count" },
  { code: "box", group: "count" },
  { code: "case", group: "count" },
  { code: "carton", group: "count" },
  { code: "pallet", group: "count" },
  { code: "bundle", group: "count" },
  { code: "roll", group: "count" },
  { code: "sheet", group: "count" },
  { code: "bag", group: "count" },
  { code: "bottle", group: "count" },
  { code: "can", group: "count" },
  { code: "kit", group: "count" },
  { code: "mg", group: "weight" },
  { code: "g", group: "weight" },
  { code: "kg", group: "weight" },
  { code: "t", group: "weight" },
  { code: "oz", group: "weight" },
  { code: "lb", group: "weight" },
  { code: "ml", group: "volume" },
  { code: "cl", group: "volume" },
  { code: "dl", group: "volume" },
  { code: "l", group: "volume" },
  { code: "m3", group: "volume" },
  { code: "gal", group: "volume" },
  { code: "fl_oz", group: "volume" },
  { code: "mm", group: "length" },
  { code: "cm", group: "length" },
  { code: "m", group: "length" },
  { code: "km", group: "length" },
  { code: "in", group: "length" },
  { code: "ft", group: "length" },
  { code: "yd", group: "length" },
  { code: "cm2", group: "area" },
  { code: "m2", group: "area" },
  { code: "ft2", group: "area" },
  { code: "min", group: "time" },
  { code: "h", group: "time" },
  { code: "day", group: "time" },
  { code: "week", group: "time" },
  { code: "month", group: "time" },
  { code: "year", group: "time" },
  { code: "kwh", group: "energy" },
  { code: "mwh", group: "energy" },
  { code: "other", group: "other" },
];

export const INVENTORY_UNIT_CODES = INVENTORY_UNITS.map(unit => unit.code);

export function inventoryUnitLabel(code: string | null | undefined, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!code) return t("units.none");
  return t(`units.${code}`, { defaultValue: code });
}
