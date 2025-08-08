// @ts-nocheck
import React from 'react';

import {
  useNodes,
  ViewportPortal,
  useReactFlow,
  type XYPosition,
} from '@xyflow/react';
 
export default function NodeInspector() {
  const { getInternalNode } = useReactFlow();
  const nodes = useNodes();
  
  console.log('NodeInspector render - nodes:', nodes.length);
 
  return (
    <ViewportPortal>
      <div className="react-flow__devtools-nodeinspector">
        <div style={{
          position: 'absolute',
          top: 100,
          left: 100,
          background: 'red',
          color: 'white',
          padding: '5px',
          zIndex: 9999
        }}>
          Debug: {nodes.length} nodes
        </div>
        {nodes.map((node) => {
          const internalNode = getInternalNode(node.id);
          if (!internalNode) {
            console.log('No internal node for:', node.id);
            return null;
          }
 
          const absPosition = internalNode?.internals.positionAbsolute;
          console.log('Node', node.id, 'absPosition:', absPosition);
 
          return (
            <NodeInfo
              key={node.id}
              id={node.id}
              selected={!!node.selected}
              type={node.type || 'default'}
              position={node.position}
              absPosition={absPosition}
              width={node.measured?.width ?? 0}
              height={node.measured?.height ?? 0}
              data={node.data}
            />
          );
        })}
      </div>
    </ViewportPortal>
  );
}
 
type NodeInfoProps = {
  id: string;
  type: string;
  selected: boolean;
  position: XYPosition;
  absPosition: XYPosition;
  width?: number;
  height?: number;
  data: any;
};
 
function NodeInfo({
  id,
  type,
  selected,
  position,
  absPosition,
  width,
  height,
  data,
}: NodeInfoProps) {
  // Use fallback dimensions if not measured yet
  const displayWidth = width || 150;
  const displayHeight = height || 40;
 
  return (
    <div
      className="react-flow__devtools-nodeinfo"
      style={{
        position: 'absolute',
        transform: `translate(${absPosition.x}px, ${absPosition.y + displayHeight}px)`,
        width: Math.min(displayWidth * 2, 300),
      }}
    >
      <div>id: {id}</div>
      <div>type: {type}</div>
      <div>selected: {selected ? 'true' : 'false'}</div>
      <div>
        position: {position.x.toFixed(1)}, {position.y.toFixed(1)}
      </div>
      <div>
        dimensions: {displayWidth} × {displayHeight} {!width && '(fallback)'}
      </div>
      <div>data: {JSON.stringify(data, null, 2)}</div>
    </div>
  );
}