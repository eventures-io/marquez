import { useState, useCallback, useEffect, useRef } from 'react';

interface UseDrawerStateReturn {
  isDrawerOpen: boolean;
  selectedNodeId: string | null;
  selectedNodeData: any | null;
  drawerRef: React.RefObject<HTMLDivElement>;
  handleNodeClick: (nodeId: string, nodeData: any) => void;
  handlePaneClick: () => void;
}

export const useDrawerState = (): UseDrawerStateReturn => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  // Handle click outside drawer to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isDrawerOpen) return;
      
      const target = event.target as HTMLElement;
      
      // Check if click is inside the drawer
      if (drawerRef.current && drawerRef.current.contains(target)) {
        return;
      }
      
      // Check if click is on a ReactFlow node (which should open drawer, not close it)
      if (target.closest('.react-flow__node')) {
        return;
      }
      
      // Check if click is on MUI components that create portals (Select, DatePicker, etc.)
      if (
        target.closest('.MuiPopover-root') ||
        target.closest('.MuiModal-root') ||
        target.closest('.MuiMenu-root') ||
        target.closest('.MuiList-root') ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="option"]') ||
        target.closest('.MuiBackdrop-root')
      ) {
        return;
      }
      
      // Close drawer for clicks outside
      setIsDrawerOpen(false);
      setSelectedNodeId(null);
      setSelectedNodeData(null);
    };

    if (isDrawerOpen) {
      // Use capture phase to ensure we catch the event before MUI components
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isDrawerOpen]);

  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeData(nodeData);
    setIsDrawerOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedNodeId(null);
    setSelectedNodeData(null);
  }, []);

  return {
    isDrawerOpen,
    selectedNodeId,
    selectedNodeData,
    drawerRef,
    handleNodeClick,
    handlePaneClick,
  };
};