import React, { useMemo, useCallback, useState, useRef } from 'react';
import * as KotOR from '@/apps/forge/KotOR';
import { buildDLGGraph, DLGGraphData, DLGGraphNode, DLGGraphNodeType } from '@/apps/forge/utils/DLGGraphModel';
import '@/apps/forge/components/tabs/tab-dlg-editor/DLGGraphView.scss';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const NODE_RX = 6;

interface DLGGraphViewProps {
  dlg: KotOR.DLGObject;
  selectedNodeIndex: number;
  selectedNodeType: 'starting' | 'entry' | 'reply' | null;
  onSelectNode: (node: KotOR.DLGNode | undefined, index: number, type: 'starting' | 'entry' | 'reply' | null) => void;
}

export const DLGGraphView: React.FC<DLGGraphViewProps> = ({
  dlg,
  selectedNodeIndex,
  selectedNodeType,
  onSelectNode,
}) => {
  const graphData = useMemo<DLGGraphData>(() => buildDLGGraph(dlg), [dlg]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const handleNodeClick = useCallback(
    (node: DLGGraphNode) => {
      onSelectNode(node.dlgNode, node.listIndex, node.type);
    },
    [onSelectNode]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.25, Math.min(2, t.scale + delta)),
    }));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || (e.target as SVGElement).closest('.dlg-graph-node')) return;
      dragRef.current = { x: e.clientX, y: e.clientY, startX: transform.x, startY: transform.y };
    },
    [transform]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setTransform((t) => ({
      ...t,
      x: dragRef.current!.startX + dx,
      y: dragRef.current!.startY + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
  }, []);

  const bounds = useMemo(() => {
    if (graphData.nodes.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    graphData.nodes.forEach((n) => {
      minX = Math.min(minX, n.x - NODE_WIDTH / 2);
      minY = Math.min(minY, n.y - NODE_HEIGHT / 2);
      maxX = Math.max(maxX, n.x + NODE_WIDTH / 2);
      maxY = Math.max(maxY, n.y + NODE_HEIGHT / 2);
    });
    const pad = 40;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    };
  }, [graphData.nodes]);

  const viewWidth = bounds.maxX - bounds.minX;
  const viewHeight = bounds.maxY - bounds.minY;

  const isSelected = useCallback(
    (node: DLGGraphNode) => selectedNodeType === node.type && selectedNodeIndex === node.listIndex,
    [selectedNodeIndex, selectedNodeType]
  );

  return (
    <div
      className="dlg-graph-view"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      role="application"
      aria-label="Dialog graph view"
    >
      <svg
        className="dlg-graph-svg"
        viewBox={`${bounds.minX} ${bounds.minY} ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <g className="dlg-graph-layer">
          {graphData.edges.map((edge) => {
            const src = graphData.nodes.find((n) => n.id === edge.sourceId);
            const tgt = graphData.nodes.find((n) => n.id === edge.targetId);
            if (!src || !tgt) return null;
            const sx = src.x;
            const sy = src.y + NODE_HEIGHT / 2;
            const tx = tgt.x;
            const ty = tgt.y - NODE_HEIGHT / 2;
            return (
              <path
                key={edge.id}
                className="dlg-graph-edge"
                d={`M ${sx} ${sy} C ${sx} ${(sy + ty) / 2}, ${tx} ${(sy + ty) / 2}, ${tx} ${ty}`}
                fill="none"
                stroke="var(--dlg-graph-edge, #555)"
                strokeWidth="1.5"
              />
            );
          })}
          {graphData.nodes.map((node) => (
            <g
              key={node.id}
              className={`dlg-graph-node dlg-graph-node--${node.type}`}
              transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
              onClick={() => handleNodeClick(node)}
              role="button"
              tabIndex={0}
              aria-label={`${node.type} ${node.listIndex + 1}: ${node.label}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNodeClick(node);
                }
              }}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={NODE_RX}
                ry={NODE_RX}
                className={
                  isSelected(node) ? 'dlg-graph-node__rect dlg-graph-node__rect--selected' : 'dlg-graph-node__rect'
                }
              />
              <text
                className="dlg-graph-node__label"
                x={NODE_WIDTH / 2}
                y={NODE_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
