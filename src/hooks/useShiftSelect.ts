/**
 * useShiftSelect.ts
 * 
 * This hook manages the selection of items by their IDs, including support 
 * for multi-selection with the Shift key.
 * 
 * Features:
 * - Allows toggling individual item selection
 * - Supports selecting a range of items by holding Shift
 * - Provides a "Select All" functionality
 * - Optimized for lists of objects containing an "id" field
 * 
 * Usage:
 * ```tsx
 * const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(items);
 * ```
 */

import { useState } from 'react';

export function useShiftSelect<T extends { id: number }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lastClickedId, setLastClickedId] = useState<number | null>(null);

   // Selects or deselects an item, including range selection using Shift.
  function handleSelectRow(id: number, event: React.MouseEvent) {
    if (event.shiftKey && lastClickedId !== null) {
      // If Shift is pressed and a previous selection exists
      const currentIndex = items.findIndex(item => item.id === id);
      const lastIndex = items.findIndex(item => item.id === lastClickedId);

      // If indices are invalid, fallback to simple selection
      if (currentIndex === -1 || lastIndex === -1) {
        setSelectedIds((prev) =>
          prev.includes(id)
            ? prev.filter((selectedId) => selectedId !== id)
            : [...prev, id]
        );
        setLastClickedId(id);
        return;
      }

      // Define the selection range
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
      let newSelectedIds = [...selectedIds];

      // Determine whether to select or deselect the range
      const shouldSelect = !selectedIds.includes(id);

      for (let i = start; i <= end; i++) {
        const itemId = items[i].id;
        if (shouldSelect) {
          if (!newSelectedIds.includes(itemId)) {
            newSelectedIds.push(itemId);
          }
        } else {
          newSelectedIds = newSelectedIds.filter((selectedId) => selectedId !== itemId);
        }
      }

      setSelectedIds(newSelectedIds);
    } else {
      // Normal selection (without Shift)
      setSelectedIds((prev) =>
        prev.includes(id)
          ? prev.filter((selectedId) => selectedId !== id)
          : [...prev, id]
      );
    }

    // Update the last clicked item
    setLastClickedId(id);
  }

  // Selects or deselects all items in the list.
  function handleSelectAll() {
    if (selectedIds.length === items.length) {
      // If all are selected, deselect all
      setSelectedIds([]);
    } else {
      // Otherwise, select all
      const allIds = items.map((item) => item.id);
      setSelectedIds(allIds);
    }
  }

  return {
    selectedIds,
    handleSelectRow,
    handleSelectAll,
  };
}
