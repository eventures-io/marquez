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
  onUpdate?: (nodeId: string, data: any) => void;
  onSave?: () => void;
  onNodeCreate?: (sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => void;
  onEdgeCreate?: (sourceId: string, targetId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onDelete?: (nodeId: string) => void;
  // Toolbar props for edit/create modes
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  canSaveLineage?: boolean;
  loading?: boolean;
  error?: string | null;
  initialSelectionId?: string;
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
  onUpdate,
  onSave,
  onNodeCreate,
  onEdgeCreate,
  onEdgeDelete,
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
      />
      
      <Box 
        height={`calc(100vh - ${HEADER_HEIGHT}px - 60px)`}
        sx={{ overflow: 'hidden', backgroundColor: 'white', position: 'relative' }}
      >
   
        <DetailsPane 
          ref={drawerRef} 
          open={isDrawerOpen} 
          onClose={handlePaneClick}
          showDelete={mode !== LineageMode.VIEW && !!selectedNodeId}
          onDelete={() => {
            if (selectedNodeId && onDelete) {
              onDelete(selectedNodeId);
              handlePaneClick(); 
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
          onEdgeCreate={mode !== LineageMode.VIEW ? onEdgeCreate : undefined}
          onEdgeDelete={mode !== LineageMode.VIEW ? onEdgeDelete : undefined}
          useLayout={useLayout}
          lockELKLayout={mode === LineageMode.EDIT}
          allowConnect={mode !== LineageMode.VIEW}
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
   
    </>
  );
};

export default TableLevelFlow;
