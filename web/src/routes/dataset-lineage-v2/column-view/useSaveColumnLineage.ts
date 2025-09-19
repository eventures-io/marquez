import { useState, useCallback } from 'react';
import { ColumnLineageData } from './useColumnLineageData';
import { LineageService } from '../services/LineageService';

interface UseSaveColumnLineageReturn {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  showValidationErrors: boolean;
  validationErrors: string[];
  showSuccessDialog: boolean;
  saveColumnLineage: (columnLineageData: ColumnLineageData, nodePositions?: Map<string, { x: number; y: number }>) => Promise<void>;
  validateColumnLineage: (columnLineageData: ColumnLineageData) => boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setShowValidationErrors: (show: boolean) => void;
  setShowSuccessDialog: (show: boolean) => void;
}

export const useSaveColumnLineage = (): UseSaveColumnLineageReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const validateColumnLineage = useCallback((columnLineageData: ColumnLineageData) => {
    const errors: string[] = [];
    
    if (columnLineageData.nodes.size === 0) {
      errors.push('Column lineage must contain at least one node');
      return false;
    }
    
    // Validate dataset nodes
    const datasetNodes = Array.from(columnLineageData.nodes.values())
      .filter(node => node.type === 'dataset-container');
    
    for (const node of datasetNodes) {
      if (!node.data.namespace?.trim()) {
        errors.push(`Dataset "${node.data.name || node.id}" is missing namespace`);
      }
      if (!node.data.name?.trim()) {
        errors.push(`Dataset "${node.data.name || node.id}" is missing name`);
      }
    }
    
    // Validate column field nodes
    const columnNodes = Array.from(columnLineageData.nodes.values())
      .filter(node => node.type === 'column-field');
    
    for (const node of columnNodes) {
      if (!node.data.namespace?.trim()) {
        errors.push(`Column "${node.data.fieldName || node.id}" is missing namespace`);
      }
      if (!node.data.datasetName?.trim()) {
        errors.push(`Column "${node.data.fieldName || node.id}" is missing dataset name`);
      }
      if (!node.data.fieldName?.trim()) {
        errors.push(`Column "${node.data.fieldName || node.id}" is missing field name`);
      }
    }
    
    // Check that we have at least one column connection (edge)
    if (columnLineageData.nodes.size > 1 && columnLineageData.edges.size === 0) {
      errors.push('Multiple nodes must be connected with column-level relationships');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, []);

  const saveColumnLineage = useCallback(async (columnLineageData: ColumnLineageData, nodePositions?: Map<string, { x: number; y: number }>) => {
    if (!validateColumnLineage(columnLineageData)) {
      setShowValidationErrors(true);
      return;
    }

    setIsSaving(true);
    try {
      // Pass node positions so the service can preserve field order
      await LineageService.saveColumnLineage(columnLineageData, nodePositions);
      
      setHasUnsavedChanges(false);
      setShowSuccessDialog(true);
      
    } catch (error: any) {
      alert(`Failed to save column lineage: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [validateColumnLineage]);

  return {
    isSaving,
    hasUnsavedChanges,
    showValidationErrors,
    validationErrors,
    showSuccessDialog,
    saveColumnLineage,
    validateColumnLineage,
    setHasUnsavedChanges,
    setShowValidationErrors,
    setShowSuccessDialog,
  };
};
