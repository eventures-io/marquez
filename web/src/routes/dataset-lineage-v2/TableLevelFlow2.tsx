// @ts-nocheck
import React, { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Drawer, styled } from '@mui/material';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
  Controls,
  MiniMap,
} from '@xyflow/react';
import useELKLayout from './useELKLayout';
import { TableLevelActionBar } from './TableLevelActionBar';
import TableLevelNode from './TableLevelNode';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  tableLevel: TableLevelNode,
};

interface TableLevelFlow2Props {
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

const TableLevelFlow2: React.FC<TableLevelFlow2Props> = ({
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
        setNodes([]);
        setEdges([]);
        return;
      }

      try {
        // Apply ELK layout to the pre-mapped nodes and edges
        const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
          lineageGraph.nodes,
          lineageGraph.edges,
          window.innerHeight - HEADER_HEIGHT * 2 - 100 // Adjust for action bar
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
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
        nodeType={nodeType}
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
              fitView
              fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
              style={{ width: '100%', height: '100%' }}
              className="react-flow"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </Box>
    </>
  );
};

export default TableLevelFlow2;