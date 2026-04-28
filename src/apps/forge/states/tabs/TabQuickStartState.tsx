import React from 'react';
import { TabQuickStart } from '@/apps/forge/components/tabs/tab-quick-start/TabQuickStart';
import { TabState } from '@/apps/forge/states/tabs';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';

export class TabQuickStartState extends TabState {
  tabName: string = `Start Page`;
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    // this.singleInstance = true;

    this.setContentView(<TabQuickStart tab={this}></TabQuickStart>);
  }
}
