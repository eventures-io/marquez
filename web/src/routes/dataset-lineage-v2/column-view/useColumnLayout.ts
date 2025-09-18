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
          // Build map of dataset container positions for relative conversion
          const datasetPos = new Map<string, { x: number; y: number }>()
          layoutedNodes.forEach((n) => {
            if ((n as any).type === 'dataset-container') {
              datasetPos.set(n.id, { x: n.position?.x || 0, y: n.position?.y || 0 })
            }
          })
          const withHandlers = layoutedNodes.map((n) => {
            const m: any = {
              ...n,
              data: {
                ...n.data,
                onNodeClick: (nodeId: string) => onNodeClick(nodeId, n.data),
              },
            }
            if (m.type === 'dataset-container') {
              m.draggable = true
            }
            if (m.type === 'column-field') {
              const parentId = (m.data as any)?.parentDatasetId
              const p = parentId ? datasetPos.get(parentId) : undefined
              if (parentId && p) {
                // Convert absolute to relative and set as RF child
                const abs = m.position || { x: 0, y: 0 }
                m.parentId = parentId
                m.extent = 'parent'
                m.position = { x: (abs.x || 0) - p.x, y: (abs.y || 0) - p.y }
                m.draggable = false
              }
            }
            return m as Node
          })
          setNodes(withHandlers)
          setEdges(layoutedEdges)
          if (lockELKLayout) hasAppliedLayoutRef.current = true
        } else {
          // Merge incoming data; preserve existing positions
          const currentById = new Map(nodes.map((n) => [n.id, n] as const))
          const merged = columnGraph.nodes.map((incoming: any) => {
            const existing = currentById.get(incoming.id)
            const m: any = {
              ...(existing || incoming),
              id: incoming.id,
              position: existing?.position || incoming.position || { x: 0, y: 0 },
              data: {
                ...incoming.data,
                onNodeClick: (nodeId: string) => onNodeClick(nodeId, incoming.data),
              },
            }
            // Merge styles so updated container heights apply after adding columns
            if (incoming.style || existing?.style) {
              m.style = { ...(existing?.style || {}), ...(incoming.style || {}) }
            }
            // Keep children as RF children so they move with the container in edit/view
            if (m.type === 'column-field') {
              const parentId = (m.data as any)?.parentDatasetId
              if (parentId) {
                m.parentId = parentId
                m.extent = 'parent'
                m.draggable = false
              }
            }
            if (m.type === 'dataset-container') {
              m.draggable = true
            }
            return m as Node
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
