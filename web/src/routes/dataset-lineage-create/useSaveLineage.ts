import { useState, useCallback } from 'react';
import { saveCompleteLineage, validateLineageForSave } from '../../store/requests/lineageCreation';
import { LineageData } from '@app-types';

interface UseSaveLineageReturn {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  showValidationErrors: boolean;
  validationErrors: string[];
  showSuccessDialog: boolean;
  saveLineage: (lineageData: LineageData) => Promise<void>;
  validateLineage: (lineageData: LineageData) => boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setShowValidationErrors: (show: boolean) => void;
  setShowSuccessDialog: (show: boolean) => void;
}

export const useSaveLineage = (): UseSaveLineageReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const validateLineage = useCallback((lineageData: LineageData) => {
    const errors = validateLineageForSave({
      nodes: new Map(Array.from(lineageData.nodes)),
      edges: new Map(Array.from(lineageData.edges))
    });
    setValidationErrors(errors);
    return errors.length === 0;
  }, []);

  const saveLineage = useCallback(async (lineageData: LineageData) => {
    if (!validateLineage(lineageData)) {
      setShowValidationErrors(true);
      return;
    }

    setIsSaving(true);
    try {
      await saveCompleteLineage({
        nodes: new Map(Array.from(lineageData.nodes)),
        edges: new Map(Array.from(lineageData.edges))
      });
      
      setHasUnsavedChanges(false);
      setShowSuccessDialog(true);
      
    } catch (error: any) {
      alert(`Failed to save lineage: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [validateLineage]);

  return {
    isSaving,
    hasUnsavedChanges,
    showValidationErrors,
    validationErrors,
    showSuccessDialog,
    saveLineage,
    validateLineage,
    setHasUnsavedChanges,
    setShowValidationErrors,
    setShowSuccessDialog,
  };
};