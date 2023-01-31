import { EventListenerModel } from "../EventListenerModel";
import { TabState } from "../states/tabs/TabState";

export type TabManagerEventListenerTypes =
  'onTabAdded'|'onTabRemoved'|'onTabShow'|'onTabHide';

export interface TabManagerEventListeners {
  onTabAdded: Function[],
  onTabRemoved: Function[],
  onTabShow: Function[],
  onTabHide: Function[],
}

export class EditorTabManager extends EventListenerModel {
  currentTab?: TabState;
  tabs: TabState[] = [];

  eventListeners: TabManagerEventListeners = {
    onTabAdded: [],
    onTabRemoved: [],
    onTabShow: [],
    onTabHide: []
  };

  static __tabId: number = 0;
  react: any;

  static GetNewTabID(): number {
    return EditorTabManager.__tabId++;
  }

  constructor(){
    super();
    this.currentTab = undefined;
    this.tabs = [];
  }

  addTab(tab: TabState){
    //Check to see if the tab has the singleInstance flag set to TRUE
    if(tab.singleInstance){
      if(this.tabTypeExists(tab)){
        this.getTabByType(tab.constructor.name)?.show();
        return; //Return because the TabManager can only have one of these
      }
    }

    let alreadyAdded = this.tabs.find( (_tab: TabState) => _tab.id == tab.id) ? true : false;
    if(alreadyAdded){
      console.warn('Tab already added to the TabManager', tab);
      return;
    }

    //Check to see if a tab is already editing this resource
    let alreadyOpen = this.isResourceIdOpenInTab(tab.getResourceID());
    if(alreadyOpen != null){
      //Show the tab that is already open
      alreadyOpen.show();
      //return so that the rest of the function is not called
      return;
    }

    this.currentTab = tab;
    tab.attach(this);
    tab.show();
    this.tabs.push(tab);

    this.processEventListener('onTabAdded');

    return tab;
  }

  removeTab(tab: TabState){
    const length = this.tabs.length;
    const tabIndex = this.tabs.indexOf(tab);

    for(let i = 0; i < length; i++){
      if(tab == this.tabs[i]){
        console.log('removeTab', 'Tab found. Deleting');
        this.tabs.splice(i, 1);
        break;
      }
    }
    try{
      if(this.currentTab == tab){
        let tabIndexToSelect = tabIndex-1;
        if(tabIndexToSelect < 0) tabIndexToSelect = 0;
        if(this.tabs.length){
          console.log('removeTab', 'Current tab removed. Trying to show sibling child');
          const t = this.tabs[tabIndexToSelect];
          if(t){
            console.log(t);
            t.show();
          }
        }
      }
    }catch(e){ console.log(e); }

    this.processEventListener('onTabRemoved');

  }

  //Checks the supplied resource ID against all open tabs and returns tab if it is found
  isResourceIdOpenInTab(resID: number){

    if(resID){
      for(let i = 0; i < this.tabs.length; i++){
        if(this.tabs[i].getResourceID() == resID){
          return this.tabs[i];
        }
      }
    }

    return null;

  }

  getTabByType(tabClass: any){
    for(let i = 0; i < this.tabs.length; i++){
      if(this.tabs[i].constructor.name === tabClass)
        return this.tabs[i];
    }
    return;
  }

  tabTypeExists(tab: TabState){
    let tabClass = tab.constructor.name;
    for(let i = 0; i < this.tabs.length; i++){
      if(this.tabs[i].constructor.name === tabClass)
        return true;
    }
    return false;
  }

  hideAll(){
    for(let i = 0; i < this.tabs.length; i++){
      this.tabs[i].hide();
    }
  }

}
