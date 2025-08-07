// @ts-nocheck
import React, { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
  MiniMap,
  Handle,
  Position,
} from '@xyflow/react'
import { Box } from '@mui/material'
import '@xyflow/react/dist/style.css'
import useELKLayout from './useELKLayout';
import CustomNode from './CustomNode';
import LineageFlow from './LineageFlow';
import { sampleLineageData } from './sampleLineageData';
import { Button, Stack, Typography } from '@mui/material';

 const initialNodes: Node[] = [
    {
      id: '1',
      type: 'custom',
      data: { label: 'Dataset A' },
      position: { x: 0, y: 0 }, // Will be overridden by ELK
      style: { width: 150, height: 40 },
    },
    {
      id: '2',
      type: 'custom',
      data: { label: 'Job 1' },
      position: { x: 0, y: 0 }, // Will be overridden by ELK
      style: { width: 150, height: 40 },
    },
    {
      id: '3',
      type: 'custom',
      data: { label: 'Dataset B' },
      position: { x: 0, y: 0 }, // Will be overridden by ELK
      style: { width: 150, height: 40 },
    },
    {
      id: '4',
      type: 'custom',
      data: { label: 'Job 2' },
      position: { x: 0, y: 0 }, // Will be overridden by ELK
      style: { width: 150, height: 40 },
    },
  ]

  const initialEdges: Edge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
    },
    {
      id: 'e2-3',
      source: '2',
      target: '3',
    },
    {
      id: 'e2-4',
      source: '2',
      target: '4',
    },
  ]

const nodeTypes = {
  custom: CustomNode,
};

const SimpleFlowDemo: React.FC = () => {
  const [demoMode, setDemoMode] = React.useState<'simple' | 'lineage'>('lineage');

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { getLayoutedElements } = useELKLayout();
 
  const onConnect = useCallback((params) => setEdges((els) => addEdge(params, els)), []);

  console.log('SimpleFlowDemo render - nodes:', nodes);
  console.log('SimpleFlowDemo render - edges:', edges);
  
  // Apply ELK layout on mount
  useEffect(() => {
    const layoutNodes = async () => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        initialNodes,
        initialEdges,
        600 // container height
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    };

    layoutNodes();
  }, [getLayoutedElements, setNodes, setEdges]);
  
  // Add error boundary
  React.useEffect(() => {
    console.log('Component mounted, nodes count:', nodes.length);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      console.log('Container dimensions:', rect.width, 'x', rect.height);
    }
  }, []);
  
  const onError = (error: Error) => {
    console.error('ReactFlow error:', error);
  };

  const onLayout = useCallback(async () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges, 600);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, getLayoutedElements, setNodes, setEdges]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h6">Dataset Lineage Demo</Typography>
        <Button
          variant={demoMode === 'simple' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setDemoMode('simple')}
        >
          Simple Demo
        </Button>
        <Button
          variant={demoMode === 'lineage' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setDemoMode('lineage')}
        >
          Lineage Demo
        </Button>
      </Stack>

      {demoMode === 'simple' && (
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
            >
              <Background />
              <Controls />
              <MiniMap />
              <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
                <button onClick={onLayout} style={{ padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>
                  Re-layout
                </button>
              </div>
            </ReactFlow>
          </ReactFlowProvider>
        </Box>
      )}

      {demoMode === 'lineage' && (
        <LineageFlow
          lineageData={sampleLineageData}
          currentNode="dataset_cleaned_customers"
          showFullLineage={true}
        />
      )}
    </Stack>
  )
}

export default SimpleFlowDemo