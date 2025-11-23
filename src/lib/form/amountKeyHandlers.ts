// src/lib/form/amountKeyHandlers.ts

export function handleAmountKeyDown<T>(
  e: React.KeyboardEvent<HTMLInputElement>,
  currentAmount: string,
  setFormData: React.Dispatch<React.SetStateAction<T>>,
  isRoot: boolean = false
) {
  const updateAmount = (newValue: string) => {
    setFormData((prev) => {
      // We only care that state has amount / details.amount,
      // but we don't force T to that shape at the type level.
      const base = prev as unknown as {
        amount?: string;
        details?: {
          amount?: string;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };

      if (isRoot) {
        return {
          ...base,
          amount: newValue,
        } as T;
      }

      return {
        ...base,
        details: {
          ...(base.details ?? {}),
          amount: newValue,
        },
      } as T;
    });
  };

  // ✅ Let the browser handle:
  // - Ctrl/Cmd + 1..9 (switch browser tabs)
  // - Common shortcuts: A,C,V,X,Z,Y (select all, copy, paste, cut, undo, redo)
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const key = e.key.toLowerCase();
    if (/^[0-9]$/.test(key)) return; // tab switching
    if (["a", "c", "v", "x", "z", "y"].includes(key)) return; // common shortcuts
  }

  // Allow default behavior for navigation keys
  if (["Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    return;
  }

  if (/^\d$/.test(e.key)) {
    e.preventDefault();
    const newAmount = parseInt(currentAmount || "0", 10) * 10 + parseInt(e.key, 10);
    updateAmount(newAmount.toString());
    return;
  }

  if (e.key === "Backspace") {
    e.preventDefault();
    const newAmount = Math.floor(parseInt(currentAmount || "0", 10) / 10);
    updateAmount(newAmount.toString());
    return;
  }

  // Block everything else (keeps the numeric-only masked behavior)
  e.preventDefault();
}

export function handleUtilitaryAmountKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  currentValue: string,
  update: (newVal: string) => void
) {
  // ✅ Same pass-throughs here too
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const key = e.key.toLowerCase();
    if (/^[0-9]$/.test(key)) return; // browser tab switching
    if (["a", "c", "v", "x", "z", "y"].includes(key)) return; // common shortcuts
  }

  if (["Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    return;
  }

  if (/^\d$/.test(e.key)) {
    e.preventDefault();
    const newVal = (parseInt(currentValue || "0", 10) * 10 + parseInt(e.key, 10)).toString();
    update(newVal);
    return;
  }

  if (e.key === "Backspace") {
    e.preventDefault();
    const newVal = Math.floor(parseInt(currentValue || "0", 10) / 10).toString();
    update(newVal);
    return;
  }

  e.preventDefault();
}
