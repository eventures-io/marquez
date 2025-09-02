import { NodeType } from '@app-types';

export interface NodeStyleDims { width: number; height: number }


export const computeNodeStyleFromData = (data: any): NodeStyleDims => {
  const width = 150;

  try {
    const type = data?.type;
    if (type === NodeType.JOB) {
      return { width, height: 24 };
    }
    if (type === NodeType.DATASET) {
      const fieldsCount = Array.isArray(data?.dataset?.fields) ? data.dataset.fields.length : 0;
      const height = Math.max(60, Math.min(34 + fieldsCount * 12, 150));
      return { width, height };
    }
  } catch {
    // fall through to default
  }

  return { width, height: 40 };
};

