import { describe, expect, it, jest } from '@jest/globals';

import { CExoLocString } from '@/resource/CExoLocString';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';
import { TabJRLEditorState } from '@/apps/forge/states/tabs/TabJRLEditorState';

jest.mock('@/apps/forge/EditorFile', () => ({
  EditorFile: class EditorFile {
    addEventListener() {}
  },
}));

jest.mock('@/apps/forge/managers/EditorTabManager', () => ({
  EditorTabManager: class EditorTabManager {
    static __tabId = 0;

    static GetNewTabID() {
      return this.__tabId++;
    }
  },
}));

jest.mock('@/apps/forge/components/tabs/tab-jrl-editor/TabJRLEditor', () => ({
  TabJRLEditor: function TabJRLEditor() {
    return null;
  },
}));

jest.mock('@/apps/forge/ForgeFileSystem', () => ({
  supportedFileDialogTypes: [],
  supportedFilePickerTypes: [],
}));

jest.mock('@/apps/forge/KotOR', () => {
  const { CExoLocString } = require('@/resource/CExoLocString');
  const { GFFDataType } = require('@/enums/resource/GFFDataType');
  const { GFFField } = require('@/resource/GFFField');
  const { GFFObject } = require('@/resource/GFFObject');
  const { GFFStruct } = require('@/resource/GFFStruct');

  return {
    ApplicationEnvironment: {
      ELECTRON: 'electron',
      WEB: 'web',
    },
    ApplicationProfile: {
      ENV: 'web',
    },
    CExoLocString,
    GFFDataType,
    GFFField,
    GFFObject,
    GFFStruct,
    ResourceTypes: {
      jrl: 2056,
      getKeyByValue: jest.fn(),
    },
  };
});

jest.mock('@/utility/Logger', () => ({
  LogScope: {
    Forge: 'Forge',
  },
  createScopedLogger: () => ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

function buildJrlGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'JRL ';
  const root = gff.RootNode;

  const categories = new GFFField(GFFDataType.LIST, 'Categories');
  const quest = new GFFStruct(0);
  quest.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Name')).setCExoLocString(new CExoLocString(33089));
  quest.addField(new GFFField(GFFDataType.DWORD, 'Priority')).setValue(1);
  quest
    .addField(new GFFField(GFFDataType.CEXOSTRING, 'Comment'))
    .setValue('Plot to be considered worthy to hear the Sand People history.');
  quest.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('Tat20aa_worthy');
  quest.addField(new GFFField(GFFDataType.INT, 'PlotIndex')).setValue(72);
  quest.addField(new GFFField(GFFDataType.INT, 'PlanetID')).setValue(4);

  const entries = new GFFField(GFFDataType.LIST, 'EntryList');
  const firstEntry = new GFFStruct(0);
  firstEntry.addField(new GFFField(GFFDataType.DWORD, 'ID')).setValue(10);
  firstEntry.addField(new GFFField(GFFDataType.WORD, 'End')).setValue(0);
  firstEntry.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text')).setCExoLocString(new CExoLocString(33090));
  firstEntry.addField(new GFFField(GFFDataType.FLOAT, 'XP_Percentage')).setValue(5.0);
  entries.addChildStruct(firstEntry);

  const secondEntry = new GFFStruct(0);
  secondEntry.addField(new GFFField(GFFDataType.DWORD, 'ID')).setValue(20);
  secondEntry.addField(new GFFField(GFFDataType.WORD, 'End')).setValue(1);
  secondEntry.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'Text')).setCExoLocString(new CExoLocString(33091));
  secondEntry.addField(new GFFField(GFFDataType.FLOAT, 'XP_Percentage')).setValue(6.0);
  entries.addChildStruct(secondEntry);

  quest.addField(entries);
  categories.addChildStruct(quest);
  root.addField(categories);

  return gff;
}

function getQuest(state: TabJRLEditorState, index = 0): GFFStruct {
  return state.jrl!.RootNode.getFieldByLabel('Categories').getChildStructs()[index];
}

function getEntry(quest: GFFStruct, index = 0): GFFStruct {
  return quest.getFieldByLabel('EntryList').getChildStructs()[index];
}

describe('TabJRLEditorState', () => {
  it('addQuest creates the Categories list when missing and selects the new quest', () => {
    const state = new TabJRLEditorState();
    state.jrl = new GFFObject();
    state.jrl.FileType = 'JRL ';

    expect(state.addQuest()).toBe(true);

    const quest = getQuest(state);
    expect(state.selectedQuestIndex).toBe(0);
    expect(state.selectedQuest).toBe(quest);
    expect(quest.getFieldByLabel('Comment').getValue()).toBe('');
    expect(quest.getFieldByLabel('Priority').getValue()).toBe(4);
    expect(quest.getFieldByLabel('Tag').getValue()).toBe('');
    expect(quest.getFieldByLabel('EntryList').getChildStructs()).toHaveLength(0);
  });

  it('addEntryToSelectedQuest allocates the next numeric entry id and supports removal', () => {
    const state = new TabJRLEditorState();
    state.jrl = buildJrlGff();

    const quest = getQuest(state);
    state.selectQuest(quest, 0);

    expect(state.addEntryToSelectedQuest()).toBe(true);

    const entries = quest.getFieldByLabel('EntryList').getChildStructs();
    expect(entries).toHaveLength(3);
    expect(state.selectedEntryIndex).toBe(2);
    expect(state.selectedEntry).toBe(entries[2]);
    expect(entries[2].getFieldByLabel('ID').getValue()).toBe(21);
    expect(entries[2].getFieldByLabel('End').getValue()).toBe(0);
    expect(entries[2].getFieldByLabel('XP_Percentage').getValue()).toBe(0);

    expect(state.removeSelectedEntry()).toBe(true);
    expect(quest.getFieldByLabel('EntryList').getChildStructs()).toHaveLength(2);
    expect(state.selectedEntryIndex).toBe(1);
  });

  it('duplicateSelectedQuest clones nested entries and rewrites the duplicated tag', () => {
    const state = new TabJRLEditorState();
    state.jrl = buildJrlGff();

    const originalQuest = getQuest(state);
    state.selectQuest(originalQuest, 0);

    expect(state.duplicateSelectedQuest()).toBe(true);

    const categories = state.jrl!.RootNode.getFieldByLabel('Categories').getChildStructs();
    expect(categories).toHaveLength(2);
    expect(state.selectedQuestIndex).toBe(1);
    expect(categories[1].getFieldByLabel('Tag').getValue()).toBe('Tat20aa_worthy_copy');
    expect(categories[1].getFieldByLabel('EntryList').getChildStructs()).toHaveLength(2);
    expect(categories[1]).not.toBe(categories[0]);
  });

  it('duplicateSelectedEntry and moveSelectedEntry preserve ordering and assign a fresh id', () => {
    const state = new TabJRLEditorState();
    state.jrl = buildJrlGff();

    const quest = getQuest(state);
    state.selectQuest(quest, 0);
    state.selectEntry(getEntry(quest, 0), 0);

    expect(state.duplicateSelectedEntry()).toBe(true);

    let entries = quest.getFieldByLabel('EntryList').getChildStructs();
    expect(entries).toHaveLength(3);
    expect(entries[1].getFieldByLabel('ID').getValue()).toBe(21);
    expect(state.selectedEntryIndex).toBe(1);

    expect(state.moveSelectedEntry(1)).toBe(true);
    entries = quest.getFieldByLabel('EntryList').getChildStructs();
    expect(state.selectedEntryIndex).toBe(2);
    expect(entries[2].getFieldByLabel('ID').getValue()).toBe(21);
  });

  it('export buffer round-trips edited JRL data', async () => {
    const state = new TabJRLEditorState();
    state.jrl = buildJrlGff();

    const quest = getQuest(state);
    state.selectQuest(quest, 0);
    state.addEntryToSelectedQuest();
    state.selectEntry(getEntry(quest, 1), 1);
    state.duplicateSelectedEntry();

    const buffer = await state.getExportBuffer();
    const roundTripped = new GFFObject(buffer);
    const categories = roundTripped.RootNode.getFieldByLabel('Categories').getChildStructs();
    const exportedEntries = categories[0].getFieldByLabel('EntryList').getChildStructs();

    expect(categories).toHaveLength(1);
    expect(exportedEntries).toHaveLength(4);
    expect(exportedEntries[2].getFieldByLabel('ID').getValue()).toBe(22);
    expect(exportedEntries[3].getFieldByLabel('ID').getValue()).toBe(21);
  });
});
