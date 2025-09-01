// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageService } from '../../routes/dataset-lineage-create/services/LineageService';
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
export { LineageService } from '../../routes/dataset-lineage-create/services/LineageService';