import React, { useState, useEffect } from "react";
import { TabJRLEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabJRLEditor.scss";

interface BaseTabProps {
  tab: TabJRLEditorState;
}

export const TabJRLEditor = function(props: BaseTabProps){
  const tab = props.tab as TabJRLEditorState;
  const [jrl, setJrl] = useState(tab.jrl);
  const [selectedQuest, setSelectedQuest] = useState(tab.selectedQuest);
  const [selectedQuestIndex, setSelectedQuestIndex] = useState(tab.selectedQuestIndex);
  const [selectedEntry, setSelectedEntry] = useState(tab.selectedEntry);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(tab.selectedEntryIndex);

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

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        { label: 'Save', onClick: () => tab.save() },
        { label: 'Save As', onClick: () => tab.saveAs() }
      ]
    }
  ];

  if(!jrl){
    return (
      <div className="forge-jrl-editor">
        <MenuBar items={menuItems} />
        <div className="forge-jrl-editor__loading">Loading journal...</div>
      </div>
    );
  }

  const categories = jrl.RootNode.getFieldByLabel('Categories')?.getChildStructs() || [];

  return (
    <div className="forge-jrl-editor">
      <MenuBar items={menuItems} />
      <div className="forge-jrl-editor__container">
        <div className="forge-jrl-editor__sidebar">
          <h4>Quests ({categories.length})</h4>
          <div className="quest-list">
            {categories.map((quest, index) => {
              const name = quest.getFieldByLabel('Name')?.getValue() || `Quest ${index}`;
              const tag = quest.getFieldByLabel('Tag')?.getValue() || '(no tag)';
              const entries = quest.getFieldByLabel('EntryList')?.getChildStructs() || [];

              return (
                <div key={index} className="quest-item-container">
                  <div
                    className={`quest-item ${index === selectedQuestIndex ? 'selected' : ''}`}
                    onClick={() => tab.selectQuest(quest, index)}
                  >
                    <span className="quest-index">[{index}]</span>
                    <div className="quest-info">
                      <div className="quest-name">{name}</div>
                      <div className="quest-tag">{tag} ({entries.length} entries)</div>
                    </div>
                  </div>
                  {selectedQuestIndex === index && entries.length > 0 && (
                    <div className="entry-list">
                      {entries.map((entry, entryIdx) => {
                        const entryId = entry.getFieldByLabel('ID')?.getValue() || entryIdx;
                        const text = entry.getFieldByLabel('Text')?.getValue() || '(empty)';

                        return (
                          <div
                            key={entryIdx}
                            className={`entry-item ${entryIdx === selectedEntryIndex ? 'selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              tab.selectEntry(entry, entryIdx);
                            }}
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
            <EntryProperties
              entry={selectedEntry}
              onUpdate={() => {
                tab.file.unsaved_changes = true;
              }}
            />
          ) : selectedQuest ? (
            <QuestProperties
              quest={selectedQuest}
              onUpdate={() => {
                tab.file.unsaved_changes = true;
              }}
            />
          ) : (
            <div className="forge-jrl-editor__no-selection">
              <p>Select a quest or entry to view and edit its properties.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface QuestPropertiesProps {
  quest: KotOR.GFFStruct;
  onUpdate: () => void;
}

const QuestProperties = (props: QuestPropertiesProps) => {
  const { quest, onUpdate } = props;

  const getFieldValue = (label: string, defaultVal: any = '') => {
    return quest.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = quest.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  const entries = quest.getFieldByLabel('EntryList')?.getChildStructs() || [];

  return (
    <div className="jrl-properties">
      <h3>Quest Properties</h3>

      <div className="property-group">
        <label>Name (LocString)</label>
        <input
          type="text"
          value={getFieldValue('Name')}
          onChange={(e) => setFieldValue('Name', e.target.value)}
          placeholder="Quest name..."
        />
      </div>

      <div className="property-group">
        <label>Tag (Plot ID)</label>
        <input
          type="text"
          value={getFieldValue('Tag')}
          onChange={(e) => setFieldValue('Tag', e.target.value)}
          placeholder="Quest tag/plot ID..."
        />
      </div>

      <div className="property-group">
        <label>Priority</label>
        <input
          title="Priority"
          type="number"
          value={getFieldValue('Priority', 0)}
          onChange={(e) => setFieldValue('Priority', parseInt(e.target.value) || 0)}
          min="0"
        />
      </div>

      <div className="property-group">
        <label>Planet ID</label>
        <input
          title="Planet ID"
          type="number"
          value={getFieldValue('PlanetID', 0)}
          onChange={(e) => setFieldValue('PlanetID', parseInt(e.target.value) || 0)}
          min="0"
        />
      </div>

      <div className="property-group">
        <label>Plot Index</label>
        <input
          title="Plot Index"
          type="number"
          value={getFieldValue('PlotIndex', -1)}
          onChange={(e) => setFieldValue('PlotIndex', parseInt(e.target.value) ?? -1)}
        />
      </div>

      <div className="property-group">
        <label>Comment</label>
        <textarea
          value={getFieldValue('Comment')}
          onChange={(e) => setFieldValue('Comment', e.target.value)}
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

  const getFieldValue = (label: string, defaultVal: any = '') => {
    return entry.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = entry.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
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
          onChange={(e) => setFieldValue('ID', parseInt(e.target.value) || 0)}
          min="0"
        />
      </div>

      <div className="property-group">
        <label>Text (LocString)</label>
        <textarea
          value={getFieldValue('Text')}
          onChange={(e) => setFieldValue('Text', e.target.value)}
          rows={8}
          placeholder="Journal entry text..."
        />
      </div>

      <div className="property-group">
        <label>XP Reward</label>
        <input
          title="XP Reward"
          type="number"
          value={getFieldValue('XP', 0)}
          onChange={(e) => setFieldValue('XP', parseInt(e.target.value) || 0)}
          min="0"
        />
        <small>This value is multiplied by 1000 in-game</small>
      </div>

      <div className="property-group">
        <label>End Node</label>
        <input
          title="End Node"
          type="checkbox"
          checked={!!getFieldValue('End', 0)}
          onChange={(e) => setFieldValue('End', e.target.checked ? 1 : 0)}
        />
        <small>If checked, this marks the quest as complete</small>
      </div>
    </div>
  );
};
