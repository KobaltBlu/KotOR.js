import React from "react";

import { TabScriptErrorLog } from "../../components/tabs/tab-script-error-log/TabScriptErrorLog";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import { TabState } from ".";

/** Monaco editor marker data (from monaco-editor). */
export type ScriptErrorMarker = import('monaco-editor').editor.IMarkerData;

export class TabScriptErrorLogState extends TabState {

  tabName: string = ` PROBLEMS `;
  code: string = ``;
  markers: ScriptErrorMarker[] = [];

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptErrorLog tab={this} parentTab={options.parentTab}></TabScriptErrorLog>);
  }

  setErrors(markers: ScriptErrorMarker[] = []) {
    this.markers = markers;
    if(!this.markers.length){
		  this.setTabName(' PROBLEMS ');
    }else{
		  this.setTabName(` PROBLEMS (${this.markers.length}) `);
    }
    this.processEventListener('onSetErrors', [this.markers]);
  }

}