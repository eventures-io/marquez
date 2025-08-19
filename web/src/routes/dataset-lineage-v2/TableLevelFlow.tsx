// @ts-nocheck
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { TableLevelActionBar } from './TableLevelActionBar';
import { getJob } from '../../store/requests/jobs';
import { getJobFacets } from '../../store/requests/facets';
import { Job, Run } from '../../types/api';
import DetailsPane from './DetailsPane';
import LineageGraph from './LineageGraph';
import '@xyflow/react/dist/style.css';


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
        <DetailsPane ref={drawerRef} open={isDrawerOpen} onClose={handlePaneClick}>
          {renderJobDetails()}
        </DetailsPane>

        <LineageGraph
          lineageGraph={lineageGraph}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          loading={loading}
          error={error}
        />
      </Box>
    </>
  );
};

export default TableLevelFlow;