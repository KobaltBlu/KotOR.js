import React from "react";
import { EditorFile } from "../../EditorFile";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { EditorTabManager } from "../../managers/EditorTabManager";
import { ForgeState } from "../ForgeState";
import * as fs from "fs";
import { supportedFileDialogTypes, supportedFilePickerTypes } from "../../components/MenuTop";

declare const KotOR: any;
declare const dialog: any;

export type TabStateEventListenerTypes =
  'onTabDestroyed'|'onTabRemoved'|'onTabShow'|'onTabHide'|'onEditorFileChange'|'onEditorFileSaved';

export interface TabStateEventListeners {
  onTabDestroyed: Function[],
  onTabRemoved: Function[],
  onTabShow: Function[],
  onTabHide: Function[],
  onEditorFileChange: Function[],
  onEditorFileSaved: Function[],
}

export class TabState {

  id: number;

  isDestroyed: boolean;
  isClosable: boolean = true;
  singleInstance: boolean;
  visible: boolean;

  tabManager: EditorTabManager;
  tabName: string = 'Unnamed Tab';

  file: EditorFile;
  
  tabContentView: JSX.Element = (<></>);

  eventListeners: TabStateEventListeners = {
    onTabDestroyed: [],
    onTabRemoved: [],
    onTabShow: [],
    onTabHide: [],
    onEditorFileChange: [],
    onEditorFileSaved: [],
  };

  addEventListener(type: TabStateEventListenerTypes, cb: Function){
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

  removeEventListener(type: TabStateEventListenerTypes, cb: Function){
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

  processEventListener(type: TabStateEventListenerTypes, args: any[] = []){
    if(Array.isArray(this.eventListeners[type])){
      let ev = this.eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  triggerEventListener(type: TabStateEventListenerTypes, args: any[] = []){
    this.processEventListener(type, args);
  }

  constructor(options: BaseTabStateOptions = {}){
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
      this.file.addEventListener('onSaveStateChanged', (file: EditorFile) => {
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
        this.tabName = (`${this.file.resref}.${this.file.ext} *`);
      }else{
        this.tabName =(`${this.file.resref}.${this.file.ext}`);
      }
    }
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

  onResize() {
    // this.updateLayoutContainers();
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
    return new Promise<boolean>( async (resolve, reject) => {
      try{
        let currentFile = this.getFile();
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
          if(currentFile.path?.length){
            console.log('saveFile', currentFile.path);
            //trigger a Save
            try{
              let saveBuffer = this.getExportBuffer();
              fs.writeFile(currentFile.path, saveBuffer, () => {
                resolve(true);
              });
            }catch(e){
              console.error(e);
              resolve(false);
            }
          }else{
            //trigger a SaveAs
            try{
              let savePath = await dialog.showSaveDialog({
                title: 'Save File As'
              });
              if(savePath){
                console.log('savePath', savePath);
                let saveBuffer = this.getExportBuffer();
                if(saveBuffer){
                  resolve(true);
                }
              }
            }catch(e){
              console.error(e);
              resolve(false);
            }
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
    throw new Error("Method not implemented.");
  }

  async compile() {
    throw new Error("Method not implemented.");
  }

}