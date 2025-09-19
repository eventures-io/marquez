import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { useParams, useSearchParams } from 'react-router-dom'
import { LineageMode, NodeType } from '@app-types'
import ColumnLevelFlow from '../ColumnLevelFlow'
import { useColumnLineageData } from '../useColumnLineageData'
import { useSaveColumnLineage } from '../useSaveColumnLineage'
import { getColumnLineage } from '../../../../store/requests/columnlineage'
import { getDataset } from '../../../../store/requests/datasets'
import { createColumnLevelElements } from '../columnLevelMapping'
import DetailsPane from '../../components/DetailsPane'
import DatasetForm from '../../table-view/components/DatasetForm'

const ColumnLineageEdit: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)
  const [columnLineageApiData, setColumnLineageApiData] = useState<any>(null)
  const [datasetDefinitions, setDatasetDefinitions] = useState<Map<string, any>>(new Map())

  const {
    columnLineageData,
    nodePositions,
    updateColumnNode,
    deleteColumnNode,
    updateColumnNodePosition,
    addColumnEdge,
    deleteColumnEdge,
    toColumnReactFlowFormat,
  } = useColumnLineageData()

  const {
    isSaving,
    hasUnsavedChanges,
    saveColumnLineage,
    setHasUnsavedChanges,
  } = useSaveColumnLineage()

  const initializedRef = useRef(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)

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
        const data = await getColumnLineage('DATASET' as any, namespace, name, depth)
        
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
        
        setDatasetDefinitions(datasetDefs)
        
        // Reorder column lineage data based on dataset field definitions
        const reorderedData = reorderColumnLineageData(data, datasetDefs)
        setColumnLineageApiData(reorderedData)
        
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

        initializedRef.current = true
      } catch (e: any) {
        setError('Failed to load column lineage for edit')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [namespace, name, depth, updateColumnNode, updateColumnNodePosition, addColumnEdge, reorderColumnLineageData])

  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    // If a column is clicked, edit its parent dataset
    const dsId = nodeData?.parentDatasetId || (nodeId.startsWith('dataset:') ? nodeId : null)
    if (dsId) {
      setSelectedDatasetId(dsId)
      setIsDrawerOpen(true)
    }
  }, [])

  const handleEdgeCreate = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `${sourceId}-${targetId}`
    addColumnEdge(edgeId, sourceId, targetId)
    setHasUnsavedChanges(true)
  }, [addColumnEdge, setHasUnsavedChanges])

  const handleEdgeDelete = useCallback((edgeId: string) => {
    deleteColumnEdge(edgeId)
    setHasUnsavedChanges(true)
  }, [deleteColumnEdge, setHasUnsavedChanges])

  const handleSave = useCallback(async () => {
    await saveColumnLineage(columnLineageData, nodePositions)
  }, [saveColumnLineage, columnLineageData, nodePositions])

  const graph = useMemo(() => {
    // If we have API data, use the same mapping as the original view for consistency
    if (columnLineageApiData && columnLineageApiData.graph && columnLineageApiData.graph.length > 0) {
      try {
        const { nodes, edges } = createColumnLevelElements(columnLineageApiData, undefined, handleNodeClick)
        return { nodes, edges }
      } catch (error) {
        console.error('Error mapping column lineage data:', error)
        // Fallback to internal data format
        const { nodes, edges } = toColumnReactFlowFormat(() => {})
        return { nodes, edges }
      }
    }
    
    // Fallback to internal data format
    const { nodes, edges } = toColumnReactFlowFormat(() => {})
    return { nodes, edges }
  }, [columnLineageApiData, toColumnReactFlowFormat, columnLineageData, handleNodeClick])

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

  return (
    <Box sx={{ position: 'relative', height: '100vh' }}>
      {/* Dataset Form Drawer */}
      <DetailsPane 
        open={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setSelectedDatasetId(null) }}
      >
        <Box p={3} sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Edit Dataset
          </Typography>
          <DatasetForm
            selectedNodeData={(() => {
              if (!selectedDatasetId) {
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
                    type: 'DB_TABLE',
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
              const dsNode = columnLineageData.nodes.get(selectedDatasetId)
              const fields = Array.from(columnLineageData.nodes.values())
                .filter(n => n.type === 'column-field' && (n.data as any)?.parentDatasetId === selectedDatasetId)
                .map(n => ({ name: (n.data as any)?.fieldName || '', type: (n.data as any)?.dataType || 'string' }))
              return {
                id: selectedDatasetId,
                label: (dsNode as any)?.data?.name || '',
                type: NodeType.DATASET,
                dataset: {
                  id: { namespace: (dsNode as any)?.data?.namespace || '', name: (dsNode as any)?.data?.name || '' },
                  namespace: (dsNode as any)?.data?.namespace || '',
                  name: (dsNode as any)?.data?.name || '',
                  description: (dsNode as any)?.data?.description || '',
                  fields,
                  type: 'DB_TABLE',
                  physicalName: (dsNode as any)?.data?.name || '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  sourceName: '',
                  facets: {},
                  tags: [],
                  lastModifiedAt: new Date().toISOString()
                }
              }
            })() as any}
            selectedNodeId={selectedDatasetId}
            onUpdate={(datasetData: any) => {
              if (!selectedDatasetId) return
              // Update dataset container
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
              // Merge column fields (preserve existing, add new, remove deleted)
              const sanitize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_')
              const existingFieldNodes = Array.from(columnLineageData.nodes.values())
                .filter(n => n.type === 'column-field' && (n.data as any)?.parentDatasetId === selectedDatasetId)
              const existingByName = new Map<string, { id: string; node: any }>()
              existingFieldNodes.forEach(n => {
                const name = ((n.data as any)?.fieldName || '') as string
                existingByName.set(sanitize(name), { id: n.id, node: n })
              })

              const requestedFields: Array<{ name: string; type: string }> = (datasetData.dataset.fields || []).map((f: any) => ({ name: f.name, type: f.type || 'string' }))
              const requestedByName = new Map<string, { name: string; type: string }>()
              requestedFields.forEach(f => requestedByName.set(sanitize(f.name), f))

              // Remove fields that are no longer present
              existingFieldNodes.forEach(n => {
                const key = sanitize(((n.data as any)?.fieldName) || '')
                if (!requestedByName.has(key)) {
                  deleteColumnNode(n.id)
                }
              })

              // Add or update requested fields
              const SPACING = 24
              const FIELD_HEIGHT = 50
              let newIndex = existingFieldNodes.length
              requestedFields.forEach((f) => {
                const key = sanitize(f.name)
                const existing = existingByName.get(key)
                if (existing) {
                  // Update existing field node data, keep id and position
                  updateColumnNode(existing.id, {
                    id: existing.id,
                    type: 'column-field',
                    data: {
                      id: existing.id,
                      namespace: datasetData.dataset.namespace,
                      datasetName: datasetData.dataset.name,
                      fieldName: f.name,
                      dataType: f.type,
                      parentDatasetId: selectedDatasetId,
                    },
                  })
                } else {
                  // Create a stable id per field name
                  const fieldId = `${selectedDatasetId}-field-${key}`
                  updateColumnNode(fieldId, {
                    id: fieldId,
                    type: 'column-field',
                    data: {
                      id: fieldId,
                      namespace: datasetData.dataset.namespace,
                      datasetName: datasetData.dataset.name,
                      fieldName: f.name,
                      dataType: f.type,
                      parentDatasetId: selectedDatasetId,
                    },
                  })
                  // Position new field below existing ones to avoid overlap in locked layout
                  // Align with ELK-based layout: left padding 20, header offset 60
                  updateColumnNodePosition(fieldId, { x: 20, y: 60 + newIndex * (FIELD_HEIGHT + SPACING) })
                  newIndex += 1
                }
              })
              setHasUnsavedChanges(true)
              setIsDrawerOpen(false)
              setSelectedDatasetId(null)
            }}
            onClose={() => { setIsDrawerOpen(false); setSelectedDatasetId(null) }}
            forceEditable={true}
            requireAtLeastOneField={true}
          />
        </Box>
      </DetailsPane>

      <ColumnLevelFlow
        mode={LineageMode.EDIT}
        columnLineageGraph={graph}
        nodeType={NodeType.DATASET}
        depth={depth}
        setDepth={setDepth}
        onNodePositionChange={updateColumnNodePosition}
        onNodeClick={handleNodeClick}
        onEdgeCreate={handleEdgeCreate}
        onEdgeDelete={handleEdgeDelete}
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        canSaveLineage={canSave}
        loading={loading}
        error={error}
        totalDatasets={totalDatasets}
        totalColumns={totalColumns}
      />
    </Box>
  )
}

export default ColumnLineageEdit
