import { useState } from 'react';

export function useShiftSelect<T extends { id: number }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lastClickedId, setLastClickedId] = useState<number | null>(null);

  function clearSelection() {
    setSelectedIds([]);
    setLastClickedId(null);
  }

  function handleSelectRow(id: number, event: React.MouseEvent) {
    if (event.shiftKey && lastClickedId !== null) {
      const currentIndex = items.findIndex(item => item.id === id);
      const lastIndex = items.findIndex(item => item.id === lastClickedId);
      if (currentIndex === -1 || lastIndex === -1) {
        setSelectedIds(prev =>
          prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
        setLastClickedId(id);
        return;
      }
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      let newSelectedIds = [...selectedIds];
      const shouldSelect = !selectedIds.includes(id);
      for (let i = start; i <= end; i++) {
        const itemId = items[i].id;
        if (shouldSelect) {
          if (!newSelectedIds.includes(itemId)) newSelectedIds.push(itemId);
        } else {
          newSelectedIds = newSelectedIds.filter(sid => sid !== itemId);
        }
      }
      setSelectedIds(newSelectedIds);
    } else {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
      );
    }
    setLastClickedId(id);
  }

  function handleSelectAll() {
    if (selectedIds.length === items.length) {
      clearSelection();
    } else {
      const allIds = items.map(item => item.id);
      setSelectedIds(allIds);
    }
  }

  return {
    selectedIds,
    handleSelectRow,
    handleSelectAll,
    clearSelection, // ⬅️ exposto
  };
}
