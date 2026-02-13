import React from 'react';

import type BaseTabStateOptions from '../../../interfaces/BaseTabStateOptions';
import { TabLIPEditorOptions } from '../../../components/tabs/tab-lip-editor/TabLIPEditorOptions';
import { SceneGraphNode } from '../../../SceneGraphNode';
import { TabState } from '../TabState';

export class TabLIPEditorOptionsState extends TabState {

  tabName: string = 'LIP';

  sceneGraphNodes: SceneGraphNode[] = [];
  sceneGraphNode: SceneGraphNode = new SceneGraphNode({ name: 'Scene' });
  keyframesGraphNode: SceneGraphNode = new SceneGraphNode({ name: 'Key Frames' });

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.singleInstance = true;
    this.isClosable = false;

    this.sceneGraphNodes = [
      this.sceneGraphNode, this.keyframesGraphNode
    ];

    this.setContentView(<TabLIPEditorOptions tab={this} parentTab={options.parentTab}></TabLIPEditorOptions>);
  }

}