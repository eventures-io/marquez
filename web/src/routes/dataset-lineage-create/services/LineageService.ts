import { API_URL } from '../../../globals';
import { genericFetchWrapper } from '../../../store/requests/index';
import { NodeType, EventType, LineageData, LineageNodeData, OpenLineageEvent } from '@app-types';



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
      
      // Add source code location facet if provided
      const sourceCodeLocation = (jobNode.job as any).sourceCodeLocation;
      if (sourceCodeLocation && sourceCodeLocation.trim()) {
        runFacets.sourceCodeLocation = {
          _producer: 'https://github.com/MarquezProject/marquez-ui',
          _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SourceCodeLocationRunFacet.json',
          type: 'git',
          url: sourceCodeLocation.trim()
        };
      }
      
      // Add source code facet if provided (as job facet for UI display)
      const sourceCode = (jobNode.job as any).sourceCode;
      if (sourceCode && sourceCode.trim()) {
        jobFacets.sourceCode = {
          _producer: 'https://github.com/MarquezProject/marquez-ui',
          _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/SourceCodeJobFacet.json',
          language: 'python', // Default to python, could be made configurable
          sourceCode: sourceCode.trim()
        };
      }
      
      // Add ownership facet if provided
      const ownership = (jobNode.job as any).ownership;
      if (ownership && ownership.trim()) {
        jobFacets.ownership = {
          _producer: 'https://github.com/MarquezProject/marquez-ui',
          _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/OwnershipJobFacet.json',
          owners: [
            {
              name: ownership.trim(),
              type: 'MAINTAINER'
            }
          ]
        };
      }
      
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