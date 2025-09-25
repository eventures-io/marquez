import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import ColumnLevelActionBar from './ColumnLevelActionBar';
import DetailsPane from '../components/DetailsPane';
import ColumnDetailsPane from './components/ColumnDetailsPane';
import Toolbar from '../table-view/components/Toolbar';
import { NodeType, LineageMode } from '@app-types';
import '@xyflow/react/dist/style.css';
import ColumnLineageGraph from './components/ColumnLineageGraph';
import { Node } from '@xyflow/react';

interface ColumnLevelFlowProps {
  mode: LineageMode;
  columnLineageGraph: { nodes: any[], edges: any[] } | null;
  nodeType: NodeType;
  depth?: number;
  setDepth?: (depth: number) => void;
  onUpdate?: (nodeId: string, data: any) => void;
  onSave?: () => void;
  onDelete?: (nodeId: string) => void;
  onColumnCreate?: (sourceDatasetId: string, position: { x: number; y: number }) => void;
  onDatasetCreate?: (position: { x: number; y: number }) => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  loading?: boolean;
  error?: string | null;
  initialSelectionId?: string;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  // Drawer state props
  isDrawerOpen?: boolean;
  selectedNodeId?: string | null;
  selectedNodeData?: any;
  drawerRef?: React.RefObject<HTMLDivElement>;
  handlePaneClick?: () => void;
  canSaveLineage?: boolean;
  totalDatasets?: number;
  totalColumns?: number;
  selectedColumn?: string;
  drawerContent?: React.ReactNode;
  fitViewKey?: number | null;
  onLayoutNodesUpdate?: (nodes: Node[]) => void;
}

const HEADER_HEIGHT = 64 + 1;

const ColumnLevelFlow: React.FC<ColumnLevelFlowProps> = ({
  mode,
  columnLineageGraph,
  nodeType,
  depth,
  setDepth,
  onUpdate,
  onSave,
  onDelete,
  onColumnCreate,
  onDatasetCreate,
  onEdgeCreate,
  onEdgeDelete,
  onNodeClick,
  onNodePositionChange,
  loading = false,
  error = null,
  initialSelectionId,
  isSaving = false,
  hasUnsavedChanges = false,
  canSaveLineage = false,
  totalDatasets = 0,
  totalColumns = 0,
  selectedColumn,
  // Drawer state props
  isDrawerOpen,
  selectedNodeId,
  selectedNodeData,
  drawerRef,
  handlePaneClick,
  drawerContent,
  fitViewKey,
  onLayoutNodesUpdate,
}) => {
  // Use drawer props or provide defaults for backward compatibility
  const drawerOpen = isDrawerOpen ?? false;
  const drawerSelectedNodeId = selectedNodeId ?? null;
  const drawerSelectedNodeData = selectedNodeData ?? null;
  const drawerRefProp = drawerRef ?? { current: null };
  const drawerHandlePaneClick = handlePaneClick ?? (() => {});
  const didAutoOpenRef = useRef(false);
  // Open drawer initially if requested (only once)
  useEffect(() => {
    if (!didAutoOpenRef.current && initialSelectionId && columnLineageGraph && onNodeClick) {
      const node = columnLineageGraph.nodes.find((n) => n.id === initialSelectionId);
      if (node) {
        onNodeClick(initialSelectionId, node.data);
        didAutoOpenRef.current = true;
      }
    }
  }, [initialSelectionId, columnLineageGraph, onNodeClick]);

  return (
    <>
      {mode === LineageMode.VIEW && depth !== undefined && setDepth && (
        <ColumnLevelActionBar
          nodeType={nodeType}
          depth={depth}
          setDepth={setDepth}
          totalDatasets={totalDatasets}
          totalColumns={totalColumns}
          selectedColumn={selectedColumn}
          mode={mode}
          onSave={onSave}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          canSaveLineage={canSaveLineage}
        />
      )}
      
      <Box 
        height={`calc(100vh - ${HEADER_HEIGHT}px - 60px)`}
        sx={{ overflow: 'hidden', backgroundColor: 'white', position: 'relative' }}
      >
        <DetailsPane
          ref={drawerRefProp} 
          open={drawerOpen} 
          onClose={drawerHandlePaneClick}
          showDelete={mode !== LineageMode.VIEW && !!drawerSelectedNodeId}
          onDelete={() => {
            if (drawerSelectedNodeId && onDelete) {
              onDelete(drawerSelectedNodeId);
              drawerHandlePaneClick(); 
            }
          }}
        >
          {drawerContent || <ColumnDetailsPane columnData={drawerSelectedNodeData} />}
        </DetailsPane>

        <ColumnLineageGraph
          mode={mode}
          columnLineageGraph={columnLineageGraph}
          onNodeClick={onNodeClick || (() => {})}
          onPaneClick={drawerHandlePaneClick}
          onEdgeCreate={onEdgeCreate}
          onEdgeDelete={onEdgeDelete}
          onNodePositionChange={onNodePositionChange}
          loading={loading}
          error={error}
          fitViewKey={fitViewKey}
          onLayoutNodesUpdate={onLayoutNodesUpdate}
        />
      </Box>

      {/* Toolbar for edit/create modes */}
      {mode !== LineageMode.VIEW && onSave && (
        <Toolbar
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          canSaveLineage={!!canSaveLineage}
          onSaveLineage={onSave}
        />
      )}
    </>
  );
};

export default ColumnLevelFlow;
