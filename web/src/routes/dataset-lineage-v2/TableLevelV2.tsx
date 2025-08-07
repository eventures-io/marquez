// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Drawer } from '@mui/material';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
  useReactFlow,
} from '@xyflow/react';
import { HEADER_HEIGHT, theme } from '../../helpers/theme';
import { LineageGraph } from '../../types/api';
import { getLineage } from '../../store/requests/lineage';
import { generateNodeId } from '../../helpers/nodes';
import { createTableLevelElements } from './tableLevelMapping';
import useELKLayout from './useELKLayout';
import { TableLevelActionBar } from './TableLevelActionBar';
import { ReactFlowZoomControls } from './ReactFlowZoomControls';
import TableLevelNode from './TableLevelNode';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  tableLevel: TableLevelNode,
};

interface TableLevelV2Props {
  lineageData?: LineageGraph | null;
  namespace?: string;
  name?: string;
  nodeType?: string;
}

const TableLevelV2: React.FC<TableLevelV2Props> = ({ 
  lineageData: propLineageData,
  namespace: propNamespace,
  name: propName,
  nodeType: propNodeType
}) => {
  // Get from URL params if not provided as props
  const { nodeType: urlNodeType, namespace: urlNamespace, name: urlName } = useParams<{ 
    nodeType: string; 
    namespace: string; 
    name: string; 
  }>();
  
  const nodeType = propNodeType || urlNodeType;
  const namespace = propNamespace || urlNamespace;
  const name = propName || urlName;
  
  console.log('TableLevelV2 params:', { nodeType, namespace, name });
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [lineageData, setLineageData] = useState<LineageGraph | null>(propLineageData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Control states
  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2);
  const [isCompact, setIsCompact] = useState(searchParams.get('isCompact') === 'true');
  const [isFull, setIsFull] = useState(searchParams.get('isFull') === 'true');
  
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { getLayoutedElements } = useELKLayout();
  
  const currentNodeId = namespace && name && nodeType ? 
    generateNodeId(nodeType.toUpperCase() as 'DATASET' | 'JOB', namespace, name) : null;
  const collapsedNodes = searchParams.get('collapsedNodes');

  // Fetch lineage data (only if not provided as props)
  const fetchLineageData = useCallback(async () => {
    if (!namespace || !name || !nodeType || propLineageData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getLineage(
        nodeType.toUpperCase() as 'DATASET' | 'JOB', 
        namespace, 
        name, 
        depth
      );
      setLineageData(data);
      console.log('Fetched lineage data:', data);
    } catch (error) {
      console.error('Failed to fetch lineage:', error);
      setError('Failed to fetch lineage data');
    } finally {
      setLoading(false);
    }
  }, [namespace, name, nodeType, depth, propLineageData]);

  // Load and layout lineage data
  useEffect(() => {
    if (propLineageData) {
      setLineageData(propLineageData);
      console.log('Using prop lineage data:', propLineageData);
    } else {
      fetchLineageData();
    }
  }, [fetchLineageData, propLineageData]);

  // Update layout when data or settings change
  useEffect(() => {
    const updateLayout = async () => {
      if (!lineageData || lineageData.graph.length === 0) {
        console.log('No lineage data available for layout');
        return;
      }

      try {
        console.log('Processing lineage data:', lineageData);
        console.log('Settings:', { currentNodeId, isCompact, isFull, collapsedNodes });

        // Convert lineage data to ReactFlow format
        const { nodes: reactFlowNodes, edges: reactFlowEdges } = createTableLevelElements(
          lineageData,
          currentNodeId,
          isCompact,
          isFull,
          collapsedNodes
        );

        console.log('Generated ReactFlow nodes:', reactFlowNodes);
        console.log('Generated ReactFlow edges:', reactFlowEdges);

        if (reactFlowNodes.length === 0) {
          console.warn('No nodes generated from lineage data');
          return;
        }

        // Apply ELK layout
        const { nodes: layoutedNodes, edges: layoutedEdges, graphBounds } = await getLayoutedElements(
          reactFlowNodes,
          reactFlowEdges,
          window.innerHeight - HEADER_HEIGHT * 2 - 100 // Adjust for action bar
        );

        console.log('Layouted nodes:', layoutedNodes);
        console.log('Layouted edges:', layoutedEdges);
        console.log('Graph bounds:', graphBounds);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setStoredGraphBounds(graphBounds);
        
        // Calculate optimal viewport to fit and center the graph
        if (graphBounds && layoutedNodes.length > 0) {
          // Use a slight delay to get accurate container dimensions after render
          setTimeout(() => {
            const container = document.querySelector('.react-flow');
            if (container) {
              const containerRect = container.getBoundingClientRect();
              const containerWidth = containerRect.width;
              const containerHeight = containerRect.height;
              
              console.log('Raw container dimensions from getBoundingClientRect:', { containerWidth, containerHeight });
              console.log('Window dimensions:', { windowWidth: window.innerWidth, windowHeight: window.innerHeight });
              console.log('Header height:', HEADER_HEIGHT);
              
              // Calculate optimal zoom to fit the graph with consistent padding on all sides
              const padding = 15; // Reduced padding to give more space for the graph
              const availableWidth = containerWidth - padding * 2;
              const availableHeight = containerHeight - padding * 2;
              const graphWidth = graphBounds.maxX - graphBounds.minX;
              const graphHeight = graphBounds.maxY - graphBounds.minY;
              
              const scaleX = availableWidth / graphWidth;
              const scaleY = availableHeight / graphHeight;
              const optimalZoom = Math.min(scaleX, scaleY, 0.8); // Cap at 0.8x zoom to ensure all nodes are visible
              
              // Calculate position to center the graph in the actual container
              // Ensure the graph is centered within the available space (accounting for padding)
              const centerX = (graphBounds.minX + graphBounds.maxX) / 2;
              const centerY = (graphBounds.minY + graphBounds.maxY) / 2;
              const x = (containerWidth / 2) - (centerX * optimalZoom);
              const y = (containerHeight / 2) - (centerY * optimalZoom);
              
              // For Y positioning, ensure the top of the graph has minimum padding
              const topY = padding - graphBounds.minY * optimalZoom;
              
              const finalX = x;
              const finalY = Math.max(topY, y);
              
              console.log('Container dimensions:', { containerWidth, containerHeight });
              console.log('Available space after padding:', { availableWidth, availableHeight });
              console.log('Graph bounds:', graphBounds);
              console.log('Graph actual size:', { graphWidth, graphHeight });
              console.log('Scale factors:', { scaleX, scaleY });
              console.log('Calculated viewport:', { x, y, zoom: optimalZoom });
              console.log('Final viewport (with padding):', { x: finalX, y: finalY, zoom: optimalZoom });
              
              // Update viewport state with final coordinates that respect padding
              setViewportState({ x: finalX, y: finalY, zoom: optimalZoom });
            }
          }, 150); // Slight delay to ensure container is fully rendered
        }
      } catch (error) {
        console.error('Error processing lineage data:', error);
      }
    };

    updateLayout();
  }, [lineageData, currentNodeId, isCompact, isFull, collapsedNodes, getLayoutedElements, setNodes, setEdges]);

  // Update URL params when controls change
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('depth', depth.toString());
    newSearchParams.set('isCompact', isCompact.toString());
    newSearchParams.set('isFull', isFull.toString());
    setSearchParams(newSearchParams);
  }, [depth, isCompact, isFull, setSearchParams]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onError = (error: Error) => {
    console.error('ReactFlow error:', error);
  };

  // Create viewport state
  const [viewport, setViewportState] = useState({ x: 0, y: 0, zoom: 1 });
  const [storedGraphBounds, setStoredGraphBounds] = useState(null);
  
  // Custom fit view function that uses our viewport calculation
  const customFitView = useCallback(() => {
    if (!storedGraphBounds) return;
    
    const container = document.querySelector('.react-flow');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      const padding = 15;
      const availableWidth = containerWidth - padding * 2;
      const availableHeight = containerHeight - padding * 2;
      const graphWidth = storedGraphBounds.maxX - storedGraphBounds.minX;
      const graphHeight = storedGraphBounds.maxY - storedGraphBounds.minY;
      
      const scaleX = availableWidth / graphWidth;
      const scaleY = availableHeight / graphHeight;
      const optimalZoom = Math.min(scaleX, scaleY, 0.8);
      
      const centerX = (storedGraphBounds.minX + storedGraphBounds.maxX) / 2;
      const centerY = (storedGraphBounds.minY + storedGraphBounds.maxY) / 2;
      const x = (containerWidth / 2) - (centerX * optimalZoom);
      const y = (containerHeight / 2) - (centerY * optimalZoom);
      
      const topY = padding - storedGraphBounds.minY * optimalZoom;
      
      const finalX = x;
      const finalY = Math.max(topY, y);
      
      setViewportState({ x: finalX, y: finalY, zoom: optimalZoom });
    }
  }, [storedGraphBounds]);

  console.log('TableLevelV2 render - nodes:', nodes.length, nodes);
  console.log('TableLevelV2 render - edges:', edges.length, edges);
  console.log('TableLevelV2 render - nodeTypes:', nodeTypes);

  if (loading) {
    return (
      <Box height={`calc(100vh - ${HEADER_HEIGHT}px)`} display="flex" alignItems="center" justifyContent="center">
        Loading lineage data...
      </Box>
    );
  }

  if (error) {
    return (
      <Box height={`calc(100vh - ${HEADER_HEIGHT}px)`} p={2}>
        Error: {error}
      </Box>
    );
  }

  return (
    <>
      <TableLevelActionBar
        nodeType={nodeType?.toUpperCase() as 'DATASET' | 'JOB'}
        depth={depth}
        setDepth={setDepth}
        isCompact={isCompact}
        setIsCompact={setIsCompact}
        isFull={isFull}
        setIsFull={setIsFull}
        onRefresh={fetchLineageData}
      />
      
      <Box 
        height={`calc(100vh - ${HEADER_HEIGHT}px - 60px)`}
        sx={{ overflow: 'hidden', backgroundColor: 'white' }}
      >
        {/* Drawer for node details */}
        <Drawer
          anchor="right"
          open={!!searchParams.get('tableLevelNode')}
          onClose={() => {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('tableLevelNode');
            setSearchParams(newParams);
          }}
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.default,
              backgroundImage: 'none',
              mt: `${HEADER_HEIGHT}px`,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              width: 400,
            },
          }}
        >
          <Box p={2}>
            <h3>Node Details</h3>
            <p>Selected node: {searchParams.get('tableLevelNode')}</p>
            {/* TODO: Add detailed node information */}
          </Box>
        </Drawer>

        <ReactFlowProvider>
          <div style={{ width: '100%', height: '100%', border: '2px solid red' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onError={onError}
              nodeTypes={nodeTypes}
              style={{ width: '100%', height: '100%' }}
              className="react-flow"
              viewport={viewport}
              onViewportChange={setViewportState}
              fitViewOptions={{ padding: 50 }}
            >
              <Background />
              <ReactFlowZoomControls onFitView={customFitView} />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </Box>
    </>
  );
};

export default TableLevelV2;