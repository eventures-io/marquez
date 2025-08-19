import React, { forwardRef } from 'react';
import { styled } from '@mui/material';

interface DetailsPaneProps {
  open: boolean;
  children: React.ReactNode;
  width?: number;
  onBackdropClick?: () => void;
}

const StyledDetailsPane = styled('div')<{ open: boolean; width: number }>(({ theme, open, width }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  height: '100%',
  width: width,
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'none',
  boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
  transform: open ? 'translateX(0)' : 'translateX(calc(100% + 10px))',
  transition: 'transform 0.3s ease-in-out',
  zIndex: 1000,
  overflow: 'auto',
}));

const DetailsPane = forwardRef<HTMLDivElement, DetailsPaneProps>(
  ({ open, children, width = 400, onBackdropClick }, ref) => {
    return (
      <StyledDetailsPane 
        ref={ref} 
        open={open} 
        width={width}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop clicks from bubbling
      >
        {children}
      </StyledDetailsPane>
    );
  }
);

DetailsPane.displayName = 'DetailsPane';

export default DetailsPane;