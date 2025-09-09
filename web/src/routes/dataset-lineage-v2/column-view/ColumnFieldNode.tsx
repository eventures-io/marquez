import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';

interface ColumnFieldNodeData {
  id: string;
  fieldName: string;
  dataType?: string;
  namespace: string;
  datasetName: string;
  description?: string;
  isPrimaryKey?: boolean;
  isNullable?: boolean;
  parentDatasetId: string;
  isHighlighted?: boolean;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
}

const ColumnFieldNode: React.FC<NodeProps> = ({ 
  data, 
  selected 
}) => {
  const typedData = data as unknown as ColumnFieldNodeData;
  const handleClick = () => {
    if (typedData.onNodeClick) {
      typedData.onNodeClick(typedData.id, typedData);
    }
  };

  const getTypeColor = (type?: string) => {
    if (!type) return 'default';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('number')) return 'info';
    if (lowerType.includes('string') || lowerType.includes('varchar') || lowerType.includes('text')) return 'success';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'warning';
    if (lowerType.includes('bool')) return 'secondary';
    return 'default';
  };

  const getNodeStyle = () => {
    return {
      background: selected ? '#424242' : '#fff',
      borderColor: selected ? '#212121' : '#bbb',
      color: selected ? '#fff' : '#333',
    };
  };

  const nodeStyle = getNodeStyle();

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '8px 12px',
        border: `2px solid ${nodeStyle.borderColor}`,
        borderRadius: '6px',
        background: nodeStyle.background,
        color: nodeStyle.color,
        fontSize: '11px',
        minWidth: '180px',
        maxWidth: '220px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        fontWeight: '500',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        style={{ 
          background: '#ccc',
          width: 6,
          height: 6,
          border: '1px solid white',
          opacity: 0.8,
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: '8px', opacity: 0.8 }}>
          🔗 FIELD
        </Typography>
        {typedData.isPrimaryKey && (
          <Typography component="span" sx={{ ml: 0.5, fontSize: '7px', opacity: 0.7 }}>
            PK
          </Typography>
        )}
      </Box>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 'bold',
          wordBreak: 'break-word',
          fontSize: '11px',
          lineHeight: 1.2,
          mb: 0.25,
        }}
      >
        {typedData.fieldName}
      </Typography>

      {typedData.dataType && (
        <Typography variant="caption" sx={{ fontSize: '8px', opacity: 0.7 }}>
          {typedData.dataType}
          {typedData.isNullable === false && ' • NOT NULL'}
        </Typography>
      )}

      {typedData.description && (
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '8px',
            opacity: 0.6,
            mt: 0.25,
            lineHeight: 1.1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {typedData.description}
        </Typography>
      )}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{ 
          background: nodeStyle.borderColor,
          width: 6,
          height: 6,
          border: '1px solid white',
          opacity: 1,
        }}
      />
    </div>
  );
};

export default ColumnFieldNode;