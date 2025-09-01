import React from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

interface ToolbarProps {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  canSaveLineage: boolean;
  onSaveLineage: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isSaving,
  hasUnsavedChanges,
  canSaveLineage,
  onSaveLineage,
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: 2,
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#fafafa'
    }}>
      <Box>
        {hasUnsavedChanges && (
          <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.75rem' }}>
            Unsaved changes
          </Alert>
        )}
      </Box>
      
      <Box>
        <Button
          variant="contained"
          onClick={onSaveLineage}
          disabled={!canSaveLineage}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          size="medium"
        >
          {isSaving ? 'Saving...' : 'Save Lineage'}
        </Button>
      </Box>
    </Box>
  );
};

export default Toolbar;
