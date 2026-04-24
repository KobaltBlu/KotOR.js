import React from 'react';

import { TabFACEditor } from '@/apps/forge/components/tabs/tab-fac-editor/TabFACEditor';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import * as KotOR from '@/apps/forge/KotOR';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabFACEditorState extends TabState {
  tabName: string = 'FAC Editor';
  fac?: KotOR.GFFObject;
  selectedFaction?: KotOR.GFFStruct;
  selectedFactionIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabFACEditorState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabFACEditorState constructor tabName', this.tabName);
    }

    this.saveTypes = [
      {
        description: 'Faction File',
        accept: {
          'application/octet-stream': ['.fac'],
        },
      },
    ];

    this.setContentView(<TabFACEditor tab={this}></TabFACEditor>);
    this.openFile();
    log.trace('TabFACEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabFACEditorState openFile entry');
    if (this.file) {
      const response = await this.file.readFile();
      log.debug('TabFACEditorState openFile readFile done', response.buffer?.length ?? 0);
      this.fac = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
      log.trace('TabFACEditorState openFile fac loaded');
    } else {
      log.trace('TabFACEditorState openFile no file');
    }
    log.trace('TabFACEditorState openFile exit');
  }

  selectFaction(faction: KotOR.GFFStruct | undefined, index: number) {
    log.trace('TabFACEditorState selectFaction', index);
    this.selectedFaction = faction;
    this.selectedFactionIndex = index;
    this.processEventListener('onFactionSelected', [faction, index]);
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabFACEditorState getExportBuffer');
    if (this.fac) {
      const buf = this.fac.getExportBuffer();
      log.debug('TabFACEditorState getExportBuffer length', buf?.length ?? 0);
      return buf;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabFACEditorState updateFile');
  }

  getResourceID(): string | undefined {
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabFACEditorState getResourceID', id ?? '(none)');
    return id;
  }
}
