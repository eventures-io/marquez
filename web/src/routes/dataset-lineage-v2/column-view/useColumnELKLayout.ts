import { useCallback } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from '@xyflow/react';

const elk = new ELK();

// ELK layout options for column view (optimized for clarity like original Marquez)
const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.separateConnectedComponents': 'false',
  'elk.layered.nodePlacement.strategy': 'STRETCH_WIDTH',
  'elk.layered.layering.strategy': 'NETWORK_SIMPLEX', // Better layer assignment
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.nodePlacement.bk.edgeStraightening': 'IMPROVE_STRAIGHTNESS',
  'elk.layered.edgeRouting.splines.mode': 'ORTHOGONAL', // Cleaner edge routing
  'elk.layered.cycleBreaking.strategy': 'GREEDY',
  'elk.layered.portAlignment.default': 'CENTER',
  'elk.layered.nodeSize.options': 'DEFAULT_MINIMUM_SIZE',
  'elk.layered.mergeEdges': 'false',
  'elk.layered.contentAlignment': 'V_CENTER',
  'elk.layered.crossingMinimization.semiInteractive': 'false',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.nodeLabels.placement': '[H_CENTER, V_TOP, INSIDE]',
  'elk.spacing.nodeNode': '150', // Increased horizontal spacing for clarity
  'elk.spacing.edgeNode': '60', // More space between edges and nodes
  'elk.spacing.edgeEdge': '30', // More space between edges
  'elk.layered.spacing.nodeNodeBetweenLayers': '150', // Consistent spacing between layers
  'elk.layered.spacing.edgeNodeBetweenLayers': '60', // Space between edges and nodes in different layers
  'elk.padding': '[top=50,left=50,bottom=50,right=50]', // More padding for better visual clarity
};

const useColumnELKLayout = () => {
  const getLayoutedElements = useCallback(async (nodes: Node[], edges: Edge[]) => {
    // Separate dataset and column nodes
    const datasetNodes = nodes.filter(n => n.type === 'dataset-container');
    const columnNodes = nodes.filter(n => n.type === 'column-field');
    
    // Layout constants
    const columnHeight = 50; // Height per column field
    const columnSpacing = 24; // Vertical spacing between column fields (match create/edit)
    const headerHeight = 60; // Space for dataset header
    const bottomPadding = 20; // Bottom padding for container
    
    // Build hierarchical ELK structure like the original implementation
    const elkDatasetNodes = datasetNodes.map(datasetNode => {
      // Find all column nodes that belong to this dataset
      const childColumns = columnNodes.filter(col => 
        col.data?.parentDatasetId === datasetNode.id
      );
      
      // Calculate dataset height dynamically based on child columns with spacing and bottom padding
      const calculatedHeight = Math.max(120, headerHeight + childColumns.length * (columnHeight + columnSpacing) + bottomPadding);
      
      return {
        id: datasetNode.id,
        width: typeof datasetNode.style?.width === 'number' ? datasetNode.style.width : 300,
        height: calculatedHeight,
        children: childColumns.map(col => ({
          id: col.id,
          width: typeof col.style?.width === 'number' ? col.style.width : 220,
          height: columnHeight,
        })),
        layoutOptions: {
          'elk.padding': '[top=60,left=30,bottom=30,right=30]', // More padding for clarity
        }
      };
    });
    
    // Create ELK graph with hierarchical structure
    const graph = {
      id: 'root',
      layoutOptions: layoutOptions,
      children: elkDatasetNodes,
      edges: edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    try {
      const layoutedGraph = await elk.layout(graph);
      
      // Apply layout positions to nodes - handle both datasets and their children
      const layoutedNodes: Node[] = [];
      
      datasetNodes.forEach(datasetNode => {
        const elkDataset = layoutedGraph.children?.find((n) => n.id === datasetNode.id);
        if (elkDataset) {
          // Add positioned dataset node
          layoutedNodes.push({
            ...datasetNode,
            position: {
              x: elkDataset.x || 0,
              y: elkDataset.y || 0,
            },
          });
          
          // Add positioned column nodes as children
          const childColumns = columnNodes.filter(col => 
            col.data?.parentDatasetId === datasetNode.id
          );
          
          childColumns.forEach((columnNode, index) => {
            const elkColumn = elkDataset.children?.find(child => child.id === columnNode.id);
            if (elkColumn) {
              // Instead of using ELK's child positioning (which can overflow),
              // position children manually within container bounds with proper spacing
              const childX = (elkDataset.x || 0) + 30; // Left padding to match container
              const childY = (elkDataset.y || 0) + headerHeight + (index * (columnHeight + columnSpacing));
              
              layoutedNodes.push({
                ...columnNode,
                position: {
                  x: childX,
                  y: childY,
                },
              });
            }
          });
        }
      });

      return { 
        nodes: layoutedNodes, 
        edges,
        graphBounds: layoutedGraph.width && layoutedGraph.height ? {
          width: layoutedGraph.width,
          height: layoutedGraph.height,
          minX: 0,
          maxX: layoutedGraph.width,
          minY: 0,
          maxY: layoutedGraph.height,
        } : null
      };
    } catch (error) {
      console.error('ELK layout error:', error);
      // Return original nodes if layout fails
      return { nodes, edges, graphBounds: null };
    }
  }, []);

  return { getLayoutedElements };
};

export default useColumnELKLayout;
