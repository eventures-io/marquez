// @ts-nocheck
import { Node, Edge } from '@xyflow/react';
import { LineageGraph } from '../../types/api';
import { JobOrDataset, LineageDataset, LineageJob, LineageNode } from '../../types/lineage';
import { Nullable } from '../../types/util/Nullable';

export interface TableLevelNodeData {
  label: string;
  type: JobOrDataset;
  dataset?: LineageDataset;
  job?: LineageJob;
  isCompact?: boolean;
  id?: string;
}

/**
 * Convert Marquez lineage data to ReactFlow nodes and edges for table-level view
 */
export const createTableLevelElements = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string> = null,
  isCompact: boolean = false,
  isFull: boolean = true, // Force to true for debugging
  collapsedNodes: Nullable<string> = null
) => {
  console.log('=== createTableLevelElements DEBUG ===');
  console.log('Input parameters:', {
    graphSize: lineageGraph.graph.length,
    currentGraphNode,
    isCompact,
    isFull,
    collapsedNodes
  });
  console.log('Full lineage graph:', lineageGraph);

  const nodes: Node<TableLevelNodeData>[] = [];
  const edges: Edge[] = [];

  // TEMPORARILY: Always use full graph for debugging
  let filteredGraph = lineageGraph.graph;
  
  console.log('Using full graph - nodes:', filteredGraph.map(n => ({ id: n.id, type: n.type })));
  
  // Skip filtering for now to debug
  // if (!isFull && currentGraphNode) {
  //   ...filtering logic...
  // }

  // Parse collapsed nodes
  const collapsedNodesArray = collapsedNodes ? collapsedNodes.split(',') : [];
  
  // Create ReactFlow nodes
  for (const node of filteredGraph) {
    const isNodeCompact = isCompact || collapsedNodesArray.includes(node.id);
    
    console.log('Processing node:', node.id, node.type, node.data);
    
    if (node.type === 'JOB') {
      const jobData = node.data as LineageJob;
      const newNode = {
        id: node.id,
        type: 'tableLevel',
        position: { x: 0, y: 0 }, // Will be set by ELK layout
        style: { 
          width: isNodeCompact ? 112 : 150, 
          height: 24
        },
        data: {
          label: jobData.simpleName || jobData.name,
          type: 'JOB',
          job: jobData,
          isCompact: isNodeCompact,
          id: node.id,
        },
      };
      console.log('Created JOB node:', newNode);
      nodes.push(newNode);
    } else if (node.type === 'DATASET') {
      const datasetData = node.data as LineageDataset;
      const height = isNodeCompact || collapsedNodesArray.includes(node.id) 
        ? 24 
        : Math.min(34 + (datasetData.fields?.length || 0) * 10, 120); // Cap height

      const newNode = {
        id: node.id,
        type: 'tableLevel',
        position: { x: 0, y: 0 }, // Will be set by ELK layout
        style: { 
          width: isNodeCompact ? 112 : 150, 
          height: height
        },
        data: {
          label: datasetData.name,
          type: 'DATASET',
          dataset: datasetData,
          isCompact: isNodeCompact,
          id: node.id,
        },
      };
      console.log('Created DATASET node:', newNode);
      nodes.push(newNode);
    } else {
      console.log('Unknown node type:', node.type);
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
            stroke: node.id === currentGraphNode || 
                   filteredGraph.find(n => n.id === edge.destination)?.id === currentGraphNode
              ? '#1976d2' 
              : '#bbb',
            strokeWidth: 2,
          },
        }))
    );
  }

  console.log('Final result:', { nodes: nodes.length, edges: edges.length });
  console.log('Nodes array:', nodes);
  console.log('Edges array:', edges);
  
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