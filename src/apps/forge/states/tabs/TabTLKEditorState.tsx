import React from "react";

import { TabTLKEditor } from "@/apps/forge/components/tabs/tab-tlk-editor/TabTLKEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabTLKEditorState extends TabState {
  tabName: string = 'TLK Editor';
  tlk?: KotOR.TLKObject;
  selectedStringIndex: number = -1;
  searchQuery: string = '';
  filterQuery: string = '';
  searchBoxVisible: boolean = false;
  jumpBoxVisible: boolean = false;
  jumpValue: number = 0;

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabTLKEditorState constructor entry');
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug('TabTLKEditorState constructor tabName', this.tabName);
    }

    this.saveTypes = [
      {
        description: 'Talk Table File',
        accept: {
          'application/octet-stream': ['.tlk']
        }
      }
    ];

    this.setContentView(<TabTLKEditor tab={this}></TabTLKEditor>);
    this.openFile();
    log.trace('TabTLKEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabTLKEditorState openFile entry');
    if(!this.file) {
      log.trace('TabTLKEditorState openFile no file');
      return;
    }
    const response = await this.file.readFile();
    log.debug('TabTLKEditorState openFile readFile done', response.buffer?.length ?? 0);
    await new Promise<void>((resolve, reject) => {
      this.tlk = new KotOR.TLKObject(response.buffer, () => resolve(), undefined);
    });
    this.selectedStringIndex = -1;
    this.searchQuery = '';
    this.filterQuery = '';
    this.searchBoxVisible = false;
    this.jumpBoxVisible = false;
    this.jumpValue = 0;
    this.processEventListener('onEditorFileLoad', [this]);
    this.processEventListener('onSearchQueryChanged', [this.searchQuery]);
    this.processEventListener('onFilterChanged', [this.filterQuery]);
    this.processEventListener('onSearchBoxToggled', [this.searchBoxVisible]);
    this.processEventListener('onJumpBoxToggled', [this.jumpBoxVisible]);
    this.processEventListener('onJumpValueChanged', [this.jumpValue]);
    log.trace('TabTLKEditorState openFile exit');
  }

  selectString(index: number) {
    log.trace('TabTLKEditorState selectString', index);
    this.selectedStringIndex = index;
    this.processEventListener('onStringSelected', [index]);
  }

  setSearchQuery(query: string) {
    log.trace('TabTLKEditorState setSearchQuery');
    this.searchQuery = query;
    this.processEventListener('onSearchQueryChanged', [query]);
  }

  applySearchFilter(query?: string) {
    log.trace('TabTLKEditorState applySearchFilter');
    this.filterQuery = typeof query === 'string' ? query : this.searchQuery;
    this.processEventListener('onFilterChanged', [this.filterQuery]);
  }

  clearSearchFilter() {
    log.trace('TabTLKEditorState clearSearchFilter');
    this.filterQuery = '';
    this.processEventListener('onFilterChanged', [this.filterQuery]);
  }

  toggleSearchBox(force?: boolean) {
    log.trace('TabTLKEditorState toggleSearchBox', force);
    const next = typeof force === 'boolean' ? force : !this.searchBoxVisible;
    this.searchBoxVisible = next;
    this.processEventListener('onSearchBoxToggled', [next]);
  }

  toggleJumpBox(force?: boolean) {
    log.trace('TabTLKEditorState toggleJumpBox', force);
    const next = typeof force === 'boolean' ? force : !this.jumpBoxVisible;
    this.jumpBoxVisible = next;
    this.processEventListener('onJumpBoxToggled', [next]);
  }

  setJumpValue(value: number) {
    log.trace('TabTLKEditorState setJumpValue', value);
    this.jumpValue = value;
    this.processEventListener('onJumpValueChanged', [value]);
  }

  insertEntry() {
    log.trace('TabTLKEditorState insertEntry');
    if (!this.tlk) return;
    const entry = new KotOR.TLKString(0, '', 0, 0, 0, 0, 0, '');
    this.tlk.TLKStrings.push(entry);
    this.tlk.StringCount = this.tlk.TLKStrings.length;
    const index = this.tlk.TLKStrings.length - 1;
    this.selectString(index);
    if (this.file) {
      this.file.unsaved_changes = true;
    }
    this.processEventListener('onEntriesChanged', [this.tlk.TLKStrings.length]);
  }

  async findReferencesForIndex(index: number): Promise<void> {
    if (index < 0) return;
    const { ModalReferenceSearchOptionsState } = require('@/apps/forge/states/modal/ModalReferenceSearchOptionsState');
    const { ModalFileResultsState } = require('@/apps/forge/states/modal/ModalFileResultsState');
    const { ForgeState } = require('@/apps/forge/states/ForgeState');
    const { createKeyResources, findStrRefReferences } = require('@/apps/forge/helpers/ReferenceFinder');

    const modal = new ModalReferenceSearchOptionsState({
      onApply: async (options: import('../modal/ModalReferenceSearchOptionsState').ReferenceSearchOptionsStateValues) => {
        const resources = createKeyResources();
        const results = await findStrRefReferences(resources, index.toString(), options);
        const resultsModal = new ModalFileResultsState({
          results,
          title: `References for ${index}`,
        });
        resultsModal.attachToModalManager(ForgeState.modalManager);
        resultsModal.open();
      },
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabTLKEditorState getExportBuffer');
    if(this.tlk){
      const buf = this.tlk.toBuffer();
      log.debug('TabTLKEditorState getExportBuffer tlk length', buf?.length ?? 0);
      return buf;
    }
    if(this.file?.buffer){
      return this.file.buffer;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabTLKEditorState updateFile');
    // UI edits TLKStrings in place; getExportBuffer uses this.tlk.toBuffer()
  }

  getResourceID(): string | undefined {
    return this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
  }
}
