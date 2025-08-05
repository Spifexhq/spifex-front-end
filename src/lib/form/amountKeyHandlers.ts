// src/lib/form/amountKeyHandlers.ts
export function handleAmountKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  currentAmount: string,
  setFormData: React.Dispatch<React.SetStateAction<any>>,
  isRoot: boolean = false
) {
  const updateAmount = (newValue: string) => {
    setFormData((prev: any) => {
      if (isRoot) {
        return {
          ...prev,
          amount: newValue,
        };
      } else {
        return {
          ...prev,
          details: {
            ...prev.details,
            amount: newValue,
          },
        };
      }
    });
  };

  if (/^\d$/.test(e.key)) {
    e.preventDefault();
    const newAmount = parseInt(currentAmount || "0", 10) * 10 + parseInt(e.key, 10);
    updateAmount(newAmount.toString());
  } else if (e.key === "Backspace") {
    e.preventDefault();
    const newAmount = Math.floor(parseInt(currentAmount || "0", 10) / 10);
    updateAmount(newAmount.toString());
  } else if (["Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
  // Allow default behavior for navigation keys
  } else {
    e.preventDefault();
  }
}

export function handleUtilitaryAmountKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  currentValue: string,
  update: (newVal: string) => void
) {
  if (/^\d$/.test(e.key)) {
    e.preventDefault();
    const newVal = (parseInt(currentValue || "0", 10) * 10 + parseInt(e.key, 10)).toString();
    update(newVal);
  } else if (e.key === "Backspace") {
    e.preventDefault();
    const newVal = Math.floor(parseInt(currentValue || "0", 10) / 10).toString();
    update(newVal);
  } else if (["Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
  // Allow default behavior for navigation keys
  } else {
    e.preventDefault();
  }
}