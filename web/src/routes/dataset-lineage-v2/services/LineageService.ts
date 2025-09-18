import { API_URL } from '../../../globals';
import { genericFetchWrapper } from '../../../store/requests/index';
import { NodeType, EventType, LineageData, LineageNodeData, OpenLineageEvent, LineageGraph, LineageNode } from '@app-types';
import type { ColumnLineageData, ColumnLineageNodeData } from '../column-view/useColumnLineageData';

export class LineageService {
  private static generateRunId(): string {
    return `run-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private static async createLineageEvent(event: OpenLineageEvent): Promise<any> {
    const url = `${API_URL}/lineage`;
    
    try {
      const response = await genericFetchWrapper(
        url,
        {
          method: 'POST',
          body: JSON.stringify(event),
          headers: { 'Content-Type': 'application/json' }
        },
        'createLineageEvent'
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  private static getJobInputs(jobId: string, lineageData: LineageData): LineageNodeData[] {
    const inputs: LineageNodeData[] = [];
    
    for (const [, edge] of lineageData.edges) {
      if (edge.target === jobId) {
        const sourceNode = lineageData.nodes.get(edge.source);
        if (sourceNode && sourceNode.type === NodeType.DATASET) {
          inputs.push(sourceNode);
        }
      }
    }
    
    return inputs;
  }

  private static getJobOutputs(jobId: string, lineageData: LineageData): LineageNodeData[] {
    const outputs: LineageNodeData[] = [];
    
    for (const [, edge] of lineageData.edges) {
      if (edge.source === jobId) {
        const targetNode = lineageData.nodes.get(edge.target);
        if (targetNode && targetNode.type === NodeType.DATASET) {
          outputs.push(targetNode);
        }
      }
    }
    
    return outputs;
  }

  static async saveCompleteLineage(lineageData: LineageData): Promise<void> {
    const events: OpenLineageEvent[] = [];
    const timestamp = new Date().toISOString();
    
    const jobNodes = Array.from(lineageData.nodes.values())
      .filter(node => node.type === NodeType.JOB);
    
    if (jobNodes.length === 0) {
      throw new Error('No jobs found in lineage. At least one job is required.');
    }
    
    for (const jobNode of jobNodes) {
      if (!jobNode.job?.name) {
        throw new Error(`Job ${jobNode.id} is missing required name`);
      }
      
      if (!jobNode.job?.namespace) {
        throw new Error(`Job ${jobNode.id} is missing required namespace`);
      }
      
      const inputs = this.getJobInputs(jobNode.id, lineageData);
      const outputs = this.getJobOutputs(jobNode.id, lineageData);
      
      for (const input of inputs) {
        if (!input.dataset?.name) {
          throw new Error(`Input dataset ${input.id} is missing required name`);
        }
        if (!input.dataset?.namespace) {
          throw new Error(`Input dataset ${input.id} is missing required namespace`);
        }
      }
      
      for (const output of outputs) {
        if (!output.dataset?.name) {
          throw new Error(`Output dataset ${output.id} is missing required name`);
        }
        if (!output.dataset?.namespace) {
          throw new Error(`Output dataset ${output.id} is missing required namespace`);
        }
      }
      
      const runId = this.generateRunId();
      
      // Build job facets
      const jobFacets: any = {
        documentation: {
          _producer: 'https://github.com/MarquezProject/marquez-ui',
          _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationJobFacet.json',
          description: jobNode.job.description || `${jobNode.job?.name || 'Job'} created via lineage UI`
        }
      };
      
      // Add SQL facet if SQL is provided
      const sqlQuery = (jobNode.job as any).sql;
      if (sqlQuery && sqlQuery.trim()) {
        jobFacets.sql = {
          _producer: 'https://github.com/MarquezProject/marquez-ui',
          _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SQLJobFacet.json',
          query: sqlQuery.trim()
        };
      }
      
      // Build run facets
      const runFacets: any = {};

      // Build job event
      const jobEventData = {
        producer: 'https://github.com/MarquezProject/marquez-ui',
        schemaURL: 'https://openlineage.io/spec/1-0-5/OpenLineage.json',
        job: {
          namespace: jobNode.job.namespace,
          name: jobNode.job.name,
          facets: jobFacets
        },
        run: {
          runId: runId,
          facets: runFacets
        },
        inputs: inputs.map(dataset => ({
          namespace: dataset.dataset!.namespace,
          name: dataset.dataset!.name,
          facets: {
            schema: {
              _producer: 'https://github.com/MarquezProject/marquez-ui',
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json',
              fields: (dataset.dataset!.fields || []).map(field => ({
                name: field.name,
                type: field.type || 'unknown'
              }))
            },
            documentation: {
              _producer: 'https://github.com/MarquezProject/marquez-ui',
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationDatasetFacet.json',
              description: dataset.dataset!.description || `${dataset.dataset?.name || 'Dataset'} dataset`
            }
          }
        })),
        outputs: outputs.map(dataset => ({
          namespace: dataset.dataset!.namespace,
          name: dataset.dataset!.name,
          facets: {
            schema: {
              _producer: 'https://github.com/MarquezProject/marquez-ui',
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json',
              fields: (dataset.dataset!.fields || []).map(field => ({
                name: field.name,
                type: field.type || 'unknown'
              }))
            },
            documentation: {
              _producer: 'https://github.com/MarquezProject/marquez-ui',
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationDatasetFacet.json',
              description: dataset.dataset!.description || `${dataset.dataset?.name || 'Dataset'} dataset`
            }
          }
        }))
      };

      events.push({
        eventType: EventType.START,
        eventTime: timestamp,
        ...jobEventData
      });

      const completeTime = new Date(new Date(timestamp).getTime() + 1000).toISOString();
      events.push({
        eventType: EventType.COMPLETE,
        eventTime: completeTime,
        ...jobEventData
      });
    }
    
    for (const event of events) {
      try {
        await this.createLineageEvent(event);
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const responseText = error?.response?.text ? await error.response.text() : 'No response text';
        throw new Error(`Failed to save job ${event.job.namespace}:${event.job.name}: ${errorMessage}. Response: ${responseText}`);
      }
    }
  }

  /**
   * Fetch the table-level lineage graph for a given dataset to detect producing jobs.
   */
  private static async fetchDatasetLineageGraph(namespace: string, name: string, depth = 1): Promise<LineageGraph | null> {
    try {
      const encodedNamespace = encodeURIComponent(namespace);
      const encodedName = encodeURIComponent(name);
      const nodeId = `dataset:${encodedNamespace}:${encodedName}`;
      const url = `${API_URL}/lineage?nodeId=${nodeId}&depth=${depth}`;
      const graph = await genericFetchWrapper(url, { method: 'GET' }, 'fetchLineageForColumnSave');
      return graph as LineageGraph;
    } catch (e) {
      console.warn('Failed to fetch lineage graph for dataset', namespace, name, e);
      return null;
    }
  }

  /**
   * Try to resolve a single producing job for the given dataset. If exactly one producing job
   * is found in the lineage graph, return its { namespace, name }. Otherwise return null.
   */
  private static async resolveProducingJobForDataset(namespace: string, name: string): Promise<{ namespace: string; name: string } | null> {
    const graph = await this.fetchDatasetLineageGraph(namespace, name, 1);
    if (!graph || !Array.isArray(graph.graph)) return null;

    // Find the dataset node in the graph
    const datasetNode = graph.graph.find(n => n.type === NodeType.DATASET && (n.data as any)?.namespace === namespace && (n.data as any)?.name === name);
    if (!datasetNode) return null;

    // Find job nodes that have an outEdge to this dataset node
    const producers: Array<{ namespace: string; name: string }> = [];
    for (const node of graph.graph) {
      if (node.type === NodeType.JOB) {
        const hasEdge = (node.outEdges || []).some(e => e.destination === datasetNode.id);
        if (hasEdge) {
          const data = node.data as any;
          if (data?.namespace && data?.name) {
            producers.push({ namespace: data.namespace, name: data.name });
          }
        }
      }
    }

    if (producers.length === 1) {
      return producers[0];
    }
    return null;
  }

  /**
   * Save column-level lineage by emitting OpenLineage events that attach ColumnLineage facets
   * to output datasets. For each target dataset with mappings, we create a START and COMPLETE
   * event. If exactly one producing job exists for that dataset, reuse its identity; otherwise
   * emit a synthetic job name.
   */
  static async saveColumnLineage(columnLineageData: ColumnLineageData): Promise<void> {
    // Index datasets and their fields from local column nodes
    const datasetNodes = Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'dataset-container');
    const columnNodes = Array.from(columnLineageData.nodes.values()).filter(n => n.type === 'column-field');

    type DatasetInfo = {
      id: string;
      namespace: string;
      name: string;
      description?: string;
      fields: Array<{ name: string; type: string }>;
    };

    const datasetsById = new Map<string, DatasetInfo>();
    for (const d of datasetNodes) {
      const ns = (d.data as any)?.namespace || '';
      const nm = (d.data as any)?.name || '';
      const desc = (d.data as any)?.description || '';
      const fields = columnNodes
        .filter(c => (c.data as any)?.parentDatasetId === d.id)
        .map(c => ({ name: (c.data as any)?.fieldName || '', type: (c.data as any)?.dataType || 'unknown' }));
      datasetsById.set(d.id, { id: d.id, namespace: ns, name: nm, description: desc, fields });
    }

    // Group column mappings by target dataset
    interface InputFieldRef { namespace: string; name: string; field: string }
    type TargetFieldMap = Record<string, { inputFields: InputFieldRef[] }>
    const mappingsByTarget = new Map<string, TargetFieldMap>();
    const sourcesByTarget = new Map<string, Set<string>>(); // targetDatasetId -> set of source datasetIds

    for (const [, edge] of columnLineageData.edges) {
      const srcNode = columnLineageData.nodes.get(edge.source);
      const tgtNode = columnLineageData.nodes.get(edge.target);
      if (!srcNode || !tgtNode) continue;
      if (srcNode.type !== 'column-field' || tgtNode.type !== 'column-field') continue;

      const srcData = srcNode.data as any;
      const tgtData = tgtNode.data as any;
      const srcDatasetId = srcData.parentDatasetId;
      const tgtDatasetId = tgtData.parentDatasetId;
      if (!srcDatasetId || !tgtDatasetId) continue;

      const srcDataset = datasetsById.get(srcDatasetId);
      const tgtDataset = datasetsById.get(tgtDatasetId);
      if (!srcDataset || !tgtDataset) continue;

      const targetFieldName = tgtData.fieldName;
      if (!targetFieldName) continue;

      const inputRef: InputFieldRef = { namespace: srcDataset.namespace, name: srcDataset.name, field: srcData.fieldName };

      if (!mappingsByTarget.has(tgtDatasetId)) mappingsByTarget.set(tgtDatasetId, {});
      const fieldMap = mappingsByTarget.get(tgtDatasetId)!;
      if (!fieldMap[targetFieldName]) fieldMap[targetFieldName] = { inputFields: [] };
      fieldMap[targetFieldName].inputFields.push(inputRef);

      if (!sourcesByTarget.has(tgtDatasetId)) sourcesByTarget.set(tgtDatasetId, new Set());
      sourcesByTarget.get(tgtDatasetId)!.add(srcDatasetId);
    }

    // Build and send events per target dataset with mappings
    const timestamp = new Date().toISOString();
    const events: OpenLineageEvent[] = [];

    for (const [tgtDatasetId, fieldsMap] of mappingsByTarget.entries()) {
      const tgtDataset = datasetsById.get(tgtDatasetId);
      if (!tgtDataset) continue;

      // Determine job identity: reuse only if exactly one producing job exists
      const reusedJob = await this.resolveProducingJobForDataset(tgtDataset.namespace, tgtDataset.name);
      const jobNamespace = reusedJob?.namespace || tgtDataset.namespace || 'ui';
      const jobName = reusedJob?.name || `ui.column_mapping::${tgtDataset.namespace}.${tgtDataset.name}`;

      // Build inputs from unique source datasets
      const sourceIds = Array.from(sourcesByTarget.get(tgtDatasetId) || []);
      const inputDatasets = sourceIds
        .map(id => datasetsById.get(id))
        .filter(Boolean) as DatasetInfo[];

      const inputs = inputDatasets.map(ds => ({
        namespace: ds.namespace,
        name: ds.name,
        facets: {
          schema: {
            _producer: 'https://github.com/MarquezProject/marquez-ui',
            _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json',
            fields: ds.fields.map(f => ({ name: f.name, type: f.type || 'unknown' }))
          },
          documentation: {
            _producer: 'https://github.com/MarquezProject/marquez-ui',
            _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationDatasetFacet.json',
            description: ds.description || `${ds.name} dataset`
          }
        }
      }));

      // Build output with schema + columnLineage facet
      const outputs = [{
        namespace: tgtDataset.namespace,
        name: tgtDataset.name,
        facets: {
          schema: {
            _producer: 'https://github.com/MarquezProject/marquez-ui',
            _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json',
            fields: tgtDataset.fields.map(f => ({ name: f.name, type: f.type || 'unknown' }))
          },
          documentation: {
            _producer: 'https://github.com/MarquezProject/marquez-ui',
            _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationDatasetFacet.json',
            description: tgtDataset.description || `${tgtDataset.name} dataset`
          },
          // Column lineage facet (typed as any to allow custom key)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          columnLineage: {
            _producer: 'https://github.com/MarquezProject/marquez-ui',
            _schemaURL: 'https://openlineage.io/spec/facets/1-0-1/ColumnLineageDatasetFacet.json',
            fields: fieldsMap
          } as any
        }
      }];

      const runId = this.generateRunId();
      const baseEvent = {
        producer: 'https://github.com/MarquezProject/marquez-ui',
        schemaURL: 'https://openlineage.io/spec/1-0-5/OpenLineage.json',
        job: {
          namespace: jobNamespace,
          name: jobName,
          facets: {
            documentation: {
              _producer: 'https://github.com/MarquezProject/marquez-ui',
              _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationJobFacet.json',
              description: reusedJob
                ? `Column lineage update for ${tgtDataset.namespace}.${tgtDataset.name} via UI (bound to existing job).`
                : `Column lineage update for ${tgtDataset.namespace}.${tgtDataset.name} via UI (synthetic job).`
            }
          }
        },
        run: { runId, facets: {} },
        inputs,
        outputs,
      } as any;
      // START event
      const startEvent = { eventType: EventType.START, eventTime: timestamp, ...baseEvent } as any;
      events.push(startEvent);
      const completeTime = new Date(new Date(timestamp).getTime() + 1000).toISOString();
      // COMPLETE event (includes inputs/outputs acceptable per backend)
      const completeEvent = { eventType: EventType.COMPLETE, eventTime: completeTime, ...baseEvent } as any;
      events.push(completeEvent);
    }

    // Send events sequentially (preserve order)
    for (const event of events) {
      try {
        await this.createLineageEvent(event as any);
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const responseText = error?.response?.text ? await error.response.text() : 'No response text';
        throw new Error(`Failed to save column lineage event for job ${event.job.namespace}:${event.job.name}: ${errorMessage}. Response: ${responseText}`);
      }
    }
  }

  static validateLineageForSave(lineageData: LineageData): string[] {
    const errors: string[] = [];
    
    if (lineageData.nodes.size === 0) {
      errors.push('Lineage must contain at least one node');
      return errors;
    }
    
    for (const [, nodeData] of lineageData.nodes) {
      if (nodeData.type === NodeType.DATASET) {
        if (!nodeData.dataset?.namespace?.trim()) {
          errors.push(`Dataset "${nodeData.dataset?.name || nodeData.id}" is missing namespace`);
        }
      } else if (nodeData.type === NodeType.JOB) {
        if (!nodeData.job?.namespace?.trim()) {
          errors.push(`Job "${nodeData.job?.name || nodeData.id}" is missing namespace`);
        }
      }
    }
    
    const jobCount = Array.from(lineageData.nodes.values())
      .filter(node => node.type === NodeType.JOB).length;
    
    if (jobCount === 0) {
      errors.push('Lineage must contain at least one job');
    }
    
    if (lineageData.nodes.size > 1 && lineageData.edges.size === 0) {
      errors.push('Multiple nodes must be connected with edges');
    }
    
    for (const [, nodeData] of lineageData.nodes) {
      if (nodeData.type === NodeType.DATASET) {
        if (!nodeData.dataset?.name?.trim()) {
          errors.push(`Dataset "${nodeData.dataset?.name || nodeData.id}" is missing name`);
        }
      } else if (nodeData.type === NodeType.JOB) {
        if (!nodeData.job?.name?.trim()) {
          errors.push(`Job "${nodeData.job?.name || nodeData.id}" is missing name`);
        }
      }
    }
    
    return errors;
  }
}
