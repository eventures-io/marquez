import React, { useCallback, useEffect } from 'react';
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
  addEdge,
  Node,
  Edge,
  Connection,
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
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  useLayout?: boolean;
  fitView?: boolean;
  loading?: boolean;
  error?: string | null;
  lockELKLayout?: boolean;
}

const HEADER_HEIGHT = 64 + 1;

// Internal component with ReactFlow context access
const LineageGraphInternal: React.FC<LineageGraphProps> = ({
  lineageGraph,
  onNodeClick,
  onPaneClick,
  onConnectEnd,
  onNodeCreate,
  onEdgeCreate,
  useLayout = true,
  fitView = true,
  loading = false,
  error = null,
  lockELKLayout = false,
}) => {
  const { screenToFlowPosition, getNodes } = useReactFlow();

  // Enhanced onConnectEnd that can create nodes and auto-open drawer for the new node
  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: any) => {
    // Call the original handler if provided
    if (onConnectEnd) {
      onConnectEnd(event, connectionState);
    }

    // Handle node creation if callback provided and connection is invalid (dropped on empty space)
    if (onNodeCreate && connectionState && !connectionState.isValid && connectionState.fromNode) {
      // Snapshot existing node ids before creation
      const beforeIds = new Set(getNodes().map((n) => n.id));

      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
      
      // Convert screen coordinates to flow coordinates
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      
      // Find the source node type from lineage graph or live RF state
      const sourceNode = lineageGraph?.nodes?.find(node => node.id === connectionState.fromNode.id);
      let sourceNodeType = sourceNode?.data?.type;
      const rfNode = getNodes().find((n) => n.id === connectionState.fromNode.id);
      if (!sourceNodeType && rfNode) {
        sourceNodeType = (rfNode as any)?.data?.type;
      }

      // Adjust x so the new node doesn't overlap the source node
      if (rfNode) {
        const horizontalSpacing = 250;
        position.x = rfNode.position.x + horizontalSpacing;
      }
      
      if (sourceNodeType) {
        const fromId = connectionState.fromNode.id;
        onNodeCreate(fromId, sourceNodeType, position);

        // Attempt to auto-select the newly created node and open the drawer
        const maxAttempts = 10;
        const trySelect = (attempt: number) => {
          const nodesNow = getNodes();
          // Find nodes that were not present before and are not the source
          const newNodes = nodesNow.filter((n) => !beforeIds.has(n.id) && n.id !== fromId);
          let target = newNodes[0];
          if (newNodes.length > 1) {
            // Prefer the one closest to the drop position
            const dist = (n: any) => {
              const dx = (n.position?.x ?? 0) - position.x;
              const dy = (n.position?.y ?? 0) - position.y;
              return Math.hypot(dx, dy);
            };
            target = newNodes.slice().sort((a: any, b: any) => dist(a) - dist(b))[0];
          }
          if (target) {
            const data: any = (target as any).data;
            onNodeClick(target.id, data);
          } else if (attempt < maxAttempts) {
            // Wait for upstream state to push the new node into ReactFlow
            setTimeout(() => trySelect(attempt + 1), 80);
          }
        };
        // Kick off selection attempts on next tick
        setTimeout(() => trySelect(0), 0);
      }
    }
  }, [onConnectEnd, onNodeCreate, lineageGraph, screenToFlowPosition, getNodes, onNodeClick]);

  // Calculate available height for layout
  const availableHeight = window.innerHeight - HEADER_HEIGHT * 2 - 100; // Adjust for action bar

  // Use custom hook for layout and ReactFlow state
  // Conditionally use layout or raw positions
  const layoutHook = useLineageLayout({ lineageGraph, onNodeClick, availableHeight, lockELKLayout });
  const [rawNodes, setRawNodes, onRawNodesChange] = useNodesState<Node>([]);
  const [rawEdges, setRawEdges, onRawEdgesChange] = useEdgesState<Edge>([]);
  const onRawConnect = useCallback((params: Connection) => setRawEdges((eds) => addEdge(params, eds)), [setRawEdges]);

  const nodes = useLayout ? layoutHook.nodes : rawNodes;
  const edges = useLayout ? layoutHook.edges : rawEdges;
  const onNodesChange = useLayout ? layoutHook.onNodesChange : onRawNodesChange;
  const onEdgesChange = useLayout ? layoutHook.onEdgesChange : onRawEdgesChange;
  // Wrap onConnect to route to parent edge creation when provided
  const handleConnect = useCallback((params: Connection) => {
    const source = params.source as string | undefined;
    const target = params.target as string | undefined;
    if (onEdgeCreate && source && target) {
      // Optional: validate connection types using available lineageGraph
      try {
        const sourceNode = lineageGraph?.nodes?.find((n) => n.id === source);
        const targetNode = lineageGraph?.nodes?.find((n) => n.id === target);
        const sType = (sourceNode as any)?.data?.type;
        const tType = (targetNode as any)?.data?.type;
        // Allow only dataset -> job or job -> dataset
        if (sType && tType && sType !== tType) {
          onEdgeCreate(source, target);
          return;
        }
        // Fallback: if we can't determine types, still forward
        if (!sType || !tType) {
          onEdgeCreate(source, target);
          return;
        }
        // Otherwise, ignore invalid same-type connection
        return;
      } catch {
        // On any error, forward to parent to decide
        if (source && target) onEdgeCreate(source, target);
        return;
      }
    }
    // No parent handler; update local RF edges for visual feedback
    (useLayout ? layoutHook.onConnect : onRawConnect)(params);
  }, [onEdgeCreate, lineageGraph, layoutHook.onConnect, onRawConnect, useLayout]);

  useEffect(() => {
    if (!useLayout) {
      if (!lineageGraph || !lineageGraph.nodes) {
        setRawNodes([]);
        setRawEdges([]);
      } else {
        const mappedNodes: Node[] = lineageGraph.nodes.map((node: any) => ({
          ...node,
          data: {
            ...node.data,
            onNodeClick: (nodeId: string) => onNodeClick(nodeId, node.data),
          },
        })) as unknown as Node[];
        setRawNodes(mappedNodes);
        setRawEdges((lineageGraph.edges || []) as Edge[]);
      }
    }
  }, [useLayout, lineageGraph, setRawNodes, setRawEdges, onNodeClick]);

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
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView={fitView}
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
