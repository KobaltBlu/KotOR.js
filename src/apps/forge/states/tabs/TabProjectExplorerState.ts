import TabProjectExplorer from "../../components/tabs/TabProjectExplorer";
import { TabState } from "./TabState";

export class TabProjectExplorerState extends TabState {

  constructor(){
    super();
    // this.singleInstance = true;
    this.tabName = `Project`;
    this.isClosable = false;

    this.tabContentView = new TabProjectExplorer({tab: this});
  }

}
