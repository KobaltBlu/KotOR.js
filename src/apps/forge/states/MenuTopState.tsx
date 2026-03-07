import { EditorFile } from "../EditorFile";
import { MenuTopItem } from "../MenuTopItem";
import { Project } from "../Project";
import { ModalChangeGameState } from "../components/modal/ModalChangeGame";
import { ForgeState } from "./ForgeState";
import { TabQuickStartState } from "./tabs/TabQuickStartState";
import { TabState } from "./tabs/TabState";
import { TabUTCEditorState } from "./tabs/TabUTCEditorState";
import { TabUTDEditorState } from "./tabs/TabUTDEditorState";
import { TabUTPEditorState } from "./tabs/TabUTPEditorState";
import { TabUTSEditorState } from "./tabs/TabUTSEditorState";
import { TabUTMEditorState } from "./tabs/TabUTMEditorState";
import { TabUTTEditorState } from "./tabs/TabUTTEditorState";
import { TabUTWEditorState } from "./tabs/TabUTWEditorState";
import { TabLIPEditorState } from "./tabs/tab-lip-editor/TabLIPEditorState";

import * as KotOR from "../KotOR";
import { ModalNewProjectState } from "./modal/ModalNewProjectState";
import { ModalAboutState } from "./modal/ModalAboutState";
import { ModalUpdateCheckState } from "./modal/ModalUpdateCheckState";
import { ModalLoadFromModuleState } from "./modal/ModalLoadFromModuleState";
import { ModalCloneModuleState } from "./modal/ModalCloneModuleState";
import { ModalInsertInstanceState } from "./modal/ModalInsertInstanceState";
import { ModalSaveToModuleState } from "./modal/ModalSaveToModuleState";
import { SaveDestination } from "../enum/SaveDestination";
import { ModalResourceComparisonState } from "./modal/ModalResourceComparisonState";
import { ModalLIPBatchProcessorState } from "./modal/ModalLIPBatchProcessorState";
import { ModalExtractOptionsState } from "./modal/ModalExtractOptionsState";
import { ModalHelpBrowserState } from "./modal/ModalHelpBrowserState";
import { ModalPatcherProjectState } from "./modal/ModalPatcherProjectState";
import { FileTypeManager } from "../FileTypeManager";
import { TabTextEditorState } from "./tabs/TabTextEditorState";
import { getWikiDocUrlForTab } from "../data/EditorWikiMapping";
import { TabReferenceFinderState } from "./tabs/TabReferenceFinderState";
import { CommandPaletteState } from "./CommandPaletteState";
import { TabERFEditorState } from "./tabs/TabERFEditorState";
import { TabHelpState } from "./tabs/TabHelpState";
import { extractErfToFolder } from "../helpers/ExtractErfToFolder";
import { createEmptyErfHeader, createEmptyModHeader } from "../helpers/CloneModule";


export class MenuTopState {

  static title: string = `KotOR Forge`;
  static items: MenuTopItem[] = [];

  static menuItemFile: MenuTopItem;
  static menuItemOpenProject: MenuTopItem;
  static menuItemNewProject: MenuTopItem;
  static menuItemSaveProject: MenuTopItem;
  static menuItemCloseProject: MenuTopItem;
  static menuItemFileSep: MenuTopItem;
  static menuItemChangeGame: MenuTopItem;
  static menuItemSettings: MenuTopItem;
  static menuItemFileSep2: MenuTopItem;
  static menuItemNewFile: MenuTopItem;
  static menuItemOpenFile: MenuTopItem;
  static menuItemLoadFromModule: MenuTopItem;
  static menuItemCompareWith: MenuTopItem;
  static menuItemSaveFile: MenuTopItem;
  static menuItemCompileFile: MenuTopItem;
  static menuItemSaveFileAs: MenuTopItem;
  static menuItemSaveToModule: MenuTopItem;
  static menuItemExtractToFolder: MenuTopItem;
  static menuItemSaveToOverride: MenuTopItem;
  static menuItemSaveToRim: MenuTopItem;
  static menuItemSaveAllFiles: MenuTopItem;
  static menuItemCloseFile: MenuTopItem;
  static menuItemFileSep3: MenuTopItem;
  static menuItemRecentProjects: MenuTopItem;
  static menuItemFileSep4: MenuTopItem;
  static menuItemExitApp: MenuTopItem;
  static menuItemLabelEngineResource: MenuTopItem;
  static menuItemNewLIP: MenuTopItem;
  static menuItemNewScript: MenuTopItem;
  static menuItemLabelBlueprints: MenuTopItem;
  static menuItemLabelNewUTC: MenuTopItem;
  static menuItemLabelNewUTD: MenuTopItem;
  static menuItemLabelNewUTP: MenuTopItem;
  static menuItemLabelNewUTS: MenuTopItem;
  static menuItemLabelNewUTM: MenuTopItem;
  static menuItemLabelNewUTT: MenuTopItem;
  static menuItemLabelNewUTW: MenuTopItem;
  static menuItemProject: MenuTopItem;
  static menuItemPatcherProject: MenuTopItem;
  static menuItemView: MenuTopItem;
  static menuItemStartPage: MenuTopItem;
  static menuItemReferenceFinder: MenuTopItem;
  static menuItemDiffTool: MenuTopItem;
  static menuItemScriptFindReferences: MenuTopItem;
  static menuItemDocumentation: MenuTopItem;
  static menuItemNewERF: MenuTopItem;
  static menuItemNewMOD: MenuTopItem;
  static menuItemOpenModuleEditor: MenuTopItem;
  static menuItemCloneModule: MenuTopItem;
  static menuItemInsertInstance: MenuTopItem;
  static menuItemLIPBatchProcessor: MenuTopItem;
  static menuItemRecentFiles: MenuTopItem;
  static menuItemAudio: MenuTopItem;
  static menuItemHelp: MenuTopItem;
  static menuItemAbout: MenuTopItem;
  static menuItemCheckForUpdates: MenuTopItem;
  static menuItemEditorDocs: MenuTopItem;
  static menuItemExtractOptions: MenuTopItem;
  static menuItemHelpBrowser: MenuTopItem;
  static menuItemGettingStarted: MenuTopItem;

  static #eventListeners: any = {};

  static addEventListener(event: string, callback: Function){
    if(typeof callback !== 'function'){ return; }
    if(!Array.isArray(this.#eventListeners[event])){
      this.#eventListeners[event] = [];
    }
    if(Array.isArray(this.#eventListeners[event])){
      let ev = this.#eventListeners[event];
      let index = ev.indexOf(callback);
      if(index == -1){
        ev.push(callback);
      }else{
        console.warn('Event Listener: Already added', event);
      }
    }else{
      console.warn('Event Listener: Unsupported', event);
    }
  }

  static removeEventListener(event: string, callback: Function){
    if(typeof callback !== 'function'){ return; }
    if(!Array.isArray(this.#eventListeners[event])){
      this.#eventListeners[event] = [];
    }
    if(Array.isArray(this.#eventListeners[event])){
      let ev = this.#eventListeners[event];
      let index = ev.indexOf(callback);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', event);
      }
    }else{
      console.warn('Event Listener: Unsupported', event);
    }
  }

  static triggerEventListener(event: string, ...args: any[]){
    if(!Array.isArray(this.#eventListeners[event])){
      this.#eventListeners[event] = [];
    }
    if(Array.isArray(this.#eventListeners[event])){
      let ev = this.#eventListeners[event];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', event);
    }
  }

  static buildMenuItems(){

    //File Menu Item
    this.menuItemFile = new MenuTopItem({
      name: `File`
    });

    //Project Menu Item
    this.menuItemProject = new MenuTopItem({
      name: `Project`
    });

    //View Menu Item
    this.menuItemView = new MenuTopItem({
      name: `View`
    });

    //Audio Menu Item
    this.menuItemAudio = new MenuTopItem({
      name: `Audio`
    });

    //Help Menu Item
    this.menuItemHelp = new MenuTopItem({
      name: 'Help'
    });

    //File Menu Child Items
    this.menuItemOpenProject = new MenuTopItem({name: 'Open Project', onClick: async () => {
      Project.OpenByDirectory();
    }});

    this.menuItemNewProject = new MenuTopItem({name: 'New Project', onClick: () => {
      // let newProjectWizard = new NewProjectWizard();
      // newProjectWizard.Show();
      const newProjectModalState = new ModalNewProjectState();
      ForgeState.modalManager.addModal(newProjectModalState);
      newProjectModalState.open();
    }});

    this.menuItemSaveProject = new MenuTopItem({name: 'Save Project', onClick: () => {
      if(ForgeState.project){
        ForgeState.project.save();
      }
    }});

    this.menuItemCloseProject = new MenuTopItem({name: 'Close Project', onClick: () => {
      // Forge.Project = undefined as any;
      // for(let i = 0; i < Forge.tabManager.tabs.length; i++){
      //   Forge.tabManager.tabs[i].Remove();
      // }
      // Forge.tabManager.AddTab(new QuickStartTab());
    }});

    this.menuItemFileSep = new MenuTopItem({type: 'separator'});

    this.menuItemChangeGame = new MenuTopItem({name: 'Change Game', onClick: async function(){
      ModalChangeGameState.Show();
    }});

    this.menuItemFileSep2 = new MenuTopItem({type: 'separator'});

    this.menuItemNewFile = new MenuTopItem({
      name: 'New',
      items: [

      ]
    });

    this.menuItemOpenFile = new MenuTopItem({
      name: 'Open File',
      onClick: async function(){
        ForgeState.openFile();
      }
    });

    this.menuItemLoadFromModule = new MenuTopItem({
      name: 'Load From Module…',
      onClick: () => {
        const loadModal = new ModalLoadFromModuleState({
          onSelect: (resref: string, ext: string, data: Uint8Array) => {
            const reskey = KotOR.ResourceTypes[ext];
            if (reskey == null) return;
            const editorFile = new EditorFile({ buffer: data, resref, ext, reskey });
            FileTypeManager.onOpenResource(editorFile);
          },
        });
        ForgeState.modalManager.addModal(loadModal);
        loadModal.open();
      },
    });

    this.menuItemCompareWith = new MenuTopItem({
      name: 'Compare with…',
      onClick: () => {
        const tab = ForgeState.tabManager.currentTab;
        if (tab instanceof TabState && tab.file) {
          const file = tab.getFile();
          const buf = file?.buffer;
          if (buf && buf.length > 0) {
            const resource1 = {
              resref: file.resref || 'resource',
              ext: file.ext || 'res',
              data: buf,
              filepath: file.getPath?.(),
            };
            const loadModal = new ModalLoadFromModuleState({
              title: 'Select second resource to compare',
              onSelect: (resref: string, ext: string, data: Uint8Array) => {
                const compareModal = new ModalResourceComparisonState({
                  resource1,
                  resource2: { resref, ext, data },
                  title: `Compare: ${resource1.resref}.${resource1.ext} vs ${resref}.${ext}`,
                });
                ForgeState.modalManager.addModal(compareModal);
                compareModal.open();
              },
            });
            ForgeState.modalManager.addModal(loadModal);
            loadModal.open();
          } else {
            alert('Open a resource with data first (e.g. open a file from a MOD or save the current file).');
          }
        } else {
          alert('No file tab selected.');
        }
      },
    });

    this.menuItemSaveFile = new MenuTopItem({
      name: 'Save File',
      // accelerator: 'Ctrl+S',
      onClick: async function(){
        if(ForgeState.tabManager.currentTab instanceof TabState){
          try{
            ForgeState.tabManager.currentTab.save();
          }catch(e){
            console.error(e);
          }
        }
      }
    });

    this.menuItemCompileFile = new MenuTopItem({
      name: 'Compile File',
      // accelerator: 'Ctrl+Shift+C',
      onClick: function(){
        if(ForgeState.tabManager.currentTab instanceof TabState){
          try{
            ForgeState.tabManager.currentTab.compile();
          }catch(e){
            console.error(e);
          }
        }
      }
    });

    this.menuItemSaveFileAs = new MenuTopItem({
      name: 'Save File As',
      // accelerator: 'Ctrl+Shift+S',
      onClick: function(){
        if(ForgeState.tabManager.currentTab instanceof TabState){
          try{
            ForgeState.tabManager.currentTab.saveAs();
          }catch(e){
            console.error(e);
          }
        }
      }
    });

    this.menuItemSaveToModule = new MenuTopItem({
      name: 'Save to MOD…',
      onClick: () => {
        const tab = ForgeState.tabManager.currentTab;
        if (tab instanceof TabState && tab.file) {
          const file = tab.getFile();
          const buf = file?.buffer;
          if (buf && buf.length > 0) {
            const resref = file.resref || 'resource';
            const resType = file.reskey ?? KotOR.ResourceTypes.res;
            const modal = new ModalSaveToModuleState({ resref, resType, data: buf });
            ForgeState.modalManager.addModal(modal);
            modal.open();
          } else {
            alert('Open a resource with data first, or save the current file.');
          }
        } else {
          alert('No file tab selected.');
        }
      },
    });

    this.menuItemExtractToFolder = new MenuTopItem({
      name: 'Extract to folder…',
      onClick: async () => {
        const tab = ForgeState.tabManager.currentTab;
        if (tab instanceof TabERFEditorState && tab.erf) {
          if (KotOR.ApplicationProfile.ENV !== KotOR.ApplicationEnvironment.ELECTRON) {
            alert('Extract to folder is only available in the Electron app.');
            return;
          }
          const dialog = (window as any).dialog;
          if (!dialog?.showOpenDialog) {
            alert('File dialog not available.');
            return;
          }
          const result = await dialog.showOpenDialog({
            title: 'Choose folder to extract to',
            properties: ['openDirectory', 'createDirectory'],
          });
          if (result?.canceled || !result?.filePaths?.length) return;
          const outputPath = result.filePaths[0];
          try {
            const { count, errors } = await extractErfToFolder({
              erf: tab.erf,
              outputPath,
              extractOptions: ForgeState.extractOptions,
            });
            if (errors.length) {
              alert(`Extracted ${count} file(s). Some errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n…' : ''}`);
            } else {
              alert(`Extracted ${count} file(s) to ${outputPath ?? 'folder'}`);
            }
          } catch (e: unknown) {
            alert(`Extract failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          alert('Open an ERF or MOD file first (File → Open File).');
        }
      },
    });

    this.menuItemSaveToOverride = new MenuTopItem({
      name: 'Save to Override…',
      onClick: () => {
        const tab = ForgeState.tabManager.currentTab;
        if (tab instanceof TabState && tab.file) {
          const file = tab.getFile();
          const buf = file?.buffer;
          if (buf && buf.length > 0) {
            const resref = file.resref || 'resource';
            const resType = file.reskey ?? KotOR.ResourceTypes.res;
            const modal = new ModalSaveToModuleState({
              resref,
              resType,
              data: buf,
              destination: SaveDestination.Override,
            });
            ForgeState.modalManager.addModal(modal);
            modal.open();
          } else {
            alert('Open a resource with data first, or save the current file.');
          }
        } else {
          alert('No file tab selected.');
        }
      },
    });

    this.menuItemSaveToRim = new MenuTopItem({
      name: 'Save to RIM…',
      onClick: () => {
        const tab = ForgeState.tabManager.currentTab;
        if (tab instanceof TabState && tab.file) {
          const file = tab.getFile();
          const buf = file?.buffer;
          if (buf && buf.length > 0) {
            const resref = file.resref || 'resource';
            const resType = file.reskey ?? KotOR.ResourceTypes.res;
            const modal = new ModalSaveToModuleState({
              resref,
              resType,
              data: buf,
              destination: SaveDestination.RIM,
            });
            ForgeState.modalManager.addModal(modal);
            modal.open();
          } else {
            alert('Open a resource with data first, or save the current file.');
          }
        } else {
          alert('No file tab selected.');
        }
      },
    });

    this.menuItemSaveAllFiles = new MenuTopItem({
      name: 'Save All Files',
      onClick: () => {
        const tabs = ForgeState.tabManager.tabs;
        for (let i = 0; i < tabs.length; i++) {
          const tab = tabs[i];
          if (tab instanceof TabState && typeof (tab as any).save === 'function') {
            try { (tab as any).save(); } catch (e) { console.error(e); }
          }
        }
      }
    });

    this.menuItemCloseFile = new MenuTopItem({
      name: 'Close File',
      onClick: () => {
        const current = ForgeState.tabManager.currentTab;
        if (current) ForgeState.tabManager.removeTab(current);
      }
    });

    this.menuItemFileSep3 = new MenuTopItem({type: 'separator'});

    this.menuItemRecentProjects = new MenuTopItem({name: 'Recent Projects', type: 'title'});

    this.menuItemRecentFiles = new MenuTopItem({name: 'Recent Files', type: 'title'});

    this.menuItemFileSep4 = new MenuTopItem({type: 'separator'});

    this.menuItemExitApp = new MenuTopItem({
      name: 'Exit',
      onClick: function(){
        (window as any).canUnload = true;
        window.close();
      }
    });

    this.menuItemLabelEngineResource = new MenuTopItem({type: 'title', name: 'Engine Resource'});

    this.menuItemNewLIP = new MenuTopItem({
      name: 'Lip Sync File',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabLIPEditorState({
          editorFile: new EditorFile({ resref: 'new_lip', reskey: KotOR.ResourceTypes.lip })
        }));
      }
    });

    this.menuItemNewScript = new MenuTopItem({
      name: 'NW Script Source File',
      onClick: function(menuItem: MenuTopItem){
        ForgeState.tabManager.addTab(new TabTextEditorState({
          editorFile: new EditorFile({ resref: 'untitled', reskey: KotOR.ResourceTypes.nss })
        }));
      }
    });

    this.menuItemLabelBlueprints = new MenuTopItem({type: 'title', name: 'Blueprints'});

    this.menuItemLabelNewUTC = new MenuTopItem({
      name: '.UTC - Creature',
      onClick: function(menuItem: MenuTopItem){
        ForgeState.tabManager.addTab(new TabUTCEditorState({
          editorFile: new EditorFile({ resref: 'new_creature', reskey: KotOR.ResourceTypes.utc })
        }));
      }
    });

    this.menuItemLabelNewUTD = new MenuTopItem({
      name: '.UTD - Door',
      onClick: function(menuItem: MenuTopItem){
        ForgeState.tabManager.addTab(new TabUTDEditorState({
          editorFile: new EditorFile({ resref: 'new_door', reskey: KotOR.ResourceTypes.utd })
        }));
      }
    });

    this.menuItemLabelNewUTP = new MenuTopItem({
      name: '.UTP - Placeable',
      onClick: function(menuItem: MenuTopItem){
        ForgeState.tabManager.addTab(new TabUTPEditorState({
          editorFile: new EditorFile({ resref: 'new_placeable', reskey: KotOR.ResourceTypes.utp })
        }));
      }
    });

    this.menuItemLabelNewUTS = new MenuTopItem({
      name: '.UTS - Sound',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabUTSEditorState({
          editorFile: new EditorFile({ resref: 'new_sound', reskey: KotOR.ResourceTypes.uts })
        }));
      }
    });

    this.menuItemLabelNewUTM = new MenuTopItem({
      name: '.UTM - Store',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabUTMEditorState({
          editorFile: new EditorFile({ resref: 'new_store', reskey: KotOR.ResourceTypes.utm })
        }));
      }
    });

    this.menuItemLabelNewUTT = new MenuTopItem({
      name: '.UTT - Trigger',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabUTTEditorState({
          editorFile: new EditorFile({ resref: 'new_trigger', reskey: KotOR.ResourceTypes.utt })
        }));
      }
    });

    this.menuItemLabelNewUTW = new MenuTopItem({
      name: '.UTW - Waypoint',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabUTWEditorState({
          editorFile: new EditorFile({ resref: 'new_waypoint', reskey: KotOR.ResourceTypes.utw })
        }));
      }
    });

    this.menuItemStartPage = new MenuTopItem({
      name: 'Start Page',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabQuickStartState());
      }
    });

    this.menuItemReferenceFinder = new MenuTopItem({
      name: 'Reference Finder',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabReferenceFinderState());
      }
    });

    this.menuItemDocumentation = new MenuTopItem({
      name: 'Documentation',
      onClick: () => {
        ForgeState.tabManager.addTab(new TabHelpState());
      }
    });

    this.menuItemNewERF = new MenuTopItem({
      name: 'New ERF…',
      onClick: () => {
        const buffer = createEmptyErfHeader();
        const editorFile = new EditorFile({
          buffer,
          resref: 'new_file',
          reskey: KotOR.ResourceTypes.erf,
        });
        FileTypeManager.onOpenResource(editorFile);
      }
    });

    this.menuItemNewMOD = new MenuTopItem({
      name: 'New MOD…',
      onClick: () => {
        const buffer = createEmptyModHeader();
        const editorFile = new EditorFile({
          buffer,
          resref: 'new_module',
          reskey: KotOR.ResourceTypes.mod,
        });
        FileTypeManager.onOpenResource(editorFile);
      }
    });


    //Project Child Items
    this.menuItemOpenModuleEditor = new MenuTopItem({
      name: 'Open Module Editor',
      onClick: () => {
        // ForgeState.project
        if(ForgeState.project instanceof Project){
          ForgeState.project.openModuleEditor();
        }else{
          alert('Open or start a new project to use this feature');
        }
      }
    });

    this.menuItemCloneModule = new MenuTopItem({
      name: 'Clone Module…',
      onClick: () => {
        const cloneModal = new ModalCloneModuleState();
        ForgeState.modalManager.addModal(cloneModal);
        cloneModal.open();
      },
    });

    this.menuItemInsertInstance = new MenuTopItem({
      name: 'Insert Instance…',
      onClick: () => {
        const insertModal = new ModalInsertInstanceState();
        ForgeState.modalManager.addModal(insertModal);
        insertModal.open();
      },
    });

    this.menuItemPatcherProject = new MenuTopItem({
      name: 'Patcher Project…',
      onClick: () => {
        const patcherModal = new ModalPatcherProjectState();
        ForgeState.modalManager.addModal(patcherModal);
        patcherModal.open();
      },
    });

    this.menuItemAudio.items.push(
      new MenuTopItem({
        name: 'No Reverb',
        onClick: () => {
          KotOR.AudioEngine.GetAudioEngine().setReverbProfile(-1);
        }
      })
    );

    this.menuItemAbout = new MenuTopItem({
      name: 'About KotOR Forge',
      onClick: () => {
        const aboutModal = new ModalAboutState();
        ForgeState.modalManager.addModal(aboutModal);
        aboutModal.open();
      }
    });

    this.menuItemEditorDocs = new MenuTopItem({
      name: 'Open Editor Documentation',
      onClick: () => {
        const url = getWikiDocUrlForTab(ForgeState.tabManager.currentTab);
        if(url){
          window.open(url, '_blank');
        }else{
          alert('No documentation is mapped for this editor yet.');
        }
      }
    });

    this.menuItemExtractOptions = new MenuTopItem({
      name: 'Extract Options...',
      onClick: () => {
        const opts = ForgeState.extractOptions;
        const extractModal = new ModalExtractOptionsState({
          defaultTpcDecompile: opts.tpcDecompile,
          defaultTpcExtractTxi: opts.tpcExtractTxi,
          defaultMdlDecompile: opts.mdlDecompile,
          defaultMdlExtractTextures: opts.mdlExtractTextures,
          onApply: (values) => {
            ForgeState.extractOptions = {
              tpcDecompile: values.tpcDecompile,
              tpcExtractTxi: values.tpcExtractTxi,
              mdlDecompile: values.mdlDecompile,
              mdlExtractTextures: values.mdlExtractTextures,
            };
          },
        });
        ForgeState.modalManager.addModal(extractModal);
        extractModal.open();
      }
    });

    this.menuItemHelpBrowser = new MenuTopItem({
      name: 'Help & Tutorials…',
      onClick: () => {
        const helpModal = new ModalHelpBrowserState();
        ForgeState.modalManager.addModal(helpModal);
        helpModal.open();
      }
    });

    this.menuItemGettingStarted = new MenuTopItem({
      name: 'Getting Started',
      onClick: () => {
        const helpModal = new ModalHelpBrowserState();
        ForgeState.modalManager.addModal(helpModal);
        helpModal.open();
      }
    });

    MenuTopState.items.push(
      this.menuItemFile,
      this.menuItemProject,
      this.menuItemView,
      this.menuItemAudio,
      this.menuItemHelp,
    );

    this.menuItemFile.items.push(
      this.menuItemOpenProject,
      this.menuItemNewProject,
      this.menuItemSaveProject,

      this.menuItemFileSep,

      this.menuItemChangeGame,
      this.menuItemSettings,
      this.menuItemFileSep2,

      this.menuItemNewFile,

      this.menuItemFileSep3,

      this.menuItemOpenFile,
      this.menuItemLoadFromModule,
      this.menuItemCompareWith,
      this.menuItemSaveFile,
      this.menuItemCompileFile,
      this.menuItemSaveFileAs,
      this.menuItemSaveToModule,
      this.menuItemSaveToOverride,
      this.menuItemSaveToRim,
      this.menuItemExtractToFolder,
      this.menuItemSaveAllFiles,
      this.menuItemCloseFile,

      this.menuItemFileSep4,

      this.menuItemRecentProjects,
      this.menuItemRecentFiles,

      this.menuItemExitApp,
    );

    this.menuItemNewFile.items.push(
      this.menuItemLabelEngineResource,
      this.menuItemNewLIP,
      this.menuItemNewScript,
      this.menuItemLabelBlueprints,
      this.menuItemLabelNewUTC,
      this.menuItemLabelNewUTD,
      this.menuItemLabelNewUTP,
      this.menuItemLabelNewUTS,
      this.menuItemLabelNewUTM,
      this.menuItemLabelNewUTT,
      this.menuItemLabelNewUTW,
      this.menuItemNewERF,
      this.menuItemNewMOD,
    );

    this.menuItemProject.items.push(
      this.menuItemOpenModuleEditor,
      this.menuItemCloneModule,
      this.menuItemInsertInstance,
      this.menuItemLIPBatchProcessor,
      this.menuItemPatcherProject,
    );

    this.menuItemView.items.push(
      this.menuItemStartPage,
      this.menuItemReferenceFinder,
      this.menuItemDiffTool,
      this.menuItemScriptFindReferences,
      this.menuItemDocumentation,
    );

    this.menuItemHelp.items.push(
      this.menuItemAbout,
      this.menuItemCheckForUpdates,
      this.menuItemEditorDocs,
      this.menuItemExtractOptions,
      this.menuItemHelpBrowser,
      this.menuItemGettingStarted,
    );
  }

  static buildAudioMenuItems(){
    this.menuItemAudio.items = [];
    this.menuItemAudio.items.push(
      new MenuTopItem({
        name: 'No Reverb',
        onClick: () => {
          KotOR.AudioEngine.GetAudioEngine().setReverbProfile(-1);
        }
      })
    );

    const eaxPresets = Object.values(KotOR.TwoDAManager.datatables.get('soundeax')?.rows || {});
    for(let i = 0; i < eaxPresets.length; i++){
      const eaxPreset = eaxPresets[i] as any;
      if(eaxPreset.label == 23) break;
      this.menuItemAudio.items.push(
        new MenuTopItem({
          name: eaxPreset.label,
          onClick: () => {
            KotOR.AudioEngine.GetAudioEngine().setReverbProfile(i);
          }
        })
      );
    }
    this.triggerEventListener('onMenuTopItemsUpdated');
  }

}

// const MenuTopOptions = {
//   title: 'KotOR Forge',
//   items: [
//     {name: 'File', items: [

//     ]},
//     {name: 'Project', items: [
//       {name: 'Open Module Editor', onClick: () => {
//         ForgeState.project
//         if(ForgeState.project instanceof Project){
//           ForgeState.project.openModuleEditor();
//         }else{
//           alert('Open or start a new project to use this feature');
//         }
//       }}
//     ]},
//     {name: 'View', items: [
//       {name: 'Start Page', onClick: () => {
//         ForgeState.tabManager.addTab(new TabQuickStartState());
//       }},
//       // {name: 'Left Pane Toggle', onClick: () => {
//       //   // $('#container').layout().toggle('west');
//       // }},
//       /*{name: 'Right Pane Toggle', onClick: () => {
//         $('#container').layout().toggle('east');
//       }},
//       {name: 'Audio Player Toggle', onClick: () => {
//         if(inlineAudioPlayer.IsVisible()){
//           inlineAudioPlayer.Hide();
//         }else{
//           inlineAudioPlayer.Show();
//         }
//       }},*/
//       // {name: 'Audio Toggle Mute', onClick: () => {
//       //   // AudioEngine.ToggleMute();
//       // }}
//     ]},
//     /*{name: 'Settings', onClick: function(){
//       let configWizard = new ConfigWizard();
//     }}*/
//   ]
// };

MenuTopState.buildMenuItems();
