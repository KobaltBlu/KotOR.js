import React from 'react';
import { TabState } from '@/apps/forge/states/tabs';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import { TabScriptCompileLog } from '@/apps/forge/components/tabs/tab-script-compile-log/TabScriptCompileLog';

export class TabScriptCompileLogState extends TabState {
  tabName: string = `Compile Log`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    this.setContentView(<TabScriptCompileLog tab={this} parentTab={options.parentTab}></TabScriptCompileLog>);
  }
}
