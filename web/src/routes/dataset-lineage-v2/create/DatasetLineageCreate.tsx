import React, { useCallback, useRef, useState, useEffect } from 'react'
import { LineageMode, NodeType, DatasetType, JobType } from '@app-types'
import { useLineageData } from '../useLineageData'
import { useSaveLineage } from '../useSaveLineage'
import TableLevelFlow from '../TableLevelFlow'

// Node ID generators
let nodeId = 2
const getJobId = () => `job-${nodeId++}`
const getDatasetId = () => `dataset-${nodeId++}`

const DatasetLineageCreateNew: React.FC = () => {
  // Local state management for creation
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
  } = useLineageData()

  // Save functionality
  const {
    isSaving,
    hasUnsavedChanges,
    showValidationErrors,
    validationErrors,
    showSuccessDialog,
    saveLineage,
    setHasUnsavedChanges,
    setShowValidationErrors,
    setShowSuccessDialog,
  } = useSaveLineage()

  const [isInitialDatasetConfigured, setIsInitialDatasetConfigured] = useState(false)
  const [hasCreatedFirstJob, setHasCreatedFirstJob] = useState(false)
  const initializedRef = useRef(false)

  // Initialize with default dataset
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      
      // Create initial dataset
      const initialDatasetData = {
        id: 'dataset-1',
        label: '',
        type: NodeType.DATASET,
        dataset: {
          id: { namespace: '', name: '' },
          name: '',
          namespace: '',
          type: DatasetType.DB_TABLE,
          physicalName: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sourceName: '',
          fields: [],
          facets: {},
          tags: [],
          lastModifiedAt: new Date().toISOString(),
          description: ''
        }
      }
      updateNode('dataset-1', initialDatasetData)
      // Compute vertical center based on viewport (header ~65px, toolbar ~60px)
      const header = 65
      const toolbar = 60
      const available = Math.max(200, window.innerHeight - header - toolbar)
      const centerY = Math.round(available / 2)
      updateNodePosition('dataset-1', { x: 50, y: centerY })
    }
  }, [updateNode, updateNodePosition])

  // Convert local lineage data to ReactFlow format
  const lineageGraph = React.useMemo(() => {
    const dummyHandleNodeClick = () => {}
    const { nodes, edges } = toReactFlowFormat(dummyHandleNodeClick)
    
    // Add node configuration state
    const enhancedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        showPulsingHandle: node.id === 'dataset-1' && isInitialDatasetConfigured && !hasCreatedFirstJob,
        isDragEnabled: node.id === 'dataset-1' ? isInitialDatasetConfigured : true
      }
    }))

    return { nodes: enhancedNodes, edges }
  }, [lineageData, toReactFlowFormat, isInitialDatasetConfigured, hasCreatedFirstJob])

  // Track changes for unsaved changes warning
  useEffect(() => {
    if (initializedRef.current && (lineageData.nodes.size > 1 || lineageData.edges.size > 0)) {
      setHasUnsavedChanges(true)
    }
  }, [lineageData, setHasUnsavedChanges])

  // Handle node updates
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
      
      // Mark initial dataset as configured if this is the first dataset
      if (nodeId === 'dataset-1' && updatedData.dataset) {
        setIsInitialDatasetConfigured(true)
      }
    }
  }, [getNode, updateNode])

  // Handle node creation
  const handleNodeCreate = useCallback((sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => {
    // Don't allow creation until initial dataset is configured
    if (!isInitialDatasetConfigured && sourceNodeId === 'dataset-1') {
      return
    }

    // Position is already adjusted by LineageGraph to avoid overlap
    const newPosition = position

    if (sourceNodeType === NodeType.DATASET) {
      // Create job node
      const id = getJobId()
      const namespace = '' // Should be derived from initial dataset
      
      setHasCreatedFirstJob(true)
      createJobNode(id, newPosition, namespace)
      
      // Create edge
      const edgeId = `${sourceNodeId}-${id}`
      addLineageEdge(edgeId, sourceNodeId, id)
      
    } else if (sourceNodeType === NodeType.JOB) {
      // Create dataset node
      const id = getDatasetId()
      const namespace = '' // Should be derived from context
      
      createDatasetNode(id, newPosition, namespace)
      
      // Create edge
      const edgeId = `${sourceNodeId}-${id}`
      addLineageEdge(edgeId, sourceNodeId, id)
    }
  }, [isInitialDatasetConfigured, createJobNode, createDatasetNode, addLineageEdge])

  // Handle edge creation (called separately from node creation)
  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    addLineageEdge(edgeId, sourceId, targetId)
  }, [addLineageEdge])

  // Handle node deletion (in create mode, just remove from local state)
  const handleNodeDelete = useCallback((nodeId: string) => {
    deleteNode(nodeId)
    setHasUnsavedChanges(true)
  }, [deleteNode, setHasUnsavedChanges])

  // Handle save
  const handleSave = async () => {
    await saveLineage(lineageData)
  }

  // Check if lineage can be saved
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
      setDepth={() => {}} // Not used in create mode
      isCompact={false}
      setIsCompact={() => {}} // Not used in create mode  
      isFull={false}
      setIsFull={() => {}} // Not used in create mode
      onRefresh={() => {}} // Not used in create mode
      onUpdate={handleNodeUpdate}
      onSave={handleSave}
      onNodeCreate={handleNodeCreate}
      onEdgeCreate={handleEdgeCreate}
      onDelete={handleNodeDelete}
      // Create mode: manual positions, left-aligned, open drawer
      useLayout={false}
      fitView={false}
      initialSelectionId={'dataset-1'}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      canSaveLineage={canSaveLineage()}
      loading={false}
      error={null}
    />
  )
}

export default DatasetLineageCreateNew
