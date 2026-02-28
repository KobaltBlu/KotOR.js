import React from "react";

import { TabState } from "./TabState";

import { TabScriptInspector } from "@/apps/forge/components/tabs/tab-script-inspector/TabScriptInspector";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabScriptInspectorState extends TabState {

  tabName: string = `NCS Viewer`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptInspector tab={this} parentTab={options.parentTab}></TabScriptInspector>);
  }

}