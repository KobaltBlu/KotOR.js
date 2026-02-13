import React from "react";

import { TabScriptCompileLog } from "../../components/tabs/tab-script-compile-log/TabScriptCompileLog";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import { TabState } from ".";

export class TabScriptCompileLogState extends TabState {

  tabName: string = `Compile Log`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptCompileLog tab={this} parentTab={options.parentTab}></TabScriptCompileLog>);
  }

}