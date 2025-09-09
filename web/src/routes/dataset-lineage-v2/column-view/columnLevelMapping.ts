import { Node, Edge } from '@xyflow/react';

// Column lineage API response types (based on original implementation)
interface ColumnLineageNode {
  id: string;
  data: {
    namespace: string;
    dataset: string;
    field: string;
    type?: string;
    description?: string;
  };
  inEdges: Array<{
    origin: string;
    destination: string;
  }>;
  outEdges: Array<{
    origin: string;
    destination: string;
  }>;
}

interface ColumnLineageGraph {
  graph: ColumnLineageNode[];
}

interface DatasetGroup {
  namespace: string;
  dataset: string;
  columns: ColumnLineageNode[];
}

// Transform column lineage API response to React Flow format
export const createColumnLevelElements = (
  columnLineageData: ColumnLineageGraph,
  selectedColumn?: string
): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  if (!columnLineageData?.graph) {
    return { nodes, edges };
  }

  // Group columns by dataset
  const datasetGroups: Map<string, DatasetGroup> = new Map();
  
  columnLineageData.graph.forEach(node => {
    const datasetKey = `${node.data.namespace}:${node.data.dataset}`;
    
    if (!datasetGroups.has(datasetKey)) {
      datasetGroups.set(datasetKey, {
        namespace: node.data.namespace,
        dataset: node.data.dataset,
        columns: []
      });
    }
    
    datasetGroups.get(datasetKey)!.columns.push(node);
  });

  // Create nodes for each dataset group - let ELK handle positioning
  datasetGroups.forEach((group, datasetKey) => {
    // Create dataset container node
    const datasetNode: Node = {
      id: `dataset:${datasetKey}`,
      type: 'dataset-container',
      position: { x: 0, y: 0 }, // ELK will position this
      data: {
        id: `dataset:${datasetKey}`,
        namespace: group.namespace,
        name: group.dataset,
        type: 'DATASET',
        columnCount: group.columns.length,
      },
      style: {
        width: 300,
        height: Math.max(120, 60 + group.columns.length * 60 + 40), // Extra height for spacing and bottom padding
        zIndex: -1, // Behind edges and column fields
      }
    };
    
    nodes.push(datasetNode);
    
    // Create column nodes - ELK will position relative to dataset
    group.columns.forEach((column) => {
      const columnNode: Node = {
        id: column.id,
        type: 'column-field',
        position: { x: 0, y: 0 }, // ELK will position this
        data: {
          id: column.id,
          fieldName: column.data.field,
          dataType: column.data.type,
          namespace: column.data.namespace,
          datasetName: column.data.dataset,
          description: column.data.description,
          parentDatasetId: `dataset:${datasetKey}`,
          isHighlighted: selectedColumn === column.id,
        },
        // parentId and extent removed - we handle positioning manually in ELK layout
        style: {
          width: 220,
          height: 50,
          zIndex: 1, // Above dataset containers and edges
        }
      };
      
      nodes.push(columnNode);
    });
  });

  // Create edges between columns
  columnLineageData.graph.forEach(node => {
    node.outEdges.forEach(edge => {
      const edgeId = `${edge.origin}-${edge.destination}`;
      
      // Determine if this edge is part of the highlighted path
      const isHighlighted = selectedColumn && 
        (edge.origin === selectedColumn || edge.destination === selectedColumn);
      
      const reactFlowEdge: Edge = {
        id: edgeId,
        source: edge.origin,
        target: edge.destination,
        type: 'default',
        style: {
          stroke: isHighlighted ? '#1976d2' : '#999',
          strokeWidth: isHighlighted ? 3 : 2,
        },
        animated: isHighlighted || false,
      };
      
      edges.push(reactFlowEdge);
    });
  });

  return { nodes, edges };
};

// Parse column lineage node ID format: "datasetField:namespace:dataset:column"
export const parseColumnLineageNode = (nodeId: string) => {
  const parts = nodeId.split(':');
  if (parts.length < 4) {
    return { type: '', namespace: '', dataset: '', column: '' };
  }
  
  const [type, namespace, dataset, ...columnParts] = parts;
  return {
    type,
    namespace,
    dataset,
    column: columnParts.join(':'), // Handle column names with colons
  };
};

// Find connected nodes for highlighting lineage paths
export const findConnectedColumnPath = (
  columnLineageData: ColumnLineageGraph,
  selectedColumnId: string
): string[] => {
  if (!columnLineageData?.graph || !selectedColumnId) {
    return [];
  }

  const visited = new Set<string>();
  const path: string[] = [];
  
  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    
    visited.add(nodeId);
    path.push(nodeId);
    
    const node = columnLineageData.graph.find(n => n.id === nodeId);
    if (!node) return;
    
    // Traverse upstream (inEdges)
    node.inEdges.forEach(edge => {
      if (!visited.has(edge.origin)) {
        traverse(edge.origin);
      }
    });
    
    // Traverse downstream (outEdges)
    node.outEdges.forEach(edge => {
      if (!visited.has(edge.destination)) {
        traverse(edge.destination);
      }
    });
  };
  
  traverse(selectedColumnId);
  return path;
};