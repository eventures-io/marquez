
import { LineageService } from '../../routes/dataset-lineage-v2/services/LineageService';
import { LineageData } from '@app-types';

/**
 * Save complete lineage by delegating to the service layer
 */
export const saveCompleteLineage = async (lineageData: LineageData): Promise<void> => {
  return await LineageService.saveCompleteLineage(lineageData);
};

/**
 * Validate lineage for save by delegating to the service layer
 */
export const validateLineageForSave = (lineageData: LineageData): string[] => {
  return LineageService.validateLineageForSave(lineageData);
};

// Re-export for backward compatibility if needed
export { LineageService } from '../../routes/dataset-lineage-v2/services/LineageService';
