import React from 'react';
import { FormControl, Select, MenuItem, SelectChangeEvent, Box, Typography } from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getColumnLineage } from '../../../store/requests/columnlineage';

export type ViewType = 'table-view' | 'column-view';

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange?: (view: ViewType) => void;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ 
  currentView, 
  onViewChange 
}) => {
  const navigate = useNavigate();
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const location = useLocation();

  const [columnViewEnabled, setColumnViewEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    const checkColumnLineage = async () => {
      if (!namespace || !name) {
        setColumnViewEnabled(false);
        return;
      }
      try {
        const res = await getColumnLineage('DATASET' as any, namespace, name, 1);
        const hasGraph = Array.isArray(res?.graph) && res.graph.length > 0;
        if (!cancelled) setColumnViewEnabled(hasGraph);
      } catch (e) {
        if (!cancelled) setColumnViewEnabled(false);
      }
    };
    checkColumnLineage();
    return () => { cancelled = true; };
  }, [namespace, name]);

  const handleChange = (event: SelectChangeEvent<ViewType>) => {
    const newView = event.target.value as ViewType;
    if (newView === 'column-view' && !columnViewEnabled) return;
    
    if (onViewChange) {
      onViewChange(newView);
    }

    if (namespace && name) {
      // Build new path based on current location
      const basePath = `/v2/dataset/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
      const newPath = `${basePath}/${newView}`;
      
      // Preserve query parameters
      const searchParams = new URLSearchParams(location.search);
      const queryString = searchParams.toString();
      const fullPath = queryString ? `${newPath}?${queryString}` : newPath;
      
      navigate(fullPath);
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
        Lineage
      </Typography>
      
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={currentView}
          onChange={handleChange}
          displayEmpty
          sx={{
            '& .MuiSelect-select': {
              paddingY: 1,
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        >
          <MenuItem value="table-view">
            <Box display="flex" alignItems="center" gap={1}>
              <span>📊</span>
              <span>Table View</span>
            </Box>
          </MenuItem>
          <MenuItem value="column-view" disabled={!columnViewEnabled}>
            <Box display="flex" alignItems="center" gap={1}>
              <span>🔗</span>
              <span>Column View</span>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default ViewSelector;
