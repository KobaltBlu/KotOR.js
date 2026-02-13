import * as fs from "fs";

import React from "react";


import { pathParse } from "../../helpers/PathParse";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabStoreState } from "../../interfaces/TabStoreState";
import type { EditorTabManager } from "../../managers/EditorTabManager";
import { GetNewTabID } from "../../managers/TabIdGenerator";

import { createScopedLogger, LogScope } from "../../../../utility/Logger";

// IMPORTANT: EditorFile and ForgeState are NOT imported at the top level to
// break circular-dependency TDZ errors that occur when the entire Forge
// codebase is bundled into a single webpack chunk (VS Code webview).
// Instead we use lazy accessors that resolve on first call, by which time
// all modules have finished evaluating.
import type { EditorFile as EditorFileType, EditorFileEventListenerTypes } from "../../EditorFile";
import { EventListenerModel } from "../../EventListenerModel";
import { supportedFileDialogTypes, supportedFilePickerTypes } from "../../ForgeFileSystem";
import * as KotOR from "../../KotOR";
import type { ForgeState as ForgeStateType } from "../ForgeState";


const log = createScopedLogger(LogScope.Forge);

/** Electron dialog API (injected by preload in Electron env). */
interface ElectronSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[] | Array<{ name: string; extensions: string[] }>;
}
interface ElectronSaveDialogResult {
  cancelled?: boolean;
  filePath?: string;
}
declare const dialog: { showSaveDialog: (opts: ElectronSaveDialogOptions) => Promise<ElectronSaveDialogResult> };

// Lazy accessors – resolved on first call to avoid TDZ.
let _EditorFile: typeof import("../../EditorFile").EditorFile | null = null;
function getEditorFile() {
  if (!_EditorFile) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _EditorFile = require("../../EditorFile").EditorFile;
  }
  return _EditorFile!;
}

let _ForgeState: typeof import("../ForgeState").ForgeState | null = null;
function getForgeState() {
  if (!_ForgeState) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _ForgeState = require("../ForgeState").ForgeState;
  }
  return _ForgeState!;
}

function isEditorFile(obj: unknown): obj is EditorFileType {
  return obj != null && typeof obj === 'object' && obj.constructor?.name === 'EditorFile';
}

export type TabStateEventListenerTypes =
  'onTabDestroyed'|'onTabRemoved'|'onTabShow'|'onTabHide'|'onTabNameChange'|'onEditorFileLoad'|'onEditorFileChange'|'onEditorFileSaved'|'onKeyDown'|'onKeyUp';

export interface TabStateEventListeners {
  onTabDestroyed: Function[],
  onTabRemoved: Function[],
  onTabShow: Function[],
  onTabHide: Function[],
  onTabNameChange: Function[],
  onEditorFileLoad: Function[],
  onEditorFileChange: Function[],
  onEditorFileSaved: Function[],
  onKeyDown: Function[],
  onKeyUp: Function[],
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

  file: EditorFileType;
  saveTypes: FilePickerAcceptType[] = [];

  #tabContentView: React.ReactElement = (<></>);

  #_onSaveStateChanged: (file: EditorFileType) => void;
  #_onNameChanged: (file: EditorFileType) => void;
  #_onKeyDown: (e: KeyboardEvent) => void;
  #_onKeyUp: (e: KeyboardEvent) => void;

  constructor(options: BaseTabStateOptions = {}){
    super();
    this.isDestroyed = false;

    options = Object.assign({
      enableLayoutContainers: false,
      closeable: true,
      editorFile: undefined,
      singleInstance: false,
    }, options);

    this.id = GetNewTabID();

    if(options.singleInstance){
      this.singleInstance = true;
    }

    if(isEditorFile(options.editorFile)){
      this.file = options.editorFile;
    }

    this.visible = false;

    if(options.closeable){
      this.isClosable = options.closeable;
    }

    this.#_onSaveStateChanged = (file: EditorFileType) => {
      this.editorFileUpdated();
    }

    this.#_onNameChanged = (file: EditorFileType) => {
      this.editorFileUpdated();
    }

    if(isEditorFile(this.file)){
      this.file.addEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', this.#_onSaveStateChanged);
      this.file.addEventListener<EditorFileEventListenerTypes>('onNameChanged', this.#_onNameChanged);
    }

    this.#_onKeyDown = (e: KeyboardEvent) => {
      this.processEventListener('onKeyDown', [e, this]);
    };

    this.#_onKeyUp = (e: KeyboardEvent) => {
      this.processEventListener('onKeyUp', [e, this]);
    };

    this.editorFileUpdated();
  }

  getProperty<K extends keyof this>(property: K): this[K] {
    return this[property];
  }

  setProperty<K extends keyof this>(property: K, value: this[K]): this[K] {
    const old = this[property];
    this[property] = value;
    this.processEventListener('onPropertyChange', [property, value, old]);
    return value;
  }

  attachTabContentView(view: React.ReactElement) {
    this.#tabContentView = view;
  }

  editorFileUpdated(){
    if(isEditorFile(this.file)){
      log.trace('editor file updated', this.file.resref, this.file.ext, this.file);
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

  setContentView(tabContentView: React.ReactElement){
    this.#tabContentView = tabContentView;
  }

  render(){
    if(!this.#tabContentView) return (<></>);
    return this.#tabContentView;
  }

  getResourceID(): string | undefined {
    return undefined;
  }

  getFile(): EditorFileType {
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

    // Attach keyboard event listeners
    window.addEventListener('keydown', this.#_onKeyDown);
    window.addEventListener('keyup', this.#_onKeyUp);
  }

  hide(){
    this.visible = false;
    this.#tabManager.triggerEventListener('onTabHide', [this]);
    this.processEventListener('onTabHide', [this]);

    // Remove keyboard event listeners
    window.removeEventListener('keydown', this.#_onKeyDown);
    window.removeEventListener('keyup', this.#_onKeyUp);
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

    // Remove keyboard event listeners if tab is still visible
    if(this.visible){
      window.removeEventListener('keydown', this.#_onKeyDown);
      window.removeEventListener('keyup', this.#_onKeyUp);
    }

    this.processEventListener('onTabDestroyed', [this]);
  }

  getExportTypes(){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      return supportedFileDialogTypes;
    }else{
      return supportedFilePickerTypes;
    }
  }


  /** Sync tab state to file buffer. Override in subclasses (e.g. GFF editors). */
  updateFile(){
  }

  async save() {
    const currentFile = this.getFile();
    if(currentFile.archive_path || currentFile.archive_path2){
      return this.saveAs();
    }
    const hostAdapter = getForgeState().getHostAdapter();
    if (hostAdapter) {
      try {
        const pathInfo = pathParse(currentFile.path || currentFile.getFilename() || 'file');
        const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
        await hostAdapter.requestSave(this, saveBuffer);
        currentFile.buffer = saveBuffer;
        currentFile.unsaved_changes = false;
        return true;
      } catch (e) {
        log.error(String(e), e);
        return false;
      }
    }
    return new Promise<boolean>( async (resolve, _reject) => {
      try{
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
          if(currentFile.path?.length){
            log.debug('saveFile', currentFile.path);
            //trigger a Save
            try{
              const pathInfo = pathParse(currentFile.path);
              const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
              fs.writeFile(currentFile.path, saveBuffer, () => {
                currentFile.buffer = saveBuffer;
                currentFile.unsaved_changes = false;
                resolve(true);
              });
            }catch(e){
              log.error(String(e), e);
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
                  const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
                  const ws: FileSystemWritableFileStream = await currentFile.handle.createWritable();
                  await ws.write(saveBuffer);
                  currentFile.buffer = saveBuffer;
                  currentFile.unsaved_changes = false;
                  await ws.close();
                  resolve(true);
                }catch(e){
                  log.error(String(e), e);
                  resolve(false);
                }
              }else{
                log.error('Write permissions could not be obtained to save this file');
                resolve(false);
              }
            }else{
              const newHandle = await window.showSaveFilePicker({
                suggestedName: currentFile.getFilename(),
                types: this.saveTypes.length ? this.saveTypes : undefined
              });
              if(newHandle){
                currentFile.handle = newHandle;
                try{
                  const ws: FileSystemWritableFileStream = await newHandle.createWritable();
                  const pathInfo = pathParse(newHandle.name);
                  const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
                  await ws.write(saveBuffer ?? new Uint8Array(0));
                  await ws.close();
                  currentFile.buffer = saveBuffer;
                  currentFile.unsaved_changes = false;
                  resolve(true);
                }catch(e){
                  log.error(String(e), e);
                  resolve(false);
                }
              }else{
                log.error('save handle invalid');
                resolve(false);
              }
            }
          }catch(e){
            log.error(String(e), e);
            resolve(false);
          }
        }
      }catch(e){
        log.error(String(e), e);
        resolve(false);
      }
    });
  }

  getSaveTypes(): FilePickerAcceptType[] | Array<{ name: string; extensions: string[] }> | undefined {
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      return this.saveTypes.length ? Object.values(this.saveTypes.map( (type) => {
        const accept = type.accept as Record<string, string | string[]>;
        return {
          name: type.description,
          extensions: Object.keys(accept).map( (node) => {
            const accepted = accept[node];
            return typeof accepted === 'string' ? accepted.replace('.', '') : accepted.map( (entry) => entry.replace('.', ''));
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
    log.trace('fileTypes', this.getSaveTypes());
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
            log.debug('savePath', savePath.filePath);
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
              log.error(String(e), e);
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
              await ws.write(saveBuffer ?? new Uint8Array(0));
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
              log.error(String(e), e);
              resolve(false);
            }
          }else{
            log.error('save handle invalid');
            resolve(false);
          }
        }
      }catch(e: unknown){
        log.error(String(e), e);
        resolve(false);
      }
    });
  }

  /** Compile (e.g. NSS to NCS). Override in TabTextEditorState; base returns false. */
  async compile(): Promise<boolean> {
    return false;
  }

  storeState(): TabStoreState {
    return {
      type: this.type,
      file: this.file
    };
  }

}
