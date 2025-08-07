// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Box, Typography, CircularProgress, Button, Stack } from '@mui/material'
import { HEADER_HEIGHT } from '../../helpers/theme'
import { LineageGraph } from '../../types/api'
import { getLineage } from '../../store/requests/lineage'
import { generateNodeId } from '../../helpers/nodes'
import SimpleFlowDemo from './SimpleFlowDemo'
import LineageFlow from './LineageFlow'
import TableLevelV2 from './TableLevelV2'

const DatasetLineageV2: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [searchParams] = useSearchParams()
  const [lineageData, setLineageData] = useState<LineageGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table-level' | 'basic-flow' | 'demo'>('table-level')
  
  const depth = Number(searchParams.get('depth')) || 2
  const currentNodeId = namespace && name ? generateNodeId('DATASET', namespace, name) : null

  useEffect(() => {
    if (namespace && name) {
      setLoading(true)
      setError(null)
      getLineage('DATASET', namespace, name, depth)
        .then((data) => {
          console.log('Fetched lineage data:', data)
          console.log('Current node ID:', currentNodeId)
          setLineageData(data)
          setLoading(false)
        })
        .catch((error) => {
          console.error('Failed to fetch lineage:', error)
          setError('Failed to fetch lineage data')
          setLoading(false)
        })
    }
  }, [namespace, name, depth])

  if (loading) {
    return (
      <Box 
        height={`calc(100vh - ${HEADER_HEIGHT}px)`} 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading lineage data...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box height={`calc(100vh - ${HEADER_HEIGHT}px)`} p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  if (viewMode === 'table-level') {
    return <TableLevelV2 
      lineageData={lineageData}
      namespace={namespace}
      name={name}
      nodeType="dataset"
    />;
  }

  return (
    <Box 
      height={`calc(100vh - ${HEADER_HEIGHT}px)`} 
      p={2}
      sx={{ backgroundColor: 'white' }}
    >
      <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'black' }}>
                Dataset Lineage V2
              </Typography>
              <Typography variant="body1" sx={{ color: 'black' }}>
                {namespace} / {name} (depth: {depth})
              </Typography>
              {lineageData && (
                <Typography variant="body2" sx={{ color: 'gray' }}>
                  Found {lineageData.graph.length} nodes in lineage
                </Typography>
              )}
            </Box>
            
            <Stack direction="row" spacing={1}>
              <Button
                variant={viewMode === 'table-level' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('table-level')}
              >
                Table Level
              </Button>
              <Button
                variant={viewMode === 'basic-flow' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('basic-flow')}
              >
                Basic Flow
              </Button>
              <Button
                variant={viewMode === 'demo' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setViewMode('demo')}
              >
                Demo
              </Button>
            </Stack>
          </Stack>
          
          {viewMode === 'demo' ? (
            <SimpleFlowDemo />
          ) : lineageData ? (
            <LineageFlow
              lineageData={lineageData}
              currentNode={currentNodeId}
              showFullLineage={true}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: 'gray' }}>
                No lineage data available
              </Typography>
            </Box>
          )}
        </>
    </Box>
  )
}

export default DatasetLineageV2