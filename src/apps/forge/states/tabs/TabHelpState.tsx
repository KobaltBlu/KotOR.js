import React from "react";

import { TabHelp } from "../../components/tabs/tab-help/TabHelp";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import { TabState } from "./TabState";

export class TabHelpState extends TabState {
  tabName: string = "Help";
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabHelp tab={this} />);
  }
}
