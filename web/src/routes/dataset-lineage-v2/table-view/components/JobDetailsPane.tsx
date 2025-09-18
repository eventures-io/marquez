import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useJobDetails } from '../useJobDetails';
import DatasetDetailsPane from './DatasetDetailsPane';
import { NodeType } from '@app-types';

interface JobDetailsPaneProps {
  selectedNodeData: any | null;
  selectedNodeId: string | null;
}

const JobDetailsPane: React.FC<JobDetailsPaneProps> = ({
  selectedNodeData,
  selectedNodeId,
}) => {
  const { jobDetails, jobFacets, detailsLoading } = useJobDetails(selectedNodeData);

  if (!selectedNodeData) return null;

  if (selectedNodeData.type === NodeType.DATASET) {
    return (
      <DatasetDetailsPane 
        selectedNodeData={selectedNodeData}
        selectedNodeId={selectedNodeId}
      />
    );
  }

  if (selectedNodeData.type !== NodeType.JOB) {
    return (
      <Box p={2}>
        <Typography variant="h6">Unknown Node Type</Typography>
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
                      color: '#333',
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

export default JobDetailsPane;