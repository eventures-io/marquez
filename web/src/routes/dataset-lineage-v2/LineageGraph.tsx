// @ts-nocheck
import React, { useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
  Controls,
  MiniMap,
} from '@xyflow/react';
import useELKLayout from './useELKLayout';
import TableLevelNode from './TableLevelNode';

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
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { getLayoutedElements } = useELKLayout();

  // Update layout when lineage graph changes
  useEffect(() => {
    const updateLayout = async () => {
      if (!lineageGraph || !lineageGraph.nodes || lineageGraph.nodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      try {
        // Apply ELK layout to the pre-mapped nodes and edges
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
          lineageGraph.nodes,
          lineageGraph.edges,
          window.innerHeight - HEADER_HEIGHT * 2 - 100 // Adjust for action bar
        );

        // Add click handler to node data
        const nodesWithClickHandler = layoutedNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onNodeClick: (nodeId: string) => onNodeClick(nodeId, node.data),
          },
        }));

        setNodes(nodesWithClickHandler);
        setEdges(layoutedEdges);
      } catch (error) {
        console.error('Error processing lineage data:', error);
      }
    };

    updateLayout();
  }, [lineageGraph, getLayoutedElements, setNodes, setEdges, onNodeClick]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
          onError={onError}
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