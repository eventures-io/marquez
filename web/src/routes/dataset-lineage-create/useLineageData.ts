import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { NodeType, JobType, DatasetType, LineageDataset, LineageJob } from '../dataset-lineage-v2/types/lineage';

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


  const updateNode = useCallback((nodeId: string, nodeData: LineageNodeData) => {
    setLineageData(prev => ({
      ...prev,
      nodes: new Map(prev.nodes).set(nodeId, nodeData),
    }));
  }, []);


  const addEdge = useCallback((edgeId: string, source: string, target: string) => {
    setLineageData(prev => ({
      ...prev,
      edges: new Map(prev.edges).set(edgeId, { id: edgeId, source, target }),
    }));
  }, []);


  const getNode = useCallback((nodeId: string): LineageNodeData | undefined => {
    return lineageData.nodes.get(nodeId);
  }, [lineageData.nodes]);

  // Store node positions
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  
  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodePositions(prev => new Map(prev).set(nodeId, position));
  }, []);

  // Convert lineage data to ReactFlow format
  const toReactFlowFormat = useCallback((handleNodeClick: (nodeId: string, nodeData: LineageNodeData) => void) => {
    const nodes: Node[] = Array.from(lineageData.nodes.entries()).map(([id, data]) => ({
      id,
      type: 'tableLevel',
      position: nodePositions.get(id) || { x: 50, y: 300 },
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
          type: DatasetType.DB_TABLE,
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
      updateNodePosition('dataset-1', { x: 50, y: 300 });
    }
    return toReactFlowFormat(handleNodeClick);
  }, [lineageData.nodes.size, updateNode, updateNodePosition, toReactFlowFormat]);

  const createJobNode = useCallback((id: string, position: { x: number; y: number }, namespace = 'example') => {
    const jobData: LineageNodeData = {
      id,
      label: '',
      type: NodeType.JOB,
      job: {
        id: { namespace, name: '' },
        name: '',
        namespace,
        type: JobType.BATCH,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inputs: [],
        outputs: [],
        location: '',
        description: '',
        simpleName: '',
        latestRun: null,
        parentJobName: null,
        parentJobUuid: null
      }
    };

    updateNode(id, jobData);
    updateNodePosition(id, position);
    return jobData;
  }, [updateNode, updateNodePosition]);

  const createDatasetNode = useCallback((id: string, position: { x: number; y: number }, namespace = 'example') => {
    const datasetData: LineageNodeData = {
      id,
      label: '',
      type: NodeType.DATASET,
      dataset: {
        id: { namespace, name: '' },
        name: '',
        namespace,
        type: DatasetType.DB_TABLE,
        physicalName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceName: '',
        fields: [],
        facets: {},
        tags: [],
        lastModifiedAt: new Date().toISOString(),
        description: ''
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