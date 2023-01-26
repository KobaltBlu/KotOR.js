import { TabState } from "../states/tabs/TabState";
// import { Signal } from "signals";

export type TabManagerEventListenerTypes =
  'onTabAdded'|'onTabRemoved'|'onTabShow'|'onTabHide';

export interface TabManagerEventListeners {
  onTabAdded: Function[],
  onTabRemoved: Function[],
  onTabShow: Function[],
  onTabHide: Function[],
}

export class EditorTabManager {
  currentTab?: TabState;
  tabs: TabState[] = [];
  $tabs: any;
  $tabsScrollControl: JQuery<HTMLElement>;
  $tabsScrollControlLeft: JQuery<HTMLElement>;
  $tabsScrollControlRight: JQuery<HTMLElement>;
  $tabsContainer: JQuery<HTMLElement>;
  scrollTimer: any;
  scrollSpeed: number;
  timer: any;

  eventListeners: TabManagerEventListeners = {
    onTabAdded: [],
    onTabRemoved: [],
    onTabShow: [],
    onTabHide: []
  };

  addEventListener(type: TabManagerEventListenerTypes, cb: Function){
    if(Array.isArray(this.eventListeners[type])){
      let ev = this.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        console.warn('Event Listener: Already added', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  removeEventListener(type: TabManagerEventListenerTypes, cb: Function){
    if(Array.isArray(this.eventListeners[type])){
      let ev = this.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  processEventListener(type: TabManagerEventListenerTypes){
    if(Array.isArray(this.eventListeners[type])){
      let ev = this.eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback();
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static __tabId: number = 0;
  react: any;
  // tabManagerView: any;

  static GetNewTabID(): number {
    console.log(EditorTabManager.__tabId);
    let id = EditorTabManager.__tabId++;
    return id;
  }

  constructor(){
    this.currentTab = undefined;
    this.tabs = [];
    // this.$tabs = $('<ul class="tabs-menu" />').sortable();

    // this.$tabsScrollControl = $('<div class="tabs-scroll-control" />');
    // this.$tabsScrollControlLeft = $('<div class="tabs-scroll-control-btn left" />');
    // this.$tabsScrollControlRight = $('<div class="tabs-scroll-control-btn right" />');

    // this.scrollTimer = null;
    // this.scrollSpeed = 25;

    // this.$tabsScrollControl.append(this.$tabsScrollControlLeft).append(this.$tabsScrollControlRight);

    // this.$tabsContainer = $('<div class="tabs tab-content" style="display: block; position:relative; top: 30px; height: calc(100% - 30px);"/>');

    // this.$tabs.bind('mousewheel', (e: any) => {
    //   let amount = e.originalEvent.wheelDelta /120;
    //   if(amount > 0) { //LEFT
    //     this.ScrollTabsMenuLeft();
    //   }
    //   else{ //RIGHT
    //     this.ScrollTabsMenuRight();
    //   }
    // });

  }

  attachComponent(view: any){
    console.log('attach', view);
    // this.tabManagerView = view;
  }

  AddTab(tab: TabState){
    //Check to see if the tab has the singleInstance flag set to TRUE
    if(tab.singleInstance){
      if(this.TabTypeExists(tab)){
        this.GetTabByType(tab.constructor.name)?.Show();
        return; //Return because the TabManager can only have one of these
      }
    }

    let alreadyAdded = this.tabs.find( (_tab: TabState) => _tab.id == tab.id) ? true : false;
    if(alreadyAdded){
      console.warn('Tab already added to the TabManager', tab);
      return;
    }

    //Check to see if a tab is already editing this resource
    let alreadyOpen = this.IsResourceIdOpenInTab(tab.GetResourceID());
    if(alreadyOpen != null){
      //Show the tab that is already open
      alreadyOpen.Show();
      //return so that the rest of the function is not called
      return;
    }

    tab.Attach(this);
    tab.Show();
    this.tabs.push(tab);

    this.processEventListener('onTabAdded');

    return tab;
  }

  //Checks the supplied resource ID against all open tabs and returns tab if it is found
  IsResourceIdOpenInTab(resID: number){

    if(resID){
      for(let i = 0; i < this.tabs.length; i++){
        if(this.tabs[i].GetResourceID() == resID){
          return this.tabs[i];
        }
      }
    }

    return null;

  }

  GetTabByType(tabClass: any){
    for(let i = 0; i < this.tabs.length; i++){
      if(this.tabs[i].constructor.name === tabClass)
        return this.tabs[i];
    }
    return;
  }

  TabTypeExists(tab: TabState){
    let tabClass = tab.constructor.name;
    for(let i = 0; i < this.tabs.length; i++){
      if(this.tabs[i].constructor.name === tabClass)
        return true;
    }
    return false;
  }

  HideAll(){
    for(let i = 0; i < this.tabs.length; i++){
      this.tabs[i].Hide();
    }
  }

  RemoveTab(tab: TabState){
    let length = this.tabs.length;
    for(let i = 0; i < length; i++){
      if(tab == this.tabs[i]){
        console.log('Tab found. Deleting');
        // this.tabs[i].$tab.remove();
        // this.tabs[i].$tabContent.remove();
        this.tabs.splice(i, 1);
        break;
      }
    }
    try{
      console.log('Trying to show');
      if(this.tabs.length){
        let t = this.tabs[this.tabs.length-1];
        console.log(t);
        t.Show();
      }
    }catch(e){ console.log(e); }

    this.processEventListener('onTabRemoved');

  }

  //Attaches the TabManager to the DOM
  AttachTo($dom: JQuery<HTMLElement>){
    return;
  }

  ScrollTabsMenuLeft(){
    return;
    this.$tabs[0].scrollLeft -= this.scrollSpeed;
  }

  ScrollTabsMenuRight(){
    return;
    this.$tabs[0].scrollLeft += this.scrollSpeed;
  }

  TriggerResize(){
    return;
    let len = this.tabs.length;
    for(let i = 0; i < len; i++){
      this.tabs[i].onResize();
    }
  }

}
