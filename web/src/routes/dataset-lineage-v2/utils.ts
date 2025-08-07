// @ts-nocheck
import { Node, Edge } from '@xyflow/react'
import { LineageGraph } from '../../types/api'

export interface ReactFlowNodeData {
  label: string
  type: 'dataset' | 'job'
  namespace: string
  name: string
}

export const convertLineageToReactFlow = (
  lineageData: LineageGraph
): { nodes: Node<ReactFlowNodeData>[], edges: Edge[] } => {
  const nodes: Node<ReactFlowNodeData>[] = []
  const edges: Edge[] = []

  // Convert graph nodes to React Flow nodes
  lineageData.graph.forEach((graphNode) => {
    const nodeType = graphNode.type === 'DATASET' ? 'dataset' : 'job'
    
    nodes.push({
      id: graphNode.id,
      type: 'default',
      data: {
        label: graphNode.data.name,
        type: nodeType,
        namespace: graphNode.data.namespace,
        name: graphNode.data.name,
      },
      position: { x: 0, y: 0 }, // Will be set by ELK layout
    })

    // Convert inEdges to React Flow edges
    if (graphNode.inEdges) {
      graphNode.inEdges.forEach((inEdge) => {
        edges.push({
          id: `${inEdge.origin}-${inEdge.destination}`,
          source: inEdge.origin,
          target: inEdge.destination,
          type: 'default',
        })
      })
    }

    // Convert outEdges to React Flow edges (if needed)
    if (graphNode.outEdges) {
      graphNode.outEdges.forEach((outEdge) => {
        const edgeId = `${outEdge.origin}-${outEdge.destination}`
        // Avoid duplicate edges
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: outEdge.origin,
            target: outEdge.destination,
            type: 'default',
          })
        }
      })
    }
  })

  return { nodes, edges }
}