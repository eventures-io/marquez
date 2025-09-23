import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography, Fab } from '@mui/material'
import Add from '@mui/icons-material/Add'
import { useParams } from 'react-router-dom'
import { Node } from '@xyflow/react'
import { LineageMode, NodeType, DatasetType } from '@app-types'
import ColumnLevelFlow from '../ColumnLevelFlow'
import { useColumnLineageData } from '../useColumnLineageData'
import { useSaveColumnLineage } from '../useSaveColumnLineage'
import { getColumnLineage } from '../../../../store/requests/columnlineage'
import { getDataset, deleteDataset } from '../../../../store/requests/datasets'
import DatasetForm from '../../table-view/components/DatasetForm'
import useColumnDrawerState from '../useColumnDrawerState'

const DEFAULT_LINEAGE_DEPTH = 2
const DATASET_CONTAINER_WIDTH = 300
const DATASET_HORIZONTAL_GAP = 120
const DATASET_INITIAL_X = 16
const DATASET_INITIAL_Y = 50
const COLUMN_FIELD_HEIGHT = 50
const COLUMN_FIELD_SPACING = 24
const COLUMN_FIELD_TOP_OFFSET = 80
const COLUMN_FIELD_LEFT_OFFSET = 40

const ColumnLineageEdit: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalNodeIds, setOriginalNodeIds] = useState<Set<string>>(new Set())

  const {
    columnLineageData,
    nodePositions,
    updateColumnNode,
    deleteColumnNode,
    updateColumnNodePosition,
    addColumnEdge,
    deleteColumnEdge,
    toColumnReactFlowFormat,
    createColumnDatasetWithFields,
  } = useColumnLineageData()

  const {
    isSaving,
    hasUnsavedChanges,
    saveColumnLineage,
    setHasUnsavedChanges,
  } = useSaveColumnLineage()

  const {
    isDrawerOpen,
    selectedNodeId: selectedDatasetId,
    selectedNodeData,
    drawerRef,
    handleNodeClick: drawerHandleNodeClick,
    handlePaneClick,
  } = useColumnDrawerState()

  const initializedRef = useRef(false)
  const newDatasetCounterRef = useRef(0)
  const layoutNodesRef = useRef<Node[]>([])
  const [fitViewKey, setFitViewKey] = useState<number | null>(null)

  const handleLayoutNodesUpdate = useCallback((nodes: Node[]) => {
    layoutNodesRef.current = nodes
  }, [])

  const computeNewDatasetPosition = useCallback((fieldCount: number) => {
    const datasetNodes = Array.from(columnLineageData.nodes.values())
      .filter((node) => node.type === 'dataset-container')

    const layoutDatasetNodes = layoutNodesRef.current.filter((node) => node.type === 'dataset-container')

    let xPosition = DATASET_INITIAL_X + datasetNodes.length * (DATASET_CONTAINER_WIDTH + DATASET_HORIZONTAL_GAP)
    let yPosition = DATASET_INITIAL_Y

    let maxRightEdge = -Infinity
    let anchorY = DATASET_INITIAL_Y

    layoutDatasetNodes.forEach((node) => {
      const width = typeof node.style?.width === 'number' ? node.style.width : DATASET_CONTAINER_WIDTH
      const position = node.position || { x: DATASET_INITIAL_X, y: DATASET_INITIAL_Y }
      const rightEdge = (position.x || 0) + width
      if (rightEdge > maxRightEdge) {
        maxRightEdge = rightEdge
        anchorY = position.y || DATASET_INITIAL_Y
      }
    })

    if (maxRightEdge > -Infinity) {
      xPosition = maxRightEdge + DATASET_HORIZONTAL_GAP
      yPosition = anchorY
    } else {
      // If layout data isn't available yet, fall back to stored node positions
      datasetNodes.forEach((node) => {
        const pos = nodePositions.get(node.id)
        if (pos) {
          yPosition = pos.y
        }
      })
    }

    if (datasetNodes.length === 0) {
      const HEADER_OFFSET = 120
      const MIN_HEIGHT = 150
      const VIEW_HEADER = 65
      const FLOW_FOOTER = 60
      const desiredHeight = Math.max(
        MIN_HEIGHT,
        HEADER_OFFSET + fieldCount * (COLUMN_FIELD_HEIGHT + COLUMN_FIELD_SPACING),
      )
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
      const containerHeight = Math.max(0, viewportHeight - VIEW_HEADER - FLOW_FOOTER)
      yPosition = Math.max(16, Math.floor((containerHeight - desiredHeight) / 2))
      xPosition = DATASET_INITIAL_X
    }

    return { x: xPosition, y: yPosition }
  }, [columnLineageData.nodes, nodePositions])

  const buildDatasetFormData = useCallback((datasetId: string | null, isNewDataset: boolean) => {
    const emptyDataset = () => ({
      id: '',
      label: '',
      type: NodeType.DATASET,
      dataset: {
        id: { namespace: '', name: '' },
        namespace: '',
        name: '',
        description: '',
        fields: [],
        type: DatasetType.DB_TABLE,
        physicalName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceName: '',
        facets: {},
        tags: [],
        lastModifiedAt: new Date().toISOString(),
      },
    })

    if (isNewDataset || !datasetId) {
      return emptyDataset()
    }

    const datasetNode = columnLineageData.nodes.get(datasetId)
    if (!datasetNode || datasetNode.type !== 'dataset-container') {
      return emptyDataset()
    }

    const columnFields = Array.from(columnLineageData.nodes.values())
      .filter((node) => node.type === 'column-field' && (node.data as any)?.parentDatasetId === datasetId)
      .map((fieldNode) => ({
        name: (fieldNode.data as any)?.fieldName || '',
        type: (fieldNode.data as any)?.dataType || 'string',
        tags: [],
        description: '',
      }))

    return {
      id: datasetId,
      label: (datasetNode.data as any)?.name || '',
      type: NodeType.DATASET,
      dataset: {
        id: {
          namespace: (datasetNode.data as any)?.namespace || '',
          name: (datasetNode.data as any)?.name || '',
        },
        namespace: (datasetNode.data as any)?.namespace || '',
        name: (datasetNode.data as any)?.name || '',
        description: (datasetNode.data as any)?.description || '',
        fields: columnFields,
        type: DatasetType.DB_TABLE,
        physicalName: (datasetNode.data as any)?.name || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceName: '',
        facets: {},
        tags: [],
        lastModifiedAt: new Date().toISOString(),
      },
    }
  }, [columnLineageData.nodes])

  const handleDatasetFormSubmit = useCallback((datasetFormData: any, options: { isNew: boolean; datasetId?: string }) => {
    const fields: Array<{ name: string; type: string }> = Array.isArray(datasetFormData?.dataset?.fields)
      ? datasetFormData.dataset.fields.map((field: any) => ({ name: field.name, type: field.type || 'string' }))
      : []

    if (options.isNew) {
      const namespace = datasetFormData?.dataset?.namespace || 'temp-namespace'
      const name = datasetFormData?.dataset?.name || `dataset-${Date.now()}`
      const proposedId = `dataset:${namespace}:${name}`
      const datasetId = columnLineageData.nodes.has(proposedId)
        ? `column-dataset-${Date.now()}-${newDatasetCounterRef.current++}`
        : proposedId

      const position = computeNewDatasetPosition(fields.length)
      createColumnDatasetWithFields(datasetId, position, datasetFormData)
      setFitViewKey((prev) => (prev == null ? 0 : prev + 1))
      setHasUnsavedChanges(true)
      handlePaneClick()
      return
    }

    const targetDatasetId = options.datasetId
    if (!targetDatasetId) {
      return
    }

    updateColumnNode(targetDatasetId, {
      id: targetDatasetId,
      type: 'dataset-container',
      data: {
        id: targetDatasetId,
        namespace: datasetFormData.dataset.namespace,
        name: datasetFormData.dataset.name,
        description: datasetFormData.dataset.description,
      },
    })

    const sanitize = (value: string) => (value || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_')

    const existingFieldNodes = Array.from(columnLineageData.nodes.values())
      .filter((node) => node.type === 'column-field' && (node.data as any)?.parentDatasetId === targetDatasetId)

    const existingByName = new Map<string, { id: string; node: any }>()
    existingFieldNodes.forEach((node) => {
      const key = sanitize(((node.data as any)?.fieldName || '') as string)
      existingByName.set(key, { id: node.id, node })
    })

    const requestedByName = new Map<string, { name: string; type: string }>()
    fields.forEach((field) => requestedByName.set(sanitize(field.name), field))

    existingFieldNodes.forEach((node) => {
      const key = sanitize(((node.data as any)?.fieldName || '') as string)
      if (!requestedByName.has(key)) {
        deleteColumnNode(node.id)
      }
    })

    fields.forEach((field, index) => {
      const key = sanitize(field.name)
      const existing = existingByName.get(key)
      const fieldPosition = {
        x: COLUMN_FIELD_LEFT_OFFSET,
        y: COLUMN_FIELD_TOP_OFFSET + index * (COLUMN_FIELD_HEIGHT + COLUMN_FIELD_SPACING),
      }

      if (existing) {
        updateColumnNode(existing.id, {
          id: existing.id,
          type: 'column-field',
          data: {
            id: existing.id,
            namespace: datasetFormData.dataset.namespace,
            datasetName: datasetFormData.dataset.name,
            fieldName: field.name,
            dataType: field.type,
            parentDatasetId: targetDatasetId,
          },
        })
        updateColumnNodePosition(existing.id, fieldPosition)
      } else {
        const fieldId = `${targetDatasetId}-field-${key}`
        updateColumnNode(fieldId, {
          id: fieldId,
          type: 'column-field',
          data: {
            id: fieldId,
            namespace: datasetFormData.dataset.namespace,
            datasetName: datasetFormData.dataset.name,
            fieldName: field.name,
            dataType: field.type,
            parentDatasetId: targetDatasetId,
          },
        })
        updateColumnNodePosition(fieldId, fieldPosition)
      }
    })

    setHasUnsavedChanges(true)
    handlePaneClick()
  }, [columnLineageData.nodes, computeNewDatasetPosition, createColumnDatasetWithFields, deleteColumnNode, handlePaneClick, setFitViewKey, setHasUnsavedChanges, updateColumnNode, updateColumnNodePosition])


  // Function to reorder column lineage data based on dataset field definitions
  const reorderColumnLineageData = useCallback((columnData: any, datasets: Map<string, any>) => {
    if (!columnData?.graph) return columnData

    const reorderedGraph = [...columnData.graph]
    
    // Group nodes by dataset
    const nodesByDataset = new Map<string, any[]>()
    reorderedGraph.forEach(node => {
      const datasetKey = `${node.data.namespace}:${node.data.dataset}`
      if (!nodesByDataset.has(datasetKey)) {
        nodesByDataset.set(datasetKey, [])
      }
      nodesByDataset.get(datasetKey)!.push(node)
    })

    // Reorder nodes within each dataset based on dataset field definitions
    const finalOrderedGraph: any[] = []
    
    nodesByDataset.forEach((nodes, datasetKey) => {
      const dataset = datasets.get(datasetKey)
      if (dataset?.fields) {
        // Create field name to position mapping from dataset definition
        const fieldPositions = new Map<string, number>()
        dataset.fields.forEach((field: any, index: number) => {
          fieldPositions.set(field.name, index)
        })
        
        // Sort nodes by field position in dataset definition
        nodes.sort((a, b) => {
          const posA = fieldPositions.get(a.data.field) ?? 999
          const posB = fieldPositions.get(b.data.field) ?? 999
          return posA - posB
        })
      }
      
      finalOrderedGraph.push(...nodes)
    })

    return {
      ...columnData,
      graph: finalOrderedGraph
    }
  }, [])

  // Load existing column lineage for dataset using the same API as the original view
  useEffect(() => {
    const load = async () => {
      if (!namespace || !name || initializedRef.current) return
      setLoading(true)
      setError(null)
      try {
        const data = await getColumnLineage('DATASET' as any, namespace, name, DEFAULT_LINEAGE_DEPTH)
        
        // Get unique datasets from the column lineage response
        const uniqueDatasets = new Set<string>()
        data?.graph?.forEach((node: any) => {
          uniqueDatasets.add(`${node.data.namespace}:${node.data.dataset}`)
        })
        
        // Fetch dataset definitions to get natural field order
        const datasetDefs = new Map<string, any>()
        await Promise.all(
          Array.from(uniqueDatasets).map(async (datasetKey) => {
            const [dsNamespace, dsName] = datasetKey.split(':')
            try {
              const dataset = await getDataset(dsNamespace, dsName)
              datasetDefs.set(datasetKey, dataset)
            } catch (e) {
              console.warn(`Failed to fetch dataset ${datasetKey}:`, e)
            }
          })
        )
        
        // Reorder column lineage data based on dataset field definitions
        const reorderedData = reorderColumnLineageData(data, datasetDefs)
        
        // Map API graph to internal editable nodes/edges using the same logic as the original view
        const seenDatasets = new Set<string>()
        for (const node of reorderedData?.graph || []) {
          const dsId = `dataset:${node.data.namespace}:${node.data.dataset}`
          if (!seenDatasets.has(dsId)) {
            updateColumnNode(dsId, {
              id: dsId,
              type: 'dataset-container',
              data: {
                id: dsId,
                namespace: node.data.namespace,
                name: node.data.dataset,
              },
            })
            // Positions are laid out by ELK in edit mode; defaults are fine
            updateColumnNodePosition(dsId, { x: 0, y: 0 })
            seenDatasets.add(dsId)
          }

          // Column node for this field
          updateColumnNode(node.id, {
            id: node.id,
            type: 'column-field',
            data: {
              id: node.id,
              namespace: node.data.namespace,
              datasetName: node.data.dataset,
              fieldName: node.data.field,
              dataType: (node.data as any).fieldType || (node.data as any).type || undefined,
              parentDatasetId: dsId,
            },
          })
          updateColumnNodePosition(node.id, { x: 0, y: 0 })
        }

        // Edges
        for (const node of reorderedData?.graph || []) {
          for (const e of node.outEdges || []) {
            const edgeId = `${e.origin}-${e.destination}`
            addColumnEdge(edgeId, e.origin, e.destination)
          }
        }

        // Track original node IDs for deletion tracking during save
        // Use the same ID format as what gets stored in local state
        const originalIds = new Set<string>()
        for (const node of reorderedData?.graph || []) {
          const dsId = `dataset:${node.data.namespace}:${node.data.dataset}`
          originalIds.add(dsId)
          originalIds.add(node.id) // Use the exact node ID that was stored
        }
        setOriginalNodeIds(originalIds)
        
        console.log('Original IDs tracked:', Array.from(originalIds))
        
        initializedRef.current = true
      } catch (e: any) {
        setError('Failed to load column lineage for edit')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [namespace, name, updateColumnNode, updateColumnNodePosition, addColumnEdge, reorderColumnLineageData])

  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    // If a column is clicked, edit its parent dataset
    const dsId = nodeData?.parentDatasetId || (nodeId.startsWith('dataset:') ? nodeId : null)
    if (dsId) {
      drawerHandleNodeClick(dsId, nodeData)
    }
  }, [drawerHandleNodeClick])


  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    addColumnEdge(edgeId, sourceId, targetId)
    setHasUnsavedChanges(true)
  }, [addColumnEdge, setHasUnsavedChanges])

  const handleEdgeDelete = useCallback((edgeId: string) => {
    console.log('Column Edit: Deleting edge:', edgeId)
    console.log('Column Edit: Edges before deletion:', Array.from(columnLineageData.edges.keys()))
    deleteColumnEdge(edgeId)
    setHasUnsavedChanges(true)
  }, [deleteColumnEdge, setHasUnsavedChanges, columnLineageData.edges])

  const handleNodeDelete = useCallback((nodeId: string) => {
    console.log('Deleting node:', nodeId, 'from local state')
    deleteColumnNode(nodeId)
    setHasUnsavedChanges(true)
  }, [deleteColumnNode, setHasUnsavedChanges])

  const handleSave = useCallback(async () => {
    try {
      // First, handle deletions for existing saved nodes
      const currentNodeIds = new Set(columnLineageData.nodes.keys())
      const deletedNodeIds = Array.from(originalNodeIds).filter(id => !currentNodeIds.has(id))
      
      console.log('Column Save Debug:', {
        originalNodeIds: Array.from(originalNodeIds),
        currentNodeIds: Array.from(currentNodeIds), 
        deletedNodeIds,
        currentEdges: Array.from(columnLineageData.edges.keys()),
        edgeCount: columnLineageData.edges.size
      })
      
      console.log('Calling saveColumnLineage with edges:', Array.from(columnLineageData.edges.keys()))
      
      if (deletedNodeIds.length > 0) {
        console.log('Processing deletions:', deletedNodeIds)
        // We need to get the original node data to know namespace/name for deletion
        // For now, we'll need to parse the node ID format: "type:namespace:name"
        for (const nodeId of deletedNodeIds) {
          try {
            const parts = nodeId.split(':')
            if (parts.length >= 3 && parts[0] === 'dataset') {
              const namespace = parts[1] 
              const name = parts.slice(2).join(':') // Handle names with colons
              
              console.log(`Deleting dataset: ${namespace}:${name}`)
              await deleteDataset(namespace, name)
              console.log(`Successfully deleted dataset: ${namespace}:${name}`)
            }
            // Column field deletions don't need API calls - they're handled by dataset updates
          } catch (error) {
            console.error(`Failed to delete node ${nodeId}:`, error)
            // Continue with other deletions even if one fails
          }
        }
      }
      
      await saveColumnLineage(columnLineageData, nodePositions)
    } catch (error) {
      console.error('Save failed:', error)
      throw error // Re-throw so the save hook can handle it
    }
  }, [saveColumnLineage, columnLineageData, nodePositions, originalNodeIds])

  const graph = useMemo(() => {
    // In edit mode, always use the internal editable data format to reflect real-time changes
    const { nodes, edges } = toColumnReactFlowFormat(handleNodeClick)
    return { nodes, edges }
  }, [toColumnReactFlowFormat, columnLineageData, handleNodeClick])

  const canSave = useMemo(() => {
    return columnLineageData.edges.size > 0 && !isSaving
  }, [columnLineageData.edges.size, isSaving])

  // Simple stats for the action bar - use graph data for display but internal data for save validation
  const totalDatasets = useMemo(() => {
    if (graph && graph.nodes) {
      return graph.nodes.filter(n => n.type === 'dataset-container').length
    }
    return Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'dataset-container').length
  }, [graph, columnLineageData.nodes])
  
  const totalColumns = useMemo(() => {
    if (graph && graph.nodes) {
      return graph.nodes.filter(n => n.type === 'column-field').length
    }
    return Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'column-field').length
  }, [graph, columnLineageData.nodes])

  const drawerContent = useMemo(() => {
    const isNewDataset = !selectedDatasetId && (selectedNodeData as any)?.isNewDataset

    if (!isNewDataset && !selectedDatasetId) {
      return null
    }

    const heading = isNewDataset ? 'Create Dataset' : 'Edit Dataset'
    const formData = buildDatasetFormData(isNewDataset ? null : selectedDatasetId, !!isNewDataset)
    const datasetIdForUpdate = isNewDataset ? undefined : (selectedDatasetId || undefined)

    return (
      <Box p={3} sx={{ width: '100%', maxWidth: 400 }}>
        <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
          {heading}
        </Typography>
        <DatasetForm
          selectedNodeData={formData as any}
          selectedNodeId={datasetIdForUpdate ?? null}
          onUpdate={(datasetData: any) => handleDatasetFormSubmit(datasetData, {
            isNew: !!isNewDataset,
            datasetId: datasetIdForUpdate,
          })}
          onClose={handlePaneClick}
          forceEditable={true}
          requireAtLeastOneField={true}
        />
      </Box>
    )
  }, [selectedDatasetId, selectedNodeData, buildDatasetFormData, handleDatasetFormSubmit, handlePaneClick])

  const handleFloatingButtonClick = useCallback(() => {
    drawerHandleNodeClick('', { isNewDataset: true })
  }, [drawerHandleNodeClick])

  const showFloatingButton = !loading

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>

      <ColumnLevelFlow
        mode={LineageMode.EDIT}
        columnLineageGraph={graph}
        nodeType={NodeType.DATASET}
        onNodePositionChange={updateColumnNodePosition}
        onNodeClick={handleNodeClick}
        onEdgeCreate={handleEdgeCreate}
        onEdgeDelete={handleEdgeDelete}
        onSave={handleSave}
        onDelete={handleNodeDelete}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        canSaveLineage={canSave}
        loading={loading}
        error={error}
        totalDatasets={totalDatasets}
        totalColumns={totalColumns}
        isDrawerOpen={isDrawerOpen}
        selectedNodeId={selectedDatasetId}
        selectedNodeData={selectedNodeData}
        drawerRef={drawerRef}
        handlePaneClick={handlePaneClick}
        drawerContent={drawerContent}
        fitViewKey={fitViewKey}
        onLayoutNodesUpdate={handleLayoutNodesUpdate}
      />

      {showFloatingButton && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 108,
            right: 24,
            zIndex: 1000,
          }}
          onClick={handleFloatingButtonClick}
        >
          <Add />
        </Fab>
      )}
    </Box>
  )
}

export default ColumnLineageEdit
