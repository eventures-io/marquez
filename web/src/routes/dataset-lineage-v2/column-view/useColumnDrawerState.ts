import { useState, useCallback, useRef, useEffect } from 'react';

interface ColumnDrawerState {
  isDrawerOpen: boolean;
  selectedNodeId: string | null;
  selectedNodeData: any | null;
  selectedColumn: string | null;
  highlightedPath: string[];
  drawerRef: React.RefObject<HTMLDivElement>;
  handleNodeClick: (nodeId: string, nodeData: any) => void;
  handleColumnSelect: (columnId: string, columnData: any) => void;
  handlePaneClick: () => void;
  setHighlightedPath: (path: string[]) => void;
  clearSelection: () => void;
}

const useColumnDrawerState = (): ColumnDrawerState => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('useColumnDrawerState: isDrawerOpen state changed', isDrawerOpen);
  }, [isDrawerOpen]);

  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeData(nodeData);
    setIsDrawerOpen(true);
    
    // If it's a column node, also set as selected column
    if (nodeData && nodeData.fieldName) {
      setSelectedColumn(nodeData.fieldName);
    }
  }, []);

  const handleColumnSelect = useCallback((columnId: string, columnData: any) => {
    setSelectedColumn(columnId);
    setSelectedNodeId(columnId);
    setSelectedNodeData(columnData);
    setIsDrawerOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    console.log('useColumnDrawerState: handlePaneClick invoked')
    setIsDrawerOpen(false);
    setSelectedNodeId(null);
    setSelectedNodeData(null);
    // Keep selected column for highlighting purposes
    // setSelectedColumn(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      console.log('useColumnDrawerState: handleClickOutside fired', {
        isDrawerOpen,
        targetClass: (event.target as HTMLElement)?.className,
      });
      if (!isDrawerOpen) return;

      const target = event.target as HTMLElement;

      const insideDrawer = !!(drawerRef.current && drawerRef.current.contains(target));
      const clickedNode = !!target.closest('.react-flow__node');
      console.log('useColumnDrawerState: outside click evaluation', { insideDrawer, clickedNode });

      if (insideDrawer) {
        return;
      }

      if (clickedNode) {
        return;
      }

      console.log('useColumnDrawerState: closing drawer from outside click');
      console.log('useColumnDrawerState: current state before update:', { isDrawerOpen, selectedNodeId });
      setIsDrawerOpen(false);
      setSelectedNodeId(null);
      setSelectedNodeData(null);
      console.log('useColumnDrawerState: state update calls completed');
    };

    console.log('useColumnDrawerState: setting up click listener, isDrawerOpen:', isDrawerOpen);
    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      console.log('useColumnDrawerState: mousedown listener added');
    } else {
      console.log('useColumnDrawerState: drawer closed, not adding listener');
    }

    return () => {
      console.log('useColumnDrawerState: removing mousedown listener');
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDrawerOpen]);

  const clearSelection = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedNodeId(null);
    setSelectedNodeData(null);
    setSelectedColumn(null);
    setHighlightedPath([]);
  }, []);

  return {
    isDrawerOpen,
    selectedNodeId,
    selectedNodeData,
    selectedColumn,
    highlightedPath,
    drawerRef,
    handleNodeClick,
    handleColumnSelect,
    handlePaneClick,
    setHighlightedPath,
    clearSelection,
  };
};

export default useColumnDrawerState;
