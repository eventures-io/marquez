import React, { forwardRef } from 'react';
import { styled, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface DetailsPaneProps {
  open: boolean;
  children: React.ReactNode;
  width?: number;
  onClose?: () => void;
}

const StyledDetailsPane = styled('div')<{ open: boolean; width: number }>(({ theme, open, width }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  height: '100%',
  width: width,
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'none',
  boxShadow: theme.shadows[8],
  transform: open ? 'translateX(0)' : 'translateX(calc(100% + 10px))',
  transition: 'transform 0.3s ease-in-out',
  zIndex: theme.zIndex.drawer,
  overflow: 'auto',
}));

const CloseButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  zIndex: 1,
}));

const DetailsPane = forwardRef<HTMLDivElement, DetailsPaneProps>(
  ({ open, children, width = 400, onClose }, ref) => {
    return (
      <StyledDetailsPane 
        ref={ref} 
        open={open} 
        width={width}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop clicks from bubbling
      >
        {onClose && (
          <CloseButton onClick={onClose} size="small">
            <CloseIcon />
          </CloseButton>
        )}
        {children}
      </StyledDetailsPane>
    );
  }
);

DetailsPane.displayName = 'DetailsPane';

export default DetailsPane;