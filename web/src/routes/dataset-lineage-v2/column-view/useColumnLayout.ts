import { useEffect, useCallback, useRef } from 'react'
import { useNodesState, useEdgesState, Node, Edge, NodeChange, EdgeChange } from '@xyflow/react'
import useColumnELKLayout from './useColumnELKLayout'

interface UseColumnLayoutReturn {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
}

interface UseColumnLayoutProps {
  columnGraph: { nodes: any[]; edges: any[] } | null
  onNodeClick: (nodeId: string, nodeData: any) => void
  lockELKLayout?: boolean
}

const useColumnLayout = ({ columnGraph, onNodeClick, lockELKLayout = false }: UseColumnLayoutProps): UseColumnLayoutReturn => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { getLayoutedElements } = useColumnELKLayout()
  const hasAppliedLayoutRef = useRef(false)

  useEffect(() => {
    const update = async () => {
      if (!columnGraph || !columnGraph.nodes || columnGraph.nodes.length === 0) {
        setNodes([])
        setEdges([])
        return
      }

      try {
        if (!lockELKLayout || !hasAppliedLayoutRef.current) {
          const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
            columnGraph.nodes,
            columnGraph.edges
          )
          const withHandlers = layoutedNodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              onNodeClick: (nodeId: string) => onNodeClick(nodeId, n.data),
            },
          }))
          setNodes(withHandlers)
          setEdges(layoutedEdges)
          if (lockELKLayout) hasAppliedLayoutRef.current = true
        } else {
          // Merge incoming data; preserve existing positions
          const currentById = new Map(nodes.map((n) => [n.id, n] as const))
          const merged = columnGraph.nodes.map((incoming: any) => {
            const existing = currentById.get(incoming.id)
            const position = existing?.position || incoming.position || { x: 0, y: 0 }
            return {
              ...(existing || incoming),
              id: incoming.id,
              position,
              data: {
                ...incoming.data,
                onNodeClick: (nodeId: string) => onNodeClick(nodeId, incoming.data),
              },
            } as Node
          })
          setNodes(merged)
          setEdges((columnGraph.edges || []) as Edge[])
        }
      } catch (e) {
        console.error('Error processing column layout:', e)
      }
    }
    update()
  }, [columnGraph, getLayoutedElements, lockELKLayout, onNodeClick])

  return { nodes, edges, onNodesChange, onEdgesChange }
}

export default useColumnLayout

