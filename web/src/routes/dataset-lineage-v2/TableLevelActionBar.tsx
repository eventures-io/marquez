// @ts-nocheck
import React from 'react';
import { ArrowBackIosRounded, Refresh } from '@mui/icons-material';
import { Divider, FormControlLabel, Switch, TextField, Box, IconButton } from '@mui/material';
import { HEADER_HEIGHT, theme } from '../../helpers/theme';
import { truncateText } from '../../helpers/text';
import { useNavigate, useParams } from 'react-router-dom';
import MQTooltip from '../../components/core/tooltip/MQTooltip';
import MqText from '../../components/core/text/MqText';

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
        <MQTooltip title={`Back to ${nodeType === 'JOB' ? 'jobs' : 'datasets'}`}>
          <IconButton
            size="small"
            sx={{ mr: 2 }}
            onClick={() => navigate(nodeType === 'JOB' ? '/' : '/datasets')}
          >
            <ArrowBackIosRounded fontSize="small" />
          </IconButton>
        </MQTooltip>
        <MqText heading>{nodeType === 'JOB' ? 'Jobs' : 'Datasets'}</MqText>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Mode</MqText>
          <MqText font="mono">Table Level V2</MqText>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Namespace</MqText>
          <MqText font="mono">
            {namespace ? truncateText(namespace, 40) : 'Unknown namespace name'}
          </MqText>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box>
          <MqText subdued>Name</MqText>
          <MqText font="mono">{name ? truncateText(name, 40) : 'Unknown dataset name'}</MqText>
        </Box>
      </Box>
      <Box display="flex" alignItems="center">
        <MQTooltip title="Refresh">
          <IconButton
            sx={{ mr: 2 }}
            color="primary"
            size="small"
            onClick={onRefresh}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </MQTooltip>
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
            label={<MqText font="mono">Full Graph</MqText>}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={isCompact}
                onChange={(_, checked) => setIsCompact(checked)}
              />
            }
            label={<MqText font="mono">Compact Nodes</MqText>}
          />
        </Box>
      </Box>
    </Box>
  );
};