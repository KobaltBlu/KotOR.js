import { EditorFile } from "../EditorFile";
import { EventListenerModel } from "../EventListenerModel";
import { TabStoreState } from "../interfaces/TabStoreState";
import {
  TabGFFEditorState, TabGUIEditorState, TabImageViewerState, TabModelViewerState,
  TabModuleEditorState, TabQuickStartState, TabHelpState, TabTwoDAEditorState,
  TabUTCEditorState, TabUTDEditorState, TabUTPEditorState, TabUTEEditorState, TabUTSEditorState, TabUTMEditorState, TabUTTEditorState, TabUTWEditorState, TabUTIEditorState,
  TabBinaryViewerState, TabAREEditorState, TabIFOEditorState, TabJRLEditorState, TabSSFEditorState, TabTLKEditorState, TabFACEditorState, TabLTREditorState,
  TabDLGEditorState, TabGITEditorState, TabSAVEditorState, TabVISEditorState, TabState,
  TabERFEditorState, TabTextEditorState, TabLIPEditorState, TabPTHEditorState, TabWOKEditorState, TabDiffToolState,
} from "../states/tabs";

import { TabReferenceFinderState } from "../states/tabs/TabReferenceFinderState";
import { TabScriptFindReferencesState } from "../states/tabs/TabScriptFindReferencesState";
import { GetNewTabID } from "./TabIdGenerator";

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

  static GetNewTabID(): number {
    return GetNewTabID();
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
        tab.destroy();
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

  restoreTabState(tabState: TabStoreState) {
    if(tabState.file){
      tabState.file = Object.assign(new EditorFile(), tabState.file);
      console.log('file', tabState.file);
    }
    switch(tabState.type){
      case 'TabQuickStartState':
        this.addTab(
          new TabQuickStartState({editorFile: tabState.file})
        );
      break;
      case 'TabHelpState':
        this.addTab(new TabHelpState());
      break;
      case 'TabImageViewerState':
        this.addTab(
          new TabImageViewerState({editorFile: tabState.file})
        );
      break;
      case 'TabModelViewerState':
        this.addTab(
          new TabModelViewerState({editorFile: tabState.file})
        );
      break;
      case 'TabGFFEditorState':
        this.addTab(
          new TabGFFEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabModuleEditorState':
        this.addTab(
          new TabModuleEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabTwoDAEditorState':
        this.addTab(
          new TabTwoDAEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabUTCEditorState':
        this.addTab(
          new TabUTCEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabUTDEditorState':
        this.addTab(
          new TabUTDEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabUTPEditorState':
        this.addTab(
          new TabUTPEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabBinaryViewerState':
        this.addTab(
          new TabBinaryViewerState({editorFile: tabState.file})
        );
      break;
      case 'TabAREEditorState':
        this.addTab(
          new TabAREEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabIFOEditorState':
        this.addTab(
          new TabIFOEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabJRLEditorState':
        this.addTab(
          new TabJRLEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabSSFEditorState':
        this.addTab(
          new TabSSFEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabTLKEditorState':
        this.addTab(
          new TabTLKEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabFACEditorState':
        this.addTab(
          new TabFACEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabLTREditorState':
        this.addTab(
          new TabLTREditorState({editorFile: tabState.file})
        );
      break;
      case 'TabDLGEditorState':
        this.addTab(
          new TabDLGEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabGITEditorState':
        this.addTab(
          new TabGITEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabSAVEditorState':
        this.addTab(
          new TabSAVEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabVISEditorState':
        this.addTab(
          new TabVISEditorState({editorFile: tabState.file})
        );
      break;

      case 'TabReferenceFinderState':
        this.addTab(
          new TabReferenceFinderState()
        );
      break;
      case 'TabScriptFindReferencesState':
        this.addTab(new TabScriptFindReferencesState());
      break;
      case 'TabERFEditorState':
        this.addTab(
          new TabERFEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabTextEditorState':
        this.addTab(
          new TabTextEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabLIPEditorState':
        this.addTab(
          new TabLIPEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabPTHEditorState':
        this.addTab(
          new TabPTHEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabUTEEditorState':
        this.addTab(
          new TabUTEEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabUTSEditorState':
        this.addTab(
          new TabUTSEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabUTMEditorState':
        this.addTab(
          new TabUTMEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabUTTEditorState':
        this.addTab(
          new TabUTTEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabUTWEditorState':
        this.addTab(
          new TabUTWEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabUTIEditorState':
        this.addTab(
          new TabUTIEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabGUIEditorState':
        this.addTab(
          new TabGUIEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabWOKEditorState':
        this.addTab(
          new TabWOKEditorState({ editorFile: tabState.file })
        );
      break;
      case 'TabDiffToolState':
        this.addTab(new TabDiffToolState());
      break;
    }
  }

}
