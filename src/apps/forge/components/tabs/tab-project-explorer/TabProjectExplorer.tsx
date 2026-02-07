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
import { useContextMenu, ContextMenuItem } from "../../common/ContextMenu";
import { TabReferenceFinderState } from "../../../states/tabs/TabReferenceFinderState";
import "./TabProjectExplorer.scss";

export interface ResourceListNodeProps {
  node: FileBrowserNode;
  depth?: number;
  children?: any;
  onContextMenu?: (event: React.MouseEvent, node: FileBrowserNode) => void;
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
      <li
        onClick={(e) => onClickNode(e, props.node)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.onContextMenu?.(e, props.node);
        }}
      >
        <input title="Open State" type="checkbox" checked={!openState} onChange={(e) => onChangeCheckbox(e, props.node)} />
        <label onClick={(e) => onLabelClick(e, props.node)}>{node.name}</label>
        <ul>
          {
            (openState) ? (
              node.nodes.map( (child: FileBrowserNode) => (
                <ResourceListNode key={child.id} node={child} onContextMenu={props.onContextMenu} />
              ))
            ) : (<></>)
          }
        </ul>
      </li>
    );
  }else{
    return (
      <li
        className="link"
        data-path={node.data.path}
        onDoubleClick={(e) => onClickNode(e, props.node)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.onContextMenu?.(e, props.node);
        }}
      >
        {node.name}
      </li>
    );
  }
}

export const TabProjectExplorer = function(props: BaseTabProps) {
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);

  const { showContextMenu, ContextMenuComponent } = useContextMenu();

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
      <div className="scroll-container tab-project-explorer__empty">
        <div className="tab-project-explorer__empty-message">
          No project is currently open.
        </div>
        <button
          type="button"
          className="tab-project-explorer__open-project-btn"
          onClick={handleOpenProject}
        >
          Open Project
        </button>
      </div>
    );
  }

  return (
    <div className="scroll-container tab-project-explorer__scroll">
      <ForgeTreeView>
        {
          resourceList.map( (node: FileBrowserNode) => {
            return (
              <ResourceListNode
                key={node.id}
                node={node}
                depth={0}
                onContextMenu={(e, n) => {
                  const items: ContextMenuItem[] = [];

                  if(n.type === 'resource'){
                    const resref = (n.name || '').split('.')[0] ?? '';
                    items.push({
                      id: 'open-file',
                      label: 'Open File',
                      onClick: () => {
                        FileTypeManager.onOpenResource(
                          new EditorFile({
                            path: n.data.path,
                            useProjectFileSystem: true,
                          })
                        );
                      }
                    });
                    items.push({
                      id: 'copy-resref',
                      label: 'Copy ResRef',
                      disabled: !resref.length,
                      onClick: async () => {
                        if (resref && navigator.clipboard?.writeText) {
                          await navigator.clipboard.writeText(resref);
                        }
                      }
                    });
                    items.push({ id: 'sep-1', separator: true });
                    items.push({
                      id: 'find-references',
                      label: 'Find References…',
                      disabled: !resref.length,
                      onClick: () => {
                        ForgeState.tabManager.addTab(
                          new TabReferenceFinderState({ query: resref, scope: 'project' })
                        );
                      }
                    });
                  }

                  if(items.length){
                    showContextMenu((e as any).clientX, (e as any).clientY, items);
                  }
                }}
              />
            )
          })
        }
      </ForgeTreeView>

      {ContextMenuComponent}
    </div>
  );

}

