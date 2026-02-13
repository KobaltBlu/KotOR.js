import * as path from "path";

import React from "react";

import { TabProjectExplorer } from "../../components/tabs/tab-project-explorer/TabProjectExplorer";
import { EditorFileProtocol } from "../../enum/EditorFileProtocol";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import { createScopedLogger, LogScope } from "../../../../utility/Logger";
import { FileBrowserNode } from "../../FileBrowserNode";
import { ProjectFileSystem } from "../../ProjectFileSystem";
import { ForgeState } from "../ForgeState";

import { TabState } from "./";

const log = createScopedLogger(LogScope.Forge);

export class TabProjectExplorerState extends TabState {

  tabName: string = `Project`;
  onReload?: Function;
  static Resources: FileBrowserNode[] = [];
  resourceNodes: FileBrowserNode[] = [];

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = false;

    this.setContentView(<TabProjectExplorer tab={this}></TabProjectExplorer>);
  }

  reload(){
    if(typeof this.onReload === 'function'){
      this.onReload();
    }
  }

  static async GenerateResourceList( state: TabProjectExplorerState ){

    ForgeState.loaderShow();
    await TabProjectExplorerState.LoadFiles();

    state.reload();
    ForgeState.loaderHide();
    return TabProjectExplorerState.Resources;
  }

  static LoadFiles() {
    return new Promise<void>( (resolve, reject) => {
      const nodeList = TabProjectExplorerState.Resources;
      ProjectFileSystem.readdir('').then( (files: string[]) => {
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
