// @ts-nocheck
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { styled, Box, Typography } from '@mui/material';
import { theme } from '../../helpers/theme';

const CustomNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  const isJob = data.type === 'JOB';
  const isDataset = data.type === 'DATASET';

const NodeContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.25), // 10px equivalent
  border: `1px solid ${theme.palette.grey[400]}`,
  borderRadius: '3px',
  background: theme.palette.common.white,
  color: theme.palette.text.primary,
  fontSize: theme.typography.body2.fontSize,
  textAlign: 'center',
  minWidth: '150px',
  minHeight: '40px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '500',
  boxShadow: theme.shadows[2],
  position: 'relative',
}));

const NodeTypeLabel = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.25), // 2px equivalent
}));

const NodeTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  wordBreak: 'break-word',
  fontSize: theme.typography.body2.fontSize,
  color: theme.palette.text.primary,
}));

const NodeSubtext = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.25), // 2px equivalent
}));

  return (
    <NodeContainer>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: theme.palette.grey[400] }}
      />
      
      <NodeTypeLabel>
        {isJob ? '⚙️ JOB' : '📊 DATASET'}
      </NodeTypeLabel>
      
      <NodeTitle>
        {data.label}
      </NodeTitle>
      
      {data.dataset && (
        <NodeSubtext>
          {data.dataset.namespace}
        </NodeSubtext>
      )}
      
      {data.job && data.job.type && (
        <NodeSubtext>
          {data.job.type}
        </NodeSubtext>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: theme.palette.grey[400] }}
      />
    </NodeContainer>
  );
};

export default CustomNode;