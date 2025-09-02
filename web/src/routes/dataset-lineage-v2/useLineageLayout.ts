
import { useEffect, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge, Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react';
import useELKLayout from './useELKLayout';

interface UseLineageLayoutReturn {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (params: Connection) => void;
}

interface UseLineageLayoutProps {
  lineageGraph: { nodes: any[], edges: any[] } | null;
  onNodeClick: (nodeId: string, nodeData: any) => void;
  availableHeight: number;
  lockELKLayout?: boolean;
}

export const useLineageLayout = ({ 
  lineageGraph, 
  onNodeClick,
  availableHeight,
  lockELKLayout = false,
}: UseLineageLayoutProps): UseLineageLayoutReturn => {
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { getLayoutedElements } = useELKLayout();
  const hasAppliedLayoutRef = useRef(false);

  // Update layout when lineage graph changes
  useEffect(() => {
    const updateLayout = async () => {
      if (!lineageGraph || !lineageGraph.nodes || lineageGraph.nodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      try {
        if (!lockELKLayout || !hasAppliedLayoutRef.current) {
          // Apply ELK layout to the pre-mapped nodes and edges (initial layout)
          const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
            lineageGraph.nodes,
            lineageGraph.edges
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
          if (lockELKLayout) {
            hasAppliedLayoutRef.current = true;
          }
        } else {
          // Layout is locked: preserve current positions even if edges/nodes change
          // Merge incoming node data with existing positions
          const currentById = new Map(nodes.map(n => [n.id, n] as const));
          const mergedNodes: Node[] = lineageGraph.nodes.map((incoming: any) => {
            const existing = currentById.get(incoming.id);
            const position = existing?.position || incoming.position || { x: 0, y: 0 };
            return {
              ...(existing || incoming),
              id: incoming.id,
              position,
              data: {
                ...incoming.data,
                onNodeClick: (nodeId: string) => onNodeClick(nodeId, incoming.data),
              },
            } as Node;
          });
          setNodes(mergedNodes);
          setEdges((lineageGraph.edges || []) as Edge[]);
        }
      } catch (error) {
        console.error('Error processing lineage data:', error);
      }
    };

    updateLayout();
  }, [lineageGraph, getLayoutedElements, setNodes, setEdges, onNodeClick, availableHeight, lockELKLayout]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  };
};
