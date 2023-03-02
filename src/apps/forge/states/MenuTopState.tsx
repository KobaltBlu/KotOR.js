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

import * as KotOR from "../KotOR";


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
  static menuItemFileSep2: MenuTopItem;
  static menuItemNewFile: MenuTopItem;
  static menuItemOpenFile: MenuTopItem;
  static menuItemSaveFile: MenuTopItem;
  static menuItemCompileFile: MenuTopItem;
  static menuItemSaveFileAs: MenuTopItem;
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
  static menuItemView: MenuTopItem;
  static menuItemStartPage: MenuTopItem;
  static menuItemOpenModuleEditor: MenuTopItem;
  static menuItemRecentFiles: MenuTopItem;

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

    //File Menu Child Items
    this.menuItemOpenProject = new MenuTopItem({name: 'Open Project', onClick: async () => {
      Project.OpenByDirectory();
    }});

    this.menuItemNewProject = new MenuTopItem({name: 'New Project', onClick: () => {
      // let newProjectWizard = new NewProjectWizard();
      // newProjectWizard.Show();
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

    this.menuItemSaveAllFiles = new MenuTopItem({name: 'Save All Files'});
    
    this.menuItemCloseFile = new MenuTopItem({name: 'Close File'});

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
      onClick: function(menuItem: MenuTopItem){
        // Forge.tabManager.AddTab(new LIPEditorTab(new EditorFile({ resref: 'new_lip', reskey: ResourceTypes.lip })));
      }
    });

    this.menuItemNewScript = new MenuTopItem({
      name: 'NW Script Source File', 
      onClick: function(menuItem: MenuTopItem){
        // Forge.tabManager.AddTab(new ScriptEditorTab(new EditorFile({ resref: 'untitled', reskey: ResourceTypes.nss })));
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
      onClick: function(menuItem: MenuTopItem){
        // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_sound', reskey: ResourceTypes.uts })));
      }
    });

    this.menuItemLabelNewUTM = new MenuTopItem({
      name: '.UTM - Store', 
      onClick: function(menuItem: MenuTopItem){
        // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_store', reskey: ResourceTypes.utm })));
      }
    });

    this.menuItemLabelNewUTT = new MenuTopItem({
      name: '.UTT - Trigger', 
      onClick: function(menuItem: MenuTopItem){
        // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_trigger', reskey: ResourceTypes.utt })));
      }
    });

    this.menuItemLabelNewUTW = new MenuTopItem({
      name: '.UTW - Waypoint', 
      onClick: function(menuItem: MenuTopItem){
        // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_waypoint', reskey: ResourceTypes.utw })));
      }
    });

    this.menuItemStartPage = new MenuTopItem({
      name: 'Start Page', 
      onClick: () => {
        ForgeState.tabManager.addTab(new TabQuickStartState());
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

    MenuTopState.items.push(
      this.menuItemFile, 
      this.menuItemProject, 
      this.menuItemView
    );

    this.menuItemFile.items.push(
      this.menuItemOpenProject,
      this.menuItemNewProject,
      this.menuItemSaveProject,

      this.menuItemFileSep,

      this.menuItemChangeGame,
      this.menuItemFileSep2,

      this.menuItemNewFile,

      this.menuItemFileSep3,

      this.menuItemOpenFile,
      this.menuItemSaveFile,
      this.menuItemCompileFile,
      this.menuItemSaveFileAs,
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
    );

    this.menuItemProject.items.push(
      this.menuItemOpenModuleEditor,
    );

    this.menuItemView.items.push(
      this.menuItemStartPage,
    );

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
