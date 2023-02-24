import React, { ComponentProps, ReactEventHandler } from "react";
import { Container, Dropdown, Nav, NavDropdown, Navbar } from 'react-bootstrap';
import { MenuItem } from "./MenuItem";
import { ForgeState } from "../states/ForgeState";
import { TabQuickStartState } from "../states/tabs/TabQuickStartState";
import { TabState } from "../states/tabs/TabState";
import { pathParse } from "../helpers/PathParse";
import { AudioPlayer } from "./AudioPlayer";
import { FileTypeManager } from "../FileTypeManager";
import { ModalChangeGameState } from "./modal/ModalChangeGame";
import { ForgeFileSystem, ForgeFileSystemResponse } from "../ForgeFileSystem";

import * as KotOR from "../KotOR";
declare const dialog: any;

export class ProtoMenuItem {
  static MENU_ITEM_ID = 0;

  id: number = 0;
  name: string;
  onClick: Function;
  items: ProtoMenuItem[] = [];
  type: string = '';

  constructor( options: any ){
    this.id = ProtoMenuItem.MENU_ITEM_ID++;
    if(typeof options.name === 'string'){
      this.name = options.name;
    }

    if(typeof options.onClick === 'function'){
      this.onClick = options.onClick;
    }

    if(Array.isArray(options.items)){
      for(let i = 0; i < options.items.length; i++){
        this.items.push(
          new ProtoMenuItem(options.items[i])
        );
      }
    }
  }

}

export default class MenuTop extends React.Component {

  items: ProtoMenuItem[] = [];

  constructor(props: any){
    super(props);
    // this.onClick = this.onClick.bind(this);
    for(let i = 0; i < MenuTopOptions.items.length; i++){
      this.items.push(
        new ProtoMenuItem(MenuTopOptions.items[i])
      );
    }
  }

  // onClick(e: React.MouseEvent<HTMLElement>, button: any){
  //   e.preventDefault();
  //   // e.stopPropagation();
  //   console.log('button', button?.name);
  //   if(typeof button?.onClick === 'function'){
  //     console.log('onClick', button);
  //     button.onClick();
  //   }
  // }

  render(): React.ReactNode {

    return (
      <Navbar className="top-menu" expand="lg">
        <div className="menu-accent"><span className="inner"></span></div>
        <Container fluid>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {this.items.map((item: any, i: any) => 
                (
                  <MenuItem key={(`menu-item-proto-${item.id}`)} item={item}></MenuItem>
                )
              )}
            <AudioPlayer></AudioPlayer>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  }

}

const MenuTopOptions = {
  title: 'KotOR Forge',
  items: [
    {name: 'File', items: [
      {name: 'Open Project', onClick: async () => {
        // let payload = await dialog.showOpenDialog({
        //   properties: ['openFile', 'createDirectory'],
        //   filters: [
        //     {name: 'KForge Project', extensions: ['json']}
        // ]});
        // if(!payload.canceled && payload.filePaths.length){
        //   Forge.Project = new Project( path.dirname(payload.filePaths[0]) );
        //   Forge.Project.Open(() => {
        //     Forge.loader.SetMessage("Loading Complete");
        //     //Fade out the loading screen because the app is ready
        //     Forge.loader.Dismiss();
        //   });
        // }
      }},
      {name: 'New Project', onClick: () => {
        // let newProjectWizard = new NewProjectWizard();
        // newProjectWizard.Show();
      }},
      {name: 'Save Project'},
      {name: 'Close Project', onClick: () => {
        // Forge.Project = undefined as any;
        // for(let i = 0; i < Forge.tabManager.tabs.length; i++){
        //   Forge.tabManager.tabs[i].Remove();
        // }
        // Forge.tabManager.AddTab(new QuickStartTab());
      }},
      {type: 'separator'},
      {name: 'Change Game', onClick: async function(){
        ModalChangeGameState.Show();
      }},
      {type: 'separator'},
      {name: 'New', items: [
        {type: 'title', name: 'Engine Resource'},
        {name: 'Lip Sync File', onClick: function(){
          // Forge.tabManager.AddTab(new LIPEditorTab(new EditorFile({ resref: 'new_lip', reskey: ResourceTypes.lip })));
        }},
        {name: 'NW Script Source File', onClick: function(){
          // Forge.tabManager.AddTab(new ScriptEditorTab(new EditorFile({ resref: 'untitled', reskey: ResourceTypes.nss })));
        }},
        {type: 'title', name: 'Blueprints'},
        {name: '.UTC - Creature', onClick: function(){
          // Forge.tabManager.AddTab(new UTCEditorTab(new EditorFile({ resref: 'new_creature', reskey: ResourceTypes.utc })));
        }},
        {name: '.UTD - Door', onClick: function(){
          // Forge.tabManager.AddTab(new UTDEditorTab(new EditorFile({ resref: 'new_door', reskey: ResourceTypes.utd })));
        }},
        {name: '.UTP - Placeable', onClick: function(){
          // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_placeable', reskey: ResourceTypes.utp })));
        }},
        {name: '.UTS - Sound', onClick: function(){
          // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_sound', reskey: ResourceTypes.uts })));
        }},
        {name: '.UTM - Store', onClick: function(){
          // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_store', reskey: ResourceTypes.utm })));
        }},
        {name: '.UTT - Trigger', onClick: function(){
          // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_trigger', reskey: ResourceTypes.utt })));
        }},
        {name: '.UTW - Waypoint', onClick: function(){
          // Forge.tabManager.AddTab(new UTPEditorTab(new EditorFile({ resref: 'new_waypoint', reskey: ResourceTypes.utw })));
        }},
      ]},
      {name: 'Open File', onClick: async function(){
        ForgeFileSystem.OpenFile().then( (response: ForgeFileSystemResponse) => {
          if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
            if(Array.isArray(response.paths)){
              const file_path = response.paths[0];
              let parsed = pathParse(file_path);
              let fileParts = parsed.name.split('.');
              if(parsed.ext == '.mdl'){
                (window as any).dialog.showOpenDialog({
                  title: `Open MDX File (${fileParts[0]}.mdx)`,
                  filters: [
                    {name: 'Model File', extensions: ['mdx']},
                    {name: 'All Formats', extensions: ['*']},
                  ],
                  properties: ['createDirectory'],
                }).then( (result: any) => {
                  let file_path2 = result.filePaths[0];
                  FileTypeManager.onOpenFile({
                    path: file_path, 
                    path2: file_path2, 
                    filename: parsed.base, 
                    resref: parsed.name, 
                    ext: fileParts[1]
                  });
                });
              }else{
                FileTypeManager.onOpenFile({
                  path: file_path, 
                  filename: parsed.base, 
                  resref: parsed.name, 
                  ext: fileParts[1]
                });
              }
            }
          }else{
            if(Array.isArray(response.handles)){
              const [handle] = response.handles;
              let parsed = pathParse(handle.name);
              let fileParts = parsed.name.split('.');
              FileTypeManager.onOpenFile({
                path: handle.name, 
                handle: handle, 
                filename: handle.name, 
                resref: fileParts[0], 
                ext: fileParts[1]
              });
            }
          }
        })
      }},
      {name: 'Save File', accelerator: 'Ctrl+S', onClick: async function(){
        if(ForgeState.tabManager.currentTab instanceof TabState){
          try{
            ForgeState.tabManager.currentTab.save();
          }catch(e){
            console.error(e);
          }
        }
      }},
      {name: 'Compile File', accelerator: 'Ctrl+Shift+C', onClick: function(){
        if(ForgeState.tabManager.currentTab instanceof TabState){
          try{
            ForgeState.tabManager.currentTab.compile();
          }catch(e){
            console.error(e);
          }
        }
      }},
      {name: 'Save File As', accelerator: 'Ctrl+Shift+S', onClick: function(){
        if(ForgeState.tabManager.currentTab instanceof TabState){
          try{
            ForgeState.tabManager.currentTab.saveAs();
          }catch(e){
            console.error(e);
          }
        }
      }},
      {name: 'Save All Files'},
      {name: 'Close File'},
      {type: 'separator'},
      {name: 'Recent Projects', type: 'title'},
      {type: 'separator'},
      {name: 'Exit', onClick: function(){
        (window as any).canUnload = true;
        window.close();
      }}
    ]},
    {name: 'Project', items: [
      {name: 'Open Module Editor', onClick: () => {
        // if(Forge.Project instanceof Project){
        //   Forge.Project.openModuleEditor();
        // }else{
        //   alert('Open or start a new project to use this feature');
        // }
      }}
    ]},
    {name: 'View', items: [
      {name: 'Start Page', onClick: () => {
        ForgeState.tabManager.addTab(new TabQuickStartState());
      }},
      {name: 'Left Pane Toggle', onClick: () => {
        // $('#container').layout().toggle('west');
      }},
      /*{name: 'Right Pane Toggle', onClick: () => {
        $('#container').layout().toggle('east');
      }},
      {name: 'Audio Player Toggle', onClick: () => {
        if(inlineAudioPlayer.IsVisible()){
          inlineAudioPlayer.Hide();
        }else{
          inlineAudioPlayer.Show();
        }
      }},*/
      {name: 'Audio Toggle Mute', onClick: () => {
        // AudioEngine.ToggleMute();
      }}
    ]},
    /*{name: 'Settings', onClick: function(){
      let configWizard = new ConfigWizard();
    }}*/
  ]
};
