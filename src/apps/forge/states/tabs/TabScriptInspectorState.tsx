import React from "react";

import { TabScriptInspector } from "../../components/tabs/tab-script-inspector/TabScriptInspector";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import { TabState } from ".";

export class TabScriptInspectorState extends TabState {

  tabName: string = `NCS Viewer`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptInspector tab={this} parentTab={options.parentTab}></TabScriptInspector>);
  }

}