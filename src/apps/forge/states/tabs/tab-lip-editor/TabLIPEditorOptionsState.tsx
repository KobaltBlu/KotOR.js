import React from "react";

import { TabLIPEditorOptions } from "@/apps/forge/components/tabs/tab-lip-editor/TabLIPEditorOptions";
import { SceneGraphNode } from "@/apps/forge/SceneGraphNode";
import { TabState } from "@/apps/forge/states/tabs/TabState";

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

    this.setContentView(<TabLIPEditorOptions tab={this} parentTab={options.parentTab}></TabLIPEditorOptions>);
  }

}