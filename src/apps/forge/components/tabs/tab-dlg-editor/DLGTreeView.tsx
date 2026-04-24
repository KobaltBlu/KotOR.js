/**
 * DLGTreeView component.
 *
 * React tree view component for displaying and editing DLG dialog structure.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGTreeView.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { DLGTreeNode } from '@/apps/forge/interfaces/DLGTreeNode';
import { DLGTreeModel } from '@/apps/forge/utils/DLGTreeModel';
import { DLGNodeType } from '@/enums/dialog/DLGNodeType';
import '@/apps/forge/components/tabs/tab-dlg-editor/DLGTreeView.scss';

interface DLGTreeViewProps {
  model: DLGTreeModel;
  onNodeSelect?: (node: DLGTreeNode | null) => void;
  onNodeDoubleClick?: (node: DLGTreeNode) => void;
  onNodeContextMenu?: (node: DLGTreeNode, event: React.MouseEvent) => void;
}

export const DLGTreeView: React.FC<DLGTreeViewProps> = ({
  model,
  onNodeSelect,
  onNodeDoubleClick,
  onNodeContextMenu,
}) => {
  const [rootNodes, setRootNodes] = useState<DLGTreeNode[]>(model.getRootNodes());
  const [_selectedNode, setSelectedNode] = useState<DLGTreeNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<DLGTreeNode | null>(null);
  const [dropTarget, setDropTarget] = useState<{ nodeId: string; position: 'before' | 'after' | 'child' } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DLGTreeNode | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = model.onChange((nodes) => {
      setRootNodes([...nodes]);
    });

    const unsubscribeSelection = model.onSelectionChange((node) => {
      setSelectedNode(node);
      if (onNodeSelect) {
        onNodeSelect(node);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeSelection();
    };
  }, [model, onNodeSelect]);

  const handleNodeClick = useCallback(
    (node: DLGTreeNode) => {
      model.selectNode(node.id);
    },
    [model]
  );

  const handleNodeDoubleClick = useCallback(
    (node: DLGTreeNode) => {
      if (!node.expanded && !node.childrenLoaded) {
        model.loadChildren(node);
      }
      model.toggleExpanded(node.id);

      if (onNodeDoubleClick) {
        onNodeDoubleClick(node);
      }
    },
    [model, onNodeDoubleClick]
  );

  const handleToggleExpand = useCallback(
    (node: DLGTreeNode, event: React.MouseEvent) => {
      event.stopPropagation();
      if (!node.expanded && !node.childrenLoaded) {
        model.loadChildren(node);
      }
      model.toggleExpanded(node.id);
    },
    [model]
  );

  const handleDragStart = useCallback((node: DLGTreeNode, event: React.DragEvent) => {
    setDraggedNode(node);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/dlg-node',
      JSON.stringify({
        nodeId: node.id,
        listIndex: node.listIndex,
        nodeType: node.nodeType,
      })
    );
  }, []);

  const handleDragOver = useCallback(
    (node: DLGTreeNode, event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedNode) return;

      // Determine drop position based on mouse position
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const y = event.clientY - rect.top;
      const height = rect.height;

      let position: 'before' | 'after' | 'child';
      if (y < height * 0.25) {
        position = 'before';
      } else if (y > height * 0.75) {
        position = 'after';
      } else {
        position = 'child';
      }

      setDropTarget({ nodeId: node.id, position });
    },
    [draggedNode]
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (node: DLGTreeNode, event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedNode || !dropTarget) return;

      // Handle the drop operation
      // This would involve moving/linking nodes in the model
      // Implementation depends on the specific drop logic needed

      setDraggedNode(null);
      setDropTarget(null);
    },
    [draggedNode, dropTarget, model]
  );

  const handleContextMenu = useCallback(
    (node: DLGTreeNode, event: React.MouseEvent) => {
      event.preventDefault();
      if (onNodeContextMenu) {
        onNodeContextMenu(node, event);
      }
    },
    [onNodeContextMenu]
  );

  const handleMouseEnter = useCallback((node: DLGTreeNode) => {
    setHoveredNode(node);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const renderNode = useCallback(
    (node: DLGTreeNode, depth: number = 0): React.ReactNode => {
      const hasChildren = node.dlgNode.replies.length > 0 || node.dlgNode.entries.length > 0;
      const isExpanded = node.expanded;
      const isSelected = node.selected;
      const isHovered = hoveredNode?.id === node.id;
      const isDropTarget = dropTarget?.nodeId === node.id;

      const nodeClasses = [
        'dlg-tree-node',
        isSelected && 'selected',
        isHovered && 'hovered',
        node.isOrphan && 'orphan',
        node.isCopy && 'copy',
        isDropTarget && `drop-target-${dropTarget.position}`,
      ]
        .filter(Boolean)
        .join(' ');

      const getNodeIcon = () => {
        if (node.nodeType === DLGNodeType.STARTING) return '🔹';
        if (node.nodeType === DLGNodeType.ENTRY) return '💬';
        if (node.nodeType === DLGNodeType.REPLY) return '👤';
        return '•';
      };

      const getNodeLabel = () => {
        const text = node.dlgNode.text || '(No text)';
        const maxLength = 50;
        const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

        let label = `[${node.listIndex}] ${truncated}`;

        if (node.hasConditions) label += ' 🔒';
        if (node.hasActions) label += ' ⚡';
        if (node.dlgNode.sound || node.dlgNode.vo_resref) label += ' 🔊';

        return label;
      };

      return (
        <div key={node.id} className="dlg-tree-node-container">
          <div
            className={nodeClasses}
            style={{ paddingLeft: `${depth * 20}px` }}
            onClick={() => handleNodeClick(node)}
            onDoubleClick={() => handleNodeDoubleClick(node)}
            onContextMenu={(e) => handleContextMenu(node, e)}
            onDragStart={(e) => handleDragStart(node, e)}
            onDragOver={(e) => handleDragOver(node, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(node, e)}
            onMouseEnter={() => handleMouseEnter(node)}
            onMouseLeave={handleMouseLeave}
            draggable
          >
            <div className="dlg-tree-node-content">
              {hasChildren && (
                <button
                  className="expand-toggle"
                  onClick={(e) => handleToggleExpand(node, e)}
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}
              {!hasChildren && <span className="expand-spacer" />}

              <span className="node-icon">{getNodeIcon()}</span>
              <span className="node-label">{getNodeLabel()}</span>
            </div>
          </div>

          {isExpanded && node.childrenLoaded && node.children.length > 0 && (
            <div className="dlg-tree-node-children">{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    },
    [
      hoveredNode,
      dropTarget,
      handleNodeClick,
      handleNodeDoubleClick,
      handleToggleExpand,
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleContextMenu,
      handleMouseEnter,
      handleMouseLeave,
    ]
  );

  return (
    <div className="dlg-tree-view" ref={treeRef}>
      {rootNodes.length === 0 ? (
        <div className="dlg-tree-empty">No starting nodes</div>
      ) : (
        <div className="dlg-tree-nodes">{rootNodes.map((node) => renderNode(node, 0))}</div>
      )}
    </div>
  );
};
