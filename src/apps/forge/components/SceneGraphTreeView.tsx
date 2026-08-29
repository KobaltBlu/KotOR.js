import React, { useState, useCallback, memo, useMemo, useEffect, CSSProperties } from "react";
import { SceneGraphNode, SceneGraphNodeEventListenerTypes } from "@/apps/forge/SceneGraphNode";
import { SceneGraphTreeViewManager } from "@/apps/forge/managers/SceneGraphTreeViewManager";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { ListItemNode } from "@/apps/forge/components/treeview/ListItemNode";
import type { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { GroupType } from "@/apps/forge/UI3DRenderer";
import * as KotOR from "@/apps/forge/KotOR";

export interface SceneGraphTreeViewProps {
  manager: SceneGraphTreeViewManager;
  /** Overrides default 350px list height (e.g. side panels with their own scroll host). */
  listStyle?: CSSProperties;
  filter?: string;
  /** When set, only show this group type (and its children). */
  typeFilter?: GroupType | '';
  tab?: TabModuleEditorState;
}

export const SceneGraphTreeView = function (props: SceneGraphTreeViewProps) {
  const manager = props.manager;
  const listStyle = props.listStyle;
  const filter = String(props.filter || '').trim().toLowerCase();
  const typeFilter = props.typeFilter || '';
  const [nodes, setNodes] = useState<SceneGraphNode[]>([]);
  const [validationTick, setValidationTick] = useState(0);

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

  useEffect(() => {
    if(!props.tab){ return; }
    const bump = () => setValidationTick((n) => n + 1);
    props.tab.addEventListener('onSelectionChanged', bump);
    props.tab.addEventListener('onModuleLoaded', bump);
    return () => {
      props.tab?.removeEventListener('onSelectionChanged', bump);
      props.tab?.removeEventListener('onModuleLoaded', bump);
    };
  }, [props.tab]);

  const tagCounts = useMemo(() => {
    void validationTick;
    const counts = new Map<string, number>();
    const area = props.tab?.module?.area;
    if(!area){ return counts; }
    const objects: ForgeGameObject[] = [
      ...area.cameras, ...area.creatures, ...area.doors, ...area.encounters,
      ...area.items, ...area.placeables, ...area.sounds, ...area.stores,
      ...area.triggers, ...area.waypoints,
    ];
    for(let i = 0; i < objects.length; i++){
      const tag = String((objects[i] as any).tag || '').trim().toLowerCase();
      if(tag){
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return counts;
  }, [props.tab, validationTick]);

  return (
    <ForgeTreeView style={listStyle ?? { height: '350px', overflow: 'auto'}}>
    {
      nodes.filter((node) => nodeMatchesFilters(node, filter, typeFilter, manager)).map( (node: SceneGraphNode) => {
        return (
          <SceneGraphTreeViewNode
            manager={manager}
            key={node.id}
            node={node}
            filter={filter}
            typeFilter={typeFilter}
            tab={props.tab}
            tagCounts={tagCounts}
          />
        )
      })
    }
    </ForgeTreeView>
  );
}

function nodeMatchesFilters(
  node: SceneGraphNode,
  filter: string,
  typeFilter: GroupType | '',
  manager?: SceneGraphTreeViewManager
): boolean {
  if(typeFilter && manager){
    for(const [key, groupNode] of manager.groupNodes){
      if(groupNode === node && key !== typeFilter){
        return false;
      }
    }
  }
  if(!filter || node.name.toLowerCase().includes(filter)){
    return true;
  }
  return node.nodes.some((child) => nodeMatchesFilters(child, filter, typeFilter, manager));
}

function validationBadgeFor(
  node: SceneGraphNode,
  tagCounts: Map<string, number>
): { text: string; kind: 'warn' | 'error' } | null {
  const obj = node.data instanceof ForgeGameObject ? node.data : undefined;
  if(!obj){ return null; }
  if(obj.templateResType !== KotOR.ResourceTypes.NA && !String(obj.templateResRef || '').trim()){
    return { text: 'no tpl', kind: 'error' };
  }
  const tag = String((obj as any).tag || '').trim().toLowerCase();
  if(tag && (tagCounts.get(tag) || 0) > 1){
    return { text: 'dup tag', kind: 'warn' };
  }
  return null;
}

export const SceneGraphTreeViewNode = memo(function SceneGraphTreeViewNode(props: any) {
  const manager: SceneGraphTreeViewManager = props.manager;
  const node: SceneGraphNode = props.node;
  const depth: number = props.depth || 0;
  const filter: string = props.filter || '';
  const typeFilter: GroupType | '' = props.typeFilter || '';
  const tab: TabModuleEditorState | undefined = props.tab;
  const tagCounts: Map<string, number> = props.tagCounts || new Map();
  const [nodes, setNodes] = useState<SceneGraphNode[]>([...node.nodes]);
  const [openState, setOpenState] = useState<boolean>(node.open);
  const [isSelected, setIsSelected] = useState<boolean>(node.selected);
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

  const onSelectStateChange = useCallback(() => {
    setIsSelected(node.selected);
  }, [node]);

  useEffect( () => {
    // Initialize state from current node.nodes
    setNodes([...node.nodes]);
    setOpenState(node.open);
    setIsSelected(node.selected);
    
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onNameChange', onNameChange);
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', onExpandStateChange);
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', onNodesChange);
    node.addEventListener<SceneGraphNodeEventListenerTypes>('onSelectStateChange', onSelectStateChange);
    return () => {
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onNameChange', onNameChange);
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', onExpandStateChange);
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', onNodesChange);
      node.removeEventListener<SceneGraphNodeEventListenerTypes>('onSelectStateChange', onSelectStateChange);
    }
  }, [node, onNameChange, onExpandStateChange, onNodesChange, onSelectStateChange]);

  const handleClick = useCallback(() => {
    const forge = node.data instanceof ForgeGameObject ? node.data : undefined;
    if(forge && tab){
      tab.selectGameObject(forge, false);
      return;
    }
    if(typeof node.onClick === 'function'){
      node.onClick(node);
    }
  }, [node, tab]);

  const handleToggle = useCallback(() => {
    setOpenState(prev => !prev);
  }, []);

  const handleDoubleClick = useCallback(() => {
    const object = node.data?.container ?? node.data;
    if(object){
      manager.context.lookAtObject(object);
    }
  }, [manager, node]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Add context menu logic if needed
  }, []);

  const handleSelect = useCallback((nodeId: string) => {
    handleClick();
  }, [handleClick]);

  // Memoize child nodes to prevent unnecessary re-renders
  const childNodes = useMemo(() => {
    if (!openState || !nodes.length) return null;
    return nodes.filter((child) => nodeMatchesFilters(child, filter, typeFilter, manager)).map((child: SceneGraphNode) => (
      <SceneGraphTreeViewNode 
        key={child.id} 
        node={child} 
        manager={manager}
        depth={depth + 1}
        filter={filter}
        typeFilter={typeFilter}
        tab={tab}
        tagCounts={tagCounts}
      />
    ));
  }, [openState, nodes, manager, depth, filter, typeFilter, tab, tagCounts]);

  const hasChildren = nodes.length > 0;
  const badge = validationBadgeFor(node, tagCounts);

  // Prepare data attributes
  const dataAttributes = {
    'data-path': node.data?.path,
  };

  const labelContent = badge ? (
    <span className="scene-graph-node-label">
      <span>{node.name}</span>
      <span className={`scene-graph-node-badge scene-graph-node-badge--${badge.kind}`}>{badge.text}</span>
    </span>
  ) : undefined;

  return (
    <ListItemNode
      id={node.id.toString()}
      name={node.name}
      hasChildren={hasChildren}
      isExpanded={openState}
      isSelected={isSelected}
      depth={depth}
      icon={node.icon}
      iconType={hasChildren ? 'folder' : 'file'}
      labelContent={labelContent}
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
