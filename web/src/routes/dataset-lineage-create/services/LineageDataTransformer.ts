import { LineageData, LineageNodeData } from '../useLineageData';
import { ServiceLineageData, ServiceLineageNodeData } from './LineageService';

export class LineageDataTransformer {
  /**
   * Transform hook data to service data
   */
  static hookToService(hookData: LineageData): ServiceLineageData {
    const serviceNodes = new Map<string, ServiceLineageNodeData>();
    const serviceEdges = new Map<string, { source: string; target: string }>();

    // Transform nodes
    for (const [nodeId, hookNode] of hookData.nodes) {
      const serviceNode: ServiceLineageNodeData = {
        id: hookNode.id,
        label: hookNode.label,
        type: hookNode.type,
        dataset: hookNode.dataset ? {
          id: hookNode.dataset.id,
          name: hookNode.dataset.name,
          namespace: hookNode.dataset.namespace,
          type: hookNode.dataset.type as string,
          physicalName: hookNode.dataset.physicalName,
          createdAt: hookNode.dataset.createdAt,
          updatedAt: hookNode.dataset.updatedAt,
          sourceName: hookNode.dataset.sourceName,
          fields: hookNode.dataset.fields?.map(field => ({
            name: field.name,
            type: field.type || 'unknown'
          })) || [],
          facets: hookNode.dataset.facets || {},
          tags: hookNode.dataset.tags || [],
          lastModifiedAt: hookNode.dataset.lastModifiedAt,
          description: hookNode.dataset.description
        } : undefined,
        job: hookNode.job ? {
          id: hookNode.job.id,
          name: hookNode.job.name,
          namespace: hookNode.job.namespace,
          type: hookNode.job.type as string,
          createdAt: hookNode.job.createdAt,
          updatedAt: hookNode.job.updatedAt,
          inputs: hookNode.job.inputs || [],
          outputs: hookNode.job.outputs || [],
          location: hookNode.job.location,
          description: hookNode.job.description,
          simpleName: hookNode.job.simpleName,
          latestRun: hookNode.job.latestRun,
          parentJobName: hookNode.job.parentJobName,
          parentJobUuid: hookNode.job.parentJobUuid,
          transformationCode: (hookNode.job as any).transformationCode,
          sql: (hookNode.job as any).sql,
          sourceCodeLocation: (hookNode.job as any).sourceCodeLocation,
          sourceCode: (hookNode.job as any).sourceCode,
          ownership: (hookNode.job as any).ownership
        } : undefined
      };
      
      serviceNodes.set(nodeId, serviceNode);
    }

    // Transform edges
    for (const [edgeId, hookEdge] of hookData.edges) {
      serviceEdges.set(edgeId, {
        source: hookEdge.source,
        target: hookEdge.target
      });
    }

    return {
      nodes: serviceNodes,
      edges: serviceEdges
    };
  }

  /**
   * Transform service data to hook data (if needed for future use)
   */
  static serviceToHook(serviceData: ServiceLineageData): LineageData {
    const hookNodes = new Map<string, LineageNodeData>();
    const hookEdges = new Map<string, { id: string; source: string; target: string }>();

    // Transform nodes
    for (const [nodeId, serviceNode] of serviceData.nodes) {
      const hookNode: LineageNodeData = {
        id: serviceNode.id,
        label: serviceNode.label,
        type: serviceNode.type,
        dataset: serviceNode.dataset ? {
          ...serviceNode.dataset,
          type: serviceNode.dataset.type as any,
          fields: serviceNode.dataset.fields?.map(field => ({
            name: field.name,
            type: field.type as any,
            tags: [],
            description: ''
          })) || []
        } as any : undefined,
        job: serviceNode.job ? {
          ...serviceNode.job,
          type: serviceNode.job.type as any
        } as any : undefined
      };
      
      hookNodes.set(nodeId, hookNode);
    }

    // Transform edges
    for (const [edgeId, serviceEdge] of serviceData.edges) {
      hookEdges.set(edgeId, {
        id: edgeId,
        source: serviceEdge.source,
        target: serviceEdge.target
      });
    }

    return {
      nodes: hookNodes,
      edges: hookEdges
    };
  }
}