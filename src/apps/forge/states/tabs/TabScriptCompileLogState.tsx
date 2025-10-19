import React from "react";
import { TabState } from ".";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabScriptCompileLog } from "../../components/tabs/tab-script-compile-log/TabScriptCompileLog";

export class TabScriptCompileLogState extends TabState {

  tabName: string = `Compile Log`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptCompileLog tab={this} parentTab={options.parentTab}></TabScriptCompileLog>);
  }

}