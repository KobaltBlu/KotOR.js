import React from "react";

import { TabScriptCompileLog } from "@/apps/forge/components/tabs/tab-script-compile-log/TabScriptCompileLog";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs";

export class TabScriptCompileLogState extends TabState {

  tabName: string = `Compile Log`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptCompileLog tab={this} parentTab={options.parentTab}></TabScriptCompileLog>);
  }

}