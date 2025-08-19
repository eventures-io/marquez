// @ts-nocheck
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { NodeType } from '../../types/lineage';

const TableLevelNode: React.FC<NodeProps> = ({ data, isConnectable, selected }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isJob = data.type === NodeType.JOB;
  const isDataset = data.type === NodeType.DATASET;
  const isCompact = data.isCompact;

  const getNodeStyle = () => {
    return {
      background: selected ? '#424242' : '#fff',
      borderColor: selected ? '#212121' : '#bbb',
      color: selected ? '#fff' : '#333',
    };
  };

  const nodeStyle = getNodeStyle();

  const handleNodeClick = () => {
    // Use the callback from parent component if available
    if (data.onNodeClick && data.id) {
      data.onNodeClick(data.id);
    }
  };

  const renderDatasetFields = () => {
    if (isCompact || !data.dataset?.fields) return null;
    
    return (
      <Box sx={{ mt: 1, maxHeight: '100px', overflow: 'auto' }}>
        {data.dataset.fields.slice(0, 5).map((field, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.5,
              px: 1,
              fontSize: '10px',
              backgroundColor: 'rgba(0,0,0,0.05)',
              mb: 0.25,
              borderRadius: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '9px' }}>
              {field.name}
            </Typography>
            {/* <Typography variant="caption" sx={{ fontSize: '8px', opacity: 0.7 }}>
              {field.type}
            </Typography> */}
          </Box>
        ))}
        {data.dataset.fields.length > 5 && (
          <Typography variant="caption" sx={{ fontSize: '8px', opacity: 0.6, textAlign: 'center' }}>
            +{data.dataset.fields.length - 5} more fields
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <div
      onClick={handleNodeClick}
      style={{
        padding: isCompact ? '8px 12px' : '12px',
        border: `2px solid ${nodeStyle.borderColor}`,
        borderRadius: '6px',
        background: nodeStyle.background,
        color: nodeStyle.color,
        fontSize: '12px',
        minWidth: isCompact ? '100px' : '150px',
        maxWidth: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
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
        isConnectable={isConnectable}
        style={{ 
          background: nodeStyle.borderColor,
          width: 8,
          height: 8,
          border: '2px solid white',
        }}
      />

      {!isCompact && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.8 }}>
            {isJob ? '⚙️ JOB' : '📊 DATASET'}
          </Typography>
          {/* {data.job?.type && (
            <Chip
              label={data.job.type}
              size="small"
              sx={{
                ml: 1,
                height: '16px',
                fontSize: '8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
              }}
            />
          )} */}
        </Box>
      )}

      <Typography
        variant="body2"
        sx={{
          fontWeight: 'bold',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: isCompact ? '11px' : '12px',
          lineHeight: 1.2,
        }}
      >
        {data.label}
      </Typography>

      {!isCompact && data.dataset && (
        <Typography variant="caption" sx={{ fontSize: '9px', opacity: 0.7, mt: 0.5 }}>
          {data.dataset.namespace}
        </Typography>
      )}

      {!isCompact && data.dataset?.tags && data.dataset.tags.length > 0 && (
        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
          {data.dataset.tags.slice(0, 2).map((tag, index) => (
            <Chip
              key={index}
              label={tag.name}
              size="small"
              sx={{
                height: '14px',
                fontSize: '7px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
              }}
            />
          ))}
        </Box>
      )}

      {renderDatasetFields()}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ 
          background: nodeStyle.borderColor,
          width: 8,
          height: 8,
          border: '2px solid white',
        }}
      />
    </div>
  );
};

export default TableLevelNode;