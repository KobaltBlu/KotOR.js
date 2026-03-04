import React from 'react';

import { TabLIPEditorOptions } from '@/apps/forge/components/tabs/tab-lip-editor/TabLIPEditorOptions';
import type BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import { SceneGraphNode } from '@/apps/forge/SceneGraphNode';
import type { TabLIPEditorState } from '@/apps/forge/states/tabs';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabLIPEditorOptionsState extends TabState {

  tabName: string = 'LIP';

  sceneGraphNodes: SceneGraphNode[] = [];
  sceneGraphNode!: SceneGraphNode;
  keyframesGraphNode!: SceneGraphNode;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabLIPEditorOptionsState constructor entry');
    super(options);
    this.singleInstance = true;
    this.isClosable = false;

    this.sceneGraphNode = new SceneGraphNode({ name: 'Scene' });
    this.keyframesGraphNode = new SceneGraphNode({ name: 'Key Frames' });
    this.sceneGraphNodes = [
      this.sceneGraphNode,
      this.keyframesGraphNode,
    ];

    const parentTab = options.parentTab;
    if (!parentTab) throw new Error('TabLIPEditorOptionsState requires options.parentTab');
    this.setContentView(<TabLIPEditorOptions tab={this} parentTab={parentTab as TabLIPEditorState} />);
    log.trace('TabLIPEditorOptionsState constructor exit');
  }
}
