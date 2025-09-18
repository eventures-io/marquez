import React, { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import ColumnDatasetNode from './ColumnDatasetNode';
import ColumnFieldNode from './ColumnFieldNode';
import ColumnLevelActionBar from './ColumnLevelActionBar';
import DetailsPane from '../components/DetailsPane';
import ColumnDetailsPane from './components/ColumnDetailsPane';
import useColumnDrawerState from './useColumnDrawerState';
import useColumnELKLayout from './useColumnELKLayout';
import { NodeType, LineageMode } from '@app-types';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  'dataset-container': ColumnDatasetNode,
  'column-field': ColumnFieldNode,
};

interface ColumnLevelFlowProps {
  mode: LineageMode;
  columnLineageGraph: { nodes: any[], edges: any[] } | null;
  nodeType: NodeType;
  depth: number;
  setDepth: (depth: number) => void;
  onUpdate?: (nodeId: string, data: any) => void;
  onSave?: () => void;
  onDelete?: (nodeId: string) => void;
  onColumnCreate?: (sourceDatasetId: string, position: { x: number; y: number }) => void;
  onDatasetCreate?: (position: { x: number; y: number }) => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
  loading?: boolean;
  error?: string | null;
  initialSelectionId?: string;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  canSaveLineage?: boolean;
  totalDatasets?: number;
  totalColumns?: number;
  selectedColumn?: string;
}

const HEADER_HEIGHT = 64 + 1;

const ColumnLevelFlowInternal: React.FC<ColumnLevelFlowProps> = ({
  mode,
  columnLineageGraph,
  nodeType,
  depth,
  setDepth,
  onUpdate,
  onSave,
  onDelete,
  onColumnCreate,
  onDatasetCreate,
  onEdgeCreate,
  onEdgeDelete,
  onNodeClick,
  loading = false,
  error = null,
  initialSelectionId,
  isSaving = false,
  hasUnsavedChanges = false,
  canSaveLineage = false,
  totalDatasets = 0,
  totalColumns = 0,
  selectedColumn,
}) => {
  const { isDrawerOpen, selectedNodeId, selectedNodeData, drawerRef, handleNodeClick, handlePaneClick } = useColumnDrawerState();
  const { getLayoutedElements } = useColumnELKLayout();
  const didAutoOpenRef = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Update nodes and edges when columnLineageGraph changes
  useEffect(() => {
    const applyLayout = async () => {
      if (columnLineageGraph) {
        // Add onNodeClick handler to nodes
        // Use custom onNodeClick if provided (CREATE mode), otherwise use default handleNodeClick  
        const nodeClickHandler = onNodeClick || handleNodeClick;
        const nodesWithHandlers = columnLineageGraph.nodes.map(node => {
          return {
            ...node,
            data: {
              ...node.data,
              onNodeClick: nodeClickHandler,
            }
          };
        });

        // Skip ELK layout for CREATE mode - use manual positioning
        if (mode === LineageMode.CREATE) {
          setNodes(nodesWithHandlers);
          setEdges(columnLineageGraph.edges);
        } else {
          // Use ELK layout for VIEW mode
          try {
            const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
              nodesWithHandlers,
              columnLineageGraph.edges
            );
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
          } catch (error) {
            console.error('Error applying ELK layout:', error);
            // Fallback to original positions
            setNodes(nodesWithHandlers);
            setEdges(columnLineageGraph.edges);
          }
        }
      }
    };
    
    applyLayout();
  }, [columnLineageGraph, getLayoutedElements, setNodes, setEdges, handleNodeClick, onNodeClick, mode]);

  // Open drawer initially if requested (only once)
  useEffect(() => {
    if (!didAutoOpenRef.current && initialSelectionId && columnLineageGraph) {
      const node = columnLineageGraph.nodes.find((n) => n.id === initialSelectionId);
      if (node) {
        handleNodeClick(initialSelectionId, node.data);
        didAutoOpenRef.current = true;
      }
    }
  }, [initialSelectionId, columnLineageGraph, handleNodeClick]);

  if (loading) {
    return (
      <Box height="100%" display="flex" alignItems="center" justifyContent="center">
        Loading column lineage data...
      </Box>
    );
  }

  if (error) {
    return (
      <Box height="100%" p={2}>
        Error: {error}
      </Box>
    );
  }

  return (
    <>
      <ColumnLevelActionBar
        nodeType={nodeType}
        depth={depth}
        setDepth={setDepth}
        totalDatasets={totalDatasets}
        totalColumns={totalColumns}
        selectedColumn={selectedColumn}
        mode={mode}
        onSave={onSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        canSaveLineage={canSaveLineage}
      />
      
      <Box 
        height={`calc(100vh - ${HEADER_HEIGHT}px - 60px)`}
        sx={{ overflow: 'hidden', backgroundColor: 'white', position: 'relative' }}
      >
        <DetailsPane 
          ref={drawerRef} 
          open={isDrawerOpen} 
          onClose={handlePaneClick}
          showDelete={mode !== LineageMode.VIEW && !!selectedNodeId}
          onDelete={() => {
            if (selectedNodeId && onDelete) {
              onDelete(selectedNodeId);
              handlePaneClick(); 
            }
          }}
        >
          <ColumnDetailsPane columnData={selectedNodeData} />
        </DetailsPane>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
          style={{ width: '100%', height: '100%' }}
          className="react-flow"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </Box>
    </>
  );
};

const ColumnLevelFlow: React.FC<ColumnLevelFlowProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ColumnLevelFlowInternal {...props} />
    </ReactFlowProvider>
  );
};

export default ColumnLevelFlow;