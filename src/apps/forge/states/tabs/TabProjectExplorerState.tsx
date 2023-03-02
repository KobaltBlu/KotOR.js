import React from "react";
import { TabProjectExplorer } from "../../components/tabs/TabProjectExplorer";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";
import { FileBrowserNode } from "./TabResourceExplorerState";
import { ProjectFileSystem } from "../../ProjectFileSystem";
import * as path from "path";
import { EditorFileProtocol } from "../../enum/EditorFileProtocol";

export class TabProjectExplorerState extends TabState {

  tabName: string = `Project`;
  onReload?: Function;
  static Resources: FileBrowserNode[] = [];
  resourceNodes: FileBrowserNode[] = [];

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = false;

    this.tabContentView = <TabProjectExplorer tab={this}></TabProjectExplorer>
  }

  reload(){
    if(typeof this.onReload === 'function'){
      this.onReload();
    }
  }

  static async GenerateResourceList( state: TabProjectExplorerState ){

    KotOR.LoadingScreen.main.Show('Loading [Files]...');
    await TabProjectExplorerState.LoadFiles();

    state.reload();
    KotOR.LoadingScreen.main.Hide();
    return TabProjectExplorerState.Resources;
  }

  static LoadFiles() {
    return new Promise<void>( (resolve, reject) => {
      const nodeList = TabProjectExplorerState.Resources;
      ProjectFileSystem.readdir('').then( (files: string[]) => {
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
