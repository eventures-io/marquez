import { Node, Edge } from '@xyflow/react';
import { LineageGraph, LineageDataset, LineageJob, LineageNode, NodeType } from '@app-types';

export interface TableLevelNodeData {
  label: string;
  type: NodeType;
  dataset?: LineageDataset;
  job?: LineageJob;
  id?: string;
  [key: string]: unknown;
}

/**
 * Convert Marquez lineage data to ReactFlow nodes and edges for table-level view
 */
export const createTableLevelElements = (
  lineageGraph: LineageGraph
) => {

  const nodes: Node<TableLevelNodeData>[] = [];
  const edges: Edge[] = [];

  const filteredGraph: LineageNode[] = lineageGraph.graph;
  
  // Create ReactFlow nodes
  for (const node of filteredGraph) {
    if (node.type === NodeType.JOB) {
      const jobData = node.data as LineageJob;
      // Map API fields to expected interface
      // TODO copy to new code base
      const mappedJobData = {
        ...jobData,
        sourceCodeLocation: jobData.location, // Map location to sourceCodeLocation
        sourceCode: jobData.transformationCode, // Map transformationCode to sourceCode
      };
      const newNode = {
        id: node.id,
        type: 'tableLevel',
        position: { x: 0, y: 0 }, // Will be set by ELK layout
        style: { width: 150, height: 24 },
        data: {
          label: jobData.simpleName || jobData.name,
          type: NodeType.JOB,
          job: mappedJobData,
          id: node.id,
        },
      };
      nodes.push(newNode);
    } else if (node.type === NodeType.DATASET) {
      const datasetData = node.data as LineageDataset;
      const height = Math.max(60, Math.min(34 + (datasetData.fields?.length || 0) * 12, 150)); // Min 60px, cap at 150px
      

      const newNode = {
        id: node.id,
        type: 'tableLevel',
        position: { x: 0, y: 0 }, // Will be set by ELK layout
        style: { width: 150, height },
        data: {
          label: datasetData.name,
          type: NodeType.DATASET,
          dataset: datasetData,
          id: node.id,
        },
      };
      nodes.push(newNode);
    } else {
    }

    // Create ReactFlow edges
    edges.push(
      ...node.outEdges
        .filter((edge) => filteredGraph.find((n) => n.id === edge.destination))
        .map((edge) => ({
          id: `${edge.origin}-${edge.destination}`,
          source: edge.origin,
          target: edge.destination,
          type: 'default',
          style: {
            stroke: '#bbb',
            strokeWidth: 2,
          },
        }))
    );
  }

  
  return { nodes, edges };
};
