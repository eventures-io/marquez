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
  'elk.spacing.nodeNode': '80', // Reduced vertical spacing for better alignment
  'elk.layered.spacing.nodeNodeBetweenLayers': '200', // Horizontal spacing between layers
  'elk.layered.nodePlacement.strategy': 'SIMPLE', // Simpler alignment strategy
  'elk.layered.nodePlacement.bk.fixedAlignment': 'LEFTUP', // Align nodes to top-left
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP', // Reduce edge crossings
  'elk.layered.layering.strategy': 'LONGEST_PATH', // Better layer assignment
  'elk.layered.nodePlacement.linearSegments.deflectionDampening': '0.1',
  'elk.spacing.edgeNode': '30',
  'elk.spacing.edgeEdge': '20',
  'elk.padding': '[top=40,left=40,bottom=40,right=40]',
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
    
    let layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: elkNode?.x || 0,
          y: elkNode?.y || 0,
        },
      };
    });

    // Post-process to ensure minimum vertical spacing of 15px
    layoutedNodes = ensureMinimumVerticalSpacing(layoutedNodes, 15);

    return { 
      nodes: layoutedNodes, 
      edges,
      // Return graph bounds for optimal viewport calculation
      graphBounds: layoutedNodes.length > 0 ? (() => {
        const bounds = {
          width: layoutedGraph.width || 0,
          height: layoutedGraph.height || 0,
          minX: Math.min(...layoutedNodes.map(n => n.position.x)),
          maxX: Math.max(...layoutedNodes.map(n => n.position.x + (n.style?.width || 150))),
          minY: Math.min(...layoutedNodes.map(n => n.position.y)),
          maxY: Math.max(...layoutedNodes.map(n => n.position.y + (n.style?.height || 40))),
        };
        
        
        return bounds;
      })() : null
    };
  }, []);

  return { getLayoutedElements };
};

export default useELKLayout;