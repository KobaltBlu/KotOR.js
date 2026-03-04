import React, { useState } from "react";

import { useContextMenu, ContextMenuItem } from "@/apps/forge/components/common/ContextMenu";
import { ForgeTreeView } from "@/apps/forge/components/treeview/ForgeTreeView";
import { EditorFile } from "@/apps/forge/EditorFile";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { Project } from "@/apps/forge/Project";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabProjectExplorerState } from "@/apps/forge/states/tabs";
import { TabReferenceFinderState } from "@/apps/forge/states/tabs/TabReferenceFinderState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);
import "@/apps/forge/components/tabs/tab-project-explorer/TabProjectExplorer.scss";

export interface ResourceListNodeProps {
  node: FileBrowserNode;
  depth?: number;
  children?: unknown;
  onContextMenu?: (event: React.MouseEvent, node: FileBrowserNode) => void;
}

export const ResourceListNode = function (props: ResourceListNodeProps) {
  const node = props.node;
  const [openState, setOpenState] = useState<boolean>(node.open);

  const onClickNode = (e: React.MouseEvent, node: FileBrowserNode) => {
    e.stopPropagation();
    if (node.type == 'resource') {
      log.debug('resource', node);

      FileTypeManager.onOpenResource(
        new EditorFile({
          path: node.data.path,
          useProjectFileSystem: true,
        })
      );
    }
  };

  const onChangeCheckbox = (_e: React.ChangeEvent, _node: FileBrowserNode) => {
    setOpenState(!openState);
  };

  const onLabelClick = (_e: React.MouseEvent, _node: FileBrowserNode) => {
    setOpenState(!openState);
  }

  if (node.nodes.length) {
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
              node.nodes.map((child: FileBrowserNode) => (
                <ResourceListNode key={child.id} node={child} onContextMenu={props.onContextMenu} />
              ))
            ) : (<></>)
          }
        </ul>
      </li>
    );
  } else {
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

export const TabProjectExplorer = function (props: BaseTabProps) {
  const [resourceList, setResourceList] = useState<FileBrowserNode[]>([]);

  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  useEffectOnce(() => {
    const tab = props.tab as TabProjectExplorerState;
    if (tab) {
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
          resourceList.map((node: FileBrowserNode) => {
            return (
              <ResourceListNode
                key={node.id}
                node={node}
                depth={0}
                onContextMenu={(e: React.MouseEvent, n: FileBrowserNode) => {
                  const items: ContextMenuItem[] = [];

                  if (n.type === 'resource') {
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

                  if (items.length) {
                    showContextMenu(e.clientX, e.clientY, items);
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

