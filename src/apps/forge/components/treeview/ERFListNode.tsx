import React, { useState, useCallback, memo, useMemo } from "react";

import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export interface ERFListNodeProps {
  node: FileBrowserNode;
  depth?: number;
  isSelected?: boolean;
  onSelect?: (node: FileBrowserNode) => void;
  onDoubleClick?: (node: FileBrowserNode) => void;
  onContextMenu?: (event: React.MouseEvent, node: FileBrowserNode) => void;
}

export const ERFListNode = memo(function ResourceListNode(props: ERFListNodeProps) {
  const { node, depth = 0, isSelected = false, onSelect, onDoubleClick, onContextMenu } = props;
  const [openState, setOpenState] = useState<boolean>(node.open);

  const isFolder = node.nodes && node.nodes.length > 0;
  const hasChildren = isFolder && node.nodes.length > 0;

  const handleToggle = useCallback(() => {
    setOpenState(prev => !prev);
  }, []);

  const handleClick = useCallback(() => {
    if (typeof onSelect === 'function'){
      onSelect(node);
    }
  }, [node, onSelect]);

  const handleDoubleClick = useCallback(() => {
    if(typeof onDoubleClick === 'function'){
      onDoubleClick(node);
    }
  }, [node, onDoubleClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    log.debug('Context menu for:', node.name);
    // Add context menu logic here
    if(typeof onContextMenu === 'function'){
      onContextMenu(e, node);
    }
  }, [node, onContextMenu]);

  const handleSelect = useCallback((_nodeId: string) => {
    if (onSelect) {
      onSelect(node);
    }
  }, [node, onSelect]);

  // Memoize child nodes to prevent unnecessary re-renders
  const childNodes = useMemo(() => {
    if (!openState || !hasChildren) return null;
    return node.nodes.map((child: FileBrowserNode) => (
      <ResourceListNode
        key={child.id}
        node={child}
        depth={depth + 1}
        isSelected={false}
        onSelect={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />
    ));
  }, [openState, hasChildren, node.nodes, depth, onSelect]);

  // Prepare data attributes for the core component
  const dataAttributes = {
    'data-path': node.data?.path,
    'data-resref': node.data?.resref,
    'data-resid': node.data?.resid,
    'data-type': node.data?.type,
    'data-archive': node.data?.archive,
  };

  return (
    <ListItemNode
      id={node.id.toString()}
      name={node.name}
      hasChildren={hasChildren}
      isExpanded={openState}
      isSelected={isSelected}
      depth={depth}
      iconType={isFolder ? 'folder' : 'file'}
      fileType={node.name?.split('.').pop()?.toLowerCase()}
      onToggle={handleToggle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onSelect={handleSelect}
      dataAttributes={dataAttributes}
    >
      {childNodes}
    </ListItemNode>
  );
});
