// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Drawer, styled } from '@mui/material';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
} from '@xyflow/react';
import useELKLayout from './useELKLayout';
import { TableLevelActionBar } from './TableLevelActionBar';
import { ReactFlowZoomControls } from './ReactFlowZoomControls';
import TableLevelNode from './TableLevelNode';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  tableLevel: TableLevelNode,
};

interface TableLevelFlowProps {
  lineageGraph: { nodes: any[], edges: any[] } | null;
  nodeType: 'DATASET' | 'JOB';
  depth: number;
  setDepth: (depth: number) => void;
  isCompact: boolean;
  setIsCompact: (isCompact: boolean) => void;
  isFull: boolean;
  setIsFull: (isFull: boolean) => void;
  onRefresh: () => void;
  loading?: boolean;
  error?: string | null;
}

const HEADER_HEIGHT = 64 + 1;

const StyledDrawerPaper = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'none',
  marginTop: `${HEADER_HEIGHT}px`,
  height: `calc(100vh - ${HEADER_HEIGHT}px)`,
  width: 400,
}));

const TableLevelFlow: React.FC<TableLevelFlowProps> = ({
  lineageGraph,
  nodeType,
  depth,
  setDepth,
  isCompact,
  setIsCompact,
  isFull,
  setIsFull,
  onRefresh,
  loading = false,
  error = null,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { getLayoutedElements } = useELKLayout();


  // Update layout when lineage graph changes
  useEffect(() => {
    const updateLayout = async () => {
      if (!lineageGraph || !lineageGraph.nodes || lineageGraph.nodes.length === 0) {
        return;
      }

      try {
        // Apply ELK layout to the pre-mapped nodes and edges
        const { nodes: layoutedNodes, edges: layoutedEdges, graphBounds } = await getLayoutedElements(
          lineageGraph.nodes,
          lineageGraph.edges,
          window.innerHeight - HEADER_HEIGHT * 2 - 100 // Adjust for action bar
        );


        // Clear nodes and edges first to force ReactFlow to completely re-render
        setNodes([]);
        setEdges([]);
        
        // Then set the new layout after a brief delay
        setTimeout(() => {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setStoredGraphBounds(graphBounds);
        }, 10);
        
        // Calculate optimal viewport to fit and center the graph
        if (graphBounds && layoutedNodes.length > 0) {
          // Use a slight delay to get accurate container dimensions after render
          setTimeout(() => {
            const container = document.querySelector('.react-flow');
            if (container) {
              const containerRect = container.getBoundingClientRect();
              const containerWidth = containerRect.width;
              const containerHeight = containerRect.height;
              
              
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
  }, [lineageGraph, getLayoutedElements, setNodes, setEdges]);


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
        onRefresh={onRefresh}
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
            component: StyledDrawerPaper,
          }}
        >
          <Box p={2}>
            <h3>Node Details</h3>
            <p>Selected node: {searchParams.get('tableLevelNode')}</p>
            {/* TODO: Add detailed node information */}
          </Box>
        </Drawer>

        <ReactFlowProvider>
          <div style={{ width: '100%', height: '100%' }}>
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

export default TableLevelFlow;