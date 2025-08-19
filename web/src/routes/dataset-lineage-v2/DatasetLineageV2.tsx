// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LineageGraph } from '../../types/api'
import { getLineage } from '../../store/requests/lineage'
import { generateNodeId } from '../../helpers/nodes'
import { createTableLevelElements } from './tableLevelMapping'
import TableLevelFlow from './TableLevelFlow'
import { NodeType } from '../../types/lineage'

const DatasetLineageV2: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // State management
  const [lineageData, setLineageData] = useState<LineageGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Control states
  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)
  const [isCompact, setIsCompact] = useState(searchParams.get('isCompact') === 'true')
  const [isFull, setIsFull] = useState(searchParams.get('isFull') === 'true')
  
  const currentNodeId = namespace && name ? 
    generateNodeId('DATASET', namespace, name) : null
  const collapsedNodes = searchParams.get('collapsedNodes')

  // Fetch lineage data
  const fetchLineageData = useCallback(async () => {
    if (!namespace || !name) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await getLineage('DATASET', namespace, name, depth)
      setLineageData(data)
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

  // Update URL params when controls change
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('depth', depth.toString())
    newSearchParams.set('isCompact', isCompact.toString())
    newSearchParams.set('isFull', isFull.toString())
    setSearchParams(newSearchParams)
  }, [depth, isCompact, isFull, setSearchParams])

  // Map lineage data to ReactFlow format
  const lineageGraph = React.useMemo(() => {
    if (!lineageData || lineageData.graph.length === 0) {
      return null
    }

    try {
      const { nodes, edges } = createTableLevelElements(
        lineageData,
        currentNodeId,
        isCompact,
        isFull,
        collapsedNodes
      )
      return { nodes, edges }
    } catch (error) {
      console.error('Error mapping lineage data:', error)
      return null
    }
  }, [lineageData, currentNodeId, isCompact, isFull, collapsedNodes])

  return (
    <TableLevelFlow 
      lineageGraph={lineageGraph}
      nodeType={NodeType.DATASET}
      depth={depth}
      setDepth={setDepth}
      isCompact={isCompact}
      setIsCompact={setIsCompact}
      isFull={isFull}
      setIsFull={setIsFull}
      onRefresh={fetchLineageData}
      loading={loading}
      error={error}
    />
  )
}

export default DatasetLineageV2