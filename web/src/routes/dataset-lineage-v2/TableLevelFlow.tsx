// @ts-nocheck
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { TableLevelActionBar } from './TableLevelActionBar';
import DetailsPane from './DetailsPane';
import LineageGraph from './LineageGraph';
import { useJobDetails } from './useJobDetails';
import { useDrawerState } from './useDrawerState';
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
  
  // Custom hooks
  const { isDrawerOpen, selectedNodeId, selectedNodeData, drawerRef, handleNodeClick, handlePaneClick } = useDrawerState();
  const { jobDetails, jobFacets, detailsLoading } = useJobDetails(selectedNodeData);

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