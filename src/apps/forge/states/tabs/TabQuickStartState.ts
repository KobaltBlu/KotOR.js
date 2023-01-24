import TabQuickStart from "../../components/tabs/TabQuickStart";
import { TabState } from "./TabState";

export class TabQuickStartState extends TabState {

  constructor(){
    super();
    // this.singleInstance = true;
    this.tabName = `Start Page`;

    this.tabContentView = new TabQuickStart({tab: this});
  }

}
