import React, { ComponentProps, ReactEventHandler } from "react";
import { Container, Dropdown, Nav, NavDropdown, Navbar } from 'react-bootstrap';
import { MenuItem } from "./MenuItem";
import { ForgeState } from "../states/ForgeState";
import { TabQuickStartState } from "../states/tabs/TabQuickStartState";

declare const KotOR: any;

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

        // let compatible_profiles: any[] = [];
        // let all_profiles = (ConfigClient.get(['Profiles']) || {});
        // let all_profile_keys = Object.keys(all_profiles);
        
        // for(let i = 0, len = all_profile_keys.length; i < len; i++){
        //   console.log(all_profile_keys[i])
        //   let profile = all_profiles[all_profile_keys[i]];
        //   if(profile.isForgeCompatible){
        //     compatible_profiles.push(profile);
        //   }
        // }

        // let mb = new ModalMessageBox({
        //   type: 'question',
        //   buttons: compatible_profiles.map( (p) => p.name ),
        //   title: 'Switch Game?',
        //   message: 'Choose which game you would like to switch to.',
        //   onChoose: (choice: string) => {
        //     let profile = compatible_profiles.find( (p) => {
        //       return p.name == choice;
        //     });
        //     console.log('change', choice, profile);
        //     if(profile){
        //       window.location.search = `?key=${profile.key}`;
        //     }
        //   }
        // });
        // mb.Show();

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
        // if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        //   (window as any).dialog.showOpenDialog({
        //     title: 'Open File',
        //     filters: [
        //       {name: 'All Supported Formats', extensions: ['tpc', 'tga', 'wav', 'mp3', 'bik', 'gff', 'utc', 'utd', 'utp', 'utm', 'uts', 'utt', 'utw', 'lip', 'mod', 'nss', 'ncs', 'erf', 'rim', 'git', 'are', 'ifo', 'mdl', 'wok', 'pwk', 'dwk', 'lyt', 'vis', 'pth']},
        //       {name: 'TPC Image', extensions: ['tpc']},
        //       {name: 'TGA Image', extensions: ['tga']},
        //       {name: 'GFF', extensions: ['gff']},
        //       {name: 'Creature Template', extensions: ['utc']},
        //       {name: 'Door Template', extensions: ['utd']},
        //       {name: 'Placeable Template', extensions: ['utp']},
        //       {name: 'Merchant Template', extensions: ['utm']},
        //       {name: 'Sound Template', extensions: ['uts']},
        //       {name: 'Trigger Template', extensions: ['utt']},
        //       {name: 'Waypoint Template', extensions: ['utw']},
        //       {name: 'LIP Animation', extensions: ['lip']},
        //       {name: 'Audio File', extensions: ['wav', 'mp3']},
        //       {name: 'Video File', extensions: ['bik']},
        //       {name: 'MOD File', extensions: ['mod']},
        //       {name: 'ERF File', extensions: ['erf']},
        //       {name: 'RIM File', extensions: ['rim']},
        //       {name: 'Model File', extensions: ['mdl', 'wok', 'pwk', 'dwk']},
        //       {name: 'Module File', extensions: ['git', 'ifo']},
        //       {name: 'Area File', extensions: ['are']},
        //       {name: 'Path File', extensions: ['pth']},
        //       {name: 'Script Source File', extensions: ['ncs']},
        //       {name: 'Script Compiled File', extensions: ['nss']},
        //       {name: 'VIS File', extensions: ['vis']},
        //       {name: 'Layout File', extensions: ['lyt']},
        //       {name: 'All Formats', extensions: ['*']},
        //     ],
        //     properties: ['createDirectory'],
        //   }).then( (result: any) => {
        //     if(!result.canceled){
        //       if(result.filePaths.length){
        //         let file_path = result.filePaths[0];
        //         let path_parse = (filepath: string): {root:string, dir: string, base: string, ext: string, name: string} => {
        //           let parsed: {root:string, dir: string, base: string, ext: string, name: string} = 
        //             { root: '', dir: '', base: '', ext: '', name: '' };
        //           let sep = window.navigator.platform.toLocaleLowerCase() == 'win32' ? '\\' : '/';
        //           let parts = filepath.split(sep);
        //           let filename = parts.pop();
        //           let filename_parts = filename.split('.');
        //           let name = filename_parts[0];
        //           let ext = '';
        //           if(filename_parts.length > 1){
        //             ext = '.'+filename_parts[1];
        //           }
        //           parsed.dir = parts.join(sep);
        //           parsed.base = filename;
        //           parsed.ext = ext;
        //           parsed.name = name;
        //           return parsed;
        //         };
        //         let parsed = path_parse(file_path);
        //         let fileParts = parsed.name.split('.');

        //         if(parsed.ext == '.mdl'){
        //           (window as any).dialog.showOpenDialog({
        //             title: `Open MDX File (${fileParts[0]}.mdx)`,
        //             filters: [
        //               {name: 'Model File', extensions: ['mdx']},
        //               {name: 'All Formats', extensions: ['*']},
        //             ],
        //             properties: ['createDirectory'],
        //           }).then( (result: any) => {
        //             let file_path2 = result.filePaths[0];
        //             // FileTypeManager.onOpenFile({
        //             //   path: file_path, 
        //             //   path2: file_path2, 
        //             //   filename: parsed.base, 
        //             //   resref: parsed.name, 
        //             //   ext: fileParts[1]
        //             // });
        //           });
        //         }else{
        //           // FileTypeManager.onOpenFile({
        //           //   path: file_path, 
        //           //   filename: parsed.base, 
        //           //   resref: parsed.name, 
        //           //   ext: fileParts[1]
        //           // });
        //         }
        //       }
        //     }
        //     console.log(result.canceled);
        //     console.log(result.filePaths);
        //   }).catch( (e: any) => {

        //   })
        // }else{
        //   window.showOpenFilePicker({
        //     types: [
        //       {
        //         description: 'All Supported Formats', 
        //         accept: {
        //           '*': ['.tpc', '.tga', '.wav', '.mp3', '.bik', '.gff', '.utc', '.utd', '.utp', '.utm', '.uts', '.utt', '.utw', '.lip', '.mod', '.nss', '.ncs', '.erf', '.rim', '.git', '.are', '.ifo', '.mdl', '.mdx', '.wok', '.pwk', '.dwk', '.lyt', '.vis', '.pth']
        //         }
        //       },
        //       {
        //         description: 'TPC Image', 
        //         accept: {
        //           '*': ['.tpc']
        //         }
        //       },
        //       {
        //         description: 'TGA Image', 
        //         accept: {
        //           '*': ['.tga']
        //         }
        //       },
        //       {
        //         description: '.GFF', 
        //         accept: {
        //           '*': ['.gff']
        //         }
        //       },
        //       {
        //         description: 'Creature Template', 
        //         accept: {
        //           '*': ['.utc']
        //         }
        //       },
        //       {
        //         description: 'Door Template', 
        //         accept: {
        //           '*': ['.utd']
        //         }
        //       },
        //       {
        //         description: 'Placeable Template', 
        //         accept: {
        //           '*': ['.utp']
        //         }
        //       },
        //       {
        //         description: 'Merchant Template', 
        //         accept: {
        //           '*': ['.utm']
        //         }
        //       },
        //       {
        //         description: 'Sound Template', 
        //         accept: {
        //           '*': ['.uts']
        //         }
        //       },
        //       {
        //         description: 'Trigger Template', 
        //         accept: {
        //           '*': ['.utt']
        //         }
        //       },
        //       {
        //         description: 'Waypoint Template', 
        //         accept: {
        //           '*': ['.utw']
        //         }
        //       },
        //       {
        //         description: 'LIP Animation', 
        //         accept: {
        //           '*': ['.lip']
        //         }
        //       },
        //       {
        //         description: 'Audio File', 
        //         accept: {
        //           '*': ['.wav', '.mp3']
        //         }
        //       },
        //       {
        //         description: 'Video File', 
        //         accept: {
        //           '*': ['.bik']
        //         }
        //       },
        //       {
        //         description: 'MOD File', 
        //         accept: {
        //           '*': ['.mod']
        //         }
        //       },
        //       {
        //         description: 'ERF File', 
        //         accept: {
        //           '*': ['.erf']
        //         }
        //       },
        //       {
        //         description: 'RIM File', 
        //         accept: {
        //           '*': ['.rim']
        //         }
        //       },
        //       {
        //         description: 'Model File', 
        //         accept: {
        //           '*': ['.mdl', '.mdx', '.wok', '.pwk', '.dwk']
        //         }
        //       },
        //       {
        //         description: 'Module File', 
        //         accept: {
        //           '*': ['.git', '.ifo']
        //         }
        //       },
        //       {
        //         description: 'Area File', 
        //         accept: {
        //           '*': ['.are']
        //         }
        //       },
        //       {
        //         description: 'Path File', 
        //         accept: {
        //           '*': ['.pth']
        //         }
        //       },
        //       {
        //         description: 'Script Source File', 
        //         accept: {
        //           '*': ['.ncs']
        //         }
        //       },
        //       {
        //         description: 'Script Compiled File', 
        //         accept: {
        //           '*': ['.nss']
        //         }
        //       },
        //       {
        //         description: 'VIS File', 
        //         accept: {
        //           '*': ['.vis']
        //         }
        //       },
        //       {
        //         description: 'Layout File', 
        //         accept: {
        //           '*': ['.lyt']
        //         }
        //       },
        //       {
        //         description: 'All Formats', 
        //         accept: {
        //           '*': ['*']
        //         }
        //       },
        //     ],
            
        //   }).then( (handles: FileSystemFileHandle[]) => {
        //     // let [handle] = handles;
        //     // if(handle){
        //     //   let parsed = path.parse(handle.name);
        //     //   let fileParts = parsed.name.split('.');
        //     //   FileTypeManager.onOpenFile({path: handle.name, handle: handle, filename: handle.name, resref: fileParts[0], ext: fileParts[1]});
        //     // }
        //   }).catch((e: any) => {

        //   })
        // }
      }},
      {name: 'Save File', accelerator: 'Ctrl+S', onClick: async function(){
        // return new Promise<boolean>( async (resolve, reject) => {
        //   if(Forge.tabManager.currentTab instanceof EditorTab){
        //     try{
        //       let currentFile = Forge.tabManager.currentTab.getFile();
        //       if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        //         if(currentFile.path?.length){
        //           console.log('saveFile', currentFile.path);
        //           //trigger a Save
        //           try{
        //             let saveBuffer = Forge.tabManager.currentTab.getExportBuffer();
        //             fs.writeFile(currentFile.path, saveBuffer, () => {
        //               resolve(true);
        //             });
        //           }catch(e){
        //             console.error(e);
        //             resolve(false);
        //           }
        //         }else{
        //           //trigger a SaveAs
        //           try{
        //             let savePath = await (window as any).dialog.showSaveFileDialog({
        //               title: 'Save File As'
        //             });
        //             if(savePath){
        //               console.log('savePath', savePath);
        //               let saveBuffer = Forge.tabManager.currentTab.getExportBuffer();
        //               if(saveBuffer){
        //                 resolve(true);
        //               }
        //             }
        //           }catch(e){
        //             console.error(e);
        //             resolve(false);
        //           }
        //         }
        //       }else{
        //         try{
        //           if(currentFile.handle instanceof FileSystemFileHandle){
        //             if((await currentFile.handle.queryPermission({mode: 'readwrite'})) === 'granted'){
        //               try{
        //                 let saveBuffer = Forge.tabManager.currentTab.getExportBuffer();
        //                 let ws: FileSystemWritableFileStream = await currentFile.handle.createWritable();
        //                 await ws.write(saveBuffer);
        //                 resolve(true);
        //               }catch(e){
        //                 console.error(e);
        //                 resolve(false);
        //               }
        //             }else{
        //               if((await currentFile.handle.requestPermission({mode: 'readwrite'})) === 'granted'){
        //                 try{
        //                   let saveBuffer = Forge.tabManager.currentTab.getExportBuffer();
        //                   let ws: FileSystemWritableFileStream = await currentFile.handle.createWritable();
        //                   await ws.write(saveBuffer);
        //                   resolve(true);
        //                 }catch(e){
        //                   console.error(e);
        //                   resolve(false);
        //                 }
        //               }else{
        //                 console.error('Write permissions could not be obtained to save this file');
        //                 resolve(false);
        //               }
        //             }
        //           }else{
        //             let newHandle = await window.showSaveFilePicker();
        //             if(newHandle){
        //               currentFile.handle = newHandle;
        //               try{
        //                 let ws: FileSystemWritableFileStream = await newHandle.createWritable();
        //                 await ws.write(currentFile.getData());
        //                 resolve(true);
        //               }catch(e){
        //                 console.error(e);
        //                 resolve(false);
        //               }
        //             }else{
        //               console.error('save handle invalid');
        //               resolve(false);
        //             }
        //           }
        //         }catch(e){
        //           console.error(e);
        //           resolve(false);
        //         }
        //       }
        //     }catch(e){
        //       console.error(e);
        //       resolve(false);
        //     }
        //   }
        // });

      }},
      {name: 'Compile File', accelerator: 'Ctrl+Shift+C', onClick: function(){

        // if(Forge.tabManager.currentTab instanceof EditorTab){
        //   try{
        //     Forge.tabManager.currentTab.Compile();
        //   }catch(e){
        //     console.error(e);
        //   }
        // }

      }},
      {name: 'Save File As', accelerator: 'Ctrl+Shift+S', onClick: function(){

        // if(Forge.tabManager.currentTab instanceof EditorTab){
        //   try{
        //     Forge.tabManager.currentTab.SaveAs();
        //   }catch(e){
        //     console.error(e);
        //   }
        // }

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
        ForgeState.tabManager.AddTab(new TabQuickStartState());
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
