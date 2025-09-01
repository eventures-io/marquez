import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LineageGraph, NodeType, LineageMode, LineageEdgeData, LineageNodeData } from '@app-types'
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
  const [serverLineageData, setServerLineageData] = useState<LineageGraph | null>(null)
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
    updateNode,
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

  const initializedRef = useRef(false)

  // Fetch lineage data from server
  const fetchLineageData = useCallback(async () => {
    if (!namespace || !name) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getLineage('DATASET', namespace, name, depth)
      setServerLineageData(data)
    } catch (error) {
      console.error('Failed to fetch lineage:', error)
      setError('Failed to fetch lineage data')
    } finally {
      setLoading(false)
    }
  }, [namespace, name, depth])

  // Load lineage data on mount and when params change
  useEffect(() => {
    fetchLineageData()
  }, [fetchLineageData])

  // Initialize local state with server data
  useEffect(() => {
    if (serverLineageData && !initializedRef.current) {
      initializedRef.current = true
      
      // Convert server data to local lineage format
      // This would need to be implemented - converting from LineageGraph to the local format
      // For now, we'll initialize with empty state and let the user add nodes
    }
  }, [serverLineageData])

  // Update URL params when controls change
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('depth', depth.toString())
    newSearchParams.set('isCompact', isCompact.toString())
    newSearchParams.set('isFull', isFull.toString())
    setSearchParams(newSearchParams)
  }, [depth, isCompact, isFull, setSearchParams])

  // Map lineage data to ReactFlow format, combining server data with local additions
  const lineageGraph = React.useMemo(() => {
    let serverNodes: any[] = []
    let serverEdges: any[] = []

    // Get server data if available
    if (serverLineageData && serverLineageData.graph.length > 0) {
      try {
        const result = createTableLevelElements(
          serverLineageData,
          currentNodeId,
          isCompact,
          isFull,
          collapsedNodes
        )
        serverNodes = result.nodes
        serverEdges = result.edges
      } catch (error) {
        console.error('Error mapping lineage data:', error)
      }
    }

    // Convert local lineage data to ReactFlow format (for new additions)
    const dummyHandleNodeClick = () => {}
    const { nodes: localNodes, edges: localEdges } = (() => {
      const nodePositions = new Map<string, { x: number; y: number }>()
      
      // Get node positions from the useLineageData hook
      const positions = Array.from(localLineageData.nodes.keys()).map((nodeId: string) => ({
        id: nodeId,
        position: { x: 50, y: 300 } // This should come from the hook's position state
      }))
      
      positions.forEach(({ id, position }) => {
        nodePositions.set(id, position)
      })

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
    })()

    // Merge server and local data (local data takes precedence for conflicts)
    const allNodes = [...serverNodes]
    const allEdges = [...serverEdges]

    // Add local nodes that don't conflict with server nodes
    localNodes.forEach(localNode => {
      if (!allNodes.find(serverNode => serverNode.id === localNode.id)) {
        allNodes.push(localNode)
      }
    })

    // Add local edges that don't conflict with server edges  
    localEdges.forEach(localEdge => {
      if (!allEdges.find(serverEdge => serverEdge.id === localEdge.id)) {
        allEdges.push(localEdge)
      }
    })

    return allNodes.length > 0 ? { nodes: allNodes, edges: allEdges } : null
  }, [serverLineageData, currentNodeId, isCompact, isFull, collapsedNodes, localLineageData])

  // Handle node updates
  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    updateNode(nodeId, updatedData)
    setHasUnsavedChanges(true)
  }, [updateNode, setHasUnsavedChanges])

  // Handle node creation
  const handleNodeCreate = useCallback((sourceNodeId: string, sourceNodeType: NodeType, position: { x: number; y: number }) => {
    const nodeId = sourceNodeType === NodeType.DATASET ? 
      `job-${Date.now()}` : `dataset-${Date.now()}`
    
    const namespace = 'example' // This should be derived from the context
    
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
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      canSaveLineage={canSaveLineage()}
      loading={loading}
      error={error}
    />
  )
}

export default DatasetLineageEdit
