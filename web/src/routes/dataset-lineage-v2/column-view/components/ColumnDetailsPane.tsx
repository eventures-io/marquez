import React from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Divider, 
  Paper,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface ColumnDetailsPaneProps {
  columnData: {
    id: string;
    fieldName: string;
    dataType?: string;
    namespace: string;
    datasetName: string;
    description?: string;
    isPrimaryKey?: boolean;
    isNullable?: boolean;
    parentDatasetId?: string;
  } | null;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
}));

// TODO: Remove if no longer used; 
const ColumnDetailsPane: React.FC<ColumnDetailsPaneProps> = ({ columnData }) => {
  if (!columnData) {
    return (
      <Box p={3}>
        <Typography variant="h6" color="text.secondary">
          Select a column to view details
        </Typography>
      </Box>
    );
  }

  const getTypeColor = (type?: string) => {
    if (!type) return 'default';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('number')) return 'info';
    if (lowerType.includes('string') || lowerType.includes('varchar') || lowerType.includes('text')) return 'success';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'warning';
    if (lowerType.includes('bool')) return 'secondary';
    return 'default';
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Column Details
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {columnData.namespace} • {columnData.datasetName}
        </Typography>
      </Box>

      {/* Column Information */}
      <StyledPaper elevation={0}>
        <Stack spacing={2}>
          {/* Column Name */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              Column Name
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {columnData.fieldName}
              </Typography>
              {columnData.isPrimaryKey && (
                <Chip 
                  label="Primary Key" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Data Type */}
          {columnData.dataType && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Data Type
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={columnData.dataType}
                  color={getTypeColor(columnData.dataType)}
                  size="small"
                />
                {columnData.isNullable === false && (
                  <Chip 
                    label="NOT NULL" 
                    size="small" 
                    color="warning" 
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Description */}
          {columnData.description && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Description
                </Typography>
                <Typography variant="body2">
                  {columnData.description}
                </Typography>
              </Box>
            </>
          )}

          {/* Column ID */}
          <Divider />
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              Column ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
              {columnData.id}
            </Typography>
          </Box>
        </Stack>
      </StyledPaper>

      {/* Dataset Information */}
      <StyledPaper elevation={0}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Dataset Information
        </Typography>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              Namespace:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {columnData.namespace}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              Dataset:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {columnData.datasetName}
            </Typography>
          </Box>
        </Stack>
      </StyledPaper>

      {/* Lineage Information */}
      <Box mt={2}>
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          💡 This column is part of the data lineage graph. 
          You can trace its upstream and downstream relationships in the visualization.
        </Typography>
      </Box>
    </Box>
  );
};

export default ColumnDetailsPane;
