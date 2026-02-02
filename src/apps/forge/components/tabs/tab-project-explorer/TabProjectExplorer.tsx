import React, { useState } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabProjectExplorerState } from "../../../states/tabs";
import { FileTypeManager } from "../../../FileTypeManager";
import { EditorFile } from "../../../EditorFile";
import { FileLocationType } from "../../../enum/FileLocationType";
import { FileBrowserNode } from "../../../FileBrowserNode";
import { ForgeTreeView } from "../../treeview/ForgeTreeView";
import { ForgeState } from "../../../states/ForgeState";
import { Project } from "../../../Project";

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

  const handleOpenProject = () => {
    Project.OpenByDirectory();
  };

  // Show "Open Project" button when no project is open
  const hasProject = !!ForgeState.project;
  if (!hasProject || resourceList.length === 0) {
    return (
      <div className="scroll-container" style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ 
          color: '#ccc',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          No project is currently open.
        </div>
        <button
          onClick={handleOpenProject}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007acc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#005a9e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007acc';
          }}
        >
          Open Project
        </button>
      </div>
    );
  }

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

