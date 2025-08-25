import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { NodeType } from '../../types/lineage';

interface EditFormProps {
  selectedNodeData: any;
  selectedNodeId: string | null;
  onUpdate: (updatedData: any) => void;
  onClose?: () => void;
}

interface FormData {
  label: string;
  namespace: string;
  name: string;
  description: string;
  type?: string;
  tags?: string[];
  fields?: Array<{ name: string; type: string }>;
}

const EditForm: React.FC<EditFormProps> = ({
  selectedNodeData,
  selectedNodeId,
  onUpdate,
  onClose,
}) => {
  const [formData, setFormData] = useState<FormData>({
    label: '', // Keep for compatibility but don't show in form
    namespace: '',
    name: '',
    description: '',
    type: '',
    tags: [],
    fields: [],
  });
  const [newTag, setNewTag] = useState('');
  const [newField, setNewField] = useState({ name: '', type: '' });

  // Initialize form data when selectedNodeData changes
  useEffect(() => {
    if (selectedNodeData) {
      const isDataset = selectedNodeData.type === NodeType.DATASET;
      const entity = isDataset ? selectedNodeData.dataset : selectedNodeData.job;
      
      setFormData({
        label: selectedNodeData.label || '',
        namespace: entity?.namespace || '',
        name: entity?.name || '',
        description: entity?.description || '',
        type: entity?.type || '',
        tags: entity?.tags?.map((tag: any) => tag.name || tag) || [],
        fields: entity?.fields || [],
      });
    }
  }, [selectedNodeData]);

  const handleInputChange = (field: keyof FormData, value: any) => {
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
    // Basic validation
    
    if (isInitialDataset && !formData.namespace.trim()) {
      alert('Please provide a namespace for the lineage.');
      return;
    }
    
    if (!formData.name.trim()) {
      alert('Please provide a name.');
      return;
    }
    
    const isDataset = selectedNodeData.type === NodeType.DATASET;
    
    console.log('EditForm handleSave - formData.fields:', formData.fields);
    
    const updatedData = {
      label: formData.name || 'Unnamed', // Use name as label for display
      [isDataset ? 'dataset' : 'job']: {
        ...selectedNodeData[isDataset ? 'dataset' : 'job'],
        ...(isInitialDataset && { namespace: formData.namespace }), // Only set namespace for initial dataset
        name: formData.name,
        description: formData.description,
        type: formData.type,
        tags: formData.tags?.map(tag => ({ name: tag })) || [],
        ...(isDataset && { fields: formData.fields || [] }),
      },
    };
    
    console.log('EditForm handleSave - updatedData:', updatedData);
    
    onUpdate(updatedData);
    
    // Close the drawer after saving
    if (onClose) {
      onClose();
    }
  };

  if (!selectedNodeData || !selectedNodeId) {
    return (
      <Box p={3}>
        <Typography variant="h6">No node selected</Typography>
      </Box>
    );
  }

  const isDataset = selectedNodeData.type === NodeType.DATASET;
  const isInitialDataset = selectedNodeId === 'dataset-1';

  return (
    <Box p={3} sx={{ width: '100%', maxWidth: 400 }}>
      <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
        Edit {isDataset ? 'Dataset' : 'Job'}
      </Typography>


      {isInitialDataset && (
        <TextField
          fullWidth
          label="Namespace"
          value={formData.namespace}
          onChange={(e) => handleInputChange('namespace', e.target.value)}
          sx={{ mb: 2 }}
          helperText="All nodes in this lineage will use this namespace"
        />
      )}

      <TextField
        fullWidth
        label="Name"
        value={formData.name}
        onChange={(e) => handleInputChange('name', e.target.value)}
        sx={{ mb: 2 }}
        required
        error={!formData.name.trim() && formData.name !== ''}
        helperText={!formData.name.trim() && formData.name !== '' ? 'Name is required' : ''}
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
          {isDataset ? [
            <MenuItem key="DB_TABLE" value="DB_TABLE">DB Table</MenuItem>,
            <MenuItem key="STREAM" value="STREAM">Stream</MenuItem>
          ] : [
            <MenuItem key="BATCH" value="BATCH">Batch</MenuItem>,
            <MenuItem key="STREAM" value="STREAM">Stream</MenuItem>,
            <MenuItem key="SERVICE" value="SERVICE">Service</MenuItem>
          ]}
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Tags Section */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Tags</Typography>
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
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Add tag"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
        />
        <IconButton onClick={handleAddTag} size="small">
          <AddIcon />
        </IconButton>
      </Box>

      {/* Fields Section (only for datasets) */}
      {isDataset && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Fields</Typography>
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
        </>
      )}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleSave} fullWidth>
          Save Changes
        </Button>
      </Box>
    </Box>
  );
};

export default EditForm;