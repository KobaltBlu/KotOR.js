import React, { useState, useCallback, memo, useMemo } from 'react';
import { FileBrowserNode } from '@/apps/forge/FileBrowserNode';
import { FileTypeManager } from '@/apps/forge/FileTypeManager';
import { EditorFile } from '@/apps/forge/EditorFile';
import { ListItemNode } from '@/apps/forge/components/treeview/ListItemNode';

export interface ResourceListNodeProps {
  node: FileBrowserNode;
  depth?: number;
  isSelected?: boolean;
  onSelect?: (node: FileBrowserNode) => void;
  onContextMenu?: (event: React.MouseEvent, node: FileBrowserNode) => void;
  onToggleNode?: (node: FileBrowserNode) => Promise<void> | void;
}

export const ResourceListNode = memo(function ResourceListNode(props: ResourceListNodeProps) {
  const { node, depth = 0, isSelected = false, onSelect, onContextMenu, onToggleNode } = props;
  const [openState, setOpenState] = useState<boolean>(node.open);
  const [loadingChildren, setLoadingChildren] = useState<boolean>(false);

  const hasLazyChildren = !!node.data?.lazyArchive && !node.data?.lazyLoaded;
  const isFolder = hasLazyChildren || (node.nodes && node.nodes.length > 0);
  const hasChildren = isFolder;

  const handleToggle = useCallback(async () => {
    const isExpanding = !openState;
    if (isExpanding && typeof onToggleNode === 'function') {
      setLoadingChildren(true);
      await onToggleNode(node);
      setLoadingChildren(false);
    }
    setOpenState((prev) => !prev);
  }, [node, onToggleNode, openState]);

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(node);
    }
  }, [node, onSelect]);

  const handleDoubleClick = useCallback(() => {
    if (node.type === 'resource' && node.data?.path) {
      console.log('Opening resource:', node);
      FileTypeManager.onOpenResource(
        new EditorFile({
          path: node.data.path,
          useGameFileSystem: true,
        })
      );
    }
  }, [node]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      console.log('Context menu for:', node.name);
      // Add context menu logic here
      if (typeof onContextMenu === 'function') {
        onContextMenu(e, node);
      }
    },
    [node, onContextMenu]
  );

  const handleSelect = useCallback(
    (nodeId: string) => {
      if (onSelect) {
        onSelect(node);
      }
    },
    [node, onSelect]
  );

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
        onContextMenu={onContextMenu}
        onToggleNode={onToggleNode}
      />
    ));
  }, [openState, hasChildren, node.nodes, depth, onSelect, onContextMenu, onToggleNode]);

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
      isLoading={loadingChildren}
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
