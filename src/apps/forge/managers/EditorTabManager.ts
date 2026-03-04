import { EditorFile } from "@/apps/forge/EditorFile";
import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { TabStoreState } from "@/apps/forge/interfaces/TabStoreState";
import { GetNewTabID } from "@/apps/forge/managers/TabIdGenerator";
import {
  TabGFFEditorState, TabGUIEditorState, TabImageViewerState, TabModelViewerState,
  TabModuleEditorState, TabQuickStartState, TabHelpState, TabTwoDAEditorState,
  TabUTCEditorState, TabUTDEditorState, TabUTPEditorState, TabUTEEditorState, TabUTSEditorState, TabUTMEditorState, TabUTTEditorState, TabUTWEditorState, TabUTIEditorState,
  TabBinaryViewerState, TabAREEditorState, TabIFOEditorState, TabJRLEditorState, TabSSFEditorState, TabTLKEditorState, TabFACEditorState, TabLTREditorState,
  TabDLGEditorState, TabGITEditorState, TabSAVEditorState, TabVISEditorState, TabState,
  TabERFEditorState, TabTextEditorState, TabLIPEditorState, TabPTHEditorState, TabWOKEditorState, TabDiffToolState,
  TabIndoorBuilderState,
} from "@/apps/forge/states/tabs";
import { TabReferenceFinderState } from "@/apps/forge/states/tabs/TabReferenceFinderState";
import { TabScriptFindReferencesState } from "@/apps/forge/states/tabs/TabScriptFindReferencesState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export type TabManagerEventListenerTypes =
  'onTabAdded'|'onTabRemoved'|'onTabShow'|'onTabHide';

export type TabManagerEventCallback = () => void;

export interface TabManagerEventListeners {
  onTabAdded: TabManagerEventCallback[];
  onTabRemoved: TabManagerEventCallback[];
  onTabShow: TabManagerEventCallback[];
  onTabHide: TabManagerEventCallback[];
}

export class EditorTabManager extends EventListenerModel {
  currentTab?: TabState;
  tabs: TabState[] = [];

  static GetNewTabID(): number {
    return GetNewTabID();
  }

  constructor(){
    super();
    log.trace('EditorTabManager constructor');
    this.currentTab = undefined;
    this.tabs = [];
    log.debug('EditorTabManager constructor complete');
  }

  addTab(tab: TabState){
    log.trace('EditorTabManager.addTab()', tab.constructor.name, tab.id);
    if(tab.singleInstance){
      log.trace('EditorTabManager.addTab() singleInstance check');
      if(this.tabTypeExists(tab)){
        log.debug('EditorTabManager.addTab() singleInstance already exists, show');
        this.getTabByType(tab.constructor.name)?.show();
        return;
      }
    }

    const alreadyAdded = this.tabs.find( (_tab: TabState) => _tab.id == tab.id) ? true : false;
    if(alreadyAdded){
      log.warn('Tab already added to the TabManager', tab);
      return;
    }

    log.trace('EditorTabManager.addTab() isResourceIdOpenInTab check');
    const alreadyOpen = this.isResourceIdOpenInTab(tab.getResourceID());
    if(alreadyOpen != null){
      log.debug('EditorTabManager.addTab() resource already open, show');
      alreadyOpen.show();
      return;
    }

    log.trace('EditorTabManager.addTab() attaching and pushing');
    this.currentTab = tab;
    tab.attach(this);
    tab.show();
    this.tabs.push(tab);
    log.trace('EditorTabManager.addTab() processEventListener onTabAdded');
    this.processEventListener('onTabAdded');
    log.info('EditorTabManager.addTab() done', tab.constructor.name, this.tabs.length);
    return tab;
  }

  removeTab(tab: TabState){
    log.trace('EditorTabManager.removeTab()', tab.constructor.name, tab.id);
    const length = this.tabs.length;
    const tabIndex = this.tabs.indexOf(tab);
    log.trace('EditorTabManager.removeTab() tabIndex', tabIndex, 'tabs.length', length);

    for(let i = 0; i < length; i++){
      if(tab == this.tabs[i]){
        log.debug('removeTab', 'Tab found. Deleting');
        tab.destroy();
        this.tabs.splice(i, 1);
        log.trace('EditorTabManager.removeTab() spliced at', i);
        break;
      }
    }
    try{
      if(this.currentTab == tab){
        log.trace('EditorTabManager.removeTab() currentTab was removed');
        let tabIndexToSelect = tabIndex-1;
        if(tabIndexToSelect < 0) tabIndexToSelect = 0;
        if(this.tabs.length){
          log.debug('removeTab', 'Current tab removed. Trying to show sibling child');
          const t = this.tabs[tabIndexToSelect];
          if(t){
            log.trace('EditorTabManager.removeTab() showing tab at index', tabIndexToSelect);
            t.show();
          }
        } else {
          log.trace('EditorTabManager.removeTab() no tabs left');
        }
      }
    }catch(e){ log.debug(String(e), e); }

    log.trace('EditorTabManager.removeTab() processEventListener onTabRemoved');
    this.processEventListener('onTabRemoved');
    log.info('EditorTabManager.removeTab() done', this.tabs.length);
  }

  //Checks the supplied resource ID against all open tabs and returns tab if it is found
  isResourceIdOpenInTab(resID: number){
    log.trace('EditorTabManager.isResourceIdOpenInTab()', resID);
    if(resID){
      for(let i = 0; i < this.tabs.length; i++){
        const tid = this.tabs[i].getResourceID();
        log.trace('EditorTabManager.isResourceIdOpenInTab() tab', i, 'resID', tid);
        if(tid == resID){
          log.debug('EditorTabManager.isResourceIdOpenInTab() found', this.tabs[i].constructor.name);
          return this.tabs[i];
        }
      }
      log.trace('EditorTabManager.isResourceIdOpenInTab() not found');
    } else {
      log.trace('EditorTabManager.isResourceIdOpenInTab() no resID');
    }
    return null;
  }

  getTabByType(tabClass: string): TabState | undefined {
    log.trace('EditorTabManager.getTabByType()', tabClass);
    for(let i = 0; i < this.tabs.length; i++){
      const name = this.tabs[i].constructor.name;
      log.trace('EditorTabManager.getTabByType() tab', i, name);
      if(name === tabClass){
        log.debug('EditorTabManager.getTabByType() found', tabClass);
        return this.tabs[i];
      }
    }
    log.trace('EditorTabManager.getTabByType() not found');
    return;
  }

  tabTypeExists(tab: TabState){
    const tabClass = tab.constructor.name;
    log.trace('EditorTabManager.tabTypeExists()', tabClass);
    for(let i = 0; i < this.tabs.length; i++){
      if(this.tabs[i].constructor.name === tabClass){
        log.trace('EditorTabManager.tabTypeExists() found at', i);
        return true;
      }
    }
    log.trace('EditorTabManager.tabTypeExists() false');
    return false;
  }

  hideAll(){
    log.trace('EditorTabManager.hideAll()', this.tabs.length);
    for(let i = 0; i < this.tabs.length; i++){
      this.tabs[i].hide();
      log.trace('EditorTabManager.hideAll() hid', i);
    }
    log.debug('EditorTabManager.hideAll() done');
  }

  restoreTabState(tabState: TabStoreState) {
    log.trace('EditorTabManager.restoreTabState()', tabState.type);
    if(tabState.file){
      tabState.file = Object.assign(new EditorFile(), tabState.file);
      log.trace('restoreTabState file', tabState.file);
    }
    switch(tabState.type){
      case 'TabQuickStartState':
        log.trace('EditorTabManager.restoreTabState TabQuickStartState');
        this.addTab(
          new TabQuickStartState({editorFile: tabState.file})
        );
      break;
      case 'TabHelpState':
        log.trace('EditorTabManager.restoreTabState TabHelpState');
        this.addTab(new TabHelpState());
      break;
      case 'TabImageViewerState':
        log.trace('EditorTabManager.restoreTabState TabImageViewerState');
        this.addTab(
          new TabImageViewerState({editorFile: tabState.file})
        );
      break;
      case 'TabModelViewerState':
        log.trace('EditorTabManager.restoreTabState TabModelViewerState');
        this.addTab(
          new TabModelViewerState({editorFile: tabState.file})
        );
      break;
      case 'TabGFFEditorState':
        log.trace('EditorTabManager.restoreTabState TabGFFEditorState');
        this.addTab(
          new TabGFFEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabModuleEditorState':
        log.trace('EditorTabManager.restoreTabState TabModuleEditorState');
        this.addTab(
          new TabModuleEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabTwoDAEditorState':
        log.trace('EditorTabManager.restoreTabState TabTwoDAEditorState');
        this.addTab(
          new TabTwoDAEditorState({editorFile: tabState.file})
        );
      break;
      case 'TabUTCEditorState':
        log.trace('EditorTabManager.restoreTabState TabUTCEditorState');
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
      case 'TabIndoorBuilderState':
        this.addTab(
          new TabIndoorBuilderState({editorFile: tabState.file})
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
        log.trace('EditorTabManager.restoreTabState TabDiffToolState');
        this.addTab(new TabDiffToolState());
      break;
      default:
        log.trace('EditorTabManager.restoreTabState unknown type', tabState.type);
    }
    log.debug('EditorTabManager.restoreTabState done', tabState.type);
  }

}
