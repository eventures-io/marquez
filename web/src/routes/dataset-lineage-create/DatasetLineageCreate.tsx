// @ts-nocheck
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box } from '@mui/material';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Node,
  Edge,
} from '@xyflow/react';
import TableLevelNode from '../dataset-lineage-v2/TableLevelNode';
import DetailsPane from '../dataset-lineage-v2/DetailsPane';
import { useDrawerState } from './useDrawerState';
import { useLineageData } from './useLineageData';
import EditForm from './EditForm';
import { NodeType } from '../../types/lineage';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  tableLevel: TableLevelNode,
};

let nodeId = 2;
const getJobId = () => `job-${nodeId++}`;
const getDatasetId = () => `dataset-${nodeId++}`;

const HEADER_HEIGHT = 64 + 1;

// Create initial static nodes
const createInitialNodes = (): Node[] => [
  {
    id: 'dataset-1',
    type: 'tableLevel',
    position: { x: 50, y: 300 },
    data: {
      id: 'dataset-1',
      label: 'Initial Dataset',
      type: NodeType.DATASET,
      onNodeClick: () => {}, // Will be replaced dynamically
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
    }
  }
];

const DatasetLineageCreateFlow: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  // Drawer state
  const { isDrawerOpen, selectedNodeId, selectedNodeData, drawerRef, handleNodeClick, handlePaneClick, updateSelectedNodeData } = useDrawerState();
  
  // Lineage data management
  const {
    updateNode,
    updateNodePosition,
    addEdge: addLineageEdge,
    getNode,
    toReactFlowFormat,
    initializeWithDefaults,
    createJobNode,
    createDatasetNode,
  } = useLineageData();
  
  // Initialize nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Track if initial dataset is properly specified
  const [isInitialDatasetConfigured, setIsInitialDatasetConfigured] = useState(false);
  
  // Track if first job node has been created
  const [hasCreatedFirstJob, setHasCreatedFirstJob] = useState(false);

  // Initialize once on mount
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      // Update node click handlers
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onNodeClick: (nodeId: string) => handleNodeClick(nodeId, node.data as any),
            isInitialDatasetConfigured: false, // Initially not configured
            isDragEnabled: false // Initially disabled until configured
          }
        }))
      );
      
      // Initialize lineage data store
      const initialNode = createInitialNodes()[0];
      const nodeData = initialNode.data as any;
      updateNode(initialNode.id, {
        id: nodeData.id,
        label: nodeData.label,
        type: nodeData.type,
        dataset: nodeData.dataset
      });
      updateNodePosition(initialNode.id, { x: 50, y: 300 });
      
      // Auto-open drawer for initial dataset configuration
      handleNodeClick(initialNode.id, nodeData);
    }
  }, []); // Empty dependency array - only run once

  // Update nodes with pulsing handle state when dataset is configured or drawer state changes
  useEffect(() => {
    if (initializedRef.current) {
      setNodes(currentNodes => 
        currentNodes.map(node => {
          // Check if node is configured based on its data
          let isNodeConfigured = false;
          if (node.id === 'dataset-1') {
            isNodeConfigured = isInitialDatasetConfigured;
          } else if (node.data?.type === NodeType.DATASET) {
            // For dataset nodes, check if namespace and name are configured (and not default values)
            const namespace = node.data?.dataset?.namespace?.trim();
            const name = node.data?.dataset?.name?.trim();
            isNodeConfigured = !!(namespace && name && namespace !== 'example' && !name.startsWith('dataset-'));
          } else if (node.data?.type === NodeType.JOB) {
            // For job nodes, check if namespace and name are configured (and not default values)
            const namespace = node.data?.job?.namespace?.trim();
            const name = node.data?.job?.name?.trim();
            isNodeConfigured = !!(namespace && name && namespace !== 'example' && !name.startsWith('job-'));
          }
          
          return {
            ...node,
            data: {
              ...node.data,
              showPulsingHandle: node.id === 'dataset-1' && isInitialDatasetConfigured && !isDrawerOpen && !hasCreatedFirstJob,
              isDragEnabled: isNodeConfigured
            }
          };
        })
      );
    }
  }, [isInitialDatasetConfigured, isDrawerOpen, hasCreatedFirstJob]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  
  const onConnectEnd = useCallback(
    (event: any, connectionState: any) => {
      // Prevent dragging until initial dataset is configured
      if (!isInitialDatasetConfigured) {
        return;
      }
      
      // Check if source node is configured before allowing connection
      const sourceNode = nodes.find(node => node.id === connectionState.fromNode.id);
      if (sourceNode && sourceNode.data.isDragEnabled === false) {
        return;
      }
      
      // When a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
        const dropPosition = screenToFlowPosition({ x: clientX, y: clientY });
        
        // Find the source node from ReactFlow nodes to determine what type to create
        const sourceNode = nodes.find(node => node.id === connectionState.fromNode.id);
        const sourceNodeType = sourceNode?.data?.type;
        
        // Use consistent horizontal spacing, only use drop Y position
        const horizontalSpacing = 250; // Fixed distance between nodes
        const sourceNodePosition = sourceNode?.position || { x: 0, y: 0 };
        
        // Different heights for different node types for vertical centering
        let nodeHeight;
        if (sourceNodeType === NodeType.DATASET) {
          // Creating job node - jobs are typically shorter
          nodeHeight = 75; // Job nodes are more compact
        } else {
          // Creating dataset node - datasets can be taller with fields
          nodeHeight = 95; // Dataset nodes have more content
        }
        
        const position = {
          x: sourceNodePosition.x + horizontalSpacing, // Fixed horizontal distance from source
          y: dropPosition.y - nodeHeight / 2 // Use drop Y position, centered vertically
        };
        
        console.log('Drop position:', dropPosition, 'Node type creating:', sourceNodeType === NodeType.DATASET ? 'JOB' : 'DATASET', 'Height:', nodeHeight, 'Centered position:', position);
        
        if (sourceNodeType === NodeType.DATASET) {
          // If source is dataset, create job node
          const id = getJobId();
          
          // Mark that first job has been created
          setHasCreatedFirstJob(true);
          
          // Create new job node
          const newJobNode = {
            id,
            type: 'tableLevel',
            position,
            data: {
              id,
              label: `Job ${id}`,
              type: NodeType.JOB,
              isDragEnabled: false, // Initially disabled until configured
              onNodeClick: (nodeId: string) => handleNodeClick(nodeId, {
                id,
                label: `Job ${id}`,
                type: NodeType.JOB,
                job: {
                  id: { namespace: 'example', name: id },
                  name: id,
                  namespace: 'example',
                  type: 'BATCH',
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
              }),
              job: {
                id: { namespace: 'example', name: id },
                name: id,
                namespace: 'example',
                type: 'BATCH',
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
            }
          };

          // Add to lineage data
          createJobNode(id, position);
          
          // Add edge
          const edgeId = `${connectionState.fromNode.id}-${id}`;
          addLineageEdge(edgeId, connectionState.fromNode.id, id);
          
          // Update ReactFlow incrementally
          setNodes(nds => [...nds, newJobNode]);
          setEdges(eds => [...eds, { 
            id: edgeId,
            source: connectionState.fromNode.id, 
            target: id 
          }]);
          
        } else if (sourceNodeType === NodeType.JOB) {
          // If source is job, create dataset node
          const id = getDatasetId();
          
          // Create new dataset node
          const newDatasetNode = {
            id,
            type: 'tableLevel',
            position,
            data: {
              id,
              label: `Dataset ${id}`,
              type: NodeType.DATASET,
              isDragEnabled: false, // Initially disabled until configured
              onNodeClick: (nodeId: string) => handleNodeClick(nodeId, {
                id,
                label: `Dataset ${id}`,
                type: NodeType.DATASET,
                dataset: {
                  id: { namespace: 'example', name: id },
                  name: id,
                  namespace: 'example',
                  type: 'DB_TABLE',
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
              }),
              dataset: {
                id: { namespace: 'example', name: id },
                name: id,
                namespace: 'example',
                type: 'DB_TABLE',
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
            }
          };

          // Add to lineage data
          createDatasetNode(id, position);
          
          // Add edge
          const edgeId = `${connectionState.fromNode.id}-${id}`;
          addLineageEdge(edgeId, connectionState.fromNode.id, id);
          
          // Update ReactFlow incrementally
          setNodes(nds => [...nds, newDatasetNode]);
          setEdges(eds => [...eds, { 
            id: edgeId,
            source: connectionState.fromNode.id, 
            target: id 
          }]);
        }
      }
    },
    [screenToFlowPosition, nodes, createJobNode, createDatasetNode, addLineageEdge, toReactFlowFormat, handleNodeClick, setNodes, setEdges, isInitialDatasetConfigured],
  );

  return (
    <Box 
      ref={reactFlowWrapper}
      height={`calc(100vh - ${HEADER_HEIGHT}px - 60px)`}
      sx={{ overflow: 'hidden', backgroundColor: 'white', position: 'relative' }}
    >
      {/* Details pane for editing node details */}
      <DetailsPane ref={drawerRef} open={isDrawerOpen} onClose={handlePaneClick}>
        <EditForm 
          selectedNodeData={selectedNodeId ? getNode(selectedNodeId) || selectedNodeData : selectedNodeData}
          selectedNodeId={selectedNodeId}
          onClose={handlePaneClick}
          onUpdate={(updatedData: any) => {
            if (selectedNodeId && updatedData) {
              // Update the lineage data
              const currentNode = getNode(selectedNodeId);
              if (currentNode) {
                const updatedNodeData = {
                  ...currentNode,
                  label: updatedData.label || currentNode.label,
                  ...(updatedData.dataset && { dataset: { ...currentNode.dataset, ...updatedData.dataset } }),
                  ...(updatedData.job && { job: { ...currentNode.job, ...updatedData.job } }),
                };
                
                updateNode(selectedNodeId, updatedNodeData);
                
                // Mark initial dataset as configured if this is the first dataset
                if (selectedNodeId === 'dataset-1' && updatedData.dataset) {
                  setIsInitialDatasetConfigured(true);
                }
                
                // Refresh ReactFlow with updated data
                const flowData = toReactFlowFormat(handleNodeClick);
                setNodes(flowData.nodes);
              }
            }
          }}
        />
      </DetailsPane>

      <Box className="graph-container" sx={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          style={{ width: '100%', height: '100%' }}
          className="react-flow"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </Box>
    </Box>
  );
};

const DatasetLineageCreate: React.FC = () => (
  <ReactFlowProvider>
    <DatasetLineageCreateFlow />
  </ReactFlowProvider>
);

export default DatasetLineageCreate;