import React from 'react';

import { TabHelp } from '@/apps/forge/components/tabs/tab-help/TabHelp';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabHelpState extends TabState {
  tabName: string = 'Help';
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabHelpState constructor entry');
    super(options);
    this.setContentView(<TabHelp tab={this} />);
    log.trace('TabHelpState constructor exit');
  }
}
