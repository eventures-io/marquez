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
      
      // Recursively find all nodes that should be deleted due to cascade
      const nodesToDelete = new Set<string>();
      const findCascadingDeletes = (currentNodeId: string) => {
        if (nodesToDelete.has(currentNodeId)) return;
        
        nodesToDelete.add(currentNodeId);
        const node = newNodes.get(currentNodeId);
        
        // Find all downstream nodes (nodes that depend on this one)
        for (const [, edge] of newEdges.entries()) {
          if (edge.source === currentNodeId) {
            const targetNode = newNodes.get(edge.target);
            
            // If this is a job node, cascade delete it and its outputs
            if (targetNode && targetNode.type === NodeType.JOB) {
              findCascadingDeletes(edge.target);
            }
            // If this is a dataset, check if it becomes orphaned
            else if (targetNode && targetNode.type === NodeType.DATASET) {
              // Count how many inputs this dataset will have after deletion
              const remainingInputs = Array.from(newEdges.values()).filter(e => 
                e.target === edge.target && !nodesToDelete.has(e.source)
              ).length;
              
              // If this dataset will have no inputs left, cascade delete it
              if (remainingInputs === 0) {
                findCascadingDeletes(edge.target);
              }
            }
          }
        }
        
        // If the current node is a job, also cascade to its output datasets
        if (node && node.type === NodeType.JOB) {
          for (const [, edge] of newEdges.entries()) {
            if (edge.source === currentNodeId) {
              const targetNode = newNodes.get(edge.target);
              if (targetNode && targetNode.type === NodeType.DATASET) {
                // Check if this output dataset becomes orphaned
                const remainingInputs = Array.from(newEdges.values()).filter(e => 
                  e.target === edge.target && !nodesToDelete.has(e.source)
                ).length;
                
                if (remainingInputs === 0) {
                  findCascadingDeletes(edge.target);
                }
              }
            }
          }
        }
      };
      
      // Start the cascade from the primary node
      findCascadingDeletes(nodeId);
      
      console.log('Cascade delete will remove nodes:', Array.from(nodesToDelete));
      
      // Remove all cascaded nodes
      for (const nodeToDelete of nodesToDelete) {
        newNodes.delete(nodeToDelete);
      }
      
      // Remove all edges that connect to any deleted node
      const edgesToDelete = [];
      for (const [edgeId, edge] of newEdges.entries()) {
        if (nodesToDelete.has(edge.source) || nodesToDelete.has(edge.target)) {
          edgesToDelete.push(edgeId);
          newEdges.delete(edgeId);
        }
      }
      
      console.log('Deleted edges:', edgesToDelete);
      console.log('Remaining nodes:', Array.from(newNodes.keys()));
      
      return {
        nodes: newNodes,
        edges: newEdges,
      };
    });
    
    // Clean up positions for all deleted nodes (will be handled in the next render cycle)
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

  // Preview what nodes would be deleted by cascading
  const previewCascadeDelete = useCallback((nodeId: string): { isRootNode: boolean; cascadeNodes: Array<{ id: string; name: string; type: string }> } => {
    const nodesToDelete = new Set<string>();
    const findCascadingDeletes = (currentNodeId: string) => {
      if (nodesToDelete.has(currentNodeId)) return;
      
      nodesToDelete.add(currentNodeId);
      const node = lineageData.nodes.get(currentNodeId);
      
      // Find all downstream nodes (nodes that depend on this one)
      for (const [, edge] of lineageData.edges.entries()) {
        if (edge.source === currentNodeId) {
          const targetNode = lineageData.nodes.get(edge.target);
          
          // If this is a job node, cascade delete it and its outputs
          if (targetNode && targetNode.type === NodeType.JOB) {
            findCascadingDeletes(edge.target);
          }
          // If this is a dataset, check if it becomes orphaned
          else if (targetNode && targetNode.type === NodeType.DATASET) {
            // Count how many inputs this dataset will have after deletion
            const remainingInputs = Array.from(lineageData.edges.values()).filter(e => 
              e.target === edge.target && !nodesToDelete.has(e.source)
            ).length;
            
            // If this dataset will have no inputs left, cascade delete it
            if (remainingInputs === 0) {
              findCascadingDeletes(edge.target);
            }
          }
        }
      }
      
      // If the current node is a job, also cascade to its output datasets
      if (node && node.type === NodeType.JOB) {
        for (const [, edge] of lineageData.edges.entries()) {
          if (edge.source === currentNodeId) {
            const targetNode = lineageData.nodes.get(edge.target);
            if (targetNode && targetNode.type === NodeType.DATASET) {
              // Check if this output dataset becomes orphaned
              const remainingInputs = Array.from(lineageData.edges.values()).filter(e => 
                e.target === edge.target && !nodesToDelete.has(e.source)
              ).length;
              
              if (remainingInputs === 0) {
                findCascadingDeletes(edge.target);
              }
            }
          }
        }
      }
    };
    
    findCascadingDeletes(nodeId);
    
    // Remove the primary node from cascade list
    nodesToDelete.delete(nodeId);
    
    // Check if this is a root node (would delete everything)
    const isRootNode = nodesToDelete.size + 1 === lineageData.nodes.size;
    
    // Build cascade node info
    const cascadeNodes = Array.from(nodesToDelete).map(id => {
      const node = lineageData.nodes.get(id);
      return {
        id,
        name: node?.label || node?.dataset?.name || node?.job?.name || id,
        type: node?.type || 'UNKNOWN'
      };
    });
    
    return { isRootNode, cascadeNodes };
  }, [lineageData]);

  return {
    lineageData,
    nodePositions,
    updateNode,
    deleteNode,
    updateNodePosition,
    addEdge,
    getNode,
    previewCascadeDelete,
    toReactFlowFormat,
    initializeWithDefaults,
    createJobNode,
    createDatasetNode,
  };
};
