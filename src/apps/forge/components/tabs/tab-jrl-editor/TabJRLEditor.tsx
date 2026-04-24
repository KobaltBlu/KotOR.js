import React, { useState, useEffect } from 'react';

import { CExoLocStringEditor } from '@/apps/forge/components/CExoLocStringEditor/CExoLocStringEditor';
import { ContextMenuItem, useContextMenu } from '@/apps/forge/components/common/ContextMenu';
import { MenuBar, MenuItem } from '@/apps/forge/components/common/MenuBar';
import { InstallationRegistry } from '@/apps/forge/data/InstallationRegistry';
import type { GFFFieldValue } from '@/apps/forge/interfaces/GFFFormField';
import * as KotOR from '@/apps/forge/KotOR';
import { TabJRLEditorState } from '@/apps/forge/states/tabs';
import '@/apps/forge/components/tabs/tab-jrl-editor/TabJRLEditor.scss';

interface BaseTabProps {
  tab: TabJRLEditorState;
}

export const TabJRLEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabJRLEditorState;
  const [jrl, setJrl] = useState(tab.jrl);
  const [selectedQuest, setSelectedQuest] = useState(tab.selectedQuest);
  const [selectedQuestIndex, setSelectedQuestIndex] = useState(tab.selectedQuestIndex);
  const [selectedEntry, setSelectedEntry] = useState(tab.selectedEntry);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(tab.selectedEntryIndex);
  const [_revision, setRevision] = useState(0);
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  useEffect(() => {
    const loadHandler = () => setJrl(tab.jrl);
    const questHandler = () => {
      setSelectedQuest(tab.selectedQuest);
      setSelectedQuestIndex(tab.selectedQuestIndex);
    };
    const entryHandler = () => {
      setSelectedEntry(tab.selectedEntry);
      setSelectedEntryIndex(tab.selectedEntryIndex);
    };

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onQuestSelected', questHandler);
    tab.addEventListener('onEntrySelected', entryHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onQuestSelected', questHandler);
      tab.removeEventListener('onEntrySelected', entryHandler);
    };
  }, [tab]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete') return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (tab.selectedEntry && tab.removeSelectedEntry()) {
        event.preventDefault();
        tab.file.unsaved_changes = true;
        setRevision((value) => value + 1);
        return;
      }

      if (tab.selectedQuest && tab.removeSelectedQuest()) {
        event.preventDefault();
        tab.file.unsaved_changes = true;
        setRevision((value) => value + 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        { label: 'Save', onClick: () => tab.save() },
        { label: 'Save As', onClick: () => tab.saveAs() },
      ],
    },
  ];

  if (!jrl) {
    return (
      <div className="forge-jrl-editor">
        <MenuBar items={menuItems} />
        <div className="forge-jrl-editor__loading">Loading journal...</div>
      </div>
    );
  }

  const categories = jrl.RootNode.getFieldByLabel('Categories')?.getChildStructs() || [];

  const markUnsavedAndRefresh = () => {
    tab.file.unsaved_changes = true;
    setRevision((value) => value + 1);
  };

  const handleAddQuest = () => {
    if (tab.addQuest()) {
      markUnsavedAndRefresh();
    }
  };

  const handleRemoveQuest = () => {
    if (tab.removeSelectedQuest()) {
      markUnsavedAndRefresh();
    }
  };

  const handleAddEntry = () => {
    if (tab.addEntryToSelectedQuest()) {
      markUnsavedAndRefresh();
    }
  };

  const handleRemoveEntry = () => {
    if (tab.removeSelectedEntry()) {
      markUnsavedAndRefresh();
    }
  };

  const handleMoveQuestUp = () => {
    if (tab.moveSelectedQuest(-1)) {
      markUnsavedAndRefresh();
    }
  };

  const handleMoveQuestDown = () => {
    if (tab.moveSelectedQuest(1)) {
      markUnsavedAndRefresh();
    }
  };

  const handleMoveEntryUp = () => {
    if (tab.moveSelectedEntry(-1)) {
      markUnsavedAndRefresh();
    }
  };

  const handleMoveEntryDown = () => {
    if (tab.moveSelectedEntry(1)) {
      markUnsavedAndRefresh();
    }
  };

  const handleDuplicateQuest = () => {
    if (tab.duplicateSelectedQuest()) {
      markUnsavedAndRefresh();
    }
  };

  const handleDuplicateEntry = () => {
    if (tab.duplicateSelectedEntry()) {
      markUnsavedAndRefresh();
    }
  };

  const canMoveQuestUp = selectedQuestIndex > 0;
  const canMoveQuestDown = selectedQuestIndex >= 0 && selectedQuestIndex < categories.length - 1;
  const selectedEntries = selectedQuest?.getFieldByLabel('EntryList')?.getChildStructs() || [];
  const canMoveEntryUp = selectedEntryIndex > 0;
  const canMoveEntryDown = selectedEntryIndex >= 0 && selectedEntryIndex < selectedEntries.length - 1;

  const showQuestContextMenu = (event: React.MouseEvent, quest: KotOR.GFFStruct, questIndex: number) => {
    event.preventDefault();
    event.stopPropagation();

    tab.selectQuest(quest, questIndex);

    const entries = quest.getFieldByLabel('EntryList')?.getChildStructs() || [];
    const contextItems: ContextMenuItem[] = [
      {
        id: 'jrl-add-entry',
        label: 'Add Entry',
        onClick: handleAddEntry,
      },
      {
        id: 'jrl-duplicate-quest',
        label: 'Duplicate Quest',
        onClick: handleDuplicateQuest,
      },
      {
        id: 'jrl-quest-up',
        label: 'Move Quest Up',
        disabled: questIndex <= 0,
        onClick: handleMoveQuestUp,
      },
      {
        id: 'jrl-quest-down',
        label: 'Move Quest Down',
        disabled: questIndex >= categories.length - 1,
        onClick: handleMoveQuestDown,
      },
      { id: 'jrl-sep-quest', separator: true },
      {
        id: 'jrl-remove-quest',
        label: 'Remove Quest',
        onClick: handleRemoveQuest,
      },
      {
        id: 'jrl-remove-entry',
        label: 'Remove Selected Entry',
        disabled: selectedEntryIndex < 0 || entries.length === 0,
        onClick: handleRemoveEntry,
      },
    ];

    showContextMenu(event.clientX, event.clientY, contextItems);
  };

  const showEntryContextMenu = (
    event: React.MouseEvent,
    quest: KotOR.GFFStruct,
    questIndex: number,
    entry: KotOR.GFFStruct,
    entryIndex: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    tab.selectQuest(quest, questIndex);
    tab.selectEntry(entry, entryIndex);

    const entries = quest.getFieldByLabel('EntryList')?.getChildStructs() || [];
    const contextItems: ContextMenuItem[] = [
      {
        id: 'jrl-duplicate-entry',
        label: 'Duplicate Entry',
        onClick: handleDuplicateEntry,
      },
      {
        id: 'jrl-entry-up',
        label: 'Move Entry Up',
        disabled: entryIndex <= 0,
        onClick: handleMoveEntryUp,
      },
      {
        id: 'jrl-entry-down',
        label: 'Move Entry Down',
        disabled: entryIndex >= entries.length - 1,
        onClick: handleMoveEntryDown,
      },
      { id: 'jrl-sep-entry', separator: true },
      {
        id: 'jrl-remove-entry-selected',
        label: 'Remove Entry',
        onClick: handleRemoveEntry,
      },
    ];

    showContextMenu(event.clientX, event.clientY, contextItems);
  };

  const showEmptyListContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();

    const contextItems: ContextMenuItem[] = [
      {
        id: 'jrl-add-quest-empty',
        label: 'Add Quest',
        onClick: handleAddQuest,
      },
    ];

    showContextMenu(event.clientX, event.clientY, contextItems);
  };

  return (
    <div className="forge-jrl-editor">
      <MenuBar items={menuItems} />
      <div className="forge-jrl-editor__container">
        <div className="forge-jrl-editor__sidebar">
          <h4>Quests ({categories.length})</h4>
          <div className="forge-jrl-editor__sidebar-actions">
            <button className="jrl-action-btn" onClick={handleAddQuest}>
              Add Quest
            </button>
            <button className="jrl-action-btn" onClick={handleAddEntry} disabled={!selectedQuest}>
              Add Entry
            </button>
            <button className="jrl-action-btn" onClick={handleDuplicateQuest} disabled={!selectedQuest}>
              Duplicate Quest
            </button>
            <button className="jrl-action-btn" onClick={handleDuplicateEntry} disabled={!selectedEntry}>
              Duplicate Entry
            </button>
            <button className="jrl-action-btn" onClick={handleMoveQuestUp} disabled={!canMoveQuestUp}>
              Quest Up
            </button>
            <button className="jrl-action-btn" onClick={handleMoveQuestDown} disabled={!canMoveQuestDown}>
              Quest Down
            </button>
            <button className="jrl-action-btn" onClick={handleMoveEntryUp} disabled={!canMoveEntryUp}>
              Entry Up
            </button>
            <button className="jrl-action-btn" onClick={handleMoveEntryDown} disabled={!canMoveEntryDown}>
              Entry Down
            </button>
            <button
              className="jrl-action-btn jrl-action-btn--danger"
              onClick={handleRemoveEntry}
              disabled={!selectedEntry}
            >
              Remove Entry
            </button>
            <button
              className="jrl-action-btn jrl-action-btn--danger"
              onClick={handleRemoveQuest}
              disabled={!selectedQuest}
            >
              Remove Quest
            </button>
          </div>
          <div className="quest-list" onContextMenu={showEmptyListContextMenu}>
            {categories.map((quest, index) => {
              const name = quest.getFieldByLabel('Name')?.getCExoLocString()?.getValue() || `Quest ${index}`;
              const tag = quest.getFieldByLabel('Tag')?.getValue() || '(no tag)';
              const entries = quest.getFieldByLabel('EntryList')?.getChildStructs() || [];

              return (
                <div key={index} className="quest-item-container">
                  <div
                    className={`quest-item ${index === selectedQuestIndex ? 'selected' : ''}`}
                    onClick={() => tab.selectQuest(quest, index)}
                    onContextMenu={(event) => showQuestContextMenu(event, quest, index)}
                  >
                    <span className="quest-index">[{index}]</span>
                    <div className="quest-info">
                      <div className="quest-name">{name}</div>
                      <div className="quest-tag">
                        {tag} ({entries.length} entries)
                      </div>
                    </div>
                  </div>
                  {selectedQuestIndex === index && entries.length > 0 && (
                    <div className="entry-list">
                      {entries.map((entry: KotOR.GFFStruct, entryIdx: number) => {
                        const entryId = entry.getFieldByLabel('ID')?.getValue() ?? entryIdx;
                        const text = entry.getFieldByLabel('Text')?.getCExoLocString()?.getValue() ?? '(empty)';
                        const isEndNode = !!entry.getFieldByLabel('End')?.getValue();

                        return (
                          <div
                            key={entryIdx}
                            className={`entry-item ${entryIdx === selectedEntryIndex ? 'selected' : ''} ${isEndNode ? 'entry-item--end' : ''}`}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              tab.selectEntry(entry, entryIdx);
                            }}
                            onContextMenu={(event: React.MouseEvent) =>
                              showEntryContextMenu(event, quest, index, entry, entryIdx)
                            }
                          >
                            <span className="entry-id">{entryId}</span>
                            <span className="entry-text">{text.substring(0, 60)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="forge-jrl-editor__main">
          {selectedEntry ? (
            <EntryProperties entry={selectedEntry} onUpdate={markUnsavedAndRefresh} />
          ) : selectedQuest ? (
            <QuestProperties quest={selectedQuest} onUpdate={markUnsavedAndRefresh} />
          ) : (
            <div className="forge-jrl-editor__no-selection">
              <p>Select a quest or entry to view and edit its properties.</p>
            </div>
          )}
        </div>
      </div>
      {ContextMenuComponent}
    </div>
  );
};

interface QuestPropertiesProps {
  quest: KotOR.GFFStruct;
  onUpdate: () => void;
}

interface StructFieldSpec {
  type: number;
  defaultValue: GFFFieldValue;
}

const getStructFieldValue = (strt: KotOR.GFFStruct, label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
  const value = strt.getFieldByLabel(label)?.getValue();
  return (value === undefined || value === null ? defaultVal : value) as GFFFieldValue;
};

const setStructFieldValue = (
  strt: KotOR.GFFStruct,
  label: string,
  value: GFFFieldValue,
  onUpdate: () => void,
  spec?: StructFieldSpec
) => {
  let field = strt.getFieldByLabel(label);
  if (!field && spec) {
    field = strt.addField(new KotOR.GFFField(spec.type, label, spec.defaultValue));
  }

  if (field) {
    field.setValue(value);
    onUpdate();
  }
};

const QuestProperties = (props: QuestPropertiesProps) => {
  const { quest, onUpdate } = props;
  const [planetOptions, setPlanetOptions] = useState<Array<{ index: number; label: string }>>([]);
  const [plotOptions, setPlotOptions] = useState<Array<{ index: number; label: string }>>([]);

  useEffect(() => {
    let disposed = false;

    const load2DAOptions = async () => {
      await InstallationRegistry.prefetch([InstallationRegistry.PLANETS, InstallationRegistry.PLOT]);

      if (disposed) return;

      setPlanetOptions(InstallationRegistry.getColumnOptions(InstallationRegistry.PLANETS, 'label', '(unset)'));
      setPlotOptions(InstallationRegistry.getColumnOptions(InstallationRegistry.PLOT, 'label', '(unset)'));
    };

    void load2DAOptions();

    return () => {
      disposed = true;
    };
  }, []);

  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue =>
    getStructFieldValue(quest, label, defaultVal);

  const getLocStringValue = (label: string): KotOR.CExoLocString => {
    const field = quest.getFieldByLabel(label);
    return field?.getCExoLocString() || new KotOR.CExoLocString();
  };

  const setFieldValue = (label: string, value: GFFFieldValue, spec?: StructFieldSpec) => {
    setStructFieldValue(quest, label, value, onUpdate, spec);
  };

  const entries = quest.getFieldByLabel('EntryList')?.getChildStructs() || [];
  const priorityValue = Number(getFieldValue('Priority', 4));
  const planetValue = Number(getFieldValue('PlanetID', -1));
  const plotValue = Number(getFieldValue('PlotIndex', -1));

  const priorityOptions = [
    { value: 0, label: 'Highest' },
    { value: 1, label: 'High' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Low' },
    { value: 4, label: 'Lowest' },
  ];

  return (
    <div className="jrl-properties">
      <h3>Quest Properties</h3>

      <div className="property-group">
        <label>Name (LocString)</label>
        <CExoLocStringEditor
          value={getLocStringValue('Name')}
          onChange={(value) =>
            setFieldValue('Name', value, {
              type: KotOR.GFFDataType.CEXOLOCSTRING,
              defaultValue: new KotOR.CExoLocString(),
            })
          }
        />
      </div>

      <div className="property-group">
        <label>Tag (Plot ID)</label>
        <input
          type="text"
          value={getFieldValue('Tag')}
          onChange={(e) =>
            setFieldValue('Tag', e.target.value, { type: KotOR.GFFDataType.CEXOSTRING, defaultValue: '' })
          }
          placeholder="Quest tag/plot ID..."
        />
      </div>

      <div className="property-group">
        <label>Priority</label>
        <select
          title="Priority"
          value={Number.isNaN(priorityValue) ? 4 : priorityValue}
          onChange={(e) =>
            setFieldValue('Priority', parseInt(e.target.value, 10) || 0, {
              type: KotOR.GFFDataType.DWORD,
              defaultValue: 4,
            })
          }
        >
          {priorityOptions.map((option) => (
            <option key={`priority-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="property-group">
        <label>Planet ID</label>
        <select
          title="Planet ID"
          value={Number.isNaN(planetValue) ? -1 : planetValue}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            setFieldValue('PlanetID', Number.isNaN(parsed) ? -1 : parsed, {
              type: KotOR.GFFDataType.INT,
              defaultValue: -1,
            });
          }}
        >
          <option value={-1}>[Unset]</option>
          {planetOptions.map((option) => (
            <option key={`planet-${option.index}`} value={option.index}>{`[${option.index}] ${option.label}`}</option>
          ))}
        </select>
      </div>

      <div className="property-group">
        <label>Plot Index</label>
        <select
          title="Plot Index"
          value={Number.isNaN(plotValue) ? -1 : plotValue}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            setFieldValue('PlotIndex', Number.isNaN(parsed) ? -1 : parsed, {
              type: KotOR.GFFDataType.INT,
              defaultValue: -1,
            });
          }}
        >
          <option value={-1}>[Unset]</option>
          {plotOptions.map((option) => (
            <option key={`plot-${option.index}`} value={option.index}>{`[${option.index}] ${option.label}`}</option>
          ))}
        </select>
      </div>

      <div className="property-group">
        <label>Comment</label>
        <textarea
          value={getFieldValue('Comment')}
          onChange={(e) =>
            setFieldValue('Comment', e.target.value, { type: KotOR.GFFDataType.CEXOSTRING, defaultValue: '' })
          }
          rows={4}
          placeholder="Developer comment..."
        />
      </div>

      <p className="entry-count">This quest has {entries.length} journal entries.</p>
    </div>
  );
};

interface EntryPropertiesProps {
  entry: KotOR.GFFStruct;
  onUpdate: () => void;
}

const EntryProperties = (props: EntryPropertiesProps) => {
  const { entry, onUpdate } = props;

  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue =>
    getStructFieldValue(entry, label, defaultVal);

  const getLocStringValue = (label: string): KotOR.CExoLocString => {
    const field = entry.getFieldByLabel(label);
    return field?.getCExoLocString() || new KotOR.CExoLocString();
  };

  const setFieldValue = (label: string, value: GFFFieldValue, spec?: StructFieldSpec) => {
    setStructFieldValue(entry, label, value, onUpdate, spec);
  };

  return (
    <div className="jrl-properties">
      <h3>Journal Entry Properties</h3>

      <div className="property-group">
        <label>Entry ID</label>
        <input
          title="Entry ID"
          type="number"
          value={getFieldValue('ID', 0)}
          onChange={(e) =>
            setFieldValue('ID', parseInt(e.target.value) || 0, { type: KotOR.GFFDataType.DWORD, defaultValue: 0 })
          }
          min="0"
        />
      </div>

      <div className="property-group">
        <label>Text (LocString)</label>
        <CExoLocStringEditor
          value={getLocStringValue('Text')}
          onChange={(value) =>
            setFieldValue('Text', value, {
              type: KotOR.GFFDataType.CEXOLOCSTRING,
              defaultValue: new KotOR.CExoLocString(),
            })
          }
        />
      </div>

      <div className="property-group">
        <label>XP Percentage</label>
        <input
          title="XP Percentage"
          type="number"
          value={getFieldValue('XP_Percentage', 0)}
          onChange={(e) =>
            setFieldValue('XP_Percentage', parseFloat(e.target.value) || 0, {
              type: KotOR.GFFDataType.FLOAT,
              defaultValue: 0,
            })
          }
          min="0"
          step="0.1"
        />
        <small>This value is multiplied by 1000 in-game</small>
      </div>

      <div className="property-group">
        <label>End Node</label>
        <input
          title="End Node"
          type="checkbox"
          checked={!!getFieldValue('End', 0)}
          onChange={(e) =>
            setFieldValue('End', e.target.checked ? 1 : 0, { type: KotOR.GFFDataType.WORD, defaultValue: 0 })
          }
        />
        <small>If checked, this marks the quest as complete</small>
      </div>
    </div>
  );
};
