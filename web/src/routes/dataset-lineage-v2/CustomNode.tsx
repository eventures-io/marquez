// @ts-nocheck
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const CustomNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  const isJob = data.type === 'JOB';
  const isDataset = data.type === 'DATASET';

  const getNodeStyle = () => {
    return {
      background: '#fff',
      borderColor: '#bbb',
      color: '#333',
    };
  };

  const nodeStyle = getNodeStyle();

  return (
    <div style={{ 
      padding: '10px', 
      border: `1px solid ${nodeStyle.borderColor}`,
      borderRadius: '3px',
      background: nodeStyle.background,
      color: nodeStyle.color,
      fontSize: '12px',
      textAlign: 'center',
      minWidth: '150px',
      minHeight: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '500',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ background: nodeStyle.borderColor }}
      />
      
      <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '2px' }}>
        {isJob ? '⚙️ JOB' : '📊 DATASET'}
      </div>
      
      <div style={{ fontWeight: 'bold', wordBreak: 'break-word' }}>
        {data.label}
      </div>
      
      {data.dataset && (
        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
          {data.dataset.namespace}
        </div>
      )}
      
      {data.job && data.job.type && (
        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
          {data.job.type}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ background: nodeStyle.borderColor }}
      />
    </div>
  );
};

export default CustomNode;