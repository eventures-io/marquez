// @ts-nocheck
import React from 'react';
import { ArrowBackIosRounded, Refresh } from '@mui/icons-material';
import { Divider, FormControlLabel, Switch, TextField, Box, IconButton, Typography } from '@mui/material';
import { HEADER_HEIGHT, theme } from '../../helpers/theme';
import { truncateText } from '../../helpers/text';
import { useNavigate, useParams } from 'react-router-dom';

interface TableLevelActionBarProps {
  nodeType: 'DATASET' | 'JOB';
  depth: number;
  setDepth: (depth: number) => void;
  isCompact: boolean;
  setIsCompact: (isCompact: boolean) => void;
  isFull: boolean;
  setIsFull: (isFull: boolean) => void;
  onRefresh: () => void;
}

export const TableLevelActionBar: React.FC<TableLevelActionBarProps> = ({
  nodeType,
  depth,
  setDepth,
  isCompact,
  setIsCompact,
  isFull,
  setIsFull,
  onRefresh,
}) => {
  const { namespace, name } = useParams();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        borderBottomWidth: 2,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderStyle: 'dashed',
      }}
      display="flex"
      height={HEADER_HEIGHT - 1}
      justifyContent="space-between"
      alignItems="center"
      px={2}
      borderColor={theme.palette.secondary.main}
    >
      <Box display="flex" alignItems="center">
        <IconButton
          size="small"
          sx={{ mr: 2 }}
          onClick={() => navigate(nodeType === 'JOB' ? '/' : '/datasets')}
        >
          <ArrowBackIosRounded fontSize="small" />
        </IconButton>
        <Typography variant="h6">{nodeType === 'JOB' ? 'Jobs' : 'Datasets'}</Typography>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box>
          <Typography variant="body2" color="text.secondary">Mode</Typography>
          <Typography variant="body2" fontFamily="monospace">Table Level V2</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box>
          <Typography variant="body2" color="text.secondary">Namespace</Typography>
          <Typography variant="body2" fontFamily="monospace">
            {namespace ? truncateText(namespace, 40) : 'Unknown namespace name'}
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box>
          <Typography variant="body2" color="text.secondary">Name</Typography>
          <Typography variant="body2" fontFamily="monospace">{name ? truncateText(name, 40) : 'Unknown dataset name'}</Typography>
        </Box>
      </Box>
      <Box display="flex" alignItems="center">
        <IconButton
          sx={{ mr: 2 }}
          color="primary"
          size="small"
          onClick={onRefresh}
        >
          <Refresh fontSize="small" />
        </IconButton>
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
        <Box display="flex" flexDirection="column">
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={isFull}
                onChange={(_, checked) => setIsFull(checked)}
              />
            }
            label={<Typography variant="body2" fontFamily="monospace">Full Graph</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={isCompact}
                onChange={(_, checked) => setIsCompact(checked)}
              />
            }
            label={<Typography variant="body2" fontFamily="monospace">Compact Nodes</Typography>}
          />
        </Box>
      </Box>
    </Box>
  );
};