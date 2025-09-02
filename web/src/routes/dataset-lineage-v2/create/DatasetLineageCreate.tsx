import React, { useCallback, useRef, useState, useEffect } from 'react'
import { LineageMode, NodeType } from '@app-types'
import { useLineageData } from '../useLineageData'
import { useSaveLineage } from '../useSaveLineage'
import TableLevelFlow from '../TableLevelFlow'
import { INITIAL_DATASET_ID } from '../constants'


let nodeId = 2
const getJobId = () => `job-${nodeId++}`
const getDatasetId = () => `dataset-${nodeId++}`

const DatasetLineageCreateNew: React.FC = () => {

  const {
    lineageData,
    updateNode,
    deleteNode,
    updateNodePosition,
    addEdge: addLineageEdge,
    getNode,
    toReactFlowFormat,
    createJobNode,
    createDatasetNode,
    initializeWithDefaults,
  } = useLineageData()


  const {
    isSaving,
    hasUnsavedChanges,
    saveLineage,
    setHasUnsavedChanges,
  } = useSaveLineage()

  const [isInitialDatasetConfigured, setIsInitialDatasetConfigured] = useState(false)
  const [hasCreatedFirstJob, setHasCreatedFirstJob] = useState(false)
  const initializedRef = useRef(false)

  // Initialize with default dataset
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
    
      initializeWithDefaults(() => {})
      const header = 65
      const toolbar = 60
      const available = Math.max(200, window.innerHeight - header - toolbar)
      const centerY = Math.round(available / 2)
      updateNodePosition(INITIAL_DATASET_ID, { x: 50, y: centerY })
    }
  }, [initializeWithDefaults, updateNodePosition])


  const lineageGraph = React.useMemo(() => {
    const dummyHandleNodeClick = () => {}
    const { nodes, edges } = toReactFlowFormat(dummyHandleNodeClick)
    
    const enhancedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        showPulsingHandle: node.id === INITIAL_DATASET_ID && isInitialDatasetConfigured && !hasCreatedFirstJob,
        isDragEnabled: node.id === INITIAL_DATASET_ID ? isInitialDatasetConfigured : true
      }
    }))

    return { nodes: enhancedNodes, edges }
  }, [lineageData, toReactFlowFormat, isInitialDatasetConfigured, hasCreatedFirstJob])

  useEffect(() => {
    if (initializedRef.current && (lineageData.nodes.size > 1 || lineageData.edges.size > 0)) {
      setHasUnsavedChanges(true)
    }
  }, [lineageData, setHasUnsavedChanges])


  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    const currentNode = getNode(nodeId)
    if (currentNode) {
      const updatedNodeData = {
        ...currentNode,
        label: updatedData.label || currentNode.label,
        ...(updatedData.dataset && { dataset: { ...currentNode.dataset, ...updatedData.dataset } }),
        ...(updatedData.job && { job: { ...currentNode.job, ...updatedData.job } }),
      }
      
      updateNode(nodeId, updatedNodeData)
 
      if (nodeId === INITIAL_DATASET_ID && updatedData.dataset) {
        setIsInitialDatasetConfigured(true)
      }
    }
  }, [getNode, updateNode])


  const handleNodeCreate = useCallback((sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => {
    // Don't allow creation until initial dataset is configured
    if (!isInitialDatasetConfigured && sourceNodeId === INITIAL_DATASET_ID) {
      return
    }

    const newPosition = position

    if (sourceNodeType === NodeType.DATASET) {
      const id = getJobId()
      const namespace = ''
      
      setHasCreatedFirstJob(true)
      createJobNode(id, newPosition, namespace)
      
      const edgeId = `${sourceNodeId}-${id}`
      addLineageEdge(edgeId, sourceNodeId, id)
      
    } else if (sourceNodeType === NodeType.JOB) {
  
      const id = getDatasetId()
      const namespace = ''
      
      createDatasetNode(id, newPosition, namespace)
      
      const edgeId = `${sourceNodeId}-${id}`
      addLineageEdge(edgeId, sourceNodeId, id)
    }
  }, [isInitialDatasetConfigured, createJobNode, createDatasetNode, addLineageEdge])


  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    addLineageEdge(edgeId, sourceId, targetId)
  }, [addLineageEdge])


  const handleNodeDelete = useCallback((nodeId: string) => {
    deleteNode(nodeId)
    setHasUnsavedChanges(true)
  }, [deleteNode, setHasUnsavedChanges])


  const handleSave = async () => {
    await saveLineage(lineageData)
  }


  const canSaveLineage = useCallback(() => {
    return lineageData.nodes.size > 1 && !isSaving
  }, [lineageData.nodes.size, isSaving])

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        return 'You have unsaved changes. Are you sure you want to leave?'
      }
    }
    
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
    
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return (
    <TableLevelFlow 
      mode={LineageMode.CREATE}
      lineageGraph={lineageGraph}
      nodeType={NodeType.DATASET}
      depth={2}
      setDepth={() => {}} 
      onUpdate={handleNodeUpdate}
      onSave={handleSave}
      onNodeCreate={handleNodeCreate}
      onEdgeCreate={handleEdgeCreate}
      onDelete={handleNodeDelete}
      useLayout={false}
      fitView={false}
      initialSelectionId={INITIAL_DATASET_ID}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      canSaveLineage={canSaveLineage()}
      loading={false}
      error={null}
    />
  )
}

export default DatasetLineageCreateNew
