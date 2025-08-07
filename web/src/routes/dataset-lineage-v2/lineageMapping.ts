// @ts-nocheck
import { Node, Edge } from '@xyflow/react';
import { LineageGraph } from '../../types/api';
import { JobOrDataset, LineageDataset, LineageJob, LineageNode } from '../../types/lineage';
import { Nullable } from '../../types/util/Nullable';

export interface LineageNodeData {
  label: string;
  type: JobOrDataset;
  dataset?: LineageDataset;
  job?: LineageJob;
}

/**
 * Convert Marquez lineage data to ReactFlow nodes and edges
 */
export const createReactFlowElements = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string> = null,
  isFull: boolean = false
) => {
  const nodes: Node<LineageNodeData>[] = [];
  const edges: Edge[] = [];

  // Filter graph based on whether we want full lineage or focused on current node
  let filteredGraph = lineageGraph.graph;
  
  if (!isFull && currentGraphNode) {
    const downstreamNodes = findDownstreamNodes(lineageGraph, currentGraphNode);
    const upstreamNodes = findUpstreamNodes(lineageGraph, currentGraphNode);
    
    filteredGraph = lineageGraph.graph.filter((node) => {
      return (
        downstreamNodes.includes(node) || 
        upstreamNodes.includes(node) || 
        node.id === currentGraphNode
      );
    });
  }

  // Create ReactFlow nodes
  for (const node of filteredGraph) {
    if (node.type === 'JOB') {
      const jobData = node.data as LineageJob;
      nodes.push({
        id: node.id,
        type: 'custom',
        position: { x: 0, y: 0 }, // Will be set by ELK layout
        style: { width: 150, height: 40 },
        data: {
          label: jobData.simpleName || jobData.name,
          type: 'JOB',
          job: jobData,
        },
      });
    } else if (node.type === 'DATASET') {
      const datasetData = node.data as LineageDataset;
      nodes.push({
        id: node.id,
        type: 'custom',
        position: { x: 0, y: 0 }, // Will be set by ELK layout
        style: { width: 150, height: 40 },
        data: {
          label: datasetData.name,
          type: 'DATASET',
          dataset: datasetData,
        },
      });
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
        }))
    );
  }

  return { nodes, edges };
};

/**
 * Find all downstream nodes from the current node
 */
export const findDownstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>
): LineageNode[] => {
  if (!currentGraphNode) return [];
  const currentNode = lineageGraph.graph.find((node) => node.id === currentGraphNode);
  if (!currentNode) return [];
  
  const connectedNodes: LineageNode[] = [];
  const visitedNodes: string[] = [];
  const queue: LineageNode[] = [currentNode];

  while (queue.length) {
    const currentNode = queue.shift();
    if (!currentNode) continue;
    if (visitedNodes.includes(currentNode.id)) continue;
    
    visitedNodes.push(currentNode.id);
    connectedNodes.push(currentNode);
    
    queue.push(
      ...currentNode.outEdges
        .map((edge) => lineageGraph.graph.find((n) => n.id === edge.destination))
        .filter((item): item is LineageNode => !!item)
    );
  }
  
  return connectedNodes;
};

/**
 * Find all upstream nodes from the current node
 */
export const findUpstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>
): LineageNode[] => {
  if (!currentGraphNode) return [];
  const currentNode = lineageGraph.graph.find((node) => node.id === currentGraphNode);
  if (!currentNode) return [];
  
  const connectedNodes: LineageNode[] = [];
  const visitedNodes: string[] = [];
  const queue: LineageNode[] = [currentNode];

  while (queue.length) {
    const currentNode = queue.shift();
    if (!currentNode) continue;
    if (visitedNodes.includes(currentNode.id)) continue;
    
    visitedNodes.push(currentNode.id);
    connectedNodes.push(currentNode);
    
    queue.push(
      ...currentNode.inEdges
        .map((edge) => lineageGraph.graph.find((n) => n.id === edge.origin))
        .filter((item): item is LineageNode => !!item)
    );
  }
  
  return connectedNodes;
};