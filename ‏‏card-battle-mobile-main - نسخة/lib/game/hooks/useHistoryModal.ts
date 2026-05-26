import { useState, useCallback } from 'react';

export interface UseHistoryModalReturn {
  showHistoryModal: boolean;
  openHistoryModal: () => void;
  closeHistoryModal: () => void;
}

export function useHistoryModal(): UseHistoryModalReturn {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const openHistoryModal  = useCallback(() => setShowHistoryModal(true),  []);
  const closeHistoryModal = useCallback(() => setShowHistoryModal(false), []);

  return { showHistoryModal, openHistoryModal, closeHistoryModal };
}
