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
  Typography,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AddIcon from '@mui/icons-material/Add';
import { JobType, NodeType } from '../types/lineage';
import { EditableNodeData } from '../types/editableNodeData';

interface JobFormData {
  label: string;
  namespace: string;
  name: string;
  description: string;
  type: string;
  tags: string[];
  transformationCode: string;
  // Facets
  sourceCodeLocation: string;
  sourceCode: string;
  sql: string;
  ownership: string;
}


interface JobFormProps {
  selectedNodeData: EditableNodeData;
  onUpdate: (updatedData: any) => void;
  onClose?: () => void;
  isRootNode?: boolean;
}

const JobForm: React.FC<JobFormProps> = ({
  selectedNodeData,
  onUpdate,
  onClose,
  isRootNode = false,
}) => {
  const [formData, setFormData] = useState<JobFormData>({
    label: '',
    namespace: '',
    name: '',
    description: '',
    type: '',
    tags: [],
    transformationCode: '',
    sourceCodeLocation: '',
    sourceCode: '',
    sql: '',
    ownership: '',
  });
  
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (selectedNodeData) {
      const entity = selectedNodeData.job;
      
      setFormData({
        label: selectedNodeData.label || '',
        namespace: entity?.namespace || '',
        name: entity?.name || '',
        description: entity?.description || '',
        type: entity?.type || '',
        tags: entity?.tags?.map((tag: any) => tag.name || tag) || [],
        transformationCode: entity?.transformationCode || '',
        sourceCodeLocation: entity?.sourceCodeLocation || '',
        sourceCode: entity?.sourceCode || '',
        sql: entity?.sql || entity?.transformationCode || '',
        ownership: entity?.ownership || '',
      });
    }
  }, [selectedNodeData]);

  const handleInputChange = (field: keyof JobFormData, value: any) => {
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

  const handleSave = () => {
    setHasSubmitted(true);
    const errors: string[] = [];
    
    if (!formData.namespace.trim()) {
      errors.push('Please fill in all required fields');
    }
    
    if (!formData.name.trim()) {
      errors.push('Please fill in all required fields');
    }
    
    // Remove duplicates
    const uniqueErrors = [...new Set(errors)];
    
    setValidationErrors(uniqueErrors);
    
    if (errors.length > 0) {
      return;
    }
    
    const updatedData = {
      label: formData.name || 'Unnamed',
      job: {
        ...selectedNodeData.job,
        namespace: formData.namespace,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        tags: formData.tags?.map(tag => ({ name: tag })) || [],
        transformationCode: formData.transformationCode,
        sourceCodeLocation: formData.sourceCodeLocation,
        sourceCode: formData.sourceCode,
        sql: formData.sql,
        ownership: formData.ownership,
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
          This is the root job of your lineage. Changes to namespace and name will affect the entire lineage structure.
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
        error={hasSubmitted && !formData.namespace.trim()}
        helperText={hasSubmitted && !formData.namespace.trim() ? 'Namespace is required' : 'The namespace for this job'}
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
        error={hasSubmitted && !formData.name.trim()}
        helperText={hasSubmitted && !formData.name.trim() ? 'Name is required' : ''}
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
          <MenuItem value={JobType.BATCH}>Batch</MenuItem>
          <MenuItem value={JobType.STREAM}>Stream</MenuItem>
          <MenuItem value={JobType.SERVICE}>Service</MenuItem>
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Tags Section */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Tags</Typography>
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

      {/* Ownership Section */}
      <Divider sx={{ my: 2 }} />
      <TextField
        fullWidth
        label="Ownership"
        value={formData.ownership}
        onChange={(e) => handleInputChange('ownership', e.target.value)}
        sx={{ mb: 2 }}
        placeholder="e.g., team-data-engineering"
        helperText="Team or individual responsible for this job"
      />

      {/* Transformation Section with Tabs */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Transformation</Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="transformation type tabs"
        >
          <Tab label="SQL" />
          <Tab label="Code" />
        </Tabs>
      </Box>

      {/* SQL Tab */}
      {activeTab === 0 && (
        <Box>
          <TextField
            fullWidth
            label="SQL Query"
            multiline
            rows={12}
            value={formData.sql}
            onChange={(e) => handleInputChange('sql', e.target.value)}
            sx={{ mb: 2 }}
            placeholder="SELECT * FROM source_table..."
            id="sql-query-field"
            name="sqlQuery"
            InputProps={{
              sx: { 
                fontFamily: 'monospace', 
                fontSize: '0.9rem'
              }
            }}
            inputProps={{
              style: {
                padding: '0.5rem',
                fontFamily: 'monospace'
              }
            }}
            helperText="SQL query executed by this job"
          />
        </Box>
      )}

      {/* Code Tab */}
      {activeTab === 1 && (
        <Box>
          <TextField
            fullWidth
            label="Source Code Location"
            value={formData.sourceCodeLocation}
            onChange={(e) => handleInputChange('sourceCodeLocation', e.target.value)}
            sx={{ mb: 2 }}
            placeholder="e.g., https://github.com/repo/file.py"
            helperText="URL or path to the source code"
          />
          
          <TextField
            fullWidth
            label="Source Code"
            multiline
            rows={10}
            value={formData.sourceCode}
            onChange={(e) => handleInputChange('sourceCode', e.target.value)}
            sx={{ mb: 2 }}
            placeholder="def transform_data():\n    # Your code here\n    pass"
            id="source-code-field"
            name="sourceCode"
            InputProps={{
              sx: { 
                fontFamily: 'monospace', 
                fontSize: '0.9rem'
              }
            }}
            inputProps={{
              style: {
                padding: '0.5rem',
                fontFamily: 'monospace'
              }
            }}
            helperText="The actual source code"
          />
        </Box>
      )}

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

export default JobForm;
