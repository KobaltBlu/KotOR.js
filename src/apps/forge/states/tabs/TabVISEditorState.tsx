import React from 'react';

import { TabVISEditor } from '@/apps/forge/components/tabs/tab-vis-editor/TabVISEditor';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import * as KotOR from '@/apps/forge/KotOR';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabVISEditorState extends TabState {
  tabName: string = 'VIS Editor';
  vis?: KotOR.VISObject;
  selectedRoomName?: string;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabVISEditorState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabVISEditorState constructor tabName', this.tabName);
    } else {
      log.trace('TabVISEditorState constructor no file');
    }

    this.saveTypes = [
      {
        description: 'Visibility File',
        accept: {
          'text/plain': ['.vis'],
        },
      },
    ];
    log.trace('TabVISEditorState constructor saveTypes set');

    this.setContentView(<TabVISEditor tab={this}></TabVISEditor>);
    log.trace('TabVISEditorState constructor setContentView');
    this.openFile();
    log.trace('TabVISEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabVISEditorState openFile entry');
    if (this.file) {
      log.trace('TabVISEditorState openFile readFile');
      const response = await this.file.readFile();
      log.debug('TabVISEditorState openFile buffer length', response?.buffer?.length);
      this.vis = new KotOR.VISObject(response.buffer);
      this.vis.read();
      log.trace('TabVISEditorState openFile VIS read');
      this.processEventListener('onEditorFileLoad', [this]);
      log.info('TabVISEditorState openFile loaded');
    } else {
      log.trace('TabVISEditorState openFile no file');
    }
    log.trace('TabVISEditorState openFile exit');
  }

  selectRoom(roomName: string | undefined) {
    log.trace('TabVISEditorState selectRoom entry', roomName);
    this.selectedRoomName = roomName;
    this.processEventListener('onRoomSelected', [roomName]);
    log.trace('TabVISEditorState selectRoom exit');
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabVISEditorState getExportBuffer entry');
    if (this.vis) {
      const buf = this.vis.toBuffer();
      log.trace('TabVISEditorState getExportBuffer length', buf?.length);
      return buf;
    }
    log.trace('TabVISEditorState getExportBuffer no vis return empty');
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabVISEditorState updateFile (no-op)');
  }

  getResourceID(): string | undefined {
    log.trace('TabVISEditorState getResourceID');
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabVISEditorState getResourceID', id);
    return id;
  }
}
