// @ts-nocheck
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { TableLevelActionBar } from './TableLevelActionBar';
import DetailsPane from './DetailsPane';
import LineageGraph from './LineageGraph';
import JobDetailsPane from './JobDetailsPane';
import { useDrawerState } from './useDrawerState';
import '@xyflow/react/dist/style.css';

interface TableLevelFlowProps {
  lineageGraph: { nodes: any[], edges: any[] } | null;
  nodeType: 'DATASET' | 'JOB';
  depth: number;
  setDepth: (depth: number) => void;
  isCompact: boolean;
  setIsCompact: (isCompact: boolean) => void;
  isFull: boolean;
  setIsFull: (isFull: boolean) => void;
  onRefresh: () => void;
  loading?: boolean;
  error?: string | null;
}

const HEADER_HEIGHT = 64 + 1;

const TableLevelFlow: React.FC<TableLevelFlowProps> = ({
  lineageGraph,
  nodeType,
  depth,
  setDepth,
  isCompact,
  setIsCompact,
  isFull,
  setIsFull,
  onRefresh,
  loading = false,
  error = null,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Custom hooks
  const { isDrawerOpen, selectedNodeId, selectedNodeData, drawerRef, handleNodeClick, handlePaneClick } = useDrawerState();


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
        <DetailsPane ref={drawerRef} open={isDrawerOpen} onClose={handlePaneClick}>
          <JobDetailsPane 
            selectedNodeData={selectedNodeData}
            selectedNodeId={selectedNodeId}
          />
        </DetailsPane>

        <LineageGraph
          lineageGraph={lineageGraph}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          loading={loading}
          error={error}
        />
      </Box>
    </>
  );
};

export default TableLevelFlow;