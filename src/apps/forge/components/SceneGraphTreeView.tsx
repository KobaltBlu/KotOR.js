import React, { useState, useCallback, memo, useMemo, useEffect, CSSProperties } from "react";
import { SceneGraphNode, SceneGraphNodeEventListenerTypes } from "@/apps/forge/SceneGraphNode";
import { SceneGraphTreeViewManager } from "@/apps/forge/managers/SceneGraphTreeViewManager";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";

export interface SceneGraphTreeViewProps {
  manager: SceneGraphTreeViewManager;
  /** Overrides default 350px list height (e.g. side panels with their own scroll host). */
  listStyle?: CSSProperties;
}

export const SceneGraphTreeView = function (props: SceneGraphTreeViewProps) {
  const manager = props.manager;
  const listStyle = props.listStyle;
  const [nodes, setNodes] = useState<SceneGraphNode[]>([]);

  const onBuild = useCallback((built: SceneGraphNode[]) => {
    setNodes([...built]);
  }, []);

  useEffect( () => {
    if(!manager){ return; }
    manager.addEventListener('onBuild', onBuild);
    // onBuild may have run before this component mounted (e.g. UI3DRenderer setCanvas); sync roots now.
    setNodes([...(manager.parentNodes ?? [])]);
    return () => {
      manager.removeEventListener('onBuild', onBuild);
    }
  }, [manager, onBuild]);
  return (
    <ForgeTreeView style={listStyle ?? { height: '350px', overflow: 'auto'}}>
    {
      nodes.map( (node: SceneGraphNode) => {
        return (
          <SceneGraphTreeViewNode manager={manager} key={node.id} node={node} />
        )
      })
    }
    </ForgeTreeView>
  );
}

export const SceneGraphTreeViewNode = memo(function SceneGraphTreeViewNode(props: any) {
  const manager: SceneGraphTreeViewManager = props.manager;
  const node: SceneGraphNode = props.node;
  const depth: number = props.depth || 0;
  const [nodes, setNodes] = useState<SceneGraphNode[]>([...node.nodes]);
  const [openState, setOpenState] = useState<boolean>(node.open);
  const [render, rerender] = useState<boolean>(false);

  const onNameChange = useCallback(() => {
    rerender(!render);
  }, [render]);

  const onExpandStateChange = useCallback(() => {
    setOpenState(node.open);
  }, [node.open]);

  const onNodesChange = useCallback(() => {
    setNodes([...node.nodes]);
  }, [node]);

  useEffect( () => {
    // Initialize state from current node.nodes
    setNodes([...node.nodes]);
    setOpenState(node.open);
    
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onNameChange', onNameChange);
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', onExpandStateChange);
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', onNodesChange);
    return () => {
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onNameChange', onNameChange);
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', onExpandStateChange);
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', onNodesChange);
    }
  }, [node, onNameChange, onExpandStateChange, onNodesChange]);

  const handleClick = useCallback(() => {
    if(typeof node.onClick === 'function'){
      node.onClick(node);
    }
  }, [node]);

  const handleToggle = useCallback(() => {
    setOpenState(prev => !prev);
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Add double-click logic if needed
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Add context menu logic if needed
  }, []);

  const handleSelect = useCallback((nodeId: string) => {
    if(typeof node.onClick === 'function'){
      node.onClick(node);
    }
  }, [node]);

  // Memoize child nodes to prevent unnecessary re-renders
  const childNodes = useMemo(() => {
    if (!openState || !nodes.length) return null;
    return nodes.map((child: SceneGraphNode) => (
      <SceneGraphTreeViewNode 
        key={child.id} 
        node={child} 
        manager={manager}
        depth={depth + 1}
      />
    ));
  }, [openState, nodes, manager, depth]);

  const hasChildren = nodes.length > 0;

  // Prepare data attributes
  const dataAttributes = {
    'data-path': node.data?.path,
  };

  return (
    <ListItemNode
      id={node.id.toString()}
      name={node.name}
      hasChildren={hasChildren}
      isExpanded={openState}
      isSelected={false}
      depth={depth}
      icon={node.icon}
      iconType={hasChildren ? 'folder' : 'file'}
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
