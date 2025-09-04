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

  return (
    <Box
      onClick={handleClick}
      sx={{
        minWidth: 200,
        minHeight: 50,
        backgroundColor: typedData.isHighlighted ? 'rgba(25, 118, 210, 0.1)' : 'white',
        border: selected 
          ? '2px solid #1976d2' 
          : typedData.isHighlighted 
          ? '2px solid rgba(25, 118, 210, 0.5)'
          : '1px solid #e0e0e0',
        borderRadius: 2,
        boxShadow: selected 
          ? '0 3px 10px rgba(25, 118, 210, 0.3)' 
          : typedData.isHighlighted
          ? '0 2px 8px rgba(25, 118, 210, 0.2)'
          : '0 1px 4px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555', width: 8, height: 8 }}
      />

      <Box p={1.5}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography 
            variant="body2" 
            component="div" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '0.85rem',
              color: typedData.isPrimaryKey ? '#d32f2f' : 'inherit'
            }}
          >
            {typedData.fieldName}
            {typedData.isPrimaryKey && (
              <Typography component="span" sx={{ ml: 0.5, fontSize: '0.7rem', color: '#d32f2f' }}>
                PK
              </Typography>
            )}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {typedData.dataType && (
            <Chip 
              label={typedData.dataType} 
              size="small"
              color={getTypeColor(typedData.dataType)}
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          )}
          
          {typedData.isNullable === false && (
            <Chip 
              label="NOT NULL" 
              size="small"
              color="error"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 18 }}
            />
          )}
        </Box>
        
        {typedData.description && (
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              mt: 0.5, 
              display: 'block', 
              fontSize: '0.7rem',
              lineHeight: 1.2
            }}
          >
            {typedData.description.length > 60 ? `${typedData.description.substring(0, 60)}...` : typedData.description}
          </Typography>
        )}
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', width: 8, height: 8 }}
      />
    </Box>
  );
};

export default ColumnFieldNode;