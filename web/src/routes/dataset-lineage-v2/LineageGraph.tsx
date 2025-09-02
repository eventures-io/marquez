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
import { computeNodeStyleFromData } from './helpers/computeNodeStyle';

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
  allowConnect?: boolean;
}

const HEADER_HEIGHT = 64 + 1;

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
  allowConnect = true,
}) => {
  const { screenToFlowPosition, getNodes } = useReactFlow();


  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: any) => {
    // Handle node connect
    if (onConnectEnd) {
      onConnectEnd(event, connectionState);
    }

    // Handle node creation 
    if (onNodeCreate && connectionState && !connectionState.isValid && connectionState.fromNode) {
      // Snapshot existing node ids before creation
      const beforeIds = new Set(getNodes().map((n) => n.id));

      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;

      const position = screenToFlowPosition({ x: clientX, y: clientY });
      
      // Find the source node type from lineage graph or live RF state
      const sourceNode = lineageGraph?.nodes?.find(node => node.id === connectionState.fromNode.id);
      let sourceNodeType = sourceNode?.data?.type;
      const rfNode = getNodes().find((n) => n.id === connectionState.fromNode.id);
      if (!sourceNodeType && rfNode) {
        sourceNodeType = (rfNode as any)?.data?.type;
      }

      // Center the new node at drop point
      if (sourceNodeType) {
        const newNodeType = sourceNodeType === NodeType.DATASET ? NodeType.JOB : NodeType.DATASET;
        const dims = computeNodeStyleFromData({ type: newNodeType, dataset: newNodeType === NodeType.DATASET ? { fields: [] } : undefined });
        position.x = position.x - dims.width / 2;
        position.y = position.y - dims.height;
      }
      
      if (sourceNodeType) {
        const fromId = connectionState.fromNode.id;
        onNodeCreate(fromId, sourceNodeType, position);

        // Auto-select the newly created node and open the drawer
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
        setTimeout(() => trySelect(0), 0);
      }
    }
  }, [onConnectEnd, onNodeCreate, lineageGraph, screenToFlowPosition, getNodes, onNodeClick]);


  const availableHeight = window.innerHeight - HEADER_HEIGHT * 2 - 100; 


  const layoutHook = useLineageLayout({ lineageGraph, onNodeClick, availableHeight, lockELKLayout });
  const [rawNodes, setRawNodes, onRawNodesChange] = useNodesState<Node>([]);
  const [rawEdges, setRawEdges, onRawEdgesChange] = useEdgesState<Edge>([]);
  const onRawConnect = useCallback((params: Connection) => setRawEdges((eds) => addEdge(params, eds)), [setRawEdges]);

  const nodes = useLayout ? layoutHook.nodes : rawNodes;
  const edges = useLayout ? layoutHook.edges : rawEdges;
  const onNodesChange = useLayout ? layoutHook.onNodesChange : onRawNodesChange;
  const onEdgesChange = useLayout ? layoutHook.onEdgesChange : onRawEdgesChange;


  const handleConnect = useCallback((params: Connection) => {
    if (!allowConnect) return; 
    const source = params.source as string | undefined;
    const target = params.target as string | undefined;
    if (onEdgeCreate && source && target) {
      // Validate connection types using lineageGraph first, then live RF state
      const sourceNode = lineageGraph?.nodes?.find((n) => n.id === source);
      const targetNode = lineageGraph?.nodes?.find((n) => n.id === target);
      let sType = (sourceNode as any)?.data?.type as NodeType | undefined;
      let tType = (targetNode as any)?.data?.type as NodeType | undefined;

      if (!sType || !tType) {
        const rfNodes = getNodes();
        const sLive = rfNodes.find((n) => n.id === source);
        const tLive = rfNodes.find((n) => n.id === target);
        sType = sType || ((sLive as any)?.data?.type as NodeType | undefined);
        tType = tType || ((tLive as any)?.data?.type as NodeType | undefined);
      }

      if (sType && tType && sType !== tType) {
        onEdgeCreate(source, target);
      }
      return;
    }
    (useLayout ? layoutHook.onConnect : onRawConnect)(params);
  }, [allowConnect, onEdgeCreate, lineageGraph, getNodes, layoutHook.onConnect, onRawConnect, useLayout]);

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
        nodesConnectable={allowConnect}
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
