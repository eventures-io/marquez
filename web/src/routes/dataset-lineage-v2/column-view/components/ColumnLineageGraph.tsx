import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import ColumnDatasetNode from '../ColumnDatasetNode';
import ColumnFieldNode from '../ColumnFieldNode';
import useColumnLayout from '../useColumnLayout';
import { LineageMode } from '@app-types';

const nodeTypes = {
  'dataset-container': ColumnDatasetNode,
  'column-field': ColumnFieldNode,
};

interface ColumnLineageGraphProps {
  mode: LineageMode;
  columnLineageGraph: { nodes: any[]; edges: any[] } | null;
  onNodeClick: (nodeId: string, nodeData: any) => void;
  onPaneClick: () => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  loading?: boolean;
  error?: string | null;
  fitViewKey?: number | null;
  onLayoutNodesUpdate?: (nodes: Node[]) => void;
}

const ColumnLineageGraphInternal: React.FC<ColumnLineageGraphProps> = ({
  mode,
  columnLineageGraph,
  onNodeClick,
  onPaneClick,
  onEdgeCreate,
  onEdgeDelete,
  onNodePositionChange,
  loading = false,
  error = null,
  fitViewKey,
  onLayoutNodesUpdate,
}) => {
  const reactFlowInstance = useReactFlow();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [createNodes, setCreateNodes, onCreateNodesChange] = useNodesState<Node>([]);
  const [createEdges, setCreateEdges, onCreateEdgesChange] = useEdgesState<Edge>([]);
  const isCreateMode = mode === LineageMode.CREATE;

  const graphWithHandlers = useMemo(() => {
    if (!columnLineageGraph) return null;
    const nodeClickHandler = onNodeClick;
    const nodes = columnLineageGraph.nodes.map((node) => ({
      ...node,
      data: { ...node.data, onNodeClick: nodeClickHandler },
    }));
    return { nodes, edges: columnLineageGraph.edges };
  }, [columnLineageGraph, onNodeClick]);

  const layout = useColumnLayout({
    columnGraph: isCreateMode ? null : graphWithHandlers,
    onNodeClick,
    lockELKLayout: mode === LineageMode.EDIT,
  });

  const getCurrentNodes = useCallback((): Node[] => {
    return isCreateMode ? createNodes : layout.nodes || [];
  }, [createNodes, isCreateMode, layout.nodes]);

  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      if (mode === LineageMode.VIEW) return false;
      const currentNodes = getCurrentNodes();
      const sourceNode = currentNodes.find((n) => n.id === connection.source);
      const targetNode = currentNodes.find((n) => n.id === connection.target);
      return (
        !!sourceNode &&
        !!targetNode &&
        sourceNode.type === 'column-field' &&
        targetNode.type === 'column-field'
      );
    },
    [getCurrentNodes, mode]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (mode === LineageMode.VIEW) return;
      const source = connection.source || '';
      const target = connection.target || '';
      if (!source || !target) return;
      const currentNodes = getCurrentNodes();
      const sourceNode = currentNodes.find((n) => n.id === source);
      const targetNode = currentNodes.find((n) => n.id === target);
      if (!sourceNode || !targetNode) return;
      if (sourceNode.type !== 'column-field' || targetNode.type !== 'column-field') return;
      onEdgeCreate && onEdgeCreate(source, target);
    },
    [getCurrentNodes, mode, onEdgeCreate]
  );

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (mode === LineageMode.VIEW) return;
      deleted.forEach((edge) => onEdgeDelete && onEdgeDelete(edge.id));
    },
    [mode, onEdgeDelete]
  );

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  const handlePaneInteraction = useCallback(() => {
    setSelectedEdgeId(null);
    onPaneClick();
  }, [onPaneClick]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedEdgeId && onEdgeDelete) {
          onEdgeDelete(selectedEdgeId);
          setSelectedEdgeId(null);
        }
      }
    },
    [onEdgeDelete, selectedEdgeId]
  );

  const handleCreateNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onCreateNodesChange(changes);
      if (mode === LineageMode.VIEW || !onNodePositionChange) return;
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && typeof change.id === 'string') {
          onNodePositionChange(change.id, change.position);
        }
      });
    },
    [mode, onCreateNodesChange, onNodePositionChange]
  );

  useEffect(() => {
    if (!isCreateMode) return;
    if (!graphWithHandlers) {
      setCreateNodes([]);
      setCreateEdges([]);
      return;
    }
    setCreateNodes(graphWithHandlers.nodes as Node[]);
    setCreateEdges(graphWithHandlers.edges as Edge[]);
  }, [graphWithHandlers, isCreateMode, setCreateEdges, setCreateNodes]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    if (!onLayoutNodesUpdate) return;
    if (isCreateMode) {
      onLayoutNodesUpdate(createNodes);
    } else {
      onLayoutNodesUpdate(layout.nodes || []);
    }
  }, [createNodes, isCreateMode, layout.nodes, onLayoutNodesUpdate]);

  useEffect(() => {
    if (fitViewKey == null) return;
    if (typeof window === 'undefined') return;
    const handle = window.requestAnimationFrame(() => {
      try {
        reactFlowInstance.fitView({ padding: 0.1, includeHiddenNodes: false });
      } catch (err) {
        console.warn('ColumnLineageGraph fitView failed:', err);
      }
    });
    return () => window.cancelAnimationFrame(handle);
  }, [fitViewKey, reactFlowInstance]);

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

  const nodes = isCreateMode ? createNodes : layout.nodes;
  const edges = (isCreateMode ? createEdges : layout.edges || []).map((edge) => ({
    ...edge,
    style: {
      ...edge.style,
      ...(selectedEdgeId === edge.id && {
        filter: 'drop-shadow(0px 0px 2px rgba(128, 128, 128, 0.5))',
        strokeWidth: 2,
      }),
    },
  }));

  const onNodesChange = isCreateMode ? handleCreateNodesChange : layout.onNodesChange;
  const onEdgesChange: (changes: EdgeChange[]) => void = isCreateMode
    ? onCreateEdgesChange
    : layout.onEdgesChange;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        onEdgeClick={handleEdgeClick}
        isValidConnection={isValidConnection}
        onPaneClick={handlePaneInteraction}
        nodeTypes={nodeTypes}
        fitView={!isCreateMode}
        fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
        nodesConnectable={mode !== LineageMode.VIEW}
        style={{ width: '100%', height: '100%' }}
        className="react-flow"
      >
        <Background />
        <Controls />
        {mode === LineageMode.VIEW && <MiniMap />}
      </ReactFlow>
    </Box>
  );
};

const ColumnLineageGraph: React.FC<ColumnLineageGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <ColumnLineageGraphInternal {...props} />
    </ReactFlowProvider>
  );
};

export default ColumnLineageGraph;
