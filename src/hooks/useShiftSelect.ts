import { useState } from "react";

/**
 * Shift-select hook that works with either string or number IDs.
 * Provide an `idSelector` so the hook doesn't care about your item shape.
 */
export function useShiftSelect<T, K extends string | number = string>(
  items: T[],
  idSelector: (item: T) => K
) {
  const [selectedIds, setSelectedIds] = useState<K[]>([]);
  const [lastClickedId, setLastClickedId] = useState<K | null>(null);

  function clearSelection() {
    setSelectedIds([]);
    setLastClickedId(null);
  }

  function handleSelectRow(id: K, event: React.MouseEvent) {
    if (event.shiftKey && lastClickedId !== null) {
      const currentIndex = items.findIndex((it) => idSelector(it) === id);
      const lastIndex = items.findIndex((it) => idSelector(it) === lastClickedId);

      if (currentIndex === -1 || lastIndex === -1) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
        setLastClickedId(id);
        return;
      }

      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      let newSelectedIds = [...selectedIds];
      const shouldSelect = !selectedIds.includes(id);

      for (let i = start; i <= end; i++) {
        const itemId = idSelector(items[i]);
        if (shouldSelect) {
          if (!newSelectedIds.includes(itemId)) newSelectedIds.push(itemId);
        } else {
          newSelectedIds = newSelectedIds.filter((sid) => sid !== itemId);
        }
      }
      setSelectedIds(newSelectedIds);
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
      );
    }
    setLastClickedId(id);
  }

  function handleSelectAll() {
    if (selectedIds.length === items.length) {
      clearSelection();
    } else {
      const allIds = items.map(idSelector);
      setSelectedIds(allIds);
    }
  }

  return {
    selectedIds,
    handleSelectRow,
    handleSelectAll,
    clearSelection,
  };
}
