import React, {forwardRef, useImperativeHandle, useState} from "react";
import BaseTab from "./BaseTab";
import { FileBrowserNode, TabResourceExplorerState } from "../../states/tabs/TabResourceExplorerState";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { FileTypeManager } from "../../FileTypeManager";
import { EditorFile } from "../../EditorFile";

export interface ResourceListNodeProps {
  node: FileBrowserNode;
  depth?: number;
  children?: any;
}

export const ResourceListNode = function(props: ResourceListNodeProps){
  const node = props.node;
  const [openState, setOpenState] = useState<boolean>(node.open);

  const onClickNode = (e: React.MouseEvent<HTMLLIElement>, node: FileBrowserNode) => {
    e.stopPropagation();
    if(node.type == 'resource'){
      console.log('resource', node);
      // let resref = e.target.dataset.resref;
      // let reskey = parseInt(e.target.dataset.resid);
      // let type = e.target.dataset.type;
      // let archive = e.target.dataset.archive;

      FileTypeManager.onOpenResource(
        new EditorFile({
          path: node.data.path,
          useGameFileSystem: true,
        })
      );
    }
  };

  const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, node: FileBrowserNode) => {
    setOpenState(!openState);
  };

  const childDepth = (props?.depth ? props.depth : 0) + 1;

  if(node.nodes.length){
    return (
      <li onClick={(e) => onClickNode(e, props.node)}>
        <input type="checkbox" checked={!openState} id={`list-${node.id}`} onChange={(e) => onChangeCheckbox(e, props.node)} />
        <label htmlFor={`list-${node.id}`}>{node.name}</label>
        <ul>
          {
            node.nodes.map( (child: FileBrowserNode) => (
              <ResourceListNode key={child.id} node={child} depth={childDepth} />
            ))
          }
        </ul>
      </li>
    );
  }else{
    return (
      <li className="link" data-path={node.data.path} onClick={(e) => onClickNode(e, props.node)}>
        {node.name}
      </li>
    );
  }
}

export interface TabResourceExplorerProps extends BaseTabProps {
  tab: TabResourceExplorerState;
  nodes: FileBrowserNode[];
}

export const TabResourceExplorer = function(props: TabResourceExplorerProps){
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);

  useEffectOnce(() => {
    const tab = props.tab as TabResourceExplorerState;
    if(tab){
      tab.onReload = () => {
        setResourceList(TabResourceExplorerState.Resources);
      }
    }
  });
  
  return (
    <div className="scroll-container" style={{ width:'100%', overflow: 'auto' }}>
      <ul className="tree css-treeview js">
        {
          resourceList.map( (node: FileBrowserNode) => {
            return (
              <ResourceListNode key={node.id} node={node} depth={0} />
            )
          })
        }
      </ul>
    </div>
  );

};
