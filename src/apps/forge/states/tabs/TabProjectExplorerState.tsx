import * as path from "path";

import React from "react";

import { TabProjectExplorer } from "@/apps/forge/components/tabs/tab-project-explorer/TabProjectExplorer";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabState } from "@/apps/forge/states/tabs";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabProjectExplorerState extends TabState {

  tabName: string = `Project`;
  onReload?: () => void;
  static Resources: FileBrowserNode[] = [];
  resourceNodes: FileBrowserNode[] = [];

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    log.trace('TabProjectExplorerState constructor');
    this.isClosable = false;

    this.setContentView(<TabProjectExplorer tab={this}></TabProjectExplorer>);
    log.trace('TabProjectExplorerState constructor done');
  }

  reload(){
    log.trace('TabProjectExplorerState.reload');
    if(typeof this.onReload === 'function'){
      this.onReload();
    }
  }

  static async GenerateResourceList( state: TabProjectExplorerState ){
    log.trace('TabProjectExplorerState.GenerateResourceList');

    ForgeState.loaderShow();
    await TabProjectExplorerState.LoadFiles();

    state.reload();
    ForgeState.loaderHide();
    log.debug('TabProjectExplorerState.GenerateResourceList done', TabProjectExplorerState.Resources.length);
    return TabProjectExplorerState.Resources;
  }

  static LoadFiles() {
    log.trace('TabProjectExplorerState.LoadFiles');
    return new Promise<void>( (resolve, _reject) => {
      const nodeList = TabProjectExplorerState.Resources;
      ProjectFileSystem.readdir('').then( (files: string[]) => {
        log.trace('TabProjectExplorerState.LoadFiles readdir count', files?.length);
        log.debug('TabProjectExplorerState.LoadFiles', files);
        const subTypes: {[key: string]: FileBrowserNode} = {};
        for(let i = 0; i < files.length; i++){
          const file = files[i];
          const parsed = path.parse(file);
          const ext = parsed.ext.split('.').pop() || '';

          if (subTypes[ext] == undefined) {
            subTypes[ext] = new FileBrowserNode({
              name: ext,
              type: 'group',
              canOrphan: true,
            });
            nodeList.push(subTypes[ext]);
          }

          subTypes[ext].addChildNode(
            new FileBrowserNode({
              name: (`${file}`),
              type: 'resource',
              data: {
                path: `${EditorFileProtocol.FILE}//project.dir/${file}`
              },
            })
          );
        }
        resolve();
      });
    });
  }
}
