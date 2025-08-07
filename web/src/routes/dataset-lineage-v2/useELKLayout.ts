// @ts-nocheck
import { useCallback } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from '@xyflow/react';

const elk = new ELK();

// ELK layout options
const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.edgeNode': '40',
  'elk.spacing.edgeEdge': '10',
};

const useELKLayout = () => {
  const getLayoutedElements = useCallback(async (nodes: Node[], edges: Edge[], containerHeight: number = 600) => {
    const graph = {
      id: 'root',
      layoutOptions: layoutOptions,
      children: nodes.map((node) => ({
        id: node.id,
        width: node.style?.width || 150,
        height: node.style?.height || 40,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    const layoutedGraph = await elk.layout(graph);
    
    // Calculate vertical offset to center the layout
    const graphHeight = layoutedGraph.height || 0;
    const verticalOffset = Math.max(0, (containerHeight - graphHeight) / 2);

    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: (elkNode?.x || 0) + 50, // Add some left margin
          y: (elkNode?.y || 0) + verticalOffset,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  }, []);

  return { getLayoutedElements };
};

export default useELKLayout;