// src/lib/form/distributePercentages.ts
/**
 * Distributes percentages evenly among the given departments,
 * ensuring the total sums to 100%.
 */
export function distributePercentages(departments: string[]): string[] {
  const departmentCount = departments.length;
  const basePercentage = departmentCount > 0 ? (100 / departmentCount).toFixed(2) : "0";
  const updatedPercentages = Array(departmentCount).fill(basePercentage);

  // Sum the initial percentages
  const total = updatedPercentages.reduce((sum, value) => sum + parseFloat(value), 0);
  // See how far off we are from exactly 100
  const difference = (100 - total).toFixed(2);

  // Adjust the last department to fix rounding differences
  if (departmentCount > 0) {
    updatedPercentages[departmentCount - 1] = (
      parseFloat(updatedPercentages[departmentCount - 1]) + parseFloat(difference)
    ).toFixed(2);
  }

  return updatedPercentages;
}