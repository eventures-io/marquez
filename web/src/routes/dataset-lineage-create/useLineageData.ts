import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { NodeType, LineageDataset, LineageJob } from '../../types/lineage';

export interface LineageNodeData {
  id: string;
  label: string;
  type: NodeType;
  dataset?: LineageDataset;
  job?: LineageJob;
}

export interface LineageData {
  nodes: Map<string, LineageNodeData>;
  edges: Map<string, { id: string; source: string; target: string }>;
}

export const useLineageData = () => {
  const [lineageData, setLineageData] = useState<LineageData>({
    nodes: new Map(),
    edges: new Map(),
  });

  // Add or update a node in the lineage data
  const updateNode = useCallback((nodeId: string, nodeData: LineageNodeData) => {
    setLineageData(prev => ({
      ...prev,
      nodes: new Map(prev.nodes).set(nodeId, nodeData),
    }));
  }, []);

  // Add an edge to the lineage data
  const addEdge = useCallback((edgeId: string, source: string, target: string) => {
    setLineageData(prev => ({
      ...prev,
      edges: new Map(prev.edges).set(edgeId, { id: edgeId, source, target }),
    }));
  }, []);

  // Get a node from lineage data
  const getNode = useCallback((nodeId: string): LineageNodeData | undefined => {
    return lineageData.nodes.get(nodeId);
  }, [lineageData.nodes]);

  // Store node positions
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Update node position
  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodePositions(prev => new Map(prev).set(nodeId, position));
  }, []);

  // Convert lineage data to ReactFlow format
  const toReactFlowFormat = useCallback((handleNodeClick: (nodeId: string, nodeData: LineageNodeData) => void) => {
    const nodes: Node[] = Array.from(lineageData.nodes.entries()).map(([id, data]) => ({
      id,
      type: 'tableLevel',
      position: nodePositions.get(id) || { x: 250, y: 100 },
      data: {
        ...data,
        onNodeClick: (nodeId: string) => handleNodeClick(nodeId, data),
      },
    }));

    const edges: Edge[] = Array.from(lineageData.edges.values()).map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    return { nodes, edges };
  }, [lineageData, nodePositions]);

  // Initialize with default data
  const initializeWithDefaults = useCallback((handleNodeClick: (nodeId: string, nodeData: LineageNodeData) => void) => {
    // Only initialize if there are no nodes yet
    if (lineageData.nodes.size === 0) {
      const initialDatasetData: LineageNodeData = {
        id: 'dataset-1',
        label: 'Initial Dataset',
        type: NodeType.DATASET,
        dataset: {
          id: { namespace: 'example', name: 'initial_dataset' },
          name: 'initial_dataset',
          namespace: 'example',
          type: 'DB_TABLE' as const,
          physicalName: 'example.initial_dataset',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sourceName: 'example_source',
          fields: [],
          facets: {},
          tags: [],
          lastModifiedAt: new Date().toISOString(),
          description: 'Initial dataset for lineage creation'
        }
      };

      updateNode('dataset-1', initialDatasetData);
      updateNodePosition('dataset-1', { x: 250, y: 100 });
    }
    return toReactFlowFormat(handleNodeClick);
  }, [lineageData.nodes.size, updateNode, updateNodePosition, toReactFlowFormat]);

  // Create a new job node
  const createJobNode = useCallback((id: string, position: { x: number; y: number }) => {
    const jobData: LineageNodeData = {
      id,
      label: `Job ${id}`,
      type: NodeType.JOB,
      job: {
        id: { namespace: 'example', name: id },
        name: id,
        namespace: 'example',
        type: 'BATCH' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inputs: [],
        outputs: [],
        location: 'example://job',
        description: `Job ${id} created via drag and drop`,
        simpleName: id,
        latestRun: null,
        parentJobName: null,
        parentJobUuid: null
      }
    };

    updateNode(id, jobData);
    updateNodePosition(id, position);
    return jobData;
  }, [updateNode, updateNodePosition]);

  // Create a new dataset node
  const createDatasetNode = useCallback((id: string, position: { x: number; y: number }) => {
    const datasetData: LineageNodeData = {
      id,
      label: `Dataset ${id}`,
      type: NodeType.DATASET,
      dataset: {
        id: { namespace: 'example', name: id },
        name: id,
        namespace: 'example',
        type: 'DB_TABLE' as const,
        physicalName: `example.${id}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceName: 'example_source',
        fields: [],
        facets: {},
        tags: [],
        lastModifiedAt: new Date().toISOString(),
        description: `Dataset ${id} created via drag and drop`
      }
    };

    updateNode(id, datasetData);
    updateNodePosition(id, position);
    return datasetData;
  }, [updateNode, updateNodePosition]);

  return {
    lineageData,
    updateNode,
    updateNodePosition,
    addEdge,
    getNode,
    toReactFlowFormat,
    initializeWithDefaults,
    createJobNode,
    createDatasetNode,
  };
};