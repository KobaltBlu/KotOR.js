import React from 'react';

import { TabDLGEditor } from '@/apps/forge/components/tabs/tab-dlg-editor/TabDLGEditor';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import * as KotOR from '@/apps/forge/KotOR';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabDLGEditorState extends TabState {
  tabName: string = 'DLG Editor';
  dlg?: KotOR.DLGObject;
  selectedNode?: KotOR.DLGNode;
  selectedNodeIndex: number = -1;
  selectedNodeType: 'starting' | 'entry' | 'reply' | null = null;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabDLGEditorState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabDLGEditorState constructor tabName', this.tabName);
    }

    this.saveTypes = [
      {
        description: 'Dialog File',
        accept: {
          'application/octet-stream': ['.dlg'],
        },
      },
    ];

    this.setContentView(<TabDLGEditor tab={this}></TabDLGEditor>);
    this.openFile();
    log.trace('TabDLGEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabDLGEditorState openFile entry');
    if (this.file) {
      const response = await this.file.readFile();
      log.debug('TabDLGEditorState openFile readFile done', response.buffer?.length ?? 0);
      const gff = new KotOR.GFFObject(response.buffer);
      this.dlg = KotOR.DLGObject.FromGFFObject(gff);
      this.processEventListener('onEditorFileLoad', [this]);
      log.trace('TabDLGEditorState openFile dlg loaded');
    } else {
      log.trace('TabDLGEditorState openFile no file');
    }
    log.trace('TabDLGEditorState openFile exit');
  }

  selectNode(node: KotOR.DLGNode | undefined, index: number, type: 'starting' | 'entry' | 'reply' | null) {
    log.trace('TabDLGEditorState selectNode', index, type);
    this.selectedNode = node;
    this.selectedNodeIndex = index;
    this.selectedNodeType = type;
    this.processEventListener('onNodeSelected', [node, index, type]);
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabDLGEditorState getExportBuffer');
    if (this.dlg && this.dlg.gff) {
      const buf = this.dlg.gff.getExportBuffer();
      log.debug('TabDLGEditorState getExportBuffer length', buf?.length ?? 0);
      return buf;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabDLGEditorState updateFile');
  }

  getResourceID(): string | undefined {
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabDLGEditorState getResourceID', id ?? '(none)');
    return id;
  }
}
