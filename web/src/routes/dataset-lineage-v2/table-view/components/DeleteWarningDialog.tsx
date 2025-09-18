import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface DeleteWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nodeName: string;
  nodeType: string;
}

const DeleteWarningDialog: React.FC<DeleteWarningDialogProps> = ({
  open,
  onClose,
  onConfirm,
  nodeName,
  nodeType,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            Delete Entire Lineage?
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1">
          You are about to delete the root {nodeType.toLowerCase()} "<strong>{nodeName}</strong>", 
          which will delete this entire lineage graph and cannot be undone.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="error"
          autoFocus
        >
          Delete Lineage
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteWarningDialog;