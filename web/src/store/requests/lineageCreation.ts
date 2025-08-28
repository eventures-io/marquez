// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { API_URL } from '../../globals'
import { genericFetchWrapper } from './index'
import { LineageData, LineageNodeData } from '../../routes/dataset-lineage-create/useLineageData'
import { NodeType } from '../../types/lineage'

interface OpenLineageEvent {
  eventType: 'START' | 'COMPLETE' | 'FAIL' | 'ABORT'
  eventTime: string
  producer: string
  schemaURL: string
  job: {
    namespace: string
    name: string
    facets?: {
      documentation?: {
        _producer: string
        _schemaURL: string
        description: string
      }
    }
  }
  run: {
    runId: string
    facets?: Record<string, any>
  }
  inputs?: Array<{
    namespace: string
    name: string
    facets?: {
      schema?: {
        _producer: string
        _schemaURL: string
        fields: Array<{ name: string; type: string }>
      }
      documentation?: {
        _producer: string
        _schemaURL: string
        description: string
      }
    }
  }>
  outputs?: Array<{
    namespace: string
    name: string
    facets?: {
      schema?: {
        _producer: string
        _schemaURL: string
        fields: Array<{ name: string; type: string }>
      }
      documentation?: {
        _producer: string
        _schemaURL: string
        description: string
      }
    }
  }>
}

// Generate a unique run ID
const generateRunId = (): string => {
  return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create OpenLineage event via API
export const createLineageEvent = async (event: OpenLineageEvent) => {
  const url = `${API_URL}/lineage`
  console.log('Creating OpenLineage event:', event)
  console.log('Posting to URL:', url)
  
  try {
    const response = await genericFetchWrapper(
      url,
      {
        method: 'POST',
        body: JSON.stringify(event),
        headers: { 'Content-Type': 'application/json' }
      },
      'createLineageEvent'
    )
    console.log('OpenLineage event created successfully:', response)
    return response
  } catch (error) {
    console.error('Failed to create OpenLineage event:', error)
    console.error('Event that failed:', JSON.stringify(event, null, 2))
    throw error
  }
}

// Get job inputs (datasets that connect TO this job)
const getJobInputs = (jobId: string, lineageData: LineageData): LineageNodeData[] => {
  const inputs: LineageNodeData[] = []
  
  for (const [edgeId, edge] of lineageData.edges) {
    if (edge.target === jobId) {
      const sourceNode = lineageData.nodes.get(edge.source)
      if (sourceNode && sourceNode.type === NodeType.DATASET) {
        inputs.push(sourceNode)
      }
    }
  }
  
  return inputs
}

// Get job outputs (datasets that connect FROM this job)  
const getJobOutputs = (jobId: string, lineageData: LineageData): LineageNodeData[] => {
  const outputs: LineageNodeData[] = []
  
  for (const [edgeId, edge] of lineageData.edges) {
    if (edge.source === jobId) {
      const targetNode = lineageData.nodes.get(edge.target)
      if (targetNode && targetNode.type === NodeType.DATASET) {
        outputs.push(targetNode)
      }
    }
  }
  
  return outputs
}

// Save complete lineage by creating OpenLineage events for all jobs
export const saveCompleteLineage = async (lineageData: LineageData) => {
  const events: OpenLineageEvent[] = []
  const timestamp = new Date().toISOString()
  
  // Get all job nodes (OpenLineage is job-centric)
  const jobNodes = Array.from(lineageData.nodes.values())
    .filter(node => node.type === NodeType.JOB)
  
  if (jobNodes.length === 0) {
    throw new Error('No jobs found in lineage. At least one job is required.')
  }
  
  // Create events for each job
  for (const jobNode of jobNodes) {
    if (!jobNode.job?.name) {
      throw new Error(`Job ${jobNode.id} is missing required name`)
    }
    
    if (!jobNode.job?.namespace) {
      throw new Error(`Job ${jobNode.id} is missing required namespace`)
    }
    
    const inputs = getJobInputs(jobNode.id, lineageData)
    const outputs = getJobOutputs(jobNode.id, lineageData)
    
    // Validate inputs and outputs
    for (const input of inputs) {
      if (!input.dataset?.name) {
        throw new Error(`Input dataset ${input.id} is missing required name`)
      }
      if (!input.dataset?.namespace) {
        throw new Error(`Input dataset ${input.id} is missing required namespace`)
      }
    }
    
    for (const output of outputs) {
      if (!output.dataset?.name) {
        throw new Error(`Output dataset ${output.id} is missing required name`)
      }
      if (!output.dataset?.namespace) {
        throw new Error(`Output dataset ${output.id} is missing required namespace`)
      }
    }
    
    const runId = generateRunId()
    const jobEventData = {
      producer: 'https://github.com/MarquezProject/marquez-ui',
      schemaURL: 'https://openlineage.io/spec/1-0-5/OpenLineage.json',
      job: {
        namespace: jobNode.job.namespace,
        name: jobNode.job.name,
        facets: {
          documentation: {
            _producer: 'https://github.com/MarquezProject/marquez-ui',
            _schemaURL: 'https://openlineage.io/spec/facets/1-0-0/DocumentationJobFacet.json',
            description: jobNode.job.description || `${jobNode.job?.name || 'Job'} created via lineage UI`
          }
        }
      },
      run: {
        runId: runId,
        facets: {}
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
    }

    // Create START event for this job
    events.push({
      eventType: 'START',
      eventTime: timestamp,
      ...jobEventData
    })

    // Create COMPLETE event for the same job run (needed to establish lineage)
    const completeTime = new Date(new Date(timestamp).getTime() + 1000).toISOString() // 1 second later
    events.push({
      eventType: 'COMPLETE',
      eventTime: completeTime,
      ...jobEventData
    })
  }
  
  console.log(`Creating ${events.length} OpenLineage events for lineage save`)
  
  // Send all events in sequence
  for (const event of events) {
    try {
      await createLineageEvent(event)
      console.log(`Successfully created event for job: ${event.job.namespace}:${event.job.name}`)
    } catch (error: any) {
      console.error(`Failed to create event for job: ${event.job.namespace}:${event.job.name}`, error)
      const errorMessage = error?.message || error?.toString() || 'Unknown error'
      const responseText = error?.response?.text ? await error.response.text() : 'No response text'
      throw new Error(`Failed to save job ${event.job.namespace}:${event.job.name}: ${errorMessage}. Response: ${responseText}`)
    }
  }
  
  console.log('Successfully saved complete lineage')
}

// Validate that lineage is ready to save
export const validateLineageForSave = (lineageData: LineageData): string[] => {
  const errors: string[] = []
  
  // Must have at least one node
  if (lineageData.nodes.size === 0) {
    errors.push('Lineage must contain at least one node')
    return errors
  }
  
  // Validate that all nodes have namespaces
  for (const [, nodeData] of lineageData.nodes) {
    if (nodeData.type === NodeType.DATASET) {
      if (!nodeData.dataset?.namespace?.trim()) {
        errors.push(`Dataset "${nodeData.dataset?.name || nodeData.id}" is missing namespace`)
      }
    } else if (nodeData.type === NodeType.JOB) {
      if (!nodeData.job?.namespace?.trim()) {
        errors.push(`Job "${nodeData.job?.name || nodeData.id}" is missing namespace`)
      }
    }
  }
  
  // Must have at least one job
  const jobCount = Array.from(lineageData.nodes.values())
    .filter(node => node.type === NodeType.JOB).length
  
  if (jobCount === 0) {
    errors.push('Lineage must contain at least one job')
  }
  
  // Must have at least one edge if there are multiple nodes
  if (lineageData.nodes.size > 1 && lineageData.edges.size === 0) {
    errors.push('Multiple nodes must be connected with edges')
  }
  
  // Validate each node has a name
  for (const [, nodeData] of lineageData.nodes) {
    if (nodeData.type === NodeType.DATASET) {
      if (!nodeData.dataset?.name?.trim()) {
        errors.push(`Dataset "${nodeData.dataset?.name || nodeData.id}" is missing name`)
      }
    } else if (nodeData.type === NodeType.JOB) {
      if (!nodeData.job?.name?.trim()) {
        errors.push(`Job "${nodeData.job?.name || nodeData.id}" is missing name`)
      }
    }
  }
  
  return errors
}