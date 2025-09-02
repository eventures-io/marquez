import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { NodeType, LineageMode, LineageEdgeData, LineageNodeData, LineageNode } from '@app-types'
import { getLineage } from '../../../store/requests/lineage'
import { generateNodeId } from '../../../helpers/nodes'
import { createTableLevelElements } from '../tableLevelMapping'
import { useLineageData } from '../useLineageData'
import { useSaveLineage } from '../useSaveLineage'
import TableLevelFlow from '../TableLevelFlow'

const DatasetLineageEdit: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Control states
  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)
  const [isCompact, setIsCompact] = useState(searchParams.get('isCompact') === 'true')
  const [isFull, setIsFull] = useState(searchParams.get('isFull') === 'true')
  
  const currentNodeId = namespace && name ? 
    generateNodeId('DATASET', namespace, name) : null
  const collapsedNodes = searchParams.get('collapsedNodes')

  // Local state management for edits
  const {
    lineageData: localLineageData,
    nodePositions,
    updateNode,
    deleteNode,
    updateNodePosition,
    addEdge: addLineageEdge,
    getNode,
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

  // Fetch lineage data from server and convert to local format
  const fetchLineageData = useCallback(async () => {
    if (!namespace || !name) return
    
    setLoading(true)
    setError(null)
    
    try {
      const serverData = await getLineage('DATASET', namespace, name, depth)
      console.log('Fetched server data:', serverData)
      
      // Use existing table level mapping to get proper positioning and edges
      const result = createTableLevelElements(
        serverData,
        currentNodeId,
        isCompact,
        isFull,
        collapsedNodes
      )
      
      console.log('Mapped server data to ReactFlow format:', result)
      
      // Convert the mapped ReactFlow nodes back to our local format
      result.nodes.forEach((reactFlowNode: any) => {
        const nodeData: LineageNodeData = {
          id: reactFlowNode.id,
          label: reactFlowNode.data.label || reactFlowNode.data.name || '',
          type: reactFlowNode.data.type,
          ...(reactFlowNode.data.dataset && { dataset: reactFlowNode.data.dataset }),
          ...(reactFlowNode.data.job && { job: reactFlowNode.data.job }),
        }
        
        console.log('Adding mapped node to local state:', reactFlowNode.id, nodeData)
        updateNode(reactFlowNode.id, nodeData)
        updateNodePosition(reactFlowNode.id, reactFlowNode.position)
      })
      
      // Convert edges to local format
      result.edges.forEach((reactFlowEdge: any) => {
        console.log('Adding mapped edge to local state:', reactFlowEdge.id)
        addLineageEdge(reactFlowEdge.id, reactFlowEdge.source, reactFlowEdge.target)
      })
      
    } catch (error) {
      console.error('Failed to fetch lineage:', error)
      setError('Failed to fetch lineage data')
    } finally {
      setLoading(false)
    }
  }, [namespace, name, depth, currentNodeId, isCompact, isFull, collapsedNodes, updateNode, updateNodePosition, addLineageEdge])

  // Load lineage data on mount and when params change
  useEffect(() => {
    fetchLineageData()
  }, [fetchLineageData])


  // Update URL params when controls change
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('depth', depth.toString())
    newSearchParams.set('isCompact', isCompact.toString())
    newSearchParams.set('isFull', isFull.toString())
    setSearchParams(newSearchParams)
  }, [depth, isCompact, isFull, setSearchParams])

  // Map local lineage data to ReactFlow format (single source of truth)
  const lineageGraph = React.useMemo(() => {
    if (localLineageData.nodes.size === 0) {
      return null
    }

    const dummyHandleNodeClick = () => {}
    
    const nodes = Array.from(localLineageData.nodes.entries()).map(([id, data]: [string, LineageNodeData]) => ({
      id,
      type: 'tableLevel',
      position: nodePositions.get(id) || { x: 50, y: 300 },
      data: {
        ...data,
        onNodeClick: dummyHandleNodeClick,
      },
    }))

    const edges = Array.from(localLineageData.edges.values()).map((edge: LineageEdgeData) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }))

    return { nodes, edges }
  }, [localLineageData, nodePositions])

  // Handle node updates
  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    // Merge updated partial data into existing node to preserve id/type
    const current = getNode(nodeId)
    const inferredType = updatedData?.job ? NodeType.JOB : NodeType.DATASET
    const merged: LineageNodeData = {
      id: current?.id || nodeId,
      label: updatedData?.label ?? current?.label ?? '',
      type: current?.type ?? inferredType,
      ...(current?.dataset || updatedData?.dataset ? {
        dataset: { ...(current?.dataset as any), ...(updatedData?.dataset || {}) }
      } : {}),
      ...(current?.job || updatedData?.job ? {
        job: { ...(current?.job as any), ...(updatedData?.job || {}) }
      } : {}),
    }
    updateNode(nodeId, merged)
    setHasUnsavedChanges(true)
  }, [getNode, updateNode, setHasUnsavedChanges])

  // Handle node creation
  const handleNodeCreate = useCallback((sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => {
    const nodeId = sourceNodeType === NodeType.DATASET ? 
      `job-${Date.now()}` : `dataset-${Date.now()}`
    
    const namespace = '' // Namespace should be provided by the user
    
    if (sourceNodeType === NodeType.DATASET) {
      createJobNode(nodeId, position, namespace)
      // Create edge automatically  
      const edgeId = `${sourceNodeId}-${nodeId}`
      addLineageEdge(edgeId, sourceNodeId, nodeId)
    } else {
      createDatasetNode(nodeId, position, namespace)
      // Create edge automatically
      const edgeId = `${sourceNodeId}-${nodeId}`
      addLineageEdge(edgeId, sourceNodeId, nodeId)
    }
    
    setHasUnsavedChanges(true)
  }, [createJobNode, createDatasetNode, addLineageEdge, setHasUnsavedChanges])

  // Handle edge creation (separate from node creation)
  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    addLineageEdge(edgeId, sourceId, targetId)
    setHasUnsavedChanges(true)
  }, [addLineageEdge, setHasUnsavedChanges])

  // Handle node deletion
  const handleNodeDelete = useCallback((nodeId: string) => {
    console.log('handleNodeDelete called with nodeId:', nodeId);
    deleteNode(nodeId)
    setHasUnsavedChanges(true)
  }, [deleteNode, setHasUnsavedChanges])

  // Handle save
  const handleSave = async () => {
    await saveLineage(localLineageData)
  }

  // Check if lineage can be saved
  const canSaveLineage = useCallback(() => {
    // Always allow saving in edit mode (even if no local changes yet)
    return !isSaving
  }, [isSaving])

  return (
    <TableLevelFlow 
      mode={LineageMode.EDIT}
      lineageGraph={lineageGraph}
      nodeType={NodeType.DATASET}
      depth={depth}
      setDepth={setDepth}
      isCompact={isCompact}
      setIsCompact={setIsCompact}
      isFull={isFull}
      setIsFull={setIsFull}
      onRefresh={fetchLineageData}
      onUpdate={handleNodeUpdate}
      onSave={handleSave}
      onNodeCreate={handleNodeCreate}
      onEdgeCreate={handleEdgeCreate}
      onDelete={handleNodeDelete}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      canSaveLineage={canSaveLineage()}
      loading={loading}
      error={error}
    />
  )
}

export default DatasetLineageEdit
