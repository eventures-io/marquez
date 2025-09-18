import React from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Chip, Divider, IconButton, Button } from '@mui/material';
import { ArrowBackIosRounded, Save, Cancel } from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { NodeType, LineageMode } from '@app-types';
import ViewSelector, { ViewType } from '../components/ViewSelector';

interface ColumnLevelActionBarProps {
  nodeType: NodeType;
  depth: number;
  setDepth: (depth: number) => void;
  totalDatasets?: number;
  totalColumns?: number;
  selectedColumn?: string;
  mode?: LineageMode;
  onSave?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  canSaveLineage?: boolean;
}

export const ColumnLevelActionBar: React.FC<ColumnLevelActionBarProps> = ({
  nodeType,
  depth,
  setDepth,
  totalDatasets = 0,
  totalColumns = 0,
  selectedColumn,
  mode = LineageMode.VIEW,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
  canSaveLineage = false,
}) => {
  const { namespace, name } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDepthChange = (event: any) => {
    setDepth(event.target.value as number);
  };

  // Determine current view from URL
  const getCurrentView = (): ViewType => {
    if (location.pathname.includes('/column-view')) {
      return 'column-view';
    }
    return 'table-view'; // default to table-view
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 2,
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
        minHeight: 64,
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <IconButton
          size="small"
          sx={{ mr: 2 }}
          onClick={() => navigate(nodeType === NodeType.JOB ? '/' : '/datasets')}
        >
          <ArrowBackIosRounded fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ mr: 2 }}>{nodeType === NodeType.JOB ? 'Jobs' : 'Datasets'}</Typography>
        <ViewSelector currentView={getCurrentView()} />
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        
        <Box display="flex" gap={1}>
          <Chip 
            label={`${totalDatasets} datasets`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip 
            label={`${totalColumns} columns`}
            size="small"
            color="secondary" 
            variant="outlined"
          />
        </Box>
        
        {selectedColumn && (
          <Chip 
            label={`Selected: ${selectedColumn}`}
            size="small"
            color="info"
            sx={{ maxWidth: 200 }}
          />
        )}
      </Box>

      <Box display="flex" alignItems="center" gap={2}>
        {mode === LineageMode.VIEW && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Depth</InputLabel>
            <Select
              value={depth}
              label="Depth"
              onChange={handleDepthChange}
            >
              <MenuItem value={1}>1 level</MenuItem>
              <MenuItem value={2}>2 levels</MenuItem>
              <MenuItem value={3}>3 levels</MenuItem>
              <MenuItem value={4}>4 levels</MenuItem>
              <MenuItem value={5}>5 levels</MenuItem>
            </Select>
          </FormControl>
        )}

        {(mode === LineageMode.CREATE || mode === LineageMode.EDIT) && (
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={onSave}
              disabled={!canSaveLineage || isSaving}
              color={hasUnsavedChanges ? "primary" : "success"}
            >
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ColumnLevelActionBar;