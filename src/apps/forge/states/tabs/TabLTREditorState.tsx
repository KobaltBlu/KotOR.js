import React from 'react';

import { TabLTREditor } from '@/apps/forge/components/tabs/tab-ltr-editor/TabLTREditor';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import * as KotOR from '@/apps/forge/KotOR';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabLTREditorState extends TabState {
  tabName: string = 'LTR Editor';
  ltr?: KotOR.LTRObject;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabLTREditorState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabLTREditorState constructor tabName', this.tabName);
    } else {
      log.trace('TabLTREditorState constructor no file');
    }

    this.saveTypes = [
      {
        description: 'Letter/Name Generator File',
        accept: {
          'application/octet-stream': ['.ltr'],
        },
      },
    ];
    log.trace('TabLTREditorState constructor saveTypes set');

    this.setContentView(<TabLTREditor tab={this}></TabLTREditor>);
    log.trace('TabLTREditorState constructor setContentView');
    this.openFile();
    log.trace('TabLTREditorState constructor exit');
  }

  async openFile() {
    log.trace('TabLTREditorState openFile entry');
    if (this.file) {
      log.trace('TabLTREditorState openFile readFile');
      const response = await this.file.readFile();
      log.debug('TabLTREditorState openFile buffer length', response?.buffer?.length);
      this.ltr = new KotOR.LTRObject(response.buffer);
      log.trace('TabLTREditorState openFile LTRObject created');
      this.processEventListener('onEditorFileLoad', [this]);
      log.info('TabLTREditorState openFile loaded');
    } else {
      log.trace('TabLTREditorState openFile no file');
    }
    log.trace('TabLTREditorState openFile exit');
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabLTREditorState getExportBuffer entry');
    if (this.ltr) {
      const buf = this.ltr.toBuffer();
      log.trace('TabLTREditorState getExportBuffer from ltr length', buf?.length);
      return buf;
    }
    if (this.file?.buffer) {
      log.trace('TabLTREditorState getExportBuffer from file.buffer');
      return this.file.buffer;
    }
    log.trace('TabLTREditorState getExportBuffer return empty');
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabLTREditorState updateFile (no-op)');
  }

  getResourceID(): string | undefined {
    log.trace('TabLTREditorState getResourceID');
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabLTREditorState getResourceID', id);
    return id;
  }
}
