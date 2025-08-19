import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Chip, Divider } from '@mui/material';
import { getDataset } from '../../store/requests/datasets';
import { Dataset, NodeType } from '@app-types';

interface DatasetDetailsPaneProps {
  selectedNodeData: any | null;
  selectedNodeId: string | null;
}

const DatasetDetailsPane: React.FC<DatasetDetailsPaneProps> = ({
  selectedNodeData,
  selectedNodeId,
}) => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch dataset details when a dataset node is selected
  useEffect(() => {
    const fetchDatasetDetails = async () => {
      if (!selectedNodeData || selectedNodeData.type !== NodeType.DATASET) {
        return;
      }

      setLoading(true);
      try {
        const datasetData = await getDataset(
          selectedNodeData.dataset.namespace, 
          selectedNodeData.dataset.name
        );
        setDataset(datasetData);
      } catch (error) {
        console.error('Failed to fetch dataset details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDatasetDetails();
  }, [selectedNodeData]);

  if (!selectedNodeData || selectedNodeData.type !== NodeType.DATASET) {
    return null;
  }

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>
        Dataset Details
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          {dataset && (
            <>
              <Typography variant="body2" gutterBottom>
                <strong>Name:</strong> {dataset.name}
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                <strong>Namespace:</strong> {dataset.namespace}
              </Typography>

              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {dataset.type}
              </Typography>

              {dataset.description && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {dataset.description}
                  </Typography>
                </Box>
              )}

              {dataset.sourceName && (
                <Box mt={1}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Source:</strong> {dataset.sourceName}
                  </Typography>
                </Box>
              )}

              {dataset.tags && dataset.tags.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {dataset.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {dataset.fields && dataset.fields.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Schema ({dataset.fields.length} fields):
                  </Typography>
                  <Box 
                    sx={{ 
                      backgroundColor: '#f5f5f5', 
                      p: 1, 
                      borderRadius: 1,
                      maxHeight: 300,
                      overflow: 'auto',
                      border: '1px solid #ddd'
                    }}
                  >
                    {dataset.fields.map((field, index) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {field.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {field.type}
                          </Typography>
                        </Box>
                        {field.description && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            {field.description}
                          </Typography>
                        )}
                        {field.tags && field.tags.length > 0 && (
                          <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.25}>
                            {field.tags.map((tag, tagIndex) => (
                              <Chip
                                key={tagIndex}
                                label={tag}
                                size="small"
                                sx={{ height: '16px', fontSize: '0.6rem' }}
                              />
                            ))}
                          </Box>
                        )}
                        {index < dataset.fields.length - 1 && <Divider sx={{ mt: 1 }} />}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <Box mt={2}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Last updated: {new Date(dataset.updatedAt).toLocaleString()}
                </Typography>
              </Box>

            </>
          )}
        </>
      )}
    </Box>
  );
};

export default DatasetDetailsPane;