import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { NodeType, LineageMode, LineageEdgeData, LineageNodeData, LineageNode } from '@app-types'
import { getLineage } from '../../../../store/requests/lineage'
import { createTableLevelElements } from '../tableLevelMapping'
import { deleteDataset } from '../../../../store/requests/datasets'
import { deleteJob } from '../../../../store/requests/jobs'
import { useLineageData } from '../useLineageData'
import { useSaveLineage } from '../useSaveLineage'
import TableLevelFlow from '../TableLevelFlow'
import DeleteWarningDialog from '../components/DeleteWarningDialog'

const DatasetLineageEdit: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalNodeIds, setOriginalNodeIds] = useState<Set<string>>(new Set())
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(null)
  
  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)
  

  const {
    lineageData: localLineageData,
    nodePositions,
    updateNode,
    deleteNode,
    updateNodePosition,
    addEdge: addLineageEdge,
    deleteEdge,
    getNode,
    previewCascadeDelete,
    createJobNode,
    createDatasetNode,
  } = useLineageData()


  const {
    isSaving,
    hasUnsavedChanges,
    saveLineage,
    setHasUnsavedChanges,
  } = useSaveLineage()

  // Fetch lineage data from server and convert to local format
  const fetchLineageData = useCallback(async () => {
    if (!namespace || !name) return
    
    setLoading(true)
    setError(null)
    
    try {
      const serverData = await getLineage('DATASET', namespace, name, depth)
      
      // Track original node IDs for deletion tracking during save
      const originalIds = new Set<string>(serverData.graph.map((node: LineageNode) => node.id))
      setOriginalNodeIds(originalIds)
      
      // Use existing table level mapping to get proper positioning and edges
      const result = createTableLevelElements(serverData)
      
      // Convert the mapped ReactFlow nodes back to our local format
      result.nodes.forEach((reactFlowNode: any) => {
        const nodeData: LineageNodeData = {
          id: reactFlowNode.id,
          label: reactFlowNode.data.label || reactFlowNode.data.name || '',
          type: reactFlowNode.data.type,
          ...(reactFlowNode.data.dataset && { dataset: reactFlowNode.data.dataset }),
          ...(reactFlowNode.data.job && { job: reactFlowNode.data.job }),
        }
        
        updateNode(reactFlowNode.id, nodeData)
        updateNodePosition(reactFlowNode.id, reactFlowNode.position)
      })
      
      result.edges.forEach((reactFlowEdge: any) => {
        addLineageEdge(reactFlowEdge.id, reactFlowEdge.source, reactFlowEdge.target)
      })
      
    } catch (error) {
      console.error('Failed to fetch lineage:', error)
      setError('Failed to fetch lineage data')
    } finally {
      setLoading(false)
    }
  }, [namespace, name, depth, updateNode, updateNodePosition, addLineageEdge])

  useEffect(() => {
    fetchLineageData()
  }, [fetchLineageData])


  // Update URL params when controls change
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('depth', depth.toString())
    setSearchParams(newSearchParams)
  }, [depth, setSearchParams])

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
        isRootNode: id === `dataset:${namespace}:${name}`,
      },
    }))

    const edges = Array.from(localLineageData.edges.values()).map((edge: LineageEdgeData) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }))

    return { nodes, edges }
  }, [localLineageData, nodePositions])


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

  const handleNodeCreate = useCallback((sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => {
    const nodeId = sourceNodeType === NodeType.DATASET ? 
      `job-${Date.now()}` : `dataset-${Date.now()}`
    
    const namespace = '' 
    
    if (sourceNodeType === NodeType.DATASET) {
      createJobNode(nodeId, position, namespace)
      const edgeId = `${sourceNodeId}-${nodeId}`
      addLineageEdge(edgeId, sourceNodeId, nodeId)
    } else {
      createDatasetNode(nodeId, position, namespace)
      const edgeId = `${sourceNodeId}-${nodeId}`
      addLineageEdge(edgeId, sourceNodeId, nodeId)
    }
    
    setHasUnsavedChanges(true)
  }, [createJobNode, createDatasetNode, addLineageEdge, setHasUnsavedChanges])

  // Handle edge creation when connecting to an existing node
  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    addLineageEdge(edgeId, sourceId, targetId)
    setHasUnsavedChanges(true)
  }, [addLineageEdge, setHasUnsavedChanges])

  const handleEdgeDelete = useCallback((edgeId: string) => {
    deleteEdge(edgeId)
    setHasUnsavedChanges(true)
  }, [deleteEdge, setHasUnsavedChanges])

  const handleNodeDelete = useCallback((nodeId: string) => {
    // Check if this would delete the entire lineage (root node)
    const preview = previewCascadeDelete(nodeId)
    const isRoot = preview.isRootNode
    
    if (isRoot) {
      // Show warning dialog for root node deletion
      setPendingDeleteNodeId(nodeId)
      setDeleteDialogOpen(true)
    } else {
      // Regular deletion - just delete immediately
      deleteNode(nodeId)
      setHasUnsavedChanges(true)
    }
  }, [previewCascadeDelete, deleteNode, setHasUnsavedChanges])

  // Handle confirmed deletion from dialog
  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteNodeId) return
    
    // Perform the deletion
    deleteNode(pendingDeleteNodeId)
    setHasUnsavedChanges(true)
    
    // Close dialog
    setDeleteDialogOpen(false)
    setPendingDeleteNodeId(null)
  }, [pendingDeleteNodeId, deleteNode, setHasUnsavedChanges])


  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false)
    setPendingDeleteNodeId(null)
  }, [])

  // Handle save with deletion tracking
  const handleSave = async () => {
    try {
      // First, handle deletions for existing saved nodes
      const currentNodeIds = new Set(localLineageData.nodes.keys())
      const deletedNodeIds = Array.from(originalNodeIds).filter(id => !currentNodeIds.has(id))
      
      if (deletedNodeIds.length > 0) {
        
        // We need to get the original node data to know namespace/name for deletion
        // For now, we'll need to parse the node ID format: "type:namespace:name"
        for (const nodeId of deletedNodeIds) {
          try {
            const parts = nodeId.split(':')
            if (parts.length >= 3) {
              const nodeType = parts[0]
              const namespace = parts[1] 
              const name = parts.slice(2).join(':') // Handle names with colons
              
              if (nodeType === 'dataset') {
                await deleteDataset(namespace, name)
              } else if (nodeType === 'job') {
                await deleteJob(namespace, name)
              }
            } else {
              console.warn('Could not parse node ID for deletion:', nodeId)
            }
          } catch (error) {
            console.error(`Failed to delete node ${nodeId}:`, error)
            // Continue with other deletions even if one fails
          }
        }
      }
      

      await saveLineage(localLineageData)
      
      // // Update original node IDs to current state after successful save
      // setOriginalNodeIds(new Set(localLineageData.nodes.keys()))
      
    } catch (error) {
      console.error('Save failed:', error)
      throw error // Re-throw so the save hook can handle it
    }
  }

  // Check if lineage can be saved
  const canSaveLineage = useCallback(() => {
    // Always allow saving in edit mode (even if no local changes yet)
    return !isSaving
  }, [isSaving])


  const pendingDeleteNode = pendingDeleteNodeId ? getNode(pendingDeleteNodeId) : null

  return (
    <>
      <TableLevelFlow 
        mode={LineageMode.EDIT}
        lineageGraph={lineageGraph}
      nodeType={NodeType.DATASET}
      depth={depth}
      setDepth={setDepth}
      onUpdate={handleNodeUpdate}
      onSave={handleSave}
      onNodeCreate={handleNodeCreate}
      onEdgeCreate={handleEdgeCreate}
      onEdgeDelete={handleEdgeDelete}
      onDelete={handleNodeDelete}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        canSaveLineage={canSaveLineage()}
        loading={loading}
        error={error}
      />

      {/* Simple Delete Warning Dialog */}
      {pendingDeleteNode && (
        <DeleteWarningDialog
          open={deleteDialogOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          nodeName={pendingDeleteNode.label || pendingDeleteNode.dataset?.name || pendingDeleteNode.job?.name || 'Unknown'}
          nodeType={pendingDeleteNode.type || 'UNKNOWN'}
        />
      )}
    </>
  )
}

export default DatasetLineageEdit
