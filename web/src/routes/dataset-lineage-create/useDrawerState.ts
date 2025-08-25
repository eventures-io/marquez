import { useState, useCallback, useEffect, useRef } from 'react';

interface UseDrawerStateReturn {
  isDrawerOpen: boolean;
  selectedNodeId: string | null;
  selectedNodeData: any | null;
  drawerRef: React.RefObject<HTMLDivElement>;
  handleNodeClick: (nodeId: string, nodeData: any) => void;
  handlePaneClick: () => void;
  updateSelectedNodeData: (nodeData: any) => void;
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
      
      // Don't close if click is inside the drawer or on ReactFlow nodes
      if (drawerRef.current?.contains(target) || target.closest('.react-flow__node')) {
        return;
      }
      
      // Don't close if click is on MUI portals (Select dropdown, etc.)
      if (target.closest('.MuiPopover-root') || target.closest('[role="presentation"]')) {
        return;
      }
      
      // Close drawer for clicks outside
      setIsDrawerOpen(false);
      setSelectedNodeId(null);
      setSelectedNodeData(null);
    };

    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  const updateSelectedNodeData = useCallback((nodeData: any) => {
    setSelectedNodeData(nodeData);
  }, []);

  return {
    isDrawerOpen,
    selectedNodeId,
    selectedNodeData,
    drawerRef,
    handleNodeClick,
    handlePaneClick,
    updateSelectedNodeData,
  };
};