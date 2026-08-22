import React from "react";
import { EditorFile, EditorFileEventListenerTypes } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { EditorTabManager } from "@/apps/forge/managers/EditorTabManager";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import * as fs from "fs";
import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { supportedFileDialogTypes, supportedFilePickerTypes } from "@/apps/forge/ForgeFileSystem";

import * as KotOR from "@/apps/forge/KotOR";
import { TabStoreState } from "@/apps/forge/interfaces/TabStoreState";
import { pathParse } from "@/apps/forge/helpers/PathParse";
import { getSessionSettings } from "@/apps/forge/settings/forgeSessionSettings";
import {
  ForgeStatusBarItem,
  ForgeStatusBarState,
} from "@/apps/forge/states/ForgeStatusBarState";
declare const dialog: any;

export type TabStateEventListenerTypes =
  'onTabDestroyed'|'onTabRemoved'|'onTabShow'|'onTabHide'|'onTabNameChange'|'onEditorFileLoad'|'onEditorFileChange'|'onEditorFileSaved'|'onKeyDown'|'onKeyUp'|'onUndoApplied'|'onRedoApplied'|'onHistoryChanged'|'onCompile'|'onDiffModeChanged'|'onRevealNss'|'onRevealNcs';

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
  onUndoApplied: Function[],
  onRedoApplied: Function[],
  onHistoryChanged: Function[],
}

export interface UpdateFileOptions {
  skipHistory?: boolean;
  coalesceKey?: string;
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

  /** Status bar item ids published by this tab (`tab:{id}:…`). */
  #statusBarItemIds: string[] = [];
  
  #tabContentView: JSX.Element = (<></>);

  #_onSaveStateChanged: (file: EditorFile) => void;
  #_onNameChanged: (file: EditorFile) => void;
  #_onKeyDown: (e: KeyboardEvent) => void;
  #_onKeyUp: (e: KeyboardEvent) => void;

  /** Undo/redo snapshot stacks. Subclasses store whatever type they need. */
  protected undoStack: any[] = [];
  protected redoStack: any[] = [];
  protected suppressUndoCapture: boolean = false;
  protected undoCoalesceKey: string | null = null;
  protected undoCoalesceTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Push the current state onto the undo stack before making a change.
   * Subclasses must override `captureUndoState()` to return the current
   * snapshot. Clears the redo stack on every new change.
   */
  captureUndoSnapshot(): void {
    this.undoCoalesceKey = null;
    if (this.undoCoalesceTimer !== undefined) {
      clearTimeout(this.undoCoalesceTimer);
      this.undoCoalesceTimer = undefined;
    }
    if (this.suppressUndoCapture) return;
    const state = this.captureUndoState();
    if (state === undefined) return;
    this.undoStack.push(state);
    this.redoStack = [];
    this.processEventListener('onHistoryChanged', []);
  }

  /**
   * Snapshot once per `key` until `delayMs` elapses. Later edits with the
   * same key (typing, sliders) stay one undo step.
   */
  captureCoalescedUndo(key: string, delayMs: number = 400): void {
    if (this.suppressUndoCapture) return;
    if (this.undoCoalesceKey !== key) {
      this.captureUndoSnapshot();
      this.undoCoalesceKey = key;
    }
    if (this.undoCoalesceTimer !== undefined) {
      clearTimeout(this.undoCoalesceTimer);
    }
    this.undoCoalesceTimer = setTimeout(() => {
      this.undoCoalesceKey = null;
      this.undoCoalesceTimer = undefined;
    }, delayMs);
  }

  /** Return the current state as a snapshot. Override in subclasses. */
  protected captureUndoState(): any {
    return undefined;
  }

  /** Restore a snapshot produced by `captureUndoState`. Override in subclasses. */
  protected applyUndoState(_state: any): void {
    // subclass responsibility
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    const current = this.captureUndoState();
    if (current !== undefined) {
      this.redoStack.push(current);
    }
    const snapshot = this.undoStack.pop()!;
    this.suppressUndoCapture = true;
    this.applyUndoState(snapshot);
    this.suppressUndoCapture = false;
    this.processEventListener('onUndoApplied', [snapshot]);
    this.processEventListener('onHistoryChanged', []);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const current = this.captureUndoState();
    if (current !== undefined) {
      this.undoStack.push(current);
    }
    const snapshot = this.redoStack.pop()!;
    this.suppressUndoCapture = true;
    this.applyUndoState(snapshot);
    this.suppressUndoCapture = false;
    this.processEventListener('onRedoApplied', [snapshot]);
    this.processEventListener('onHistoryChanged', []);
  }

  clearUndoHistory(): void {
    this.undoCoalesceKey = null;
    if (this.undoCoalesceTimer !== undefined) {
      clearTimeout(this.undoCoalesceTimer);
      this.undoCoalesceTimer = undefined;
    }
    this.undoStack = [];
    this.redoStack = [];
    this.processEventListener('onHistoryChanged', []);
  }

  /**
   * Return `true` if the base class should handle Ctrl+Z / Ctrl+Y for this
   * key event. Override to return `false` when another element (e.g. Monaco
   * editor) should handle undo/redo natively for that event.
   * Default: returns `true` only if `captureUndoState()` is overridden.
   */
  protected shouldHandleUndoKeyboard(_e: KeyboardEvent): boolean {
    return this.captureUndoState() !== undefined || this.undoStack.length > 0 || this.redoStack.length > 0;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get canCompile(): boolean {
    return false;
  }

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
    
    this.#_onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && this.shouldHandleUndoKeyboard(e)) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) { this.redo(); } else { this.undo(); }
        } else if (e.key === 'y') {
          e.preventDefault();
          this.redo();
        }
      }
      this.processEventListener('onKeyDown', [e, this]);
    };
    
    this.#_onKeyUp = (e: KeyboardEvent) => {
      this.processEventListener('onKeyUp', [e, this]);
    };
    
    this.editorFileUpdated();
  }

  getProperty(property: keyof this): any{
    return (this as any)[property];
  }

  setProperty(property: keyof this, value: any){
    const old = (this as any)[property];
    (this as any)[property] = value;
    this.processEventListener('onPropertyChange', [property, value, old]);
    return value;
  }

  attachTabContentView(view: any){
    this.#tabContentView = view;
  }

  editorFileUpdated(){
    if(this.file instanceof EditorFile){
      console.log('editor file updated', this.file.resref, this.file.ext, this.file)
      this.setTabName(`${this.file.resref}.${this.file.ext}`);
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
    
    // Attach keyboard event listeners
    window.addEventListener('keydown', this.#_onKeyDown);
    window.addEventListener('keyup', this.#_onKeyUp);
  }

  /**
   * Contribute items to the Forge status bar. Replaces this tab's previous items.
   * Ids are prefixed with `tab:{this.id}:`. Cleared on hide/destroy unless
   * `keepOnHide` is set (rare — prefer a global `ForgeStatusBarState.setItem`).
   */
  setStatusBarItems(
    items: Array<Omit<ForgeStatusBarItem, "id"> & { id?: string }>,
  ): void {
    this.clearStatusBarItems();
    const nextIds: string[] = [];
    for (const item of items) {
      const raw = String(item.id ?? "item").trim() || "item";
      const id = raw.startsWith(`tab:${this.id}:`) ? raw : `tab:${this.id}:${raw}`;
      ForgeStatusBarState.setItem({
        ...item,
        id,
      });
      nextIds.push(id);
    }
    this.#statusBarItemIds = nextIds;
  }

  clearStatusBarItems(): void {
    if (!this.#statusBarItemIds.length) {
      ForgeStatusBarState.removeByPrefix(`tab:${this.id}:`);
      return;
    }
    for (const id of this.#statusBarItemIds) {
      ForgeStatusBarState.removeItem(id);
    }
    this.#statusBarItemIds = [];
  }

  hide(){
    this.visible = false;
    this.clearStatusBarItems();
    this.#tabManager.triggerEventListener('onTabHide', [this]);
    this.processEventListener('onTabHide', [this]);
    
    // Remove keyboard event listeners
    window.removeEventListener('keydown', this.#_onKeyDown);
    window.removeEventListener('keyup', this.#_onKeyUp);
  }

  remove(options?: { skipUnsavedConfirm?: boolean }){
    if(
      !options?.skipUnsavedConfirm
      && this.isClosable
      && this.file?.unsaved_changes
      && getSessionSettings().confirmCloseUnsaved
    ){
      const ok = typeof window === "undefined"
        || window.confirm(`Close "${this.tabName}" without saving?`);
      if(!ok){
        return;
      }
    }
    this.visible = false;
    this.clearStatusBarItems();
    if(ForgeState.project && this.file instanceof EditorFile){
      ForgeState.project.removeFromOpenFileList(this.file);
    }
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
    this.clearStatusBarItems();
    
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

  getSaveSuggestedName(): string {
    return this.getFile()?.getFilename() ?? 'untitled';
  }


  updateFile(_options?: UpdateFileOptions){
    //stub method to be overridden by subclasses
  }

  async save() {
    let currentFile = this.getFile();
    if(currentFile.archive_path || currentFile.archive_path2){
      return this.saveAs();
    }
    try{
      const pathInfo = pathParse(this.getSaveSuggestedName());
      const saveBuffer = await this.getExportBuffer(pathInfo.name, pathInfo.ext);
      const ok = await currentFile.writeBuffer(saveBuffer);
      if(ok){
        return true;
      }
    }catch(e){
      console.error(e);
    }
    return this.saveAs();
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
            defaultPath: this.getSaveSuggestedName(),
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
                // Preserve original in recent files before mutating (Save As replaces the file object's path)
                const originalPath = currentFile.getPath();
                if(originalPath){
                  ForgeState.addRecentFile(EditorFile.From(currentFile));
                }
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
            suggestedName: this.getSaveSuggestedName(),
            types: this.getSaveTypes(),
          });
          if(newHandle){
            // Preserve original in recent files before mutating (Save As replaces the file object's path)
            const originalPath = currentFile.getPath();
            if(originalPath){
              ForgeState.addRecentFile(EditorFile.From(currentFile));
            }
            currentFile.handle = newHandle;
            try{
              const pathInfo = pathParse(newHandle.name);
              currentFile.setPath(EditorFile.referenceURIForSystemVirtualName(newHandle.name));
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