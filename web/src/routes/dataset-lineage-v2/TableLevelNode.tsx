import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { NodeType, LineageDataset, LineageJob } from '@app-types';

interface TableLevelNodeData {
  id: string;
  label: string;
  type: NodeType;
  dataset?: LineageDataset;
  job?: LineageJob;
  isCompact?: boolean;
  onNodeClick?: (id: string) => void;
  showPulsingHandle?: boolean;
  isDragEnabled?: boolean;
}

const TableLevelNode: React.FC<NodeProps> = ({ data, isConnectable, selected }) => {
  const nodeData = data as unknown as TableLevelNodeData;
  const isJob = nodeData.type === NodeType.JOB;
  const isCompact = nodeData.isCompact;

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
    if (nodeData.onNodeClick && nodeData.id) {
      nodeData.onNodeClick(nodeData.id);
    }
  };

  const renderDatasetFields = () => {
    if (isCompact || !nodeData.dataset?.fields) return null;
    
    return (
      <Box sx={{ mt: 1, maxHeight: '100px', overflow: 'auto' }}>
        {nodeData.dataset.fields.slice(0, 5).map((field: { name: string; type: string | null }, index: number) => (
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
        {nodeData.dataset.fields.length > 5 && (
          <Typography variant="caption" sx={{ fontSize: '8px', opacity: 0.6, textAlign: 'center' }}>
            +{nodeData.dataset.fields.length - 5} more fields
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
        isConnectable={false}
        style={{ 
          background: '#ccc',
          width: 8,
          height: 8,
          border: '2px solid white',
          opacity: 0.3,
          pointerEvents: 'none',
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
        {nodeData.label}
      </Typography>

      {!isCompact && nodeData.dataset && (
        <Typography variant="caption" sx={{ fontSize: '9px', opacity: 0.7, mt: 0.5 }}>
          {nodeData.dataset.namespace}
        </Typography>
      )}

      {!isCompact && nodeData.dataset?.tags && nodeData.dataset.tags.length > 0 && (
        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
          {nodeData.dataset.tags.slice(0, 2).map((tag: { name: string }, index: number) => (
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

      {nodeData.showPulsingHandle ? (
        <Tooltip title="Drag to create the next node" placement="top">
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={nodeData.isDragEnabled !== false}
            style={{ 
              background: '#4CAF50',
              width: 5,
              height: 5,
              border: 'none',
            }}
          />
        </Tooltip>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={nodeData.isDragEnabled !== false}
          style={{ 
            background: nodeData.isDragEnabled === false ? '#ccc' : nodeStyle.borderColor,
            width: 8,
            height: 8,
            border: '2px solid white',
            opacity: nodeData.isDragEnabled === false ? 0.5 : 1,
          }}
        />
      )}
      {nodeData.showPulsingHandle && (
        <>
          <div
            className="pulse-circle"
            style={{
              position: 'absolute',
              right: '-10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(76, 175, 80, 0.3)',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />
          <style>{`
            .pulse-circle {
              animation: pulseCircle 2s ease-in-out infinite;
            }
            @keyframes pulseCircle {
              0% {
                transform: translateY(-50%) scale(0.8);
                opacity: 1;
              }
              50% {
                transform: translateY(-50%) scale(1.4);
                opacity: 0.3;
              }
              100% {
                transform: translateY(-50%) scale(0.8);
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
};

export default TableLevelNode;
