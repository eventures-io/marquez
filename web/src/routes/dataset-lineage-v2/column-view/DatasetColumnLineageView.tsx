import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { LineageMode, NodeType } from '@app-types';
import { getColumnLineage } from '../../../store/requests/columnlineage';
import { createColumnLevelElements } from './columnLevelMapping';
import ColumnLevelFlow from './ColumnLevelFlow';

const DatasetColumnLineageView: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const [searchParams] = useSearchParams();
  
  const [columnLineageData, setColumnLineageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2);
  
  // Get selected column from URL params
  const selectedColumn = searchParams.get('column');

  // Fetch column lineage data
  const fetchColumnLineageData = useCallback(async () => {
    if (!namespace || !name) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getColumnLineage('DATASET', namespace, name, depth);
      setColumnLineageData(data);
    } catch (error) {
      console.error('Failed to fetch column lineage:', error);
      setError('Failed to fetch column lineage data');
    } finally {
      setLoading(false);
    }
  }, [namespace, name, depth]);

  useEffect(() => {
    fetchColumnLineageData();
  }, [fetchColumnLineageData]);

  // Transform data to React Flow format
  const columnLineageGraph = React.useMemo(() => {
    if (!columnLineageData || !columnLineageData.graph || columnLineageData.graph.length === 0) {
      return null;
    }

    try {
      const { nodes, edges } = createColumnLevelElements(columnLineageData, selectedColumn || undefined);
      return { nodes, edges };
    } catch (error) {
      console.error('Error mapping column lineage data:', error);
      return null;
    }
  }, [columnLineageData, selectedColumn]);

  // Calculate stats for action bar
  const stats = React.useMemo(() => {
    if (!columnLineageGraph) return { totalDatasets: 0, totalColumns: 0 };
    
    const datasets = columnLineageGraph.nodes.filter(node => node.type === 'dataset-container');
    const columns = columnLineageGraph.nodes.filter(node => node.type === 'column-field');
    
    return {
      totalDatasets: datasets.length,
      totalColumns: columns.length,
    };
  }, [columnLineageGraph]);

  return (
    <ColumnLevelFlow 
      mode={LineageMode.VIEW}
      columnLineageGraph={columnLineageGraph}
      nodeType={NodeType.DATASET}
      depth={depth}
      setDepth={setDepth}
      loading={loading}
      error={error}
      totalDatasets={stats.totalDatasets}
      totalColumns={stats.totalColumns}
      selectedColumn={selectedColumn || undefined}
    />
  );
};

export default DatasetColumnLineageView;