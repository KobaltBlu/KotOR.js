import React from 'react';


import { TabLIPEditorOptions } from '@/apps/forge/components/tabs/tab-lip-editor/TabLIPEditorOptions';
import type BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import { SceneGraphNode } from '@/apps/forge/SceneGraphNode';
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

    /* SceneGraphNode can be reported as unresolved when @/ path is not resolved by ESLint parser */
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-call -- construction; type from @/apps/forge/SceneGraphNode */
    this.sceneGraphNode = new SceneGraphNode({ name: 'Scene' });
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-call -- construction; type from @/apps/forge/SceneGraphNode */
    this.keyframesGraphNode = new SceneGraphNode({ name: 'Key Frames' });
    this.sceneGraphNodes = [
      this.sceneGraphNode,
      this.keyframesGraphNode,
    ];

    this.setContentView(<TabLIPEditorOptions tab={this} parentTab={options.parentTab}></TabLIPEditorOptions>);
    log.trace('TabLIPEditorOptionsState constructor exit');
  }
}
