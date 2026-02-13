import React from "react";

import { TabTLKEditor } from "../../components/tabs/tab-tlk-editor/TabTLKEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";

import { TabState } from "./TabState";

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
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
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
  }

  async openFile() {
    if(!this.file) return;
    const response = await this.file.readFile();
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
  }

  selectString(index: number) {
    this.selectedStringIndex = index;
    this.processEventListener('onStringSelected', [index]);
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
    this.processEventListener('onSearchQueryChanged', [query]);
  }

  applySearchFilter(query?: string) {
    this.filterQuery = typeof query === 'string' ? query : this.searchQuery;
    this.processEventListener('onFilterChanged', [this.filterQuery]);
  }

  clearSearchFilter() {
    this.filterQuery = '';
    this.processEventListener('onFilterChanged', [this.filterQuery]);
  }

  toggleSearchBox(force?: boolean) {
    const next = typeof force === 'boolean' ? force : !this.searchBoxVisible;
    this.searchBoxVisible = next;
    this.processEventListener('onSearchBoxToggled', [next]);
  }

  toggleJumpBox(force?: boolean) {
    const next = typeof force === 'boolean' ? force : !this.jumpBoxVisible;
    this.jumpBoxVisible = next;
    this.processEventListener('onJumpBoxToggled', [next]);
  }

  setJumpValue(value: number) {
    this.jumpValue = value;
    this.processEventListener('onJumpValueChanged', [value]);
  }

  insertEntry() {
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
    const { ModalReferenceSearchOptionsState } = require('../modal/ModalReferenceSearchOptionsState');
    const { ModalFileResultsState } = require('../modal/ModalFileResultsState');
    const { ForgeState } = require('../ForgeState');
    const { createKeyResources, findStrRefReferences } = require('../../helpers/ReferenceFinder');

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
    if(this.tlk){
      return this.tlk.toBuffer();
    }
    if(this.file?.buffer){
      return this.file.buffer;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // UI edits TLKStrings in place; getExportBuffer uses this.tlk.toBuffer()
  }

  getResourceID(): string | undefined {
    return this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
  }
}
