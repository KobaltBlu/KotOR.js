import React from "react";

import { TabAREEditor } from "@/apps/forge/components/tabs/tab-are-editor/TabAREEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import type { GFFFieldValue } from "@/apps/forge/interfaces/GFFFormField";
import * as KotOR from "@/apps/forge/KotOR";
import { UndoManager } from "@/apps/forge/managers/UndoManager";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabAREEditorState extends TabState {
  tabName: string = 'ARE Editor';
  are?: KotOR.GFFObject;
  activeTab: string = 'basic';
  undoManager: UndoManager = new UndoManager();

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabAREEditorState constructor entry');
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug('TabAREEditorState constructor tabName', this.tabName);
    }

    this.saveTypes = [
      {
        description: 'Area File',
        accept: {
          'application/octet-stream': ['.are']
        }
      }
    ];

    this.setContentView(<TabAREEditor tab={this}></TabAREEditor>);
    this.openFile();
    log.trace('TabAREEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabAREEditorState openFile entry');
    if(this.file){
      const response = await this.file.readFile();
      log.debug('TabAREEditorState openFile readFile done', response.buffer?.length ?? 0);
      this.are = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
      log.trace('TabAREEditorState openFile are loaded');
    } else {
      log.trace('TabAREEditorState openFile no file');
    }
    log.trace('TabAREEditorState openFile exit');
  }

  setActiveTab(tab: string) {
    log.trace('TabAREEditorState setActiveTab', tab);
    this.activeTab = tab;
    this.processEventListener('onTabChange', [tab]);
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabAREEditorState getExportBuffer');
    if(this.are){
      const buf = this.are.getExportBuffer();
      log.debug('TabAREEditorState getExportBuffer length', buf?.length ?? 0);
      return buf;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabAREEditorState updateFile');
  }

  markDataChanged() {
    if (this.file) {
      this.file.unsaved_changes = true;
    }
    this.processEventListener('onEditorFileLoad', [this]);
  }

  setFieldValue(struct: KotOR.GFFStruct | undefined, label: string, value: GFFFieldValue): void {
    const field = struct?.getFieldByLabel(label);
    if (!field) return;

    const previousValue = field.getValue();
    if (previousValue === value) return;

    if (typeof previousValue === 'object' || typeof value === 'object') {
      field.setValue(value);
      this.markDataChanged();
      return;
    }

    this.undoManager.execute({
      type: 'are-field-edit',
      description: `Edit ${label}`,
      redo: () => {
        field.setValue(value);
        this.markDataChanged();
      },
      undo: () => {
        field.setValue(previousValue as GFFFieldValue);
        this.markDataChanged();
      }
    });
  }

  undo() {
    this.undoManager.undo();
    this.processEventListener('onEditorFileLoad', [this]);
  }

  redo() {
    this.undoManager.redo();
    this.processEventListener('onEditorFileLoad', [this]);
  }

  getResourceID(): string | undefined {
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabAREEditorState getResourceID', id ?? '(none)');
    return id;
  }
}
