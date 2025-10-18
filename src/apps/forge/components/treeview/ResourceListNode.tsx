import React, { useState, useCallback, memo, useMemo } from "react";
import { FileBrowserNode } from "../../FileBrowserNode";
import { FileTypeManager } from "../../FileTypeManager";
import { EditorFile } from "../../EditorFile";
import { ListItemNode } from "./ListItemNode";

export interface ResourceListNodeProps {
  node: FileBrowserNode;
  depth?: number;
  isSelected?: boolean;
  onSelect?: (node: FileBrowserNode) => void;
}

export const ResourceListNode = memo(function ResourceListNode(props: ResourceListNodeProps) {
  const { node, depth = 0, isSelected = false, onSelect } = props;
  const [openState, setOpenState] = useState<boolean>(node.open);

  const isFolder = node.nodes && node.nodes.length > 0;
  const hasChildren = isFolder && node.nodes.length > 0;

  const handleToggle = useCallback(() => {
    setOpenState(prev => !prev);
  }, []);

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(node);
    }
  }, [node, onSelect]);

  const handleDoubleClick = useCallback(() => {
    if (node.type === 'resource') {
      console.log('Opening resource:', node);
      FileTypeManager.onOpenResource(
        new EditorFile({
          path: node.data.path,
          useGameFileSystem: true,
        })
      );
    }
  }, [node]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    console.log('Context menu for:', node.name);
    // Add context menu logic here
  }, [node]);

  const handleSelect = useCallback((nodeId: string) => {
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