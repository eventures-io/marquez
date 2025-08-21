
import { useEffect, useCallback } from 'react';
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
}

export const useLineageLayout = ({ 
  lineageGraph, 
  onNodeClick,
  availableHeight
}: UseLineageLayoutProps): UseLineageLayoutReturn => {
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
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
      } catch (error) {
        console.error('Error processing lineage data:', error);
      }
    };

    updateLayout();
  }, [lineageGraph, getLayoutedElements, setNodes, setEdges, onNodeClick, availableHeight]);

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