import React from "react";
import {TabQuickStart} from "../../components/tabs/TabQuickStart";
import { TabState } from "./";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

export class TabQuickStartState extends TabState {

  tabName: string = `Start Page`;
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}){
    super(options); 
    // this.singleInstance = true;

    this.setContentView(<TabQuickStart tab={this}></TabQuickStart>);
  }

}
