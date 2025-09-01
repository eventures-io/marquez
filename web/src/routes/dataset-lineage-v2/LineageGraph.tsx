import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import TableLevelNode from './TableLevelNode';
import { useLineageLayout } from './useLineageLayout';
import { NodeType } from '@app-types';

const nodeTypes = {
  tableLevel: TableLevelNode,
};

interface LineageGraphProps {
  lineageGraph: { nodes: any[], edges: any[] } | null;
  onNodeClick: (nodeId: string, nodeData: any) => void;
  onPaneClick: () => void;
  onConnectEnd?: (event: MouseEvent | TouchEvent, connectionState: any) => void;
  onNodeCreate?: (sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => void;
  loading?: boolean;
  error?: string | null;
}

const HEADER_HEIGHT = 64 + 1;

// Internal component with ReactFlow context access
const LineageGraphInternal: React.FC<LineageGraphProps> = ({
  lineageGraph,
  onNodeClick,
  onPaneClick,
  onConnectEnd,
  onNodeCreate,
  loading = false,
  error = null,
}) => {
  const { screenToFlowPosition } = useReactFlow();

  // Enhanced onConnectEnd that can create nodes
  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: any) => {
    // Call the original handler if provided
    if (onConnectEnd) {
      onConnectEnd(event, connectionState);
    }

    // Handle node creation if callback provided and connection is invalid (dropped on empty space)
    if (onNodeCreate && connectionState && !connectionState.isValid && connectionState.fromNode) {
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
      
      // Convert screen coordinates to flow coordinates
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      
      // Find the source node type from lineage graph
      const sourceNode = lineageGraph?.nodes?.find(node => node.id === connectionState.fromNode.id);
      const sourceNodeType = sourceNode?.data?.type;
      
      if (sourceNodeType) {
        onNodeCreate(connectionState.fromNode.id, sourceNodeType, position);
      }
    }
  }, [onConnectEnd, onNodeCreate, lineageGraph, screenToFlowPosition]);

  // Calculate available height for layout
  const availableHeight = window.innerHeight - HEADER_HEIGHT * 2 - 100; // Adjust for action bar

  // Use custom hook for layout and ReactFlow state
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useLineageLayout({
    lineageGraph,
    onNodeClick,
    availableHeight,
  });

  if (loading) {
    return (
      <Box height="100%" display="flex" alignItems="center" justifyContent="center">
        Loading lineage data...
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
    <Box className="graph-container" sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={handleConnectEnd}
        onPaneClick={onPaneClick}
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
  );
};

const LineageGraph: React.FC<LineageGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <LineageGraphInternal {...props} />
    </ReactFlowProvider>
  );
};

export default LineageGraph;