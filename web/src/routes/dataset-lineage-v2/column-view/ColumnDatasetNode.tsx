import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import { NodeType } from '@app-types';

interface ColumnDatasetNodeData {
  id: string;
  namespace: string;
  name: string;
  type: NodeType;
  description?: string;
  columnCount?: number;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
}

const ColumnDatasetNode: React.FC<NodeProps> = ({ 
  data, 
  selected 
}) => {
  const typedData = data as unknown as ColumnDatasetNodeData;
  const handleClick = () => {
    if (typedData.onNodeClick) {
      typedData.onNodeClick(typedData.id, typedData);
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        minWidth: 280,
        minHeight: 60,
        backgroundColor: 'white',
        border: selected ? '2px solid #1976d2' : '1px solid #ddd',
        borderRadius: 2,
        boxShadow: selected ? '0 4px 12px rgba(25, 118, 210, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      
      {/* Left Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />

      <Box p={2}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {typedData.name}
          </Typography>
          <Chip 
            label="Dataset" 
            size="small" 
            color="primary"
            variant="outlined"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          {typedData.namespace}
        </Typography>
        
        {typedData.description && (
          <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
            {typedData.description}
          </Typography>
        )}
        
        {typedData.columnCount && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {typedData.columnCount} columns
          </Typography>
        )}
      </Box>

      {/* Right Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
      
      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </Box>
  );
};

export default ColumnDatasetNode;