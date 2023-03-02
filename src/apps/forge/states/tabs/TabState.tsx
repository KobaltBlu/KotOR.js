import React from "react";
import { EditorFile, EditorFileEventListenerTypes } from "../../EditorFile";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { EditorTabManager } from "../../managers/EditorTabManager";
import { ForgeState } from "../ForgeState";
import * as fs from "fs";
import { EventListenerModel } from "../../EventListenerModel";
import { supportedFileDialogTypes, supportedFilePickerTypes } from "../../ForgeFileSystem";

import * as KotOR from "../../KotOR";
declare const dialog: any;

export type TabStateEventListenerTypes =
  'onTabDestroyed'|'onTabRemoved'|'onTabShow'|'onTabHide'|'onTabNameChange'|'onEditorFileLoad'|'onEditorFileChange'|'onEditorFileSaved';

export interface TabStateEventListeners {
  onTabDestroyed: Function[],
  onTabRemoved: Function[],
  onTabShow: Function[],
  onTabHide: Function[],
  onTabNameChange: Function[],
  onEditorFileLoad: Function[],
  onEditorFileChange: Function[],
  onEditorFileSaved: Function[],
}

export class TabState extends EventListenerModel {

  id: number;

  isDestroyed: boolean;
  isClosable: boolean = true;
  singleInstance: boolean;
  visible: boolean;

  tabManager: EditorTabManager;
  tabName: string = 'Unnamed Tab';

  file: EditorFile;
  
  tabContentView: JSX.Element = (<></>);

  // protected eventListeners: TabStateEventListeners = {
  //   onTabDestroyed: [],
  //   onTabRemoved: [],
  //   onTabShow: [],
  //   onTabHide: [],
  //   onTabNameChange: [],
  //   onEditorFileLoad: [],
  //   onEditorFileChange: [],
  //   onEditorFileSaved: [],
  // };

  constructor(options: BaseTabStateOptions = {}){
    super();
    this.isDestroyed = false;

    options = Object.assign({
      enableLayoutContainers: false,
      closeable: true,
      editorFile: undefined,
      singleInstance: false,
    }, options);

    this.id = EditorTabManager.GetNewTabID();

    if(options.singleInstance){
      this.singleInstance = true;
    }

    if(options.editorFile instanceof EditorFile){
      this.file = options.editorFile;
    }

    this.visible = false;
    
    if(options.closeable){
      this.isClosable = options.closeable;
    }

    if(this.file instanceof EditorFile){
      this.file.addEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', (file: EditorFile) => {
        this.editorFileUpdated();
      });
      this.file.addEventListener<EditorFileEventListenerTypes>('onNameChanged', (file: EditorFile) => {
        this.editorFileUpdated();
      });
    }
    this.editorFileUpdated();
  }

  attachTabContentView(view: any){
    this.tabContentView = view;
  }

  editorFileUpdated(){
    if(this.file instanceof EditorFile){
      console.log('editor file updated', this.file.resref, this.file.ext, this.file)
      if(this.file.unsaved_changes){
        this.setTabName(`${this.file.resref}.${this.file.ext} *`);
      }else{
        this.setTabName(`${this.file.resref}.${this.file.ext}`);
      }
    }
  }

  setTabName(name: string){
    this.tabName = name;
    this.processEventListener('onTabNameChange', [this]);
  }

  render(){
    if(!this.tabContentView) return (<></>);
    return this.tabContentView;
  }

  getResourceID(): any{
    return;
  }

  getFile(): EditorFile {
    return this.file;
  }

  getExportBuffer(): Buffer {
    return this.file.buffer ? this.file.buffer : Buffer.allocUnsafe(0);
  }

  show(){
    this.tabManager.hideAll();
    this.visible = true;

    this.tabManager.currentTab = this;
    this.tabManager.triggerEventListener('onTabShow', [this]);
    this.processEventListener('onTabShow', [this]);
  }

  hide(){
    this.visible = false;
    this.tabManager.triggerEventListener('onTabHide', [this]);
    this.processEventListener('onTabHide', [this]);
  }

  remove(){
    this.visible = false;
    this.tabManager.removeTab(this);
    this.processEventListener('onTabRemoved', [this]);
  }

  attach(tabManager: EditorTabManager){
    this.tabManager = tabManager;
    this.isDestroyed = false;
  }

  destroy() {
    this.isDestroyed = true;
    this.processEventListener('onTabDestroyed', [this]);
  }

  getExportTypes(){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      return supportedFileDialogTypes;
    }else{
      return supportedFilePickerTypes;
    }
  }
  
  async save() {
    let currentFile = this.getFile();
    if(currentFile.archive_path || currentFile.archive_path2){
      return this.saveAs();
    }
    return new Promise<boolean>( async (resolve, reject) => {
      try{
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
          if(currentFile.path?.length){
            console.log('saveFile', currentFile.path);
            //trigger a Save
            try{
              let saveBuffer = this.getExportBuffer();
              fs.writeFile(currentFile.path, saveBuffer, () => {
                currentFile.unsaved_changes = false;
                resolve(true);
              });
            }catch(e){
              console.error(e);
              resolve(false);
            }
          }else{
            this.saveAs().then( (status: boolean) => {
              resolve(status);
            })
          }
        }else{
          try{
            if(currentFile.handle instanceof FileSystemFileHandle){
              if((await currentFile.handle.queryPermission({mode: 'readwrite'})) === 'granted'){
                try{
                  let saveBuffer = this.getExportBuffer();
                  let ws: FileSystemWritableFileStream = await currentFile.handle.createWritable();
                  await ws.write(saveBuffer);
                  resolve(true);
                }catch(e){
                  console.error(e);
                  resolve(false);
                }
              }else{
                if((await currentFile.handle.requestPermission({mode: 'readwrite'})) === 'granted'){
                  try{
                    let saveBuffer = this.getExportBuffer();
                    let ws: FileSystemWritableFileStream = await currentFile.handle.createWritable();
                    await ws.write(saveBuffer);
                    resolve(true);
                  }catch(e){
                    console.error(e);
                    resolve(false);
                  }
                }else{
                  console.error('Write permissions could not be obtained to save this file');
                  resolve(false);
                }
              }
            }else{
              let newHandle = await window.showSaveFilePicker();
              if(newHandle){
                currentFile.handle = newHandle;
                try{
                  let ws: FileSystemWritableFileStream = await newHandle.createWritable();
                  await ws.write(currentFile.getData() || Buffer.allocUnsafe(0));
                  resolve(true);
                }catch(e){
                  console.error(e);
                  resolve(false);
                }
              }else{
                console.error('save handle invalid');
                resolve(false);
              }
            }
          }catch(e){
            console.error(e);
            resolve(false);
          }
        }
      }catch(e){
        console.error(e);
        resolve(false);
      }
    });
  }

  async saveAs() {
    let currentFile = this.getFile();
    return new Promise<boolean>( async (resolve, reject) => {
      try{
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
          let savePath = await dialog.showSaveDialog({
            title: 'Save File As',
            defaultPath: currentFile.path,
          });
          if(savePath && !savePath.cancelled){
            console.log('savePath', savePath.filePath);
            try{
              let saveBuffer = this.getExportBuffer();
              fs.writeFile(savePath.filePath, saveBuffer, () => {
                currentFile.setPath(savePath.filePath);
                currentFile.archive_path = undefined;
                currentFile.archive_path2 = undefined;
                currentFile.unsaved_changes = false;
                resolve(true);
              });
            }catch(e){
              console.error(e);
              resolve(false);
            }
          }
        }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
          let newHandle = await window.showSaveFilePicker();
          if(newHandle){
            currentFile.handle = newHandle;
            console.log('handle', newHandle.name, newHandle);
            try{
              currentFile.setPath(newHandle.name);
              let ws: FileSystemWritableFileStream = await newHandle.createWritable();
              await ws.write(currentFile.getData() || Buffer.allocUnsafe(0));
              resolve(true);
            }catch(e){
              console.error(e);
              resolve(false);
            }
          }else{
            console.error('save handle invalid');
            resolve(false);
          }
        }
      }catch(e: any){
        console.error(e);
        resolve(false);
      }
    });
  }

  async compile() {
    throw new Error("Method not implemented.");
  }

}