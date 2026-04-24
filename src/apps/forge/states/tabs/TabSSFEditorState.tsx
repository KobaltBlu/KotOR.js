import React from 'react';

import { TabSSFEditor } from '@/apps/forge/components/tabs/tab-ssf-editor/TabSSFEditor';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import * as KotOR from '@/apps/forge/KotOR';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabSSFEditorState extends TabState {
  tabName: string = 'SSF Editor';
  ssf?: KotOR.SSFObject;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabSSFEditorState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabSSFEditorState constructor tabName', this.tabName);
    } else {
      log.trace('TabSSFEditorState constructor no file');
    }

    this.saveTypes = [
      {
        description: 'Sound Set File',
        accept: {
          'application/octet-stream': ['.ssf'],
        },
      },
    ];
    log.trace('TabSSFEditorState constructor saveTypes set');

    this.setContentView(<TabSSFEditor tab={this}></TabSSFEditor>);
    log.trace('TabSSFEditorState constructor setContentView');
    this.openFile();
    log.trace('TabSSFEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabSSFEditorState openFile entry');
    if (this.file) {
      log.trace('TabSSFEditorState openFile readFile');
      const response = await this.file.readFile();
      log.debug('TabSSFEditorState openFile buffer length', response?.buffer?.length);
      this.ssf = new KotOR.SSFObject(response.buffer);
      log.trace('TabSSFEditorState openFile SSFObject created');
      this.processEventListener('onEditorFileLoad', [this]);
      log.info('TabSSFEditorState openFile loaded');
    } else {
      log.trace('TabSSFEditorState openFile no file');
    }
    log.trace('TabSSFEditorState openFile exit');
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabSSFEditorState getExportBuffer entry');
    if (this.ssf) {
      const buf = this.ssf.toBuffer();
      log.trace('TabSSFEditorState getExportBuffer length', buf?.length);
      return buf;
    }
    log.trace('TabSSFEditorState getExportBuffer no ssf return empty');
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabSSFEditorState updateFile (no-op)');
  }

  getResourceID(): string | undefined {
    log.trace('TabSSFEditorState getResourceID');
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabSSFEditorState getResourceID', id);
    return id;
  }
}
