// @/utils/formUtils.ts

/**
 * Formats a numeric string (representing centavos) into Brazilian currency style, e.g.:
 *  "0" => "R$ 0,00"
 *  "1" => "R$ 0,01"
 *  "100" => "R$ 1,00"
 *  "12345" => "R$ 123,45"
 */

import { FormData } from "@/components/Modal/Modal.types";

// Formats a centavos string into "R$ X,XX" (Brazilian currency formatting)
export function formatCurrency(amount: string): string {
  const numeric = parseInt(amount, 10) || 0;
  const formatted = (numeric / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `R$ ${formatted}`;
}

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

/**
 * A helper to handle digit/backspace/etc. key presses on an input that should treat its value as centavos.
 * We accept the event, the current amount, and the setFormData function. Then we handle updating state here.
 */
export function handleAmountKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  currentAmount: string,
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
) {
  // If it is a digit (0 to 9)
  if (/^\d$/.test(e.key)) {
    e.preventDefault();
    const newAmount = parseInt(currentAmount, 10) * 10 + parseInt(e.key, 10);
    setFormData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        amount: newAmount.toString(),
      },
    }));
  }
  // If it is Backspace, remove the last digit (dividing by 10 and rounding down)
  else if (e.key === "Backspace") {
    e.preventDefault();
    const newAmount = Math.floor(parseInt(currentAmount, 10) / 10);
    setFormData((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        amount: newAmount.toString(),
      },
    }));
  }
  // Allows Tab and arrow keys for navigation
  else if (
    e.key === "Tab" ||
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight"
  ) {
    // do nothing (don't prevent default)
  }
  // Prevent everything else
  else {
    e.preventDefault();
  }
}