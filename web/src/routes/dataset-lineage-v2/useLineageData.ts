import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { LineageData, LineageNodeData, NodeType, DatasetType, JobType } from '@app-types';

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

  const deleteNode = useCallback((nodeId: string) => {
    console.log('deleteNode called with nodeId:', nodeId);
    
    setLineageData(prev => {
      console.log('Current nodes before delete:', Array.from(prev.nodes.keys()));
      const newNodes = new Map(prev.nodes);
      const newEdges = new Map(prev.edges);
      
      // Remove the primary node
      const nodeExisted = newNodes.has(nodeId);
      newNodes.delete(nodeId);
      console.log('Node existed:', nodeExisted, 'Remaining nodes:', Array.from(newNodes.keys()));
      
      // Remove all edges connected to this node and track result datasets
      const edgesToDelete = [];
      const resultDatasets = new Set<string>(); // Only target nodes (results)
      
      for (const [edgeId, edge] of newEdges.entries()) {
        if (edge.source === nodeId || edge.target === nodeId) {
          edgesToDelete.push(edgeId);
          newEdges.delete(edgeId);
          // Only track target nodes as potential candidates for deletion (result datasets)
          if (edge.source === nodeId) {
            resultDatasets.add(edge.target);
          }
          // Note: we do NOT add edge.source when edge.target === nodeId
          // because those are input datasets that should remain
        }
      }
      console.log('Deleted edges:', edgesToDelete);
      console.log('Result datasets that might be orphaned:', Array.from(resultDatasets));
      
      // Check for orphaned result dataset nodes (nodes with no remaining connections)
      const orphanedNodes = [];
      for (const datasetId of resultDatasets) {
        const hasConnections = Array.from(newEdges.values()).some(edge => 
          edge.source === datasetId || edge.target === datasetId
        );
        
        if (!hasConnections) {
          const node = newNodes.get(datasetId);
          // Only auto-delete dataset nodes that were results of the deleted job
          if (node && node.type === NodeType.DATASET) {
            orphanedNodes.push(datasetId);
            newNodes.delete(datasetId);
          }
        }
      }
      
      if (orphanedNodes.length > 0) {
        console.log('Deleted orphaned result dataset nodes:', orphanedNodes);
      }
      
      return {
        nodes: newNodes,
        edges: newEdges,
      };
    });
    
    // Clean up positions for the primary node (orphaned positions will be cleaned up on next render)
    setNodePositions(prev => {
      const newPositions = new Map(prev);
      newPositions.delete(nodeId);
      return newPositions;
    });
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
          id: { namespace: '', name: '' },
          name: '',
          namespace: '',
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

      updateNode('dataset-1', initialDatasetData);
      updateNodePosition('dataset-1', { x: 50, y: 300 });
    }
    return toReactFlowFormat(handleNodeClick);
  }, [lineageData.nodes.size, updateNode, updateNodePosition, toReactFlowFormat]);

  const createJobNode = useCallback((id: string, position: { x: number; y: number }, namespace = '') => {
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

  const createDatasetNode = useCallback((id: string, position: { x: number; y: number }, namespace = '') => {
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
    nodePositions,
    updateNode,
    deleteNode,
    updateNodePosition,
    addEdge,
    getNode,
    toReactFlowFormat,
    initializeWithDefaults,
    createJobNode,
    createDatasetNode,
  };
};
