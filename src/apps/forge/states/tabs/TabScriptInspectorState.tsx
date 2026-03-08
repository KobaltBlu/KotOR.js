import React from "react";

import { TabScriptInspector } from "@/apps/forge/components/tabs/tab-script-inspector/TabScriptInspector";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs";

export class TabScriptInspectorState extends TabState {

  tabName: string = `NCS Viewer`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptInspector tab={this} parentTab={options.parentTab}></TabScriptInspector>);
  }

}