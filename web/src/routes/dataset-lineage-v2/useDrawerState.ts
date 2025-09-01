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
    // TODO(debug): temporary logging for drawer open; remove after fix
    console.debug('[drawer] open', { nodeId, hasData: !!nodeData, keys: nodeData ? Object.keys(nodeData) : [] })
    setSelectedNodeId(nodeId);
    setSelectedNodeData(nodeData);
    setIsDrawerOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    // TODO(debug): temporary logging for drawer close; remove after fix
    console.debug('[drawer] close via pane click')
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
