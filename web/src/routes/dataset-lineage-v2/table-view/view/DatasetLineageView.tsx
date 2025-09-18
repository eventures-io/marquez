import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LineageGraph, NodeType, LineageMode } from '@app-types'
import { getLineage } from '../../../../store/requests/lineage'
import { createTableLevelElements } from '../tableLevelMapping'
import TableLevelFlow from '../TableLevelFlow'

const DatasetLineageView: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // State management
  const [lineageData, setLineageData] = useState<LineageGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Control states
  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)
  
  // Full-graph view by default; no collapsed nodes

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
    setSearchParams(newSearchParams)
  }, [depth, setSearchParams])

  // Map lineage data to ReactFlow format
  const lineageGraph = React.useMemo(() => {
    if (!lineageData || lineageData.graph.length === 0) {
      return null
    }

    try {
      const { nodes, edges } = createTableLevelElements(lineageData)
      return { nodes, edges }
    } catch (error) {
      console.error('Error mapping lineage data:', error)
      return null
    }
  }, [lineageData])

  return (
    <TableLevelFlow 
      mode={LineageMode.VIEW}
      lineageGraph={lineageGraph}
      nodeType={NodeType.DATASET}
      depth={depth}
      setDepth={setDepth}
      loading={loading}
      error={error}
    />
  )
}

export default DatasetLineageView
