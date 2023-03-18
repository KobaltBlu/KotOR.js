import React from "react";
import { TabState } from ".";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabScriptInspector } from "../../components/tabs/TabScriptInspector";

export class TabScriptInspectorState extends TabState {

  tabName: string = `NCS Viewer`;
  code: string = ``;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptInspector tab={this} parentTab={options.parentTab}></TabScriptInspector>);
  }

}