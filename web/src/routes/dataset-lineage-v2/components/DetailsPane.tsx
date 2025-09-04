import React, { forwardRef } from 'react';
import { styled, IconButton, Box, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface DetailsPaneProps {
  open: boolean;
  children: React.ReactNode;
  width?: number;
  onClose: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
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

const ButtonContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  zIndex: 1,
  display: 'flex',
  gap: theme.spacing(0.5),
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.04)',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
}));

const DeleteButton = styled(Button)(({ theme }) => ({
  color: theme.palette.error.main,
  border: `1px solid ${theme.palette.error.main}`,
  minWidth: 'auto',
  padding: theme.spacing(0.5, 1),
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  '&:hover': {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
}));

const DetailsPane = forwardRef<HTMLDivElement, DetailsPaneProps>(
  ({ open, children, width = 400, onClose, onDelete, showDelete = false }, ref) => {
    return (
      <StyledDetailsPane 
        ref={ref} 
        open={open} 
        width={width}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop clicks from bubbling
      >
        <ButtonContainer>
          {showDelete && onDelete && (
            <DeleteButton onClick={() => {
              onDelete();
            }} size="small">
              DELETE
            </DeleteButton>
          )}
          <ActionButton onClick={onClose} size="small">
            <CloseIcon />
          </ActionButton>
        </ButtonContainer>
        {children}
      </StyledDetailsPane>
    );
  }
);

DetailsPane.displayName = 'DetailsPane';

export default DetailsPane;
