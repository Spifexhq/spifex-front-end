export function matchesRecordFilters<T>(item: T, applied: Record<string, string>, controls: { key: string; value(item: T): string; date?: "from" | "to" }[], searchValue: (item: T) => string) {
 const query = (applied.search || "").trim().toLocaleLowerCase();
 return (!query || searchValue(item).toLocaleLowerCase().includes(query)) && controls.every(control => {
  const expected = applied[control.key];
  if (!expected) return true;
  const actual = control.value(item);
  if (control.date) return !!actual && (control.date === "from" ? actual >= expected : actual <= expected);
  return actual === expected;
 });
}
