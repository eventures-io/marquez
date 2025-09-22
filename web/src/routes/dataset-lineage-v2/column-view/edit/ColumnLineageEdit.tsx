import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { LineageMode, NodeType } from '@app-types'
import ColumnLevelFlow from '../ColumnLevelFlow'
import { useColumnLineageData } from '../useColumnLineageData'
import { useSaveColumnLineage } from '../useSaveColumnLineage'
import { getColumnLineage } from '../../../../store/requests/columnlineage'
import { getDataset } from '../../../../store/requests/datasets'
import DatasetForm from '../../table-view/components/DatasetForm'
import useColumnDrawerState from '../useColumnDrawerState'

const DEFAULT_LINEAGE_DEPTH = 2

const ColumnLineageEdit: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const {
    isDrawerOpen,
    selectedNodeId: selectedDatasetId,
    selectedNodeData,
    drawerRef,
    handleNodeClick: drawerHandleNodeClick,
    handlePaneClick,
  } = useColumnDrawerState()

  const initializedRef = useRef(false)


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
    console.log('Deleting edge:', edgeId)
    deleteColumnEdge(edgeId)
    setHasUnsavedChanges(true)
  }, [deleteColumnEdge, setHasUnsavedChanges])

  const handleSave = useCallback(async () => {
    console.log('Saving lineage with edges:', Array.from(columnLineageData.edges.keys()))
    console.log('Total edges to save:', columnLineageData.edges.size)
    await saveColumnLineage(columnLineageData, nodePositions)
  }, [saveColumnLineage, columnLineageData, nodePositions])

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

  // Create custom drawer content based on selected node type
  const getDrawerContent = () => {
    if (!selectedDatasetId) {
      return null; // Default column details pane will be shown
    }
    
    // Check if the selected node is a dataset container
    const selectedNode = columnLineageData.nodes.get(selectedDatasetId);
    if (selectedNode?.type === 'dataset-container') {
      // Show dataset edit form
      return (
        <Box p={3} sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Edit Dataset
          </Typography>
          <DatasetForm
            selectedNodeData={(() => {
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
              // Handle field updates similar to before...
              setHasUnsavedChanges(true)
              handlePaneClick()
            }}
            onClose={handlePaneClick}
            forceEditable={true}
            requireAtLeastOneField={true}
          />
        </Box>
      );
    }
    
    return null; // Default column details pane will be shown
  };

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
        drawerContent={getDrawerContent()}
      />
    </Box>
  )
}

export default ColumnLineageEdit
