import React from 'react';
import { Box, Typography } from '@mui/material';
import { NodeType } from '../../types/lineage';
import { EditableNodeData } from '../../types/editableNodeData';
import DatasetForm from './DatasetForm';
import JobForm from './JobForm';

interface EditFormProps {
  selectedNodeData: EditableNodeData;
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
  const isRootNode = selectedNodeData.isRootNode || false;

  return (
    <Box p={3} sx={{ width: '100%', maxWidth: 400 }}>
      <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
        Edit {isDataset ? 'Dataset' : 'Job'} {isRootNode && '(Root)'}
      </Typography>

      {isDataset ? (
        <DatasetForm
          selectedNodeData={selectedNodeData}
          selectedNodeId={selectedNodeId}
          onUpdate={onUpdate}
          onClose={onClose}
          isRootNode={isRootNode}
        />
      ) : (
        <JobForm
          selectedNodeData={selectedNodeData}
          onUpdate={onUpdate}
          onClose={onClose}
          isRootNode={isRootNode}
        />
      )}
    </Box>
  );
};

export default EditForm;
