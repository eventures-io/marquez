import React, { useCallback, useRef, useState, useEffect } from 'react'
import { LineageMode, NodeType } from '@app-types'
import ColumnLevelFlow from '../ColumnLevelFlow'
import { useColumnLineageData } from '../useColumnLineageData'
import { useSaveColumnLineage } from '../useSaveColumnLineage'

let nodeId = 2
const getDatasetId = () => `column-dataset-${nodeId++}`
const getColumnId = () => `column-field-${nodeId++}`

const ColumnLineageCreate: React.FC = () => {
  const {
    columnLineageData,
    updateColumnNode,
    deleteColumnNode,
    updateColumnNodePosition,
    addColumnEdge,
    deleteColumnEdge,
    getColumnNode,
    toColumnReactFlowFormat,
    createColumnDatasetNode,
    createColumnFieldNode,
    initializeWithDefaults,
  } = useColumnLineageData()

  const {
    isSaving,
    hasUnsavedChanges,
    saveColumnLineage,
    setHasUnsavedChanges,
  } = useSaveColumnLineage()

  const [isInitialDatasetConfigured, setIsInitialDatasetConfigured] = useState(false)
  const [hasCreatedFirstColumn, setHasCreatedFirstColumn] = useState(false)
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
      updateColumnNodePosition('initial-dataset', { x: 50, y: centerY })
    }
  }, [initializeWithDefaults, updateColumnNodePosition])

  const columnLineageGraph = React.useMemo(() => {
    const dummyHandleNodeClick = () => {}
    const { nodes, edges } = toColumnReactFlowFormat(dummyHandleNodeClick)
    
    const enhancedNodes = nodes.map(node => {
      const nodeData = getColumnNode(node.id)
      let isNodeComplete = true
      
      // Check if node has complete namespace and name
      if (nodeData) {
        if (nodeData.type === 'dataset-container' && nodeData.data) {
          isNodeComplete = !!(nodeData.data.namespace?.trim() && nodeData.data.name?.trim())
        } else if (nodeData.type === 'column-field' && nodeData.data) {
          isNodeComplete = !!(nodeData.data.namespace?.trim() && nodeData.data.datasetName?.trim() && nodeData.data.fieldName?.trim())
        }
      }
      
      return {
        ...node,
        data: {
          ...node.data,
          showPulsingHandle: node.id === 'initial-dataset' && isInitialDatasetConfigured && !hasCreatedFirstColumn,
          isDragEnabled: node.id === 'initial-dataset' ? isInitialDatasetConfigured : isNodeComplete,
          isRootNode: node.id === 'initial-dataset'
        }
      }
    })

    return { nodes: enhancedNodes, edges }
  }, [columnLineageData, toColumnReactFlowFormat, isInitialDatasetConfigured, hasCreatedFirstColumn, getColumnNode])

  useEffect(() => {
    if (initializedRef.current && (columnLineageData.nodes.size > 1 || columnLineageData.edges.size > 0)) {
      setHasUnsavedChanges(true)
    }
  }, [columnLineageData, setHasUnsavedChanges])

  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    const currentNode = getColumnNode(nodeId)
    if (currentNode) {
      const updatedNodeData = {
        ...currentNode,
        data: {
          ...currentNode.data,
          ...updatedData,
        }
      }
      
      updateColumnNode(nodeId, updatedNodeData)

      if (nodeId === 'initial-dataset' && updatedData.namespace && updatedData.name) {
        setIsInitialDatasetConfigured(true)
      }
    }
  }, [getColumnNode, updateColumnNode])

  const handleColumnCreate = useCallback((sourceDatasetId: string, position: { x: number; y: number }) => {
    // Don't allow creation until initial dataset is configured
    if (!isInitialDatasetConfigured && sourceDatasetId === 'initial-dataset') {
      return
    }

    // Don't allow creation from datasets that don't have complete namespace and name
    const sourceNode = getColumnNode(sourceDatasetId)
    if (sourceNode && sourceNode.type === 'dataset-container') {
      const dataset = sourceNode.data
      if (!dataset?.namespace?.trim() || !dataset?.name?.trim()) {
        return
      }
    }

    const id = getColumnId()
    const sourceDataset = getColumnNode(sourceDatasetId)
    const namespace = sourceDataset?.data?.namespace || ''
    const datasetName = sourceDataset?.data?.name || ''
    
    setHasCreatedFirstColumn(true)
    createColumnFieldNode(id, position, namespace, datasetName, sourceDatasetId)
    
  }, [isInitialDatasetConfigured, getColumnNode, createColumnFieldNode])

  const handleDatasetCreate = useCallback((position: { x: number; y: number }) => {
    const id = getDatasetId()
    const namespace = ''
    
    createColumnDatasetNode(id, position, namespace)
  }, [createColumnDatasetNode])

  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    addColumnEdge(edgeId, sourceId, targetId)
  }, [addColumnEdge])

  const handleNodeDelete = useCallback((nodeId: string) => {
    deleteColumnNode(nodeId)
    setHasUnsavedChanges(true)
  }, [deleteColumnNode, setHasUnsavedChanges])

  const handleEdgeDelete = useCallback((edgeId: string) => {
    deleteColumnEdge(edgeId)
    setHasUnsavedChanges(true)
  }, [deleteColumnEdge, setHasUnsavedChanges])

  const handleSave = async () => {
    await saveColumnLineage(columnLineageData)
  }

  const canSaveLineage = useCallback(() => {
    return columnLineageData.nodes.size > 1 && !isSaving
  }, [columnLineageData.nodes.size, isSaving])

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
    <ColumnLevelFlow 
      mode={LineageMode.CREATE}
      columnLineageGraph={columnLineageGraph}
      nodeType={NodeType.DATASET}
      depth={2}
      setDepth={() => {}} 
      onUpdate={handleNodeUpdate}
      onSave={handleSave}
      onColumnCreate={handleColumnCreate}
      onDatasetCreate={handleDatasetCreate}
      onEdgeCreate={handleEdgeCreate}
      onEdgeDelete={handleEdgeDelete}
      onDelete={handleNodeDelete}
      initialSelectionId="initial-dataset"
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      canSaveLineage={canSaveLineage()}
      loading={false}
      error={null}
      totalDatasets={Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'dataset-container').length}
      totalColumns={Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'column-field').length}
    />
  )
}

export default ColumnLineageCreate