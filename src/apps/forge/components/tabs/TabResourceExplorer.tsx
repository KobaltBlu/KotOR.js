import React, {forwardRef, useImperativeHandle, useState} from "react";
import BaseTab from "./BaseTab";
import { FileBrowserNode, TabResourceExplorerState } from "../../states/tabs/TabResourceExplorerState";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { FileTypeManager } from "../../FileTypeManager";
import { EditorFile } from "../../EditorFile";

export interface ResourceListNodeProps {
  node: FileBrowserNode;
  children?: any;
}

export const ResourceListNode = function(props: ResourceListNodeProps){
  const [openState, setOpenState] = useState<boolean>(props.node.open);

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

  if(props.node.nodes.length){
    return (
      <li onClick={(e) => onClickNode(e, props.node)}>
        <input type="checkbox" checked={!openState} id={`list-${props.node.id}`} onChange={(e) => onChangeCheckbox(e, props.node)} />
        <label htmlFor={`list-${props.node.id}`}>{props.node.name}</label>
        <span></span>
        <ul>
          {
            props.node.nodes.map( (child: FileBrowserNode) => (
              <ResourceListNode key={child.id} node={child} />
            ))
          }
        </ul>
      </li>
    );
  }else{
    return (
      <li className="link" data-path={props.node.data.path} onClick={(e) => onClickNode(e, props.node)}>
        {props.node.name}
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
              <ResourceListNode key={node.id} node={node} />
            )
          })
        }
      </ul>
    </div>
  );

};
