import React from "react";
import { TabLIPEditorOptions } from "../../../components/tabs/tab-lip-editor/TabLIPEditorOptions";
import { TabState } from "../TabState";
import { SceneGraphNode } from "../../../SceneGraphNode";

export class TabLIPEditorOptionsState extends TabState {

  tabName: string = 'LIP';

  sceneGraphNodes: SceneGraphNode[] = [];
  sceneGraphNode: SceneGraphNode = new SceneGraphNode({name: 'Scene'});
  keyframesGraphNode: SceneGraphNode = new SceneGraphNode({name: 'Key Frames'});

  constructor(options: any = {}){
    super(options);
    this.singleInstance = true;
    this.isClosable = false;

    this.sceneGraphNodes = [
      this.sceneGraphNode, this.keyframesGraphNode
    ];

    this.tabContentView = <TabLIPEditorOptions tab={this} parentTab={options.parentTab}></TabLIPEditorOptions>
  }

}