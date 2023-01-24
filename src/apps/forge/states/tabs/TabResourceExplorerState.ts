import { TabState } from "./TabState";
import TabResourceExplorer from "../../components/tabs/TabResourceExplorer";

export class TabResourceExplorerState extends TabState {

  constructor(){
    super();
    this.tabName = `Game`;
    this.isClosable = false;

    this.tabContentView = new TabResourceExplorer({tab: this});
  }

}
