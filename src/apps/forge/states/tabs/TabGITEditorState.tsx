import React from "react";

import { TabGITEditor } from "@/apps/forge/components/tabs/tab-git-editor/TabGITEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { UndoManager } from "@/apps/forge/managers/UndoManager";
import { InsertInstanceResourceType } from "@/apps/forge/states/modal/ModalInsertInstanceState";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabGITEditorState extends TabState {
  tabName: string = 'GIT Editor';
  git?: KotOR.GFFObject;
  selectedInstance?: KotOR.GFFStruct;
  selectedInstanceType: string = '';
  selectedInstanceIndex: number = -1;
  undoManager: UndoManager = new UndoManager(200);

  static readonly INSTANCE_FIELD_BY_EXT: Record<InsertInstanceResourceType, string> = {
    utc: 'Creature List',
    utd: 'Door List',
    utp: 'Placeable List',
    ute: 'Encounter List',
    uts: 'SoundList',
    utm: 'StoreList',
    utt: 'TriggerList',
    utw: 'WaypointList',
  };

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabGITEditorState constructor entry');
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug('TabGITEditorState constructor tabName', this.tabName);
    }

    this.saveTypes = [
      {
        description: 'Game Instance Template',
        accept: {
          'application/octet-stream': ['.git']
        }
      }
    ];

    this.setContentView(<TabGITEditor tab={this}></TabGITEditor>);
    this.openFile();
    log.trace('TabGITEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabGITEditorState openFile entry');
    if(this.file){
      const response = await this.file.readFile();
      log.debug('TabGITEditorState openFile readFile done', response.buffer?.length ?? 0);
      this.git = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
      log.trace('TabGITEditorState openFile git loaded');
    } else {
      log.trace('TabGITEditorState openFile no file');
    }
    log.trace('TabGITEditorState openFile exit');
  }

  selectInstance(instance: KotOR.GFFStruct | undefined, type: string, index: number) {
    log.trace('TabGITEditorState selectInstance', type, index);
    this.selectedInstance = instance;
    this.selectedInstanceType = type;
    this.selectedInstanceIndex = index;
    this.processEventListener('onInstanceSelected', [instance, type, index]);
  }

  private markDataChanged() {
    if (this.file) {
      this.file.unsaved_changes = true;
    }
    this.processEventListener('onEditorFileLoad', [this]);
  }

  undo(): boolean {
    const changed = this.undoManager.undo();
    if (changed) {
      this.markDataChanged();
    }
    return changed;
  }

  redo(): boolean {
    const changed = this.undoManager.redo();
    if (changed) {
      this.markDataChanged();
    }
    return changed;
  }

  private ensureInstanceListField(fieldLabel: string): KotOR.GFFField | undefined {
    if (!this.git) return;

    let listField = this.git.RootNode.getFieldByLabel(fieldLabel);
    if (!listField) {
      listField = this.git.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, fieldLabel));
    }
    return listField;
  }

  private createInstanceStruct(ext: InsertInstanceResourceType, resref: string): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(0);

    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', resref));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', 0));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', 0));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', 0));

    if (ext === 'utd' || ext === 'utp' || ext === 'utt' || ext === 'utw') {
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', resref));
    }

    if (ext === 'utc' || ext === 'utd' || ext === 'utp' || ext === 'utm' || ext === 'utw') {
      instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Bearing', 0));
    }

    return instance;
  }

  addInstanceFromBlueprint(resref: string, ext: InsertInstanceResourceType): boolean {
    if (!this.git || !resref) return false;

    const listFieldLabel = TabGITEditorState.INSTANCE_FIELD_BY_EXT[ext];
    if (!listFieldLabel) return false;

    const listField = this.ensureInstanceListField(listFieldLabel);
    if (!listField) return false;

    const instance = this.createInstanceStruct(ext, resref);
    this.undoManager.execute({
      type: 'git-add-instance',
      description: `Add ${ext.toUpperCase()} instance`,
      redo: () => {
        listField.addChildStruct(instance);
        const nextIndex = listField.getChildStructs().length - 1;
        this.selectInstance(instance, listFieldLabel, nextIndex);
      },
      undo: () => {
        const list = listField.getChildStructs();
        const idx = list.indexOf(instance);
        if (idx >= 0) {
          list.splice(idx, 1);
        }
        if (list.length) {
          const nextIndex = Math.max(0, Math.min(idx, list.length - 1));
          this.selectInstance(list[nextIndex], listFieldLabel, nextIndex);
        } else {
          this.selectInstance(undefined, '', -1);
        }
      }
    });
    this.markDataChanged();
    return true;
  }

  deleteSelectedInstance(): boolean {
    if (!this.git || !this.selectedInstance || !this.selectedInstanceType || this.selectedInstanceIndex < 0) {
      return false;
    }

    const listField = this.git.RootNode.getFieldByLabel(this.selectedInstanceType);
    if (!listField) return false;

    const list = listField.getChildStructs();
    if (this.selectedInstanceIndex >= list.length) return false;

    const removedInstance = list[this.selectedInstanceIndex];
    const removedIndex = this.selectedInstanceIndex;
    const type = this.selectedInstanceType;
    this.undoManager.execute({
      type: 'git-delete-instance',
      description: 'Delete instance',
      redo: () => {
        list.splice(removedIndex, 1);
        if (list.length > 0) {
          const nextIndex = Math.min(removedIndex, list.length - 1);
          this.selectInstance(list[nextIndex], type, nextIndex);
        } else {
          this.selectInstance(undefined, '', -1);
        }
      },
      undo: () => {
        list.splice(removedIndex, 0, removedInstance);
        this.selectInstance(removedInstance, type, removedIndex);
      }
    });
    this.markDataChanged();
    return true;
  }

  duplicateSelectedInstance(): boolean {
    if (!this.git || !this.selectedInstanceType || this.selectedInstanceIndex < 0) {
      return false;
    }

    const listField = this.git.RootNode.getFieldByLabel(this.selectedInstanceType);
    if (!listField) return false;

    const list = listField.getChildStructs();
    if (this.selectedInstanceIndex >= list.length) return false;

    // Clone through binary round-trip to preserve all nested fields and types.
    const clonedGit = new KotOR.GFFObject(this.git.getExportBuffer());
    const clonedList = clonedGit.RootNode.getFieldByLabel(this.selectedInstanceType)?.getChildStructs();
    const clonedStruct = clonedList?.[this.selectedInstanceIndex];
    if (!clonedStruct) return false;

    const tagField = clonedStruct.getFieldByLabel('Tag');
    if (tagField) {
      const tag = String(tagField.getValue() || '').trim();
      if (tag.length > 0) {
        tagField.setValue(`${tag}_copy`.slice(0, 32));
      }
    }

    const insertIndex = this.selectedInstanceIndex + 1;
    const type = this.selectedInstanceType;
    this.undoManager.execute({
      type: 'git-duplicate-instance',
      description: 'Duplicate instance',
      redo: () => {
        list.splice(insertIndex, 0, clonedStruct);
        this.selectInstance(clonedStruct, type, insertIndex);
      },
      undo: () => {
        const idx = list.indexOf(clonedStruct);
        if (idx >= 0) {
          list.splice(idx, 1);
        }
        const sourceIndex = Math.max(0, Math.min(this.selectedInstanceIndex, list.length - 1));
        if (list.length) {
          this.selectInstance(list[sourceIndex], type, sourceIndex);
        } else {
          this.selectInstance(undefined, '', -1);
        }
      }
    });
    this.markDataChanged();
    return true;
  }

  moveSelectedInstanceUp(): boolean {
    if (!this.git || !this.selectedInstanceType || this.selectedInstanceIndex <= 0) {
      return false;
    }

    const listField = this.git.RootNode.getFieldByLabel(this.selectedInstanceType);
    if (!listField) return false;

    const list = listField.getChildStructs();
    if (this.selectedInstanceIndex >= list.length) return false;

    const index = this.selectedInstanceIndex;
    const type = this.selectedInstanceType;
    this.undoManager.execute({
      type: 'git-move-instance-up',
      description: 'Move instance up',
      redo: () => {
        const prev = list[index - 1];
        list[index - 1] = list[index];
        list[index] = prev;
        this.selectInstance(list[index - 1], type, index - 1);
      },
      undo: () => {
        const current = list[index - 1];
        list[index - 1] = list[index];
        list[index] = current;
        this.selectInstance(list[index], type, index);
      }
    });
    this.markDataChanged();
    return true;
  }

  moveSelectedInstanceDown(): boolean {
    if (!this.git || !this.selectedInstanceType || this.selectedInstanceIndex < 0) {
      return false;
    }

    const listField = this.git.RootNode.getFieldByLabel(this.selectedInstanceType);
    if (!listField) return false;

    const list = listField.getChildStructs();
    if (this.selectedInstanceIndex >= list.length - 1) return false;

    const index = this.selectedInstanceIndex;
    const type = this.selectedInstanceType;
    this.undoManager.execute({
      type: 'git-move-instance-down',
      description: 'Move instance down',
      redo: () => {
        const next = list[index + 1];
        list[index + 1] = list[index];
        list[index] = next;
        this.selectInstance(list[index + 1], type, index + 1);
      },
      undo: () => {
        const current = list[index + 1];
        list[index + 1] = list[index];
        list[index] = current;
        this.selectInstance(list[index], type, index);
      }
    });
    this.markDataChanged();
    return true;
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabGITEditorState getExportBuffer');
    if(this.git){
      const buf = this.git.getExportBuffer();
      log.debug('TabGITEditorState getExportBuffer length', buf?.length ?? 0);
      return buf;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabGITEditorState updateFile');
  }

  getResourceID(): string | undefined {
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabGITEditorState getResourceID', id ?? '(none)');
    return id;
  }
}
