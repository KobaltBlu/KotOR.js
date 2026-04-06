import React from "react";
import { TabProjectExplorer } from "@/apps/forge/components/tabs/tab-project-explorer/TabProjectExplorer";
import { TabState } from "@/apps/forge/states/tabs";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import * as path from "path";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { FileBrowserNode } from "@/apps/forge/FileBrowserNode";

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
        console.log('TabProjectExplorerState.LoadFiles', files);
        let subTypes: {[key: string]: FileBrowserNode} = {};
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
