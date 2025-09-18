import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';

// Column lineage data structures
export interface ColumnLineageNodeData {
  id: string;
  type: 'dataset-container' | 'column-field';
  data: {
    id: string;
    namespace?: string;
    name?: string;
    fieldName?: string;
    dataType?: string;
    datasetName?: string;
    parentDatasetId?: string;
    description?: string;
    isHighlighted?: boolean;
    onNodeClick?: (nodeId: string, nodeData: any) => void;
  };
}

export interface ColumnLineageEdgeData {
  id: string;
  source: string;
  target: string;
}

export interface ColumnLineageData {
  nodes: Map<string, ColumnLineageNodeData>;
  edges: Map<string, ColumnLineageEdgeData>;
}

interface UseColumnLineageDataReturn {
  columnLineageData: ColumnLineageData;
  nodePositions: Map<string, { x: number; y: number }>;
  updateColumnNode: (nodeId: string, nodeData: ColumnLineageNodeData) => void;
  deleteColumnNode: (nodeId: string) => void;
  updateColumnNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addColumnEdge: (edgeId: string, source: string, target: string) => void;
  deleteColumnEdge: (edgeId: string) => void;
  getColumnNode: (nodeId: string) => ColumnLineageNodeData | undefined;
  toColumnReactFlowFormat: (onNodeClick: (nodeId: string, nodeData: any) => void) => { nodes: Node[], edges: Edge[] };
  createColumnDatasetNode: (id: string, position: { x: number; y: number }, namespace: string) => void;
  createColumnFieldNode: (id: string, position: { x: number; y: number }, namespace: string, datasetName: string, parentDatasetId: string) => void;
  createColumnDatasetWithFields: (id: string, position: { x: number; y: number }, datasetData: any) => void;
  initializeWithDefaults: (callback: () => void) => void;
  previewCascadeDelete: (nodeId: string) => { isRootNode: boolean; affectedNodes: string[] };
}

export const useColumnLineageData = (): UseColumnLineageDataReturn => {
  const [columnLineageData, setColumnLineageData] = useState<ColumnLineageData>({
    nodes: new Map(),
    edges: new Map(),
  });
  
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const updateColumnNode = useCallback((nodeId: string, nodeData: ColumnLineageNodeData) => {
    setColumnLineageData(prev => ({
      ...prev,
      nodes: new Map(prev.nodes.set(nodeId, nodeData)),
    }));
  }, []);

  const deleteColumnNode = useCallback((nodeId: string) => {
    setColumnLineageData(prev => {
      const newNodes = new Map(prev.nodes);
      const newEdges = new Map(prev.edges);
      
      // Remove the node
      newNodes.delete(nodeId);
      
      // Remove all edges connected to this node
      for (const [edgeId, edge] of newEdges) {
        if (edge.source === nodeId || edge.target === nodeId) {
          newEdges.delete(edgeId);
        }
      }
      
      return { nodes: newNodes, edges: newEdges };
    });
    
    // Remove node position
    setNodePositions(prev => {
      const newPositions = new Map(prev);
      newPositions.delete(nodeId);
      return newPositions;
    });
  }, []);

  const updateColumnNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodePositions(prev => new Map(prev.set(nodeId, position)));
  }, []);

  const addColumnEdge = useCallback((edgeId: string, source: string, target: string) => {
    const edgeData: ColumnLineageEdgeData = {
      id: edgeId,
      source,
      target,
    };
    
    setColumnLineageData(prev => ({
      ...prev,
      edges: new Map(prev.edges.set(edgeId, edgeData)),
    }));
  }, []);

  const deleteColumnEdge = useCallback((edgeId: string) => {
    setColumnLineageData(prev => {
      const newEdges = new Map(prev.edges);
      newEdges.delete(edgeId);
      return { ...prev, edges: newEdges };
    });
  }, []);

  const getColumnNode = useCallback((nodeId: string): ColumnLineageNodeData | undefined => {
    return columnLineageData.nodes.get(nodeId);
  }, [columnLineageData.nodes]);

  const getColumnCountForDataset = useCallback((datasetId: string): number => {
    let count = 0;
    for (const [, node] of columnLineageData.nodes) {
      if (node.type === 'column-field' && node.data.parentDatasetId === datasetId) {
        count++;
      }
    }
    return count;
  }, [columnLineageData.nodes]);

  const toColumnReactFlowFormat = useCallback((onNodeClick: (nodeId: string, nodeData: any) => void) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Convert nodes
    for (const [nodeId, nodeData] of columnLineageData.nodes) {
      const position = nodePositions.get(nodeId) || { x: 0, y: 0 };
      
      const reactFlowNode: Node = {
        id: nodeId,
        type: nodeData.type,
        position,
        data: {
          ...nodeData.data,
          onNodeClick,
        },
        style: {
          width: nodeData.type === 'dataset-container' ? 300 : 220,
          height: nodeData.type === 'dataset-container' ? 
            Math.max(150, 120 + (getColumnCountForDataset(nodeId) * 60)) : 50,
          zIndex: nodeData.type === 'dataset-container' ? -1 : 1,
        },
      };

      // Configure dragging and parent-child relationships
      if (nodeData.type === 'dataset-container') {
        // Dataset containers are draggable
        reactFlowNode.draggable = true;
      } else if (nodeData.type === 'column-field') {
        // Column fields are children of dataset containers
        reactFlowNode.parentId = nodeData.data.parentDatasetId;
        reactFlowNode.extent = 'parent';
        reactFlowNode.draggable = false;
      }
      
      nodes.push(reactFlowNode);
    }

    // Convert edges
    for (const [, edgeData] of columnLineageData.edges) {
      const reactFlowEdge: Edge = {
        id: edgeData.id,
        source: edgeData.source,
        target: edgeData.target,
        type: 'default',
      };
      
      edges.push(reactFlowEdge);
    }

    return { nodes, edges };
  }, [columnLineageData, nodePositions, getColumnCountForDataset]);

  const createColumnDatasetNode = useCallback((id: string, position: { x: number; y: number }, namespace: string) => {
    const nodeData: ColumnLineageNodeData = {
      id,
      type: 'dataset-container',
      data: {
        id,
        namespace,
        name: '',
      },
    };
    
    updateColumnNode(id, nodeData);
    updateColumnNodePosition(id, position);
  }, [updateColumnNode, updateColumnNodePosition]);

  const createColumnFieldNode = useCallback((
    id: string, 
    position: { x: number; y: number }, 
    namespace: string, 
    datasetName: string, 
    parentDatasetId: string
  ) => {
    const nodeData: ColumnLineageNodeData = {
      id,
      type: 'column-field',
      data: {
        id,
        namespace,
        datasetName,
        fieldName: '',
        dataType: 'string',
        parentDatasetId,
      },
    };
    
    updateColumnNode(id, nodeData);
    updateColumnNodePosition(id, position);
  }, [updateColumnNode, updateColumnNodePosition]);

  const createColumnDatasetWithFields = useCallback((
    id: string, 
    position: { x: number; y: number }, 
    datasetData: any
  ) => {
    // Create dataset container node
    const datasetNodeData: ColumnLineageNodeData = {
      id,
      type: 'dataset-container',
      data: {
        id,
        namespace: datasetData.dataset.namespace,
        name: datasetData.dataset.name,
        description: datasetData.dataset.description,
      },
    };
    
    updateColumnNode(id, datasetNodeData);
    updateColumnNodePosition(id, position);

    // Create column field nodes for each field
    if (datasetData.dataset.fields && datasetData.dataset.fields.length > 0) {
      datasetData.dataset.fields.forEach((field: any, index: number) => {
        const fieldId = `${id}-field-${index}`;
        const fieldNodeData: ColumnLineageNodeData = {
          id: fieldId,
          type: 'column-field',
          data: {
            id: fieldId,
            namespace: datasetData.dataset.namespace,
            datasetName: datasetData.dataset.name,
            fieldName: field.name,
            dataType: field.type,
            parentDatasetId: id,
          },
        };
        
        updateColumnNode(fieldId, fieldNodeData);
        // Position columns relative to parent (dataset container)
        updateColumnNodePosition(fieldId, { 
          x: 40,  // Relative to parent dataset container
          y: 80 + (index * 60)  // Relative to parent dataset container
        });
      });
    }
  }, [updateColumnNode, updateColumnNodePosition]);

  const initializeWithDefaults = useCallback((callback: () => void) => {
    // Create initial dataset
    const initialDatasetData: ColumnLineageNodeData = {
      id: 'initial-dataset',
      type: 'dataset-container',
      data: {
        id: 'initial-dataset',
        namespace: '',
        name: '',
      },
    };
    
    updateColumnNode('initial-dataset', initialDatasetData);
    callback();
  }, [updateColumnNode]);

  const previewCascadeDelete = useCallback((nodeId: string) => {
    const isRootNode = nodeId === 'initial-dataset';
    const affectedNodes: string[] = [nodeId];
    
    // For column-level, if we delete a dataset, we also delete its columns
    if (columnLineageData.nodes.get(nodeId)?.type === 'dataset-container') {
      for (const [id, node] of columnLineageData.nodes) {
        if (node.type === 'column-field' && node.data.parentDatasetId === nodeId) {
          affectedNodes.push(id);
        }
      }
    }
    
    return { isRootNode, affectedNodes };
  }, [columnLineageData.nodes]);

  return {
    columnLineageData,
    nodePositions,
    updateColumnNode,
    deleteColumnNode,
    updateColumnNodePosition,
    addColumnEdge,
    deleteColumnEdge,
    getColumnNode,
    toColumnReactFlowFormat,
    createColumnDatasetNode,
    createColumnFieldNode,
    createColumnDatasetWithFields,
    initializeWithDefaults,
    previewCascadeDelete,
  };
};