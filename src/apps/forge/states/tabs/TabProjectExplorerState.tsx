import React from "react";
import { TabProjectExplorer } from "@/apps/forge/components/tabs/tab-project-explorer/TabProjectExplorer";
import { TabState } from "@/apps/forge/states/tabs";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import { buildProjectExplorerTree } from "@/apps/forge/helpers/ProjectExplorerTree";

export class TabProjectExplorerState extends TabState {
  tabName: string = `Project`;
  onReload?: Function;
  static Resources: FileBrowserNode[] = [];
  resourceNodes: FileBrowserNode[] = [];

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    // this.singleInstance = true;
    this.isClosable = false;

    this.setContentView(<TabProjectExplorer tab={this}></TabProjectExplorer>);
  }

  reload() {
    if (typeof this.onReload === 'function') {
      this.onReload();
    }
  }

  static async GenerateResourceList(state: TabProjectExplorerState) {
    ForgeState.loaderShow();
    await TabProjectExplorerState.LoadFiles();

    state.reload();
    ForgeState.loaderHide();
    return TabProjectExplorerState.Resources;
  }

  static LoadFiles(): Promise<void> {
    const nodeList = TabProjectExplorerState.Resources;
    nodeList.splice(0, nodeList.length);
    return ProjectFileSystem.readdir("", { recursive: true })
      .then((files: string[]) => {
        console.log("TabProjectExplorerState.LoadFiles", files);
        try {
          const root = buildProjectExplorerTree(files);
          nodeList.push(root);
        } catch (e) {
          console.error("TabProjectExplorerState.LoadFiles", e);
        }
      })
      .catch((e: unknown) => {
        console.error("TabProjectExplorerState.LoadFiles", e);
        try {
          nodeList.push(buildProjectExplorerTree([]));
        } catch {
          /* noop */
        }
      });
  }
}
