// @ts-nocheck
import React from 'react';
import { Box, IconButton, Stack } from '@mui/material';
import { ZoomIn, ZoomOut, CenterFocusStrong, FitScreen } from '@mui/icons-material';
import { useReactFlow } from '@xyflow/react';

interface ReactFlowZoomControlsProps {
  onCenterOnNode?: () => void;
  onFitView?: () => void;
}

export const ReactFlowZoomControls: React.FC<ReactFlowZoomControlsProps> = ({
  onCenterOnNode,
  onFitView,
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = () => {
    zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 300 });
  };

  const handleFitView = () => {
    if (onFitView) {
      onFitView();
    } else {
      fitView({ duration: 300, padding: 0.2 });
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 2,
        boxShadow: 2,
      }}
    >
      <Stack direction="column" spacing={0}>
        <IconButton onClick={handleZoomIn} size="small">
          <ZoomIn fontSize="small" />
        </IconButton>
        
        <IconButton onClick={handleZoomOut} size="small">
          <ZoomOut fontSize="small" />
        </IconButton>
        
        <IconButton onClick={handleFitView} size="small">
          <FitScreen fontSize="small" />
        </IconButton>
        
        {onCenterOnNode && (
          <IconButton onClick={onCenterOnNode} size="small">
            <CenterFocusStrong fontSize="small" />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};