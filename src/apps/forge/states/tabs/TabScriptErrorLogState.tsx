import React from "react";

import { TabScriptErrorLog } from "@/apps/forge/components/tabs/tab-script-error-log/TabScriptErrorLog";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs";

export class TabScriptErrorLogState extends TabState {

  tabName: string = ` PROBLEMS `;
  code: string = ``;
  markers: any[] = [];

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabScriptErrorLog tab={this} parentTab={options.parentTab}></TabScriptErrorLog>);
  }

  setErrors(markers: any[] = []) {
    this.markers = markers;
    if(!this.markers.length){
		  this.setTabName(' PROBLEMS ');
    }else{
		  this.setTabName(` PROBLEMS (${this.markers.length}) `);
    }
    this.processEventListener('onSetErrors', [this.markers]);
  }

}