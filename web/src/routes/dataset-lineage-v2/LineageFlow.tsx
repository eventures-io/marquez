// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
  MiniMap,
} from '@xyflow/react';
import { Box, Button, Stack } from '@mui/material';
import '@xyflow/react/dist/style.css';
import useELKLayout from './useELKLayout';
import CustomNode from './CustomNode';
import { createReactFlowElements } from './lineageMapping';
import { LineageGraph } from '../../types/api';

const nodeTypes = {
  custom: CustomNode,
};

interface LineageFlowProps {
  lineageData: LineageGraph;
  currentNode?: string;
  showFullLineage?: boolean;
}

const LineageFlow: React.FC<LineageFlowProps> = ({
  lineageData,
  currentNode = null,
  showFullLineage = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullLineage, setIsFullLineage] = useState(showFullLineage);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { getLayoutedElements } = useELKLayout();

  const onConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [setEdges]
  );

  // Load and layout lineage data
  useEffect(() => {
    const loadLineageData = async () => {
      try {
        // Convert lineage data to ReactFlow format
        const { nodes: reactFlowNodes, edges: reactFlowEdges } = createReactFlowElements(
          lineageData,
          currentNode,
          isFullLineage
        );

        console.log('Generated nodes:', reactFlowNodes.length);
        console.log('Generated edges:', reactFlowEdges.length);

        if (reactFlowNodes.length === 0) {
          console.warn('No nodes generated from lineage data');
          return;
        }

        // Apply ELK layout
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
          reactFlowNodes,
          reactFlowEdges,
          600 // container height
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      } catch (error) {
        console.error('Error loading lineage data:', error);
      }
    };

    if (lineageData && lineageData.graph && lineageData.graph.length > 0) {
      loadLineageData();
    }
  }, [lineageData, currentNode, isFullLineage, getLayoutedElements, setNodes, setEdges]);

  const onLayout = useCallback(async () => {
    if (nodes.length === 0) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
      nodes,
      edges,
      600
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, getLayoutedElements, setNodes, setEdges]);

  const toggleFullLineage = useCallback(() => {
    setIsFullLineage(!isFullLineage);
  }, [isFullLineage]);

  const onError = (error: Error) => {
    console.error('ReactFlow error:', error);
  };

  return (
    <Box ref={containerRef} height="600px" width="100%" border="1px solid #ddd" borderRadius="4px">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onError={onError}
          nodeTypes={nodeTypes}
          style={{ width: '100%', height: '100%' }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          className="react-flow"
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
          
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={onLayout}
                sx={{ backgroundColor: '#fff' }}
              >
                Re-layout
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={toggleFullLineage}
                sx={{ backgroundColor: '#fff' }}
              >
                {isFullLineage ? 'Focus' : 'Full'} Lineage
              </Button>
            </Stack>
          </div>
        </ReactFlow>
      </ReactFlowProvider>
    </Box>
  );
};

export default LineageFlow;