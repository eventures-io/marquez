import { Node, Edge } from '@xyflow/react';
import { LineageGraph, LineageDataset, LineageJob, LineageNode, NodeType, Nullable } from '@app-types';

export interface TableLevelNodeData {
  label: string;
  type: NodeType;
  dataset?: LineageDataset;
  job?: LineageJob;
  isCompact?: boolean;
  id?: string;
  [key: string]: unknown;
}

/**
 * Convert Marquez lineage data to ReactFlow nodes and edges for table-level view
 */
export const createTableLevelElements = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string> = null,
  isCompact: boolean = false,
  isFull: boolean = false, // Default to filtered view like original
  collapsedNodes: Nullable<string> = null
) => {

  const nodes: Node<TableLevelNodeData>[] = [];
  const edges: Edge[] = [];

  // Get downstream and upstream nodes if not showing full lineage
  let filteredGraph: LineageNode[];
  
  if (isFull) {
    filteredGraph = lineageGraph.graph;
  } else {
    // Filter to show only directly connected nodes (like original table-level)
    const downstreamNodes = findDownstreamNodes(lineageGraph, currentGraphNode);
    const upstreamNodes = findUpstreamNodes(lineageGraph, currentGraphNode);
    
    filteredGraph = lineageGraph.graph.filter((node: LineageNode) => {
      return (
        downstreamNodes.includes(node) || 
        upstreamNodes.includes(node) || 
        node.id === currentGraphNode
      );
    });
    
  }

  // Parse collapsed nodes
  const collapsedNodesArray = collapsedNodes ? collapsedNodes.split(',') : [];
  
  // Create ReactFlow nodes
  for (const node of filteredGraph) {
    const isNodeCompact = isCompact || collapsedNodesArray.includes(node.id);
    
    
    if (node.type === NodeType.JOB) {
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
          type: NodeType.JOB,
          job: jobData,
          isCompact: isNodeCompact,
          id: node.id,
        },
      };
      nodes.push(newNode);
    } else if (node.type === NodeType.DATASET) {
      const datasetData = node.data as LineageDataset;
      const height = isNodeCompact || collapsedNodesArray.includes(node.id) 
        ? 24 
        : Math.max(60, Math.min(34 + (datasetData.fields?.length || 0) * 12, 150)); // Min 60px, cap at 150px
      

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
          type: NodeType.DATASET,
          dataset: datasetData,
          isCompact: isNodeCompact,
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

/**
 * Find all downstream nodes from the current node
 */
export const findDownstreamNodes = (
  lineageGraph: LineageGraph,
  currentGraphNode: Nullable<string>
): LineageNode[] => {
  if (!currentGraphNode) return [];
  const currentNode = lineageGraph.graph.find((node: LineageNode) => node.id === currentGraphNode);
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
        .map((edge) => lineageGraph.graph.find((n: LineageNode) => n.id === edge.destination))
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
  const currentNode = lineageGraph.graph.find((node: LineageNode) => node.id === currentGraphNode);
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
        .map((edge) => lineageGraph.graph.find((n: LineageNode) => n.id === edge.origin))
        .filter((item): item is LineageNode => !!item)
    );
  }
  
  return connectedNodes;
};