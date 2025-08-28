import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
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
  Connection,
} from '@xyflow/react';
import TableLevelNode from '../dataset-lineage-v2/TableLevelNode';
import DetailsPane from '../dataset-lineage-v2/DetailsPane';
import { useDrawerState } from './useDrawerState';
import { useLineageData } from './useLineageData';
import { useSaveLineage } from './useSaveLineage';
import EditForm from './EditForm';
import Toolbar from './Toolbar';
import { NodeType, JobType, DatasetType } from '../../types/lineage';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  tableLevel: TableLevelNode,
};

let nodeId = 2;
const getJobId = () => `job-${nodeId++}`;
const getDatasetId = () => `dataset-${nodeId++}`;

const HEADER_HEIGHT = 64 + 1;

const createInitialNodes = (): Node[] => [
  {
    id: 'dataset-1',
    type: 'tableLevel',
    position: { x: 50, y: 300 },
    data: {
      id: 'dataset-1',
      label: '',
      type: NodeType.DATASET,
      onNodeClick: () => {},
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
    }
  }
];

const DatasetLineageCreateFlow: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  const { isDrawerOpen, selectedNodeId, drawerRef, handleNodeClick, handlePaneClick } = useDrawerState();
  
  const {
    lineageData,
    updateNode,
    updateNodePosition,
    addEdge: addLineageEdge,
    getNode,
    toReactFlowFormat,
    createJobNode,
    createDatasetNode,
  } = useLineageData();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  
  const [isInitialDatasetConfigured, setIsInitialDatasetConfigured] = useState(false);
  
  const [hasCreatedFirstJob, setHasCreatedFirstJob] = useState(false);
  
  const {
    isSaving,
    hasUnsavedChanges,
    showValidationErrors,
    validationErrors,
    showSuccessDialog,
    saveLineage,
    setHasUnsavedChanges,
    setShowValidationErrors,
    setShowSuccessDialog,
  } = useSaveLineage();

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
            // For dataset nodes, only check name (namespace inherited from initial dataset)
            const name = (node.data as any)?.dataset?.name?.trim();
            isNodeConfigured = !!(name && name.length > 0);
          } else if (node.data?.type === NodeType.JOB) {
            // For job nodes, only check name (namespace inherited from initial dataset)
            const name = (node.data as any)?.job?.name?.trim();
            isNodeConfigured = !!(name && name.length > 0);
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

  // Track changes for unsaved changes warning
  useEffect(() => {
    if (initializedRef.current && (nodes.length > 1 || edges.length > 0)) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, lineageData]);

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveLineage = async () => {
    await saveLineage(lineageData);
  };

  const canSaveLineage = useCallback(() => {
    return lineageData.nodes.size > 1 && !isSaving;
  }, [lineageData.nodes.size, isSaving]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
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
                
        if (sourceNodeType === NodeType.DATASET) {
          // If source is dataset, create job node
          const id = getJobId();
          const namespace = '';
          
          // Mark that first job has been created
          setHasCreatedFirstJob(true);
          
          // Create new job node
          const newJobNode = {
            id,
            type: 'tableLevel',
            position,
            data: {
              id,
              label: '',
              type: NodeType.JOB,
              isDragEnabled: false, // Initially disabled until configured
              onNodeClick: (nodeId: string) => handleNodeClick(nodeId, {
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
              }),
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
            }
          };

          // Add to lineage data with shared namespace
          createJobNode(id, position, namespace);
          
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
          
          // Automatically open the drawer for the new node after state updates
          setTimeout(() => {
            handleNodeClick(id, newJobNode.data);
          }, 0);
          
        } else if (sourceNodeType === NodeType.JOB) {
          // If source is job, create dataset node
          const id = getDatasetId();
          const namespace = '';
          
          // Create new dataset node
          const newDatasetNode = {
            id,
            type: 'tableLevel',
            position,
            data: {
              id,
              label: `Dataset`,
              type: NodeType.DATASET,
              isDragEnabled: false, // Initially disabled until configured
              onNodeClick: (nodeId: string) => handleNodeClick(nodeId, {
                id,
                label: `Dataset`,
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
              }),
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
            }
          };

          // Add to lineage data with shared namespace
          createDatasetNode(id, position, namespace);
          
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
          
          // Automatically open the drawer for the new node after state updates
          setTimeout(() => {
            handleNodeClick(id, newDatasetNode.data);
          }, 0);
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
          selectedNodeData={selectedNodeId ? getNode(selectedNodeId) : null}
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
                
                // Update ReactFlow nodes immediately with the new data
                setNodes(currentNodes => 
                  currentNodes.map(node => {
                    if (node.id === selectedNodeId) {
                      return {
                        ...node,
                        data: {
                          ...node.data,
                          label: updatedNodeData.label,
                          ...(updatedNodeData.dataset && { dataset: updatedNodeData.dataset }),
                          ...(updatedNodeData.job && { job: updatedNodeData.job })
                        }
                      };
                    }
                    return node;
                  })
                );
              }
            }
          }}
        />
      </DetailsPane>

      <Box className="graph-container" sx={{ width: '100%', height: 'calc(100% - 80px)' }}>
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

      <Toolbar
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        canSaveLineage={canSaveLineage()}
        onSaveLineage={handleSaveLineage}
      />

      {/* Validation Errors Dialog */}
      <Dialog open={showValidationErrors} onClose={() => setShowValidationErrors(false)} maxWidth="md">
        <DialogTitle>Cannot Save Lineage</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            Please fix the following issues before saving:
          </Box>
          {validationErrors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowValidationErrors(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)}>
        <DialogTitle>Lineage Saved Successfully!</DialogTitle>
        <DialogContent>
          Your data lineage has been saved to the database. You can now view it in the lineage graph or create a new one.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowSuccessDialog(false);
            window.location.reload();
          }} variant="contained">
            Create New Lineage
          </Button>
          <Button onClick={() => {
            setShowSuccessDialog(false);
          }}>
            View Saved Lineage
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const DatasetLineageCreate: React.FC = () => (
  <ReactFlowProvider>
    <DatasetLineageCreateFlow />
  </ReactFlowProvider>
);

export default DatasetLineageCreate;