// @ts-nocheck
import { useCallback } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from '@xyflow/react';

const elk = new ELK();

// Function to ensure minimum vertical spacing between nodes
const ensureMinimumVerticalSpacing = (nodes: Node[], minSpacing: number): Node[] => {
  // Group nodes by their x position (same column)
  const nodesByColumn = new Map<number, Node[]>();
  
  nodes.forEach((node) => {
    const x = Math.round(node.position.x / 10) * 10; // Round to nearest 10px for grouping
    if (!nodesByColumn.has(x)) {
      nodesByColumn.set(x, []);
    }
    nodesByColumn.get(x)!.push(node);
  });

  // For each column, sort by y position and adjust spacing
  nodesByColumn.forEach((columnNodes) => {
    columnNodes.sort((a, b) => a.position.y - b.position.y);
    
    for (let i = 1; i < columnNodes.length; i++) {
      const prevNode = columnNodes[i - 1];
      const currentNode = columnNodes[i];
      const prevNodeHeight = prevNode.style?.height || 40;
      const minY = prevNode.position.y + prevNodeHeight + minSpacing;
      
      if (currentNode.position.y < minY) {
        currentNode.position.y = minY;
      }
    }
  });

  return nodes;
};

// ELK layout options
const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '120', // Much larger minimum spacing between nodes
  'elk.layered.spacing.nodeNodeBetweenLayers': '200', // Horizontal spacing between layers
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.spacing.edgeNodeBetweenLayers': '60',
  'elk.spacing.edgeNode': '40',
  'elk.spacing.edgeEdge': '25',
  'elk.padding': '[top=40,left=40,bottom=40,right=40]',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.separateConnectedComponents': 'false',
};

const useELKLayout = () => {
  const getLayoutedElements = useCallback(async (nodes: Node[], edges: Edge[], containerHeight: number = 600) => {
    const graph = {
      id: 'root',
      layoutOptions: layoutOptions,
      children: nodes.map((node) => {
        const width = node.style?.width || 150;
        const height = node.style?.height || 40;
        console.log(`ELK node ${node.id}: width=${width}, height=${height}`);
        return {
          id: node.id,
          width,
          height,
        };
      }),
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

    let layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: (elkNode?.x || 0) + 50, // Add some left margin
          y: (elkNode?.y || 0) + verticalOffset,
        },
      };
    });

    // Post-process to ensure minimum vertical spacing of 15px
    console.log('Before spacing adjustment:', layoutedNodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y, height: n.style?.height })));
    layoutedNodes = ensureMinimumVerticalSpacing(layoutedNodes, 15);
    console.log('After spacing adjustment:', layoutedNodes.map(n => ({ id: n.id, x: n.position.x, y: n.position.y, height: n.style?.height })));

    return { nodes: layoutedNodes, edges };
  }, []);

  return { getLayoutedElements };
};

export default useELKLayout;