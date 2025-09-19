import React, { useCallback, useState, useEffect } from 'react'
import { Fab, Box, Typography } from '@mui/material'
import { Add } from '@mui/icons-material'
import { LineageMode, NodeType, DatasetType } from '@app-types'
import ColumnLevelFlow from '../ColumnLevelFlow'
import { useColumnLineageData } from '../useColumnLineageData'
import { useSaveColumnLineage } from '../useSaveColumnLineage'
import DetailsPane from '../../components/DetailsPane'
import DatasetForm from '../../table-view/components/DatasetForm'

let datasetId = 1
const getDatasetId = () => `column-dataset-${datasetId++}`

const ColumnLineageCreate: React.FC = () => {
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

  const [isDrawerOpen, setIsDrawerOpen] = useState(true) // Start with drawer open
  const [showFloatingButton, setShowFloatingButton] = useState(false)
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)

  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    console.log('handleNodeClick called:', { 
      nodeId, 
      nodeDataKeys: Object.keys(nodeData),
      fullNodeData: nodeData 
    })
    
    // Check if this is a dataset container by nodeId pattern
    if (nodeId.startsWith('column-dataset-') && !nodeId.includes('-field-')) {
      // Click on dataset container - edit this dataset
      console.log('Clicking dataset container, setting selectedDatasetId:', nodeId)
      setSelectedDatasetId(nodeId)
      setIsDrawerOpen(true)
    } else if (nodeId.includes('-field-')) {
      // Click on column field - edit the parent dataset
      const parentDatasetId = nodeData.parentDatasetId
      console.log('Clicking column field, parent dataset:', parentDatasetId)
      if (parentDatasetId) {
        setSelectedDatasetId(parentDatasetId)
        setIsDrawerOpen(true)
      }
    } else {
      console.log('Unknown node type for nodeId:', nodeId)
    }
  }, [])

  const columnLineageGraph = React.useMemo(() => {
    const { nodes, edges } = toColumnReactFlowFormat(handleNodeClick)

    // In CREATE mode only: increase dataset container height to account for
    // larger vertical spacing between column fields (24px bottom margin),
    // and re-space column field Y positions inside each dataset container.
    const SPACING = 24
    const FIELD_HEIGHT = 50
    const TOP_OFFSET = 80
    const LEFT_OFFSET = 40

    // First, adjust container heights based on column counts
    const adjustedNodes = nodes.map(n => {
      if (n.type === 'dataset-container') {
        const datasetId = n.id
        const colCount = nodes.filter(
          c => c.type === 'column-field' && c.data?.parentDatasetId === datasetId
        ).length
        const height = Math.max(150, 120 + colCount * (FIELD_HEIGHT + SPACING))
        return {
          ...n,
          style: {
            ...(n.style || {}),
            height,
          },
        }
      }
      return n
    })

    // Then, re-space column nodes for each dataset container
    const datasetIds = adjustedNodes
      .filter(n => n.type === 'dataset-container')
      .map(n => n.id)

    // Compute new positions for column nodes per dataset
    const newPositions = new Map<string, { x: number; y: number }>()
    datasetIds.forEach(datasetId => {
      const cols = adjustedNodes
        .filter(n => n.type === 'column-field' && n.data?.parentDatasetId === datasetId)
        .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0))
      cols.forEach((col, index) => {
        newPositions.set(col.id, {
          x: LEFT_OFFSET,
          y: TOP_OFFSET + index * (FIELD_HEIGHT + SPACING),
        })
      })
    })

    const nodesWithSpacing = adjustedNodes.map(n => {
      const pos = newPositions.get(n.id)
      return pos ? { ...n, position: { ...(n.position || { x: 0, y: 0 }), ...pos } } : n
    })

    return { nodes: nodesWithSpacing, edges }
  }, [columnLineageData, toColumnReactFlowFormat, handleNodeClick])

  useEffect(() => {
    if (columnLineageData.nodes.size > 0) {
      setHasUnsavedChanges(true)
    }
  }, [columnLineageData, setHasUnsavedChanges])

  const handleDatasetFormSave = useCallback((datasetData: any) => {
    if (selectedDatasetId) {
      // Update existing dataset
      updateColumnNode(selectedDatasetId, {
        id: selectedDatasetId,
        type: 'dataset-container',
        data: {
          id: selectedDatasetId,
          namespace: datasetData.dataset.namespace,
          name: datasetData.dataset.name,
          description: datasetData.dataset.description,
        },
      })
      
      // Update existing column fields if any
      if (datasetData.dataset.fields && datasetData.dataset.fields.length > 0) {
        // Remove existing fields first
        const existingFields = Array.from(columnLineageData.nodes.values())
          .filter(node => node.type === 'column-field' && node.data.parentDatasetId === selectedDatasetId)
        
        existingFields.forEach(field => deleteColumnNode(field.id))
        
        // Add updated fields
        datasetData.dataset.fields.forEach((field: any, index: number) => {
          const fieldId = `${selectedDatasetId}-field-${index}`
          const fieldNodeData = {
            id: fieldId,
            type: 'column-field' as const,
            data: {
              id: fieldId,
              namespace: datasetData.dataset.namespace,
              datasetName: datasetData.dataset.name,
              fieldName: field.name,
              dataType: field.type,
              parentDatasetId: selectedDatasetId,
            },
          }
          
          updateColumnNode(fieldId, fieldNodeData)
          // Position columns relative to parent dataset container
          updateColumnNodePosition(fieldId, {
            x: 40, // Relative to parent dataset container
            y: 80 + index * (50 + 24), // Increase bottom margin between fields (24px)
          })
        })
      }
    } else {
      // Create new dataset
      const id = getDatasetId()
      
      // Position new datasets respecting current arrangement.
      // If there are linked columns, place the new dataset to the right of the
      // rightmost linked dataset and align its Y with that dataset. Otherwise,
      // place to the right of the rightmost dataset.
      const existingDatasets = Array.from(columnLineageData.nodes.values())
        .filter(n => n.type === 'dataset-container')
      // Place the first dataset near the left edge; subsequent ones spaced to the right of an anchor dataset
      let xPosition = 16
      
      // Center the first dataset vertically; subsequent datasets align to an anchor dataset's Y
      let yPosition = 50
      if (existingDatasets.length === 0) {
        const FIELD_HEIGHT = 50
        const SPACING = 24
        const HEADER_OFFSET = 120 // top padding + header area inside container
        const MIN_HEIGHT = 150
        const VIEW_HEADER = 64 + 1 // matches ColumnLevelFlow HEADER_HEIGHT
        const FLOW_FOOTER = 60 // extra space in the container height calc

        const colCount = Array.isArray(datasetData?.dataset?.fields)
          ? datasetData.dataset.fields.length
          : 0
        const desiredHeight = Math.max(MIN_HEIGHT, HEADER_OFFSET + colCount * (FIELD_HEIGHT + SPACING))
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
        const containerHeight = Math.max(0, viewportHeight - VIEW_HEADER - FLOW_FOOTER)
        yPosition = Math.max(16, Math.floor((containerHeight - desiredHeight) / 2))
      } else {
        // Determine anchor dataset: prefer rightmost among linked datasets; fallback to rightmost overall
        const linkedDatasetIds = new Set<string>()
        columnLineageData.edges.forEach(edge => {
          const src = columnLineageData.nodes.get(edge.source)
          const tgt = columnLineageData.nodes.get(edge.target)
          if (src?.type === 'column-field' && src.data.parentDatasetId) {
            linkedDatasetIds.add(src.data.parentDatasetId)
          }
          if (tgt?.type === 'column-field' && tgt.data.parentDatasetId) {
            linkedDatasetIds.add(tgt.data.parentDatasetId)
          }
        })

        const candidates = (linkedDatasetIds.size > 0
          ? Array.from(linkedDatasetIds)
          : existingDatasets.map(d => d.id))

        let anchorId: string | null = null
        let maxX = -Infinity
        let anchorY = 50
        candidates.forEach(id => {
          const pos = nodePositions.get(id)
          if (pos && pos.x >= maxX) {
            maxX = pos.x
            anchorId = id
            anchorY = pos.y
          }
        })

        // Position to the right of the anchor dataset with fixed spacing
        xPosition = (isFinite(maxX) ? maxX : 16) + 400
        yPosition = anchorY
      }
      
      createColumnDatasetWithFields(id, { x: xPosition, y: yPosition }, datasetData)
      
      // Show floating button after first dataset
      setShowFloatingButton(true)
    }
    
    // Close drawer and clear selection
    setIsDrawerOpen(false)
    setSelectedDatasetId(null)
  }, [selectedDatasetId, columnLineageData.nodes, createColumnDatasetWithFields, updateColumnNode, deleteColumnNode, updateColumnNodePosition])

  const handleFloatingButtonClick = useCallback(() => {
    setSelectedDatasetId(null) // Clear selection for creating new dataset
    setIsDrawerOpen(true)
  }, [])

  const handleDrawerClose = useCallback(() => {
    // Only allow closing if we have at least one dataset
    if (columnLineageData.nodes.size > 0) {
      setIsDrawerOpen(false)
      setSelectedDatasetId(null) // Clear selection on close
    }
  }, [columnLineageData.nodes.size])

  const getSelectedDatasetData = useCallback(() => {
    if (!selectedDatasetId) {
      // Return empty structure for new dataset creation
      return {
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
          lastModifiedAt: new Date().toISOString()
        }
      }
    }
    
    const datasetNode = columnLineageData.nodes.get(selectedDatasetId)
    if (!datasetNode || datasetNode.type !== 'dataset-container') {
      return {
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
          lastModifiedAt: new Date().toISOString()
        }
      }
    }
    
    // Get all column fields for this dataset
    const columnFields = Array.from(columnLineageData.nodes.values())
      .filter(node => node.type === 'column-field' && node.data.parentDatasetId === selectedDatasetId)
      .map(field => ({
        name: field.data.fieldName || '',
        type: field.data.dataType || 'string',
        tags: [],
        description: ''
      }))
    
    return {
      id: selectedDatasetId,
      label: datasetNode.data.name || '',
      type: NodeType.DATASET,
      dataset: {
        id: { namespace: datasetNode.data.namespace || '', name: datasetNode.data.name || '' },
        namespace: datasetNode.data.namespace || '',
        name: datasetNode.data.name || '',
        description: datasetNode.data.description || '',
        fields: columnFields,
        type: DatasetType.DB_TABLE,
        physicalName: datasetNode.data.name || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceName: '',
        facets: {},
        tags: [],
        lastModifiedAt: new Date().toISOString()
      }
    }
  }, [selectedDatasetId, columnLineageData.nodes])

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
    await saveColumnLineage(columnLineageData, nodePositions)
  }

  const canSaveLineage = useCallback(() => {
    return columnLineageData.nodes.size > 1 && !isSaving
  }, [columnLineageData.nodes.size, isSaving])

  // Warn on page leave with unsaved changes
  // TODO: Re-enable this for production
  // useEffect(() => {
  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     if (hasUnsavedChanges) {
  //       e.preventDefault()
  //       return 'You have unsaved changes. Are you sure you want to leave?'
  //     }
  //   }
  //   
  //   if (hasUnsavedChanges) {
  //     window.addEventListener('beforeunload', handleBeforeUnload)
  //   }
  //   
  //   return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  // }, [hasUnsavedChanges])

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      <ColumnLevelFlow 
        mode={LineageMode.CREATE}
        columnLineageGraph={columnLineageGraph}
        nodeType={NodeType.DATASET}
        depth={2}
        setDepth={() => {}} 
        onSave={handleSave}
        onEdgeCreate={handleEdgeCreate}
        onEdgeDelete={handleEdgeDelete}
        onDelete={handleNodeDelete}
        onNodeClick={handleNodeClick}
        onNodePositionChange={updateColumnNodePosition}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        canSaveLineage={canSaveLineage()}
        loading={false}
        error={null}
        totalDatasets={Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'dataset-container').length}
        totalColumns={Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'column-field').length}
      />

      {/* Dataset Form Drawer */}
      <DetailsPane 
        open={isDrawerOpen} 
        onClose={handleDrawerClose}
      >
        <Box p={3} sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            {selectedDatasetId ? 'Edit Dataset' : 'Create Dataset'}
          </Typography>
          <DatasetForm
            selectedNodeData={getSelectedDatasetData()}
            selectedNodeId={selectedDatasetId}
            onUpdate={handleDatasetFormSave}
            onClose={handleDrawerClose}
            forceEditable={true}
            requireAtLeastOneField={true}
          />
        </Box>
      </DetailsPane>

      {/* Floating Action Button */}
      {showFloatingButton && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 88, // keep above bottom toolbar (60px) with extra spacing
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

export default ColumnLineageCreate
