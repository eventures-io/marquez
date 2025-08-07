import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Box, Typography, CircularProgress } from '@mui/material'
import { HEADER_HEIGHT } from '../../helpers/theme'
import { LineageGraph } from '../../types/api'
import { getLineage } from '../../store/requests/lineage'
import SimpleFlowDemo from './SimpleFlowDemo'

const DatasetLineageV2: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const [searchParams] = useSearchParams()
  const [lineageData, setLineageData] = useState<LineageGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const depth = Number(searchParams.get('depth')) || 2

  useEffect(() => {
    if (namespace && name) {
      setLoading(true)
      setError(null)
      getLineage('DATASET', namespace, name, depth)
        .then((data) => {
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

  return (
    <Box 
      height={`calc(100vh - ${HEADER_HEIGHT}px)`} 
      p={2}
      sx={{ backgroundColor: 'white' }}
    >
      <Box mb={2}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'black' }}>
          Dataset Lineage V2
        </Typography>
        <Typography variant="body1" sx={{ color: 'black' }}>
          {namespace} / {name} (depth: {depth})
        </Typography>
      </Box>
      
      <SimpleFlowDemo />
      
      {lineageData && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            Debug - Nodes: {lineageData.graph.length}
          </Typography>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(lineageData, null, 2)}
          </pre>
        </Box>
      )}
    </Box>
  )
}

export default DatasetLineageV2