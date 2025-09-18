import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DatasetType } from '../../types/lineage';
import { EditableNodeData } from '../../types/editableNodeData';

interface DatasetFormData {
  label: string;
  namespace: string;
  name: string;
  description: string;
  type: string;
  tags: string[];
  fields: Array<{ name: string; type: string }>;
}


interface DatasetFormProps {
  selectedNodeData: EditableNodeData;
  selectedNodeId: string | null;
  onUpdate: (updatedData: any) => void;
  onClose?: () => void;
  isRootNode?: boolean;
  forceEditable?: boolean;
  requireAtLeastOneField?: boolean;
}

const DatasetForm: React.FC<DatasetFormProps> = ({
  selectedNodeData,
  selectedNodeId,
  onUpdate,
  onClose,
  isRootNode = false,
  forceEditable = false,
  requireAtLeastOneField = false,
}) => {
  const [formData, setFormData] = useState<DatasetFormData>({
    label: '',
    namespace: '',
    name: '',
    description: '',
    type: '',
    tags: [],
    fields: [],
  });
  
  const [newTag, setNewTag] = useState('');
  const [newField, setNewField] = useState({ name: '', type: '' });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check if this is a new node (nodes created in create mode are new)
  const isNewNode = forceEditable || (selectedNodeId && (selectedNodeId.startsWith('dataset-') && parseInt(selectedNodeId.split('-')[1]) > 1) || !selectedNodeData?.dataset?.namespace || !selectedNodeData?.dataset?.name);


  useEffect(() => {
    if (selectedNodeData) {
      const entity = selectedNodeData.dataset;
      
      setFormData({
        label: selectedNodeData.label || '',
        namespace: entity?.namespace || '',
        name: entity?.name || '',
        description: entity?.description || '',
        type: entity?.type || '',
        tags: entity?.tags?.map((tag: any) => tag.name || tag) || [],
        fields: entity?.fields?.map(field => ({
          name: field.name,
          type: field.type || 'string'
        })) || [],
      });
      
      // Reset the new field inputs and form validation state when switching datasets
      setNewField({ name: '', type: '' });
      setHasSubmitted(false);
      setValidationErrors([]);
    }
  }, [selectedNodeData]);

  const handleInputChange = (field: keyof DatasetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      handleInputChange('tags', [...(formData.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const handleAddField = () => {
    if (newField.name.trim() && newField.type.trim()) {
      handleInputChange('fields', [...(formData.fields || []), { ...newField }]);
      setNewField({ name: '', type: '' });
    }
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = formData.fields?.filter((_, i) => i !== index) || [];
    handleInputChange('fields', updatedFields);
  };

  const handleSave = () => {
    setHasSubmitted(true);
    const errors: string[] = [];
    
    if (!formData.namespace.trim()) {
      errors.push('Please fill in all required fields');
    }
    
    if (!formData.name.trim()) {
      errors.push('Please fill in all required fields');
    }

    // Require at least one column/field if requested
    const hasExistingFields = (formData.fields && formData.fields.length > 0);
    const hasPendingNewField = newField.name.trim() && newField.type.trim();
    if (requireAtLeastOneField && !(hasExistingFields || hasPendingNewField)) {
      errors.push('Add at least one column before saving');
    }
    
    // Remove duplicates
    const uniqueErrors = [...new Set(errors)];
    
    setValidationErrors(uniqueErrors);
    
    if (errors.length > 0) {
      return;
    }
    
    let fieldsToSave = [...(formData.fields || [])];
    if (newField.name.trim() && newField.type.trim()) {
      fieldsToSave.push({ name: newField.name.trim(), type: newField.type.trim() });
    }
    
    const updatedData = {
      label: formData.name || 'Unnamed',
      dataset: {
        ...selectedNodeData.dataset,
        namespace: formData.namespace,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        tags: formData.tags?.map(tag => ({ name: tag })) || [],
        fields: fieldsToSave,
      },
    };
    
    onUpdate(updatedData);
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <Box>
      {isRootNode && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          icon={<ErrorOutlineIcon />}
        >
          This is the root dataset of your lineage. Changes to namespace and name will affect the entire lineage structure.
        </Alert>
      )}
      
      <TextField
        fullWidth
        label="Namespace"
        value={formData.namespace}
        onChange={(e) => handleInputChange('namespace', e.target.value)}
        sx={{ 
          mb: 2,
          ...(isRootNode && {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#1976d2',
                borderWidth: 2,
              },
            },
            '& .MuiInputLabel-root': {
              color: '#1976d2',
              fontWeight: 'bold',
            },
          })
        }}
        required
        disabled={!isNewNode}
        error={hasSubmitted && !formData.namespace.trim()}
        helperText={hasSubmitted && !formData.namespace.trim() ? 'Namespace is required' : isNewNode ? 'The namespace for this dataset' : 'Namespace cannot be changed for existing nodes'}
      />

      <TextField
        fullWidth
        label="Name"
        value={formData.name}
        onChange={(e) => handleInputChange('name', e.target.value)}
        sx={{ 
          mb: 2,
          ...(isRootNode && {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#1976d2',
                borderWidth: 2,
              },
            },
            '& .MuiInputLabel-root': {
              color: '#1976d2',
              fontWeight: 'bold',
            },
          })
        }}
        required
        disabled={!isNewNode}
        error={hasSubmitted && !formData.name.trim()}
        helperText={hasSubmitted && !formData.name.trim() ? 'Name is required' : isNewNode ? '' : 'Name cannot be changed for existing nodes'}
      />

      <TextField
        fullWidth
        label="Description"
        multiline
        rows={3}
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Type</InputLabel>
        <Select
          value={formData.type}
          label="Type"
          onChange={(e) => handleInputChange('type', e.target.value)}
        >
          <MenuItem value={DatasetType.DB_TABLE}>DB Table</MenuItem>
          <MenuItem value={DatasetType.STREAM}>Stream</MenuItem>
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Tags Section */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {formData.tags?.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              onDelete={() => handleRemoveTag(tag)}
              size="small"
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Add tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <IconButton onClick={handleAddTag} size="small">
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Fields Section */}
      <Box sx={{ mb: 2 }}>
        {formData.fields?.map((field, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              value={field.name}
              placeholder="Field name"
              sx={{ flex: 1 }}
              disabled
            />
            <TextField
              size="small"
              value={field.type}
              placeholder="Field type"
              sx={{ flex: 1 }}
              disabled
            />
            <IconButton onClick={() => handleRemoveField(index)} size="small">
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            placeholder="Field name"
            value={newField.name}
            onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder="Field type"
            value={newField.type}
            onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
            sx={{ flex: 1 }}
          />
          <IconButton onClick={handleAddField} size="small">
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {validationErrors.length > 0 && (
        <Box sx={{ mt: 0, mb: 0 }}>
          {validationErrors.map((error, index) => (
            <Alert 
              key={index} 
              severity="error" 
              icon={<ErrorOutlineIcon />}
              sx={{ 
                backgroundColor: 'transparent',
                color: 'white',
                '& .MuiAlert-message': {
                  color: 'white'
                }
              }}
            >
              {error}
            </Alert>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleSave} fullWidth>
          Save Changes
        </Button>
      </Box>
    </Box>
  );
};

export default DatasetForm;
