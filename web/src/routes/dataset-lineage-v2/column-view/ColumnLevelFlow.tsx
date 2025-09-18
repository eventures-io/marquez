import React, { useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Controls,
  MiniMap,
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
import useColumnLayout from './useColumnLayout';
import Toolbar from '../table-view/components/Toolbar';
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
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
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
  onNodePositionChange,
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

  // Allow column-to-column connections in CREATE and EDIT modes
  const isValidConnection = useCallback((connection: { source?: string | null; target?: string | null }) => {
    if (mode === LineageMode.VIEW) return false;
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    return !!sourceNode && !!targetNode && sourceNode.type === 'column-field' && targetNode.type === 'column-field';
  }, [mode, nodes]);

  const handleConnect = useCallback((connection: { source?: string | null; target?: string | null }) => {
    if (mode === LineageMode.VIEW) return;
    const source = connection.source || '';
    const target = connection.target || '';
    if (!source || !target) return;

    // Ensure connection is between column-field nodes
    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    if (!sourceNode || !targetNode || sourceNode.type !== 'column-field' || targetNode.type !== 'column-field') return;

    onEdgeCreate && onEdgeCreate(source, target);
  }, [mode, nodes, onEdgeCreate]);

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    if (mode === LineageMode.VIEW) return;
    deleted.forEach((e) => onEdgeDelete && onEdgeDelete(e.id));
  }, [mode, onEdgeDelete]);

  // Mirror node drag updates back to caller (create/edit modes)
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    if (mode === LineageMode.VIEW) return;
    if (!Array.isArray(changes)) return;
    changes.forEach((ch: any) => {
      if (ch.type === 'position' && ch.position && typeof ch.id === 'string') {
        onNodePositionChange && onNodePositionChange(ch.id, ch.position);
      }
    });
  }, [onNodesChange, onNodePositionChange, mode]);

  // Compose graph with click handlers
  const graphWithHandlers = React.useMemo(() => {
    if (!columnLineageGraph) return null;
    const nodeClickHandler = onNodeClick || handleNodeClick;
    const nodes = columnLineageGraph.nodes.map(n => ({
      ...n,
      data: { ...n.data, onNodeClick: nodeClickHandler },
    }));
    return { nodes, edges: columnLineageGraph.edges };
  }, [columnLineageGraph, onNodeClick, handleNodeClick]);

  // Layout handling similar to table-level: ELK once then lock for EDIT, always for VIEW
  const layout = useColumnLayout({
    columnGraph: mode === LineageMode.CREATE ? null : graphWithHandlers,
    onNodeClick: onNodeClick || handleNodeClick,
    lockELKLayout: mode === LineageMode.EDIT,
  });

  // In CREATE mode, map graph directly to RF state without ELK or fitView
  useEffect(() => {
    if (mode !== LineageMode.CREATE) return;
    if (!columnLineageGraph) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const nodeClickHandler = onNodeClick || handleNodeClick;
    const nodesWithHandlers = columnLineageGraph.nodes.map((n) => ({
      ...n,
      data: { ...n.data, onNodeClick: nodeClickHandler },
    }));
    setNodes(nodesWithHandlers as any);
    setEdges(columnLineageGraph.edges as any);
  }, [mode, columnLineageGraph, setNodes, setEdges, onNodeClick, handleNodeClick]);

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
      {mode !== LineageMode.CREATE && (
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
      )}
      
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
          nodes={mode === LineageMode.CREATE ? nodes : layout.nodes}
          edges={mode === LineageMode.CREATE ? edges : layout.edges}
          onNodesChange={mode === LineageMode.CREATE ? handleNodesChange : layout.onNodesChange}
          onEdgesChange={mode === LineageMode.CREATE ? onEdgesChange : layout.onEdgesChange}
          onConnect={handleConnect}
          onEdgesDelete={handleEdgesDelete}
          isValidConnection={isValidConnection}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView={mode !== LineageMode.CREATE}
          fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
          style={{ width: '100%', height: '100%' }}
          className="react-flow"
        >
          <Background />
          <Controls />
          {mode !== LineageMode.CREATE && <MiniMap />}
        </ReactFlow>
      </Box>

      {/* Toolbar for edit/create modes */}
      {mode !== LineageMode.VIEW && onSave && (
        <Toolbar
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          canSaveLineage={!!canSaveLineage}
          onSaveLineage={onSave}
        />
      )}
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
