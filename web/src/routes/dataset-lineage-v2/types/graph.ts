import { NodeType, LineageDataset, LineageJob } from './lineage';

export interface LineageNodeData {
  id: string;
  label: string;
  type: NodeType;
  dataset?: LineageDataset;
  job?: LineageJob;
}

export interface LineageEdgeData {
  id: string;
  source: string;
  target: string;
}

export interface LineageData {
  nodes: Map<string, LineageNodeData>;
  edges: Map<string, LineageEdgeData>;
}