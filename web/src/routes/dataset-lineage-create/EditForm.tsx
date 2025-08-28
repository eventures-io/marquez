import React from 'react';
import { Box, Typography } from '@mui/material';
import { NodeType } from '../../types/lineage';
import DatasetForm from './DatasetForm';
import JobForm from './JobForm';

interface EditFormProps {
  selectedNodeData: any;
  selectedNodeId: string | null;
  onUpdate: (updatedData: any) => void;
  onClose?: () => void;
}

const EditForm: React.FC<EditFormProps> = ({
  selectedNodeData,
  selectedNodeId,
  onUpdate,
  onClose,
}) => {
  if (!selectedNodeData || !selectedNodeId) {
    return (
      <Box p={3}>
        <Typography variant="h6">No node selected</Typography>
      </Box>
    );
  }

  const isDataset = selectedNodeData.type === NodeType.DATASET;

  return (
    <Box p={3} sx={{ width: '100%', maxWidth: 400 }}>
      <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
        Edit {isDataset ? 'Dataset' : 'Job'}
      </Typography>

      {isDataset ? (
        <DatasetForm
          selectedNodeData={selectedNodeData}
          selectedNodeId={selectedNodeId}
          onUpdate={onUpdate}
          onClose={onClose}
        />
      ) : (
        <JobForm
          selectedNodeData={selectedNodeData}
          onUpdate={onUpdate}
          onClose={onClose}
        />
      )}
    </Box>
  );
};

export default EditForm;