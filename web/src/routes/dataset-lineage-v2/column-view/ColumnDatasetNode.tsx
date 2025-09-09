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

  const getNodeStyle = () => {
    return {
      background: selected ? '#424242' : '#f5f5f5', // Light grey background
      borderColor: selected ? '#212121' : '#bbb',
      color: selected ? '#fff' : '#333',
    };
  };

  const nodeStyle = getNodeStyle();

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '15px',
        border: `2px solid ${nodeStyle.borderColor}`,
        borderRadius: '8px',
        background: nodeStyle.background,
        color: nodeStyle.color,
        fontSize: '12px',
        minWidth: '250px',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        fontWeight: '500',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        style={{ 
          background: '#ccc',
          width: 8,
          height: 8,
          border: '2px solid white',
          opacity: 0.8,
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.8 }}>
          📊 DATASET
        </Typography>
      </Box>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 'bold',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '12px',
          lineHeight: 1.2,
        }}
      >
        {typedData.name}
      </Typography>

      <Typography variant="caption" sx={{ fontSize: '9px', opacity: 0.7, mt: 0.5 }}>
        {typedData.namespace}
      </Typography>

      {typedData.columnCount && (
        <Typography variant="caption" sx={{ fontSize: '8px', opacity: 0.6, mt: 0.25 }}>
          {typedData.columnCount} columns
        </Typography>
      )}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{ 
          background: nodeStyle.borderColor,
          width: 8,
          height: 8,
          border: '2px solid white',
          opacity: 1,
        }}
      />
    </div>
  );
};

export default ColumnDatasetNode;