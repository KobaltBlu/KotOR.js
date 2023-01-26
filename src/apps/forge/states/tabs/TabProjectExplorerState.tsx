import React from "react";
import { TabProjectExplorer } from "../../components/tabs/TabProjectExplorer";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

export class TabProjectExplorerState extends TabState {

  tabName: string = `Project`;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = false;

    this.tabContentView = <TabProjectExplorer tab={this}></TabProjectExplorer>
  }

}
