import { useState, useCallback } from 'react';

const useEditModalState = (initialEntry = null) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(initialEntry);

  const openEditModal = useCallback((entry) => {
    setEditEntry(entry);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditEntry(null);
  }, []);

  return {
    isEditModalOpen,
    editEntry,
    openEditModal,
    closeEditModal,
  };
};

export default useEditModalState;