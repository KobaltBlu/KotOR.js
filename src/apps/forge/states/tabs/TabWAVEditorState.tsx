import React from 'react';

import { TabWAVEditor } from '@/apps/forge/components/tabs/tab-wav-editor/TabWAVEditor';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { WAVObject } from '@/resource/WAVObject';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabWAVEditorState extends TabState {
  tabName: string = 'WAV Editor';
  saveTypes: { description: string; accept: Record<string, string[]> }[] = [
    {
      description: 'Wave Audio',
      accept: {
        'application/octet-stream': ['.wav'],
      },
    },
  ];
  wavObject?: WAVObject;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabWAVEditorState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabWAVEditorState constructor tabName', this.tabName);
    }

    this.setContentView(<TabWAVEditor tab={this}></TabWAVEditor>);
    this.openFile();
    log.trace('TabWAVEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabWAVEditorState openFile entry');
    if (!this.file) {
      log.trace('TabWAVEditorState openFile no file');
      return;
    }
    const response = await this.file.readFile();
    this.wavObject = new WAVObject(response.buffer);
    this.processEventListener('onEditorFileLoad', [this]);
    log.trace('TabWAVEditorState openFile loaded');
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabWAVEditorState getExportBuffer');
    if (this.wavObject) {
      return this.wavObject.toBuffer();
    }
    if (this.file?.buffer) {
      return this.file.buffer;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabWAVEditorState updateFile');
  }

  getResourceID(): string | undefined {
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabWAVEditorState getResourceID', id ?? '(none)');
    return id;
  }
}
