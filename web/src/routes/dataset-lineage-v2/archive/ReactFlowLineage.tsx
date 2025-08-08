// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react'
import ELK from 'elkjs'
import { LineageGraph } from '../../../types/api'
import { convertLineageToReactFlow, ReactFlowNodeData } from './utils'
import { Box, Typography } from '@mui/material'

interface ReactFlowLineageProps {
  lineageData: LineageGraph
}

const elk = new ELK()

// ELK layout options
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.direction': 'RIGHT',
}

const getLayoutedElements = async (nodes: Node[], edges: Edge[]) => {
  const elkGraph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: 180,
      height: 60,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  }

  const layoutedGraph = await elk.layout(elkGraph)

  const layoutedNodes = nodes.map((node) => {
    const elkNode = layoutedGraph.children?.find((n) => n.id === node.id)
    return {
      ...node,
      position: {
        x: elkNode?.x ?? 0,
        y: elkNode?.y ?? 0,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

const ReactFlowLineage: React.FC<ReactFlowLineageProps> = ({ lineageData }) => {
  const { nodes: initialNodes, edges: initialEdges } = convertLineageToReactFlow(lineageData)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isLayouting, setIsLayouting] = useState(true)

  // Apply ELK layout when data changes
  useEffect(() => {
    const applyLayout = async () => {
      setIsLayouting(true)
      const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
        initialNodes,
        initialEdges
      )
      setNodes(layoutedNodes)
      setEdges(layoutedEdges)
      setIsLayouting(false)
    }

    if (initialNodes.length > 0) {
      applyLayout()
    }
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<ReactFlowNodeData>) => {
    console.log('Node clicked:', node.data)
  }, [])

  if (isLayouting) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="400px">
        <Typography>Applying layout...</Typography>
      </Box>
    )
  }

  return (
    <Box height="600px" border="1px solid #ddd" borderRadius="4px">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls />
        <Panel position="top-left">
          <Box p={1} bgcolor="background.paper" borderRadius="4px">
            <Typography variant="body2">
              Nodes: {nodes.length} | Edges: {edges.length}
            </Typography>
          </Box>
        </Panel>
      </ReactFlow>
    </Box>
  )
}

// Wrapper component with ReactFlowProvider
const ReactFlowLineageWrapper: React.FC<ReactFlowLineageProps> = (props) => (
  <ReactFlowProvider>
    <ReactFlowLineage {...props} />
  </ReactFlowProvider>
)

export default ReactFlowLineageWrapper