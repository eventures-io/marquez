// @ts-nocheck
import React from 'react'
import { useParams } from 'react-router-dom'
import TableLevelV2 from './TableLevelV2'

const DatasetLineageV2: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()

  return <TableLevelV2 
    namespace={namespace}
    name={name}
    nodeType="dataset"
  />
}

export default DatasetLineageV2