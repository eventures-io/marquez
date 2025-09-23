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
    setIsDrawerOpen(false);
    setSelectedNodeId(null);
    setSelectedNodeData(null);
    // Keep selected column for highlighting purposes
    // setSelectedColumn(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isDrawerOpen) return;

      const target = event.target as HTMLElement;

      const insideDrawer = !!(drawerRef.current && drawerRef.current.contains(target));
      const clickedNode = !!target.closest('.react-flow__node');

      if (insideDrawer) {
        return;
      }

      if (clickedNode) {
        return;
      }

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
