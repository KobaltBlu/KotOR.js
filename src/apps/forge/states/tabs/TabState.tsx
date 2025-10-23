import React from "react";
import { EditorFile, EditorFileEventListenerTypes } from "../../EditorFile";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { EditorTabManager } from "../../managers/EditorTabManager";
import { ForgeState } from "../ForgeState";
import * as fs from "fs";
import { EventListenerModel } from "../../EventListenerModel";
import { supportedFileDialogTypes, supportedFilePickerTypes } from "../../ForgeFileSystem";

import * as KotOR from "../../KotOR";
import { TabStoreState } from "../../interfaces/TabStoreState";
import { pathParse } from "../../helpers/PathParse";
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
  type: string = this.constructor.name;

  isDestroyed: boolean;
  isClosable: boolean = true;
  singleInstance: boolean;
  visible: boolean;

  #tabManager: EditorTabManager;
  tabName: string = 'Unnamed Tab';

  file: EditorFile;
  saveTypes: FilePickerAcceptType[] = [];
  
  #tabContentView: JSX.Element = (<></>);

  #_onSaveStateChanged: (file: EditorFile) => void;
  #_onNameChanged: (file: EditorFile) => void;

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

    this.#_onSaveStateChanged = (file: EditorFile) => {
      this.editorFileUpdated();
    }

    this.#_onNameChanged = (file: EditorFile) => {
      this.editorFileUpdated();
    }

    if(this.file instanceof EditorFile){
      this.file.addEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', this.#_onSaveStateChanged);
      this.file.addEventListener<EditorFileEventListenerTypes>('onNameChanged', this.#_onNameChanged);
    }
    this.editorFileUpdated();
  }

  attachTabContentView(view: any){
    this.#tabContentView = view;
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

  getContentView(){
    return this.#tabContentView;
  }

  setContentView(tabContentView: JSX.Element){
    this.#tabContentView = tabContentView;
  }

  render(){
    if(!this.#tabContentView) return (<></>);
    return this.#tabContentView;
  }

  getResourceID(): any{
    return;
  }

  getFile(): EditorFile {
    return this.file;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    return this.file.buffer ? this.file.buffer : new Uint8Array(0);
  }

  show(){
    this.#tabManager.hideAll();
    this.visible = true;

    this.#tabManager.currentTab = this;
    this.#tabManager.triggerEventListener('onTabShow', [this]);
    this.processEventListener('onTabShow', [this]);
  }

  hide(){
    this.visible = false;
    this.#tabManager.triggerEventListener('onTabHide', [this]);
    this.processEventListener('onTabHide', [this]);
  }

  remove(){
    this.visible = false;
    this.#tabManager.removeTab(this);
    this.processEventListener('onTabRemoved', [this]);
  }

  attach(tabManager: EditorTabManager){
    this.#tabManager = tabManager;
    this.isDestroyed = false;
  }

  getTabManager(){
    return this.#tabManager;
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
              const pathInfo = pathParse(currentFile.path);
              let saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
              fs.writeFile(currentFile.path, saveBuffer, () => {
                currentFile.buffer = saveBuffer;
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
              let granted = (await currentFile.handle.queryPermission({mode: 'readwrite'})) === 'granted';
              if(!granted){
                granted = (await currentFile.handle.requestPermission({mode: 'readwrite'})) === 'granted';
              }
              if(granted){
                try{
                  const pathInfo = pathParse(currentFile.handle.name);
                  let saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
                  let ws: FileSystemWritableFileStream = await currentFile.handle.createWritable();
                  await ws.write(saveBuffer as any);
                  currentFile.buffer = saveBuffer;
                  currentFile.unsaved_changes = false;
                  resolve(true);
                }catch(e){
                  console.error(e);
                  resolve(false);
                }
              }else{
                console.error('Write permissions could not be obtained to save this file');
                resolve(false);
              }
            }else{
              let newHandle = await window.showSaveFilePicker({
                suggestedName: currentFile.getFilename(),
                types: this.saveTypes.length ? this.saveTypes : undefined
              });
              if(newHandle){
                currentFile.handle = newHandle;
                try{
                  let ws: FileSystemWritableFileStream = await newHandle.createWritable();
                  const pathInfo = pathParse(newHandle.name);
                  const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
                  await ws.write(saveBuffer as any || new Uint8Array(0) as any);
                  await ws.close();
                  currentFile.buffer = saveBuffer;
                  currentFile.unsaved_changes = false;
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

  getSaveTypes(): any {
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      return this.saveTypes.length ? Object.values(this.saveTypes.map( (type) => {
        return {
          name: type.description,
          extensions: Object.keys(type.accept).map( (node) => {
            return typeof type.accept[node] === 'string' ? type.accept[node].replace('.', '') : type.accept[node].map( (type) => type.replace('.', ''));
          }).flat()
        }
      })) : [
        { name: 'All Files', extensions: ['*'] }
      ]
    }else{
      return this.saveTypes.length ? this.saveTypes : undefined
    }
  }

  async saveAs() {
    console.log('fileTypes', this.getSaveTypes());
    const currentFile = this.getFile();
    // currentFile.addEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', this.#_onSaveStateChanged);
    // currentFile.addEventListener<EditorFileEventListenerTypes>('onNameChanged', this.#_onNameChanged);
    return new Promise<boolean>( async (resolve, reject) => {
      try{
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
          const savePath = await dialog.showSaveDialog({
            title: 'Save File As',
            defaultPath: currentFile.getFilename(),
            filters: this.getSaveTypes()
          });
          if(savePath && !savePath.cancelled){
            console.log('savePath', savePath.filePath);
            const pathInfo = pathParse(savePath.filePath);
            try{
              const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
              fs.writeFile(savePath.filePath, saveBuffer, () => {
                // this.file.removeEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', this.#_onSaveStateChanged);
                // this.file.removeEventListener<EditorFileEventListenerTypes>('onNameChanged', this.#_onNameChanged);
                this.file = currentFile;
                currentFile.setPath(savePath.filePath);
                currentFile.archive_path = undefined;
                currentFile.archive_path2 = undefined;
                currentFile.buffer = saveBuffer;
                currentFile.unsaved_changes = false;
                this.editorFileUpdated();
                resolve(true);
              });
            }catch(e){
              console.error(e);
              resolve(false);
            }
          }
        }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
          const newHandle = await window.showSaveFilePicker({
            suggestedName: currentFile.getFilename(),
            types: this.getSaveTypes(),
          });
          if(newHandle){
            currentFile.handle = newHandle;
            try{
              const pathInfo = pathParse(newHandle.name);
              currentFile.setPath(`file://system.dir/${newHandle.name}`);
              const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
              const ws: FileSystemWritableFileStream = await newHandle.createWritable();
              await ws.write(saveBuffer as any || new Uint8Array(0) as any);
              await ws.close();
              // this.file.removeEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', this.#_onSaveStateChanged);
              // this.file.removeEventListener<EditorFileEventListenerTypes>('onNameChanged', this.#_onNameChanged);
              this.file = currentFile;
              currentFile.archive_path = undefined;
              currentFile.archive_path2 = undefined;
              currentFile.buffer = saveBuffer;
              currentFile.unsaved_changes = false;
              this.editorFileUpdated();
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

  storeState(): TabStoreState {
    return {
      type: this.type,
      file: this.file
    };
  }

}