import React, { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { useReactFlow } from '@xyflow/react';
import { TableLevelActionBar } from './TableLevelActionBar';
import DetailsPane from './DetailsPane';
import LineageGraph from './LineageGraph';
import JobDetailsPane from './JobDetailsPane';
import EditForm from './EditForm';
import Toolbar from './Toolbar';
import { useDrawerState } from './useDrawerState';
import { NodeType, LineageMode, JobType, DatasetType } from '@app-types';
import '@xyflow/react/dist/style.css';

interface TableLevelFlowProps {
  mode: LineageMode;
  lineageGraph: { nodes: any[], edges: any[] } | null;
  nodeType: NodeType;
  depth: number;
  setDepth: (depth: number) => void;
  isCompact: boolean;
  setIsCompact: (isCompact: boolean) => void;
  isFull: boolean;
  setIsFull: (isFull: boolean) => void;
  onRefresh: () => void;
  onUpdate?: (nodeId: string, data: any) => void;
  onSave?: () => void;
  onNodeCreate?: (sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  onDelete?: (nodeId: string) => void;
  // Toolbar props for edit/create modes
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  canSaveLineage?: boolean;
  loading?: boolean;
  error?: string | null;
  // Optional: initial node selection (open drawer on mount)
  initialSelectionId?: string;
  // Optional: control layout/fit behavior (useful for create mode)
  useLayout?: boolean;
  fitView?: boolean;
}

const HEADER_HEIGHT = 64 + 1;

const TableLevelFlow: React.FC<TableLevelFlowProps> = ({
  mode,
  lineageGraph,
  nodeType,
  depth,
  setDepth,
  isCompact,
  setIsCompact,
  isFull,
  setIsFull,
  onRefresh,
  onUpdate,
  onSave,
  onNodeCreate,
  onEdgeCreate,
  onDelete,
  isSaving = false,
  hasUnsavedChanges = false,
  canSaveLineage = false,
  loading = false,
  error = null,
  initialSelectionId,
  useLayout = true,
  fitView = true,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Custom hooks
  const { isDrawerOpen, selectedNodeId, selectedNodeData, drawerRef, handleNodeClick, handlePaneClick } = useDrawerState();
  // Open drawer initially if requested (only once)
  const didAutoOpenRef = useRef(false);
  useEffect(() => {
    if (!didAutoOpenRef.current && initialSelectionId && lineageGraph) {
      const node = lineageGraph.nodes.find((n) => n.id === initialSelectionId);
      if (node) {
        handleNodeClick(initialSelectionId, node.data);
        didAutoOpenRef.current = true;
      }
    }
  }, [initialSelectionId, lineageGraph, handleNodeClick]);


  return (
    <>
      <TableLevelActionBar
        nodeType={nodeType}
        depth={depth}
        setDepth={setDepth}
        isCompact={isCompact}
        setIsCompact={setIsCompact}
        isFull={isFull}
        setIsFull={setIsFull}
        onRefresh={onRefresh}
      />
      
      <Box 
        height={`calc(100vh - ${HEADER_HEIGHT}px - 60px)`}
        sx={{ overflow: 'hidden', backgroundColor: 'white', position: 'relative' }}
      >
        {/* Details pane for node details */}
        <DetailsPane 
          ref={drawerRef} 
          open={isDrawerOpen} 
          onClose={handlePaneClick}
          showDelete={mode !== LineageMode.VIEW && !!selectedNodeId}
          onDelete={() => {
            console.log('TableLevelFlow onDelete called with selectedNodeId:', selectedNodeId);
            if (selectedNodeId && onDelete) {
              console.log('Calling onDelete with nodeId:', selectedNodeId);
              onDelete(selectedNodeId);
              handlePaneClick(); // Close the pane after deletion
            }
          }}
        >
          {mode === LineageMode.VIEW ? (
            <JobDetailsPane 
              selectedNodeData={selectedNodeData}
              selectedNodeId={selectedNodeId}
            />
          ) : (
            <EditForm
              selectedNodeData={selectedNodeData}
              selectedNodeId={selectedNodeId}
              onUpdate={(updatedData: any) => {
                if (selectedNodeId && onUpdate) {
                  onUpdate(selectedNodeId, updatedData);
                  // Update the drawer state with the new data to keep it in sync
                  const updatedNodeData = {
                    ...selectedNodeData,
                    ...updatedData,
                    ...(updatedData.dataset && { dataset: { ...selectedNodeData?.dataset, ...updatedData.dataset } }),
                    ...(updatedData.job && { job: { ...selectedNodeData?.job, ...updatedData.job } }),
                  };
                  handleNodeClick(selectedNodeId, updatedNodeData);
                }
              }}
              onClose={handlePaneClick}
            />
          )}
        </DetailsPane>

        <LineageGraph
          lineageGraph={lineageGraph}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onConnectEnd={undefined}
          onNodeCreate={mode !== LineageMode.VIEW ? onNodeCreate : undefined}
          useLayout={useLayout}
          fitView={fitView}
          loading={loading}
          error={error}
        />
      </Box>

      {/* Toolbar for edit/create modes */}
      {/* Debug: mode={mode}, onSave={!!onSave} */}
      {mode !== LineageMode.VIEW && onSave && (
        <Toolbar
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          canSaveLineage={canSaveLineage}
          onSaveLineage={onSave}
        />
      )}
      {/* Always show toolbar in non-view modes for debugging */}
      {mode !== LineageMode.VIEW && !onSave && (
        <div style={{padding: '10px', background: 'red', color: 'white'}}>
          DEBUG: Edit/Create mode but onSave is missing! Mode: {mode}
        </div>
      )}
    </>
  );
};

export default TableLevelFlow;
