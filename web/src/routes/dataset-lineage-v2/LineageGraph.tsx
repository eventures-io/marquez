import React from 'react';
import { Box } from '@mui/material';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  Controls,
  MiniMap,
} from '@xyflow/react';
import TableLevelNode from './TableLevelNode';
import { useLineageLayout } from './useLineageLayout';

const nodeTypes = {
  tableLevel: TableLevelNode,
};

interface LineageGraphProps {
  lineageGraph: { nodes: any[], edges: any[] } | null;
  onNodeClick: (nodeId: string, nodeData: any) => void;
  onPaneClick: () => void;
  loading?: boolean;
  error?: string | null;
}

const HEADER_HEIGHT = 64 + 1;

const LineageGraph: React.FC<LineageGraphProps> = ({
  lineageGraph,
  onNodeClick,
  onPaneClick,
  loading = false,
  error = null,
}) => {
  // Calculate available height for layout
  const availableHeight = window.innerHeight - HEADER_HEIGHT * 2 - 100; // Adjust for action bar

  // Use custom hook for layout and ReactFlow state
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useLineageLayout({
    lineageGraph,
    onNodeClick,
    availableHeight,
  });

  const onError = (error: Error) => {
    console.error('ReactFlow error:', error);
  };

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
    <ReactFlowProvider>
      <Box className="graph-container" sx={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          // onError={onError}
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
    </ReactFlowProvider>
  );
};

export default LineageGraph;