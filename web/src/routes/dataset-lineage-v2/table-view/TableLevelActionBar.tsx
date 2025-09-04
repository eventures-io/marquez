import React from 'react';
import { ArrowBackIosRounded } from '@mui/icons-material';
import { Divider, TextField, Box, IconButton, Typography, styled } from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { NodeType } from '@app-types';
import ViewSelector, { ViewType } from '../components/ViewSelector';

interface TableLevelActionBarProps {
  nodeType: NodeType;
  depth: number;
  setDepth: (depth: number) => void;
}

const HEADER_HEIGHT = 64 + 1;

const StyledActionBar = styled(Box)(({ theme }) => ({
  borderBottomWidth: 2,
  borderTopWidth: 0,
  borderLeftWidth: 0,
  borderRightWidth: 0,
  borderStyle: 'dashed',
  borderColor: theme.palette.secondary.main,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  px: 2,
}));

export const TableLevelActionBar: React.FC<TableLevelActionBarProps> = ({
  nodeType,
  depth,
  setDepth,
}) => {
  const { namespace, name } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current view from URL
  const getCurrentView = (): ViewType => {
    if (location.pathname.includes('/column-view')) {
      return 'column-view';
    }
    return 'table-view'; // default to table-view
  };

  return (
    <StyledActionBar height={HEADER_HEIGHT - 1}>
      <Box display="flex" alignItems="center">
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
        <Box>
          <Typography variant="body2" color="text.secondary">Namespace</Typography>
          <Typography 
            variant="body2" 
            fontFamily="monospace"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '300px'
            }}
          >
            {namespace || 'Unknown namespace name'}
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box>
          <Typography variant="body2" color="text.secondary">Name</Typography>
          <Typography 
            variant="body2" 
            fontFamily="monospace"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '300px'
            }}
          >
            {name || 'Unknown dataset name'}
          </Typography>
        </Box>
      </Box>
      <Box display="flex" alignItems="center">
        <TextField
          id="table-level-depth"
          type="number"
          inputProps={{ min: 0 }}
          label="Depth"
          variant="outlined"
          size="small"
          sx={{ width: '80px', mr: 2 }}
          value={depth}
          onChange={(e) => {
            setDepth(isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value));
          }}
        />
        {/* Removed Full Graph and Compact toggles */}
      </Box>
    </StyledActionBar>
  );
};
