import React from 'react';

import { TabJRLEditor } from '@/apps/forge/components/tabs/tab-jrl-editor/TabJRLEditor';
import BaseTabStateOptions from '@/apps/forge/interfaces/BaseTabStateOptions';
import * as KotOR from '@/apps/forge/KotOR';
import { TabState } from '@/apps/forge/states/tabs/TabState';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export class TabJRLEditorState extends TabState {
  tabName: string = 'JRL Editor';
  jrl?: KotOR.GFFObject;
  selectedQuest?: KotOR.GFFStruct;
  selectedQuestIndex: number = -1;
  selectedEntry?: KotOR.GFFStruct;
  selectedEntryIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}) {
    log.trace('TabJRLEditorState constructor entry');
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
      log.debug('TabJRLEditorState constructor tabName', this.tabName);
    } else {
      log.trace('TabJRLEditorState constructor no file');
    }

    this.saveTypes = [
      {
        description: 'Journal File',
        accept: {
          'application/octet-stream': ['.jrl'],
        },
      },
    ];
    log.trace('TabJRLEditorState constructor saveTypes set');

    this.setContentView(<TabJRLEditor tab={this}></TabJRLEditor>);
    log.trace('TabJRLEditorState constructor setContentView');
    this.openFile();
    log.trace('TabJRLEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabJRLEditorState openFile entry');
    if (this.file) {
      log.trace('TabJRLEditorState openFile readFile');
      const response = await this.file.readFile();
      log.debug('TabJRLEditorState openFile buffer length', response?.buffer?.length);
      this.jrl = new KotOR.GFFObject(response.buffer);
      log.trace('TabJRLEditorState openFile GFFObject created');
      this.processEventListener('onEditorFileLoad', [this]);
      log.info('TabJRLEditorState openFile loaded');
    } else {
      log.trace('TabJRLEditorState openFile no file');
    }
    log.trace('TabJRLEditorState openFile exit');
  }

  selectQuest(quest: KotOR.GFFStruct | undefined, questIndex: number) {
    log.trace('TabJRLEditorState selectQuest entry', questIndex);
    this.selectedQuest = quest;
    this.selectedQuestIndex = questIndex;
    this.selectedEntry = undefined;
    this.selectedEntryIndex = -1;
    this.processEventListener('onQuestSelected', [quest, questIndex]);
    log.trace('TabJRLEditorState selectQuest exit');
  }

  selectEntry(entry: KotOR.GFFStruct | undefined, entryIndex: number) {
    log.trace('TabJRLEditorState selectEntry entry', entryIndex);
    this.selectedEntry = entry;
    this.selectedEntryIndex = entryIndex;
    this.processEventListener('onEntrySelected', [entry, entryIndex]);
    log.trace('TabJRLEditorState selectEntry exit');
  }

  private ensureCategoriesField(): KotOR.GFFField | undefined {
    if (!this.jrl) return;

    let categoriesField = this.jrl.RootNode.getFieldByLabel('Categories');
    if (!categoriesField) {
      categoriesField = this.jrl.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Categories'));
    }
    return categoriesField;
  }

  private createQuestStruct(): KotOR.GFFStruct {
    const quest = new KotOR.GFFStruct(0);
    quest.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', ''));
    quest.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Name', new KotOR.CExoLocString()));
    quest.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'PlanetID', 0));
    quest.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'PlotIndex', 0));
    quest.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Priority', 4));
    quest.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', ''));
    quest.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'EntryList'));
    return quest;
  }

  private createEntryStruct(nextEntryId: number): KotOR.GFFStruct {
    const entry = new KotOR.GFFStruct(0);
    entry.addField(new KotOR.GFFField(KotOR.GFFDataType.WORD, 'End', 0));
    entry.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'ID', nextEntryId));
    entry.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Text', new KotOR.CExoLocString()));
    entry.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XP_Percentage', 0));
    return entry;
  }

  addQuest(): boolean {
    if (!this.jrl) return false;

    const categoriesField = this.ensureCategoriesField();
    if (!categoriesField) return false;

    const quest = this.createQuestStruct();
    categoriesField.addChildStruct(quest);

    const nextIndex = categoriesField.getChildStructs().length - 1;
    this.selectQuest(quest, nextIndex);
    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  removeSelectedQuest(): boolean {
    if (!this.jrl || this.selectedQuestIndex < 0) return false;

    const categoriesField = this.jrl.RootNode.getFieldByLabel('Categories');
    if (!categoriesField) return false;

    const categories = categoriesField.getChildStructs();
    if (this.selectedQuestIndex >= categories.length) return false;

    categories.splice(this.selectedQuestIndex, 1);

    if (categories.length > 0) {
      const nextIndex = Math.min(this.selectedQuestIndex, categories.length - 1);
      this.selectQuest(categories[nextIndex], nextIndex);
    } else {
      this.selectQuest(undefined, -1);
    }

    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  addEntryToSelectedQuest(): boolean {
    if (!this.selectedQuest) return false;

    let entryListField = this.selectedQuest.getFieldByLabel('EntryList');
    if (!entryListField) {
      entryListField = this.selectedQuest.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'EntryList'));
    }

    const entries = entryListField.getChildStructs();
    const maxId = entries.reduce((max, current) => {
      const value = current.getFieldByLabel('ID')?.getValue();
      const id = typeof value === 'number' ? value : 0;
      return Math.max(max, id);
    }, -1);

    const entry = this.createEntryStruct(maxId + 1);
    entryListField.addChildStruct(entry);

    const nextIndex = entryListField.getChildStructs().length - 1;
    this.selectEntry(entry, nextIndex);
    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  removeSelectedEntry(): boolean {
    if (!this.selectedQuest || this.selectedEntryIndex < 0) return false;

    const entryListField = this.selectedQuest.getFieldByLabel('EntryList');
    if (!entryListField) return false;

    const entries = entryListField.getChildStructs();
    if (this.selectedEntryIndex >= entries.length) return false;

    entries.splice(this.selectedEntryIndex, 1);

    if (entries.length > 0) {
      const nextIndex = Math.min(this.selectedEntryIndex, entries.length - 1);
      this.selectEntry(entries[nextIndex], nextIndex);
    } else {
      this.selectEntry(undefined, -1);
    }

    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  moveSelectedQuest(offset: number): boolean {
    if (!this.jrl || this.selectedQuestIndex < 0 || offset === 0) return false;

    const categoriesField = this.jrl.RootNode.getFieldByLabel('Categories');
    if (!categoriesField) return false;

    const categories = categoriesField.getChildStructs();
    const currentIndex = this.selectedQuestIndex;
    const targetIndex = currentIndex + offset;

    if (currentIndex < 0 || currentIndex >= categories.length) return false;
    if (targetIndex < 0 || targetIndex >= categories.length) return false;

    const [quest] = categories.splice(currentIndex, 1);
    categories.splice(targetIndex, 0, quest);

    this.selectQuest(quest, targetIndex);
    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  moveSelectedEntry(offset: number): boolean {
    if (!this.selectedQuest || this.selectedEntryIndex < 0 || offset === 0) return false;

    const entryListField = this.selectedQuest.getFieldByLabel('EntryList');
    if (!entryListField) return false;

    const entries = entryListField.getChildStructs();
    const currentIndex = this.selectedEntryIndex;
    const targetIndex = currentIndex + offset;

    if (currentIndex < 0 || currentIndex >= entries.length) return false;
    if (targetIndex < 0 || targetIndex >= entries.length) return false;

    const [entry] = entries.splice(currentIndex, 1);
    entries.splice(targetIndex, 0, entry);

    this.selectEntry(entry, targetIndex);
    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  duplicateSelectedQuest(): boolean {
    if (!this.jrl || this.selectedQuestIndex < 0) return false;

    const categoriesField = this.jrl.RootNode.getFieldByLabel('Categories');
    if (!categoriesField) return false;

    const categories = categoriesField.getChildStructs();
    if (this.selectedQuestIndex >= categories.length) return false;

    // Clone through round-trip to preserve nested list fields and types.
    const clonedJrl = new KotOR.GFFObject(this.jrl.getExportBuffer());
    const clonedCategories = clonedJrl.RootNode.getFieldByLabel('Categories')?.getChildStructs();
    const clonedQuest = clonedCategories?.[this.selectedQuestIndex];
    if (!clonedQuest) return false;

    const tagField = clonedQuest.getFieldByLabel('Tag');
    if (tagField) {
      const tag = String(tagField.getValue() || '').trim();
      if (tag.length > 0) {
        tagField.setValue(`${tag}_copy`.slice(0, 32));
      }
    }

    const insertIndex = this.selectedQuestIndex + 1;
    categories.splice(insertIndex, 0, clonedQuest);

    this.selectQuest(clonedQuest, insertIndex);
    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  duplicateSelectedEntry(): boolean {
    if (!this.jrl || this.selectedQuestIndex < 0 || this.selectedEntryIndex < 0) return false;

    const categoriesField = this.jrl.RootNode.getFieldByLabel('Categories');
    if (!categoriesField) return false;

    const categories = categoriesField.getChildStructs();
    const selectedQuest = categories[this.selectedQuestIndex];
    if (!selectedQuest) return false;

    const entryListField = selectedQuest.getFieldByLabel('EntryList');
    if (!entryListField) return false;

    const entries = entryListField.getChildStructs();
    if (this.selectedEntryIndex >= entries.length) return false;

    const clonedJrl = new KotOR.GFFObject(this.jrl.getExportBuffer());
    const clonedQuest = clonedJrl.RootNode.getFieldByLabel('Categories')?.getChildStructs()?.[this.selectedQuestIndex];
    const clonedEntry = clonedQuest?.getFieldByLabel('EntryList')?.getChildStructs()?.[this.selectedEntryIndex];
    if (!clonedEntry) return false;

    const currentMaxId = entries.reduce((max, current) => {
      const value = current.getFieldByLabel('ID')?.getValue();
      return Math.max(max, typeof value === 'number' ? value : -1);
    }, -1);

    const idField = clonedEntry.getFieldByLabel('ID');
    if (idField) {
      idField.setValue(currentMaxId + 1);
    }

    const insertIndex = this.selectedEntryIndex + 1;
    entries.splice(insertIndex, 0, clonedEntry);

    this.selectQuest(selectedQuest, this.selectedQuestIndex);
    this.selectEntry(clonedEntry, insertIndex);
    this.processEventListener('onEditorFileLoad', [this]);
    return true;
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabJRLEditorState getExportBuffer entry');
    if (this.jrl) {
      const buf = this.jrl.getExportBuffer();
      log.trace('TabJRLEditorState getExportBuffer length', buf?.length);
      return buf;
    }
    log.trace('TabJRLEditorState getExportBuffer no jrl return empty');
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabJRLEditorState updateFile (no-op)');
  }

  getResourceID(): string | undefined {
    log.trace('TabJRLEditorState getResourceID');
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabJRLEditorState getResourceID', id);
    return id;
  }
}
