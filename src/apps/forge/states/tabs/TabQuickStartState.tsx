import React from "react";
import {TabQuickStart} from "../../components/tabs/TabQuickStart";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

export class TabQuickStartState extends TabState {

  tabName: string = `Start Page`;

  constructor(options: BaseTabStateOptions = {}){
    super(options); 
    // this.singleInstance = true;

    this.tabContentView = <TabQuickStart tab={this}></TabQuickStart>
  }

}
