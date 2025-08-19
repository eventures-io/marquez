// @ts-nocheck
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, styled, Typography, CircularProgress } from '@mui/material';
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
import { getJob } from '../../store/requests/jobs';
import { getJobFacets } from '../../store/requests/facets';
import { Job, Run } from '../../types/api';
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

const DetailsPane = styled('div')<{ open: boolean }>(({ theme, open }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  height: '100%',
  width: 400,
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'none',
  boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
  transform: open ? 'translateX(0)' : 'translateX(calc(100% + 10px))',
  transition: 'transform 0.3s ease-in-out',
  zIndex: 1000,
  overflow: 'auto',
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [jobFacets, setJobFacets] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { getLayoutedElements } = useELKLayout();

  // Handle click outside drawer to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isDrawerOpen) return;
      
      const target = event.target as HTMLElement;
      
      // Check if click is inside the drawer
      if (drawerRef.current && drawerRef.current.contains(target)) {
        return;
      }
      
      // Check if click is on a ReactFlow node (which should open drawer, not close it)
      if (target.closest('.react-flow__node')) {
        return;
      }
      
      // Close drawer for clicks outside
      setIsDrawerOpen(false);
      setSelectedNodeId(null);
    };

    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDrawerOpen]);

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

        // Add click handler to node data
        const nodesWithClickHandler = layoutedNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onNodeClick: (nodeId: string) => handleNodeClick(nodeId, node.data),
          },
        }));

        setNodes(nodesWithClickHandler);
        setEdges(layoutedEdges);
      } catch (error) {
        console.error('Error processing lineage data:', error);
      }
    };

    updateLayout();
  }, [lineageGraph, getLayoutedElements, setNodes, setEdges]);

  // Fetch job details when a job node is selected
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!selectedNodeData || selectedNodeData.type !== 'JOB') {
        return;
      }

      setDetailsLoading(true);
      try {
        const job = await getJob(selectedNodeData.job.namespace, selectedNodeData.job.name);
        setJobDetails(job);

        // If there's a latest run, fetch job facets
        if (job.latestRun?.id) {
          const facets = await getJobFacets(job.latestRun.id);
          setJobFacets(facets);
        }
      } catch (error) {
        console.error('Failed to fetch job details:', error);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchJobDetails();
  }, [selectedNodeData]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeData(nodeData);
    setJobDetails(null);
    setJobFacets(null);
    setIsDrawerOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedNodeId(null);
    setSelectedNodeData(null);
    setJobDetails(null);
    setJobFacets(null);
  }, []);

  const onError = (error: Error) => {
    console.error('ReactFlow error:', error);
  };

  const renderJobDetails = () => {
    if (!selectedNodeData) return null;

    if (selectedNodeData.type !== 'JOB') {
      return (
        <Box p={2}>
          <Typography variant="h6">Dataset Details</Typography>
          <Typography variant="body2">Selected node: {selectedNodeId}</Typography>
          <Typography variant="body2">Type: {selectedNodeData.type}</Typography>
        </Box>
      );
    }

    return (
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Job Details
        </Typography>
        
        {detailsLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {jobDetails && (
              <>
                {(jobDetails.description || jobFacets?.facets?.documentation?.description) && (
                  <Box mt={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      Description:
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {jobFacets?.facets?.documentation?.description || jobDetails.description}
                    </Typography>
                  </Box>
                )}

                {jobFacets?.facets?.sql?.query && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      SQL Query:
                    </Typography>
                    <Box 
                      sx={{ 
                        backgroundColor: '#f5f5f5', 
                        p: 1, 
                        borderRadius: 1,
                        maxHeight: 300,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid #ddd'
                      }}
                    >
                      {jobFacets.facets.sql.query}
                    </Box>
                  </Box>
                )}

              </>
            )}
          </>
        )}
      </Box>
    );
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
        sx={{ overflow: 'hidden', backgroundColor: 'white', position: 'relative' }}
      >
        {/* Details pane for node details */}
        <DetailsPane ref={drawerRef} open={isDrawerOpen}>
          {renderJobDetails()}
        </DetailsPane>

        <ReactFlowProvider>
          <div className="graph-container" style={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={handlePaneClick}
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

export default TableLevelFlow;