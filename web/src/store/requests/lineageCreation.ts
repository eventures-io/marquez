// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { LineageService } from '../../routes/dataset-lineage-create/services/LineageService';
import { LineageDataTransformer } from '../../routes/dataset-lineage-create/services/LineageDataTransformer';
import { LineageData } from '../../routes/dataset-lineage-create/useLineageData';

/**
 * Save complete lineage by delegating to the service layer
 */
export const saveCompleteLineage = async (lineageData: LineageData): Promise<void> => {
  const serviceData = LineageDataTransformer.hookToService(lineageData);
  return await LineageService.saveCompleteLineage(serviceData);
};

/**
 * Validate lineage for save by delegating to the service layer
 */
export const validateLineageForSave = (lineageData: LineageData): string[] => {
  const serviceData = LineageDataTransformer.hookToService(lineageData);
  return LineageService.validateLineageForSave(serviceData);
};

// Re-export for backward compatibility if needed
export { LineageService } from '../../routes/dataset-lineage-create/services/LineageService';
export { LineageDataTransformer } from '../../routes/dataset-lineage-create/services/LineageDataTransformer';