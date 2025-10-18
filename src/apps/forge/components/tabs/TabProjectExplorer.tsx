import React, { useState } from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { TabProjectExplorerState } from "../../states/tabs";
import { FileTypeManager } from "../../FileTypeManager";
import { EditorFile } from "../../EditorFile";
import { FileLocationType } from "../../enum/FileLocationType";
import { FileBrowserNode } from "../../FileBrowserNode";
import { ForgeTreeView } from "../treeview/ForgeTreeView";

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

      FileTypeManager.onOpenResource(
        new EditorFile({
          path: node.data.path,
          useProjectFileSystem: true,
        })
      );
    }
  };

  const onChangeCheckbox = (e: React.ChangeEvent<HTMLInputElement>, node: FileBrowserNode) => {
    setOpenState(!openState);
  };

  const onLabelClick = (e: React.MouseEvent<HTMLLabelElement>, node: FileBrowserNode) => {
    setOpenState(!openState);
  }

  if(node.nodes.length){
    return (
      <li onClick={(e) => onClickNode(e, props.node)}>
        <input type="checkbox" checked={!openState} onChange={(e) => onChangeCheckbox(e, props.node)} />
        <label onClick={(e) => onLabelClick(e, props.node)}>{node.name}</label>
        <ul>
          {
            (openState) ? (
              node.nodes.map( (child: FileBrowserNode) => (
                <ResourceListNode key={child.id} node={child} />
              ))
            ) : (<></>)
          }
        </ul>
      </li>
    );
  }else{
    return (
      <li className="link" data-path={node.data.path} onDoubleClick={(e) => onClickNode(e, props.node)}>
        {node.name}
      </li>
    );
  }
}

export const TabProjectExplorer = function(props: BaseTabProps) {
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);

  useEffectOnce(() => {
    const tab = props.tab as TabProjectExplorerState;
    if(tab){
      tab.onReload = () => {
        setResourceList(TabProjectExplorerState.Resources);
      }
    }
  });

  return (
    <div className="scroll-container" style={{ width:'100%', overflow: 'auto' }}>
      <ForgeTreeView>
        {
          resourceList.map( (node: FileBrowserNode) => {
            return (
              <ResourceListNode key={node.id} node={node} depth={0} />
            )
          })
        }
      </ForgeTreeView>
    </div>
  );

}
