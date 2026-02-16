import React from "react";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabHelp } from "../../components/tabs/tab-help/TabHelp";

export class TabHelpState extends TabState {
  tabName: string = "Help";
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabHelp tab={this} />);
  }
}
