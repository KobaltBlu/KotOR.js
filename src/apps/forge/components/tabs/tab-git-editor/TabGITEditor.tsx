import React, { useState, useEffect } from "react";
import { TabGITEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabGITEditor.scss";

interface BaseTabProps {
  tab: TabGITEditorState;
}

export const TabGITEditor = function(props: BaseTabProps){
  const tab = props.tab as TabGITEditorState;
  const [git, setGit] = useState(tab.git);
  const [selectedInstance, setSelectedInstance] = useState(tab.selectedInstance);
  const [selectedType, setSelectedType] = useState(tab.selectedInstanceType);
  const [selectedIndex, setSelectedIndex] = useState(tab.selectedInstanceIndex);

  useEffect(() => {
    const loadHandler = () => setGit(tab.git);
    const selectHandler = () => {
      setSelectedInstance(tab.selectedInstance);
      setSelectedType(tab.selectedInstanceType);
      setSelectedIndex(tab.selectedInstanceIndex);
    };

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onInstanceSelected', selectHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onInstanceSelected', selectHandler);
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

  if(!git){
    return (
      <div className="forge-git-editor">
        <MenuBar items={menuItems} />
        <div className="forge-git-editor__loading">Loading GIT...</div>
      </div>
    );
  }

  const instanceLists = [
    { label: 'Creatures', field: 'Creature List', icon: '👤' },
    { label: 'Doors', field: 'Door List', icon: '🚪' },
    { label: 'Placeables', field: 'Placeable List', icon: '📦' },
    { label: 'Triggers', field: 'TriggerList', icon: '⚡' },
    { label: 'Waypoints', field: 'WaypointList', icon: '📍' },
    { label: 'Sounds', field: 'SoundList', icon: '🔊' },
    { label: 'Stores', field: 'StoreList', icon: '🏪' },
    { label: 'Encounters', field: 'Encounter List', icon: '⚔️' },
    { label: 'Cameras', field: 'CameraList', icon: '📷' },
  ];

  return (
    <div className="forge-git-editor">
      <MenuBar items={menuItems} />
      <div className="forge-git-editor__container">
        <div className="forge-git-editor__sidebar">
          {instanceLists.map(({ label, field, icon }) => {
            const instances = git.RootNode.getFieldByLabel(field)?.getChildStructs() || [];
            return (
              <InstanceList
                key={field}
                label={label}
                icon={icon}
                instances={instances}
                instanceType={field}
                selectedIndex={selectedType === field ? selectedIndex : -1}
                onSelect={(instance, index) => tab.selectInstance(instance, field, index)}
              />
            );
          })}
        </div>
        <div className="forge-git-editor__main">
          {selectedInstance ? (
            <InstanceProperties
              instance={selectedInstance}
              instanceType={selectedType}
              onUpdate={() => {
                tab.file.unsaved_changes = true;
              }}
            />
          ) : (
            <div className="forge-git-editor__no-selection">
              <p>Select an instance from the lists to view and edit its properties.</p>
              <div className="forge-git-editor__stats">
                <h4>Instance Statistics</h4>
                {instanceLists.map(({ label, field }) => {
                  const count = git.RootNode.getFieldByLabel(field)?.getChildStructs()?.length || 0;
                  return <p key={field}>{label}: {count}</p>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface InstanceListProps {
  label: string;
  icon: string;
  instances: KotOR.GFFStruct[];
  instanceType: string;
  selectedIndex: number;
  onSelect: (instance: KotOR.GFFStruct, index: number) => void;
}

const InstanceList = (props: InstanceListProps) => {
  const { label, icon, instances, instanceType, selectedIndex, onSelect } = props;

  if(instances.length === 0){
    return null;
  }

  return (
    <div className="git-instance-list">
      <h4>{icon} {label} ({instances.length})</h4>
      <div className="git-instance-list__items">
        {instances.map((instance, index) => {
          const templateResRef = instance.getFieldByLabel('TemplateResRef')?.getValue() || '(none)';
          const tag = instance.getFieldByLabel('Tag')?.getValue() || '(no tag)';

          return (
            <div
              key={index}
              className={`git-instance-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelect(instance, index)}
            >
              <span className="instance-index">[{index}]</span>
              <div className="instance-info">
                <div className="instance-template">{templateResRef}</div>
                <div className="instance-tag">{tag}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface InstancePropertiesProps {
  instance: KotOR.GFFStruct;
  instanceType: string;
  onUpdate: () => void;
}

const InstanceProperties = (props: InstancePropertiesProps) => {
  const { instance, instanceType, onUpdate } = props;

  const getFieldValue = (label: string, defaultVal: any = '') => {
    return instance.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = instance.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  const hasField = (label: string) => instance.hasField(label);

  return (
    <div className="git-instance-properties">
      <h3>Instance Properties ({instanceType})</h3>

      {hasField('TemplateResRef') && (
        <div className="property-group">
          <label>Template ResRef</label>
          <input
            type="text"
            value={getFieldValue('TemplateResRef')}
            onChange={(e) => setFieldValue('TemplateResRef', e.target.value)}
            placeholder="Blueprint ResRef..."
          />
        </div>
      )}

      {hasField('Tag') && (
        <div className="property-group">
          <label>Tag</label>
          <input
            type="text"
            value={getFieldValue('Tag')}
            onChange={(e) => setFieldValue('Tag', e.target.value)}
            placeholder="Instance tag..."
          />
        </div>
      )}

      <h4>Position</h4>
      <div className="property-row">
        {hasField('XPosition') && (
          <div className="property-group">
            <label>X</label>
            <input
              title="X Position"
              placeholder="X Position"
              type="number"
              value={getFieldValue('XPosition', 0)}
              onChange={(e) => setFieldValue('XPosition', parseFloat(e.target.value) || 0)}
              step="0.1"
            />
          </div>
        )}
        {hasField('YPosition') && (
          <div className="property-group">
            <label>Y</label>
            <input
              title="Y Position"
              placeholder="Y Position"
              type="number"
              value={getFieldValue('YPosition', 0)}
              onChange={(e) => setFieldValue('YPosition', parseFloat(e.target.value) || 0)}
              step="0.1"
            />
          </div>
        )}
        {hasField('ZPosition') && (
          <div className="property-group">
            <label>Z</label>
            <input
              title="Z Position"
              placeholder="Z Position"
              type="number"
              value={getFieldValue('ZPosition', 0)}
              onChange={(e) => setFieldValue('ZPosition', parseFloat(e.target.value) || 0)}
              step="0.1"
            />
          </div>
        )}
      </div>

      <h4>Orientation</h4>
      <div className="property-row">
        {hasField('XOrientation') && (
          <div className="property-group">
            <label>X</label>
            <input
              title="X Orientation"
              placeholder="X Orientation"
              type="number"
              value={getFieldValue('XOrientation', 0)}
              onChange={(e) => setFieldValue('XOrientation', parseFloat(e.target.value) || 0)}
              step="0.01"
            />
          </div>
        )}
        {hasField('YOrientation') && (
          <div className="property-group">
            <label>Y</label>
            <input
              title="Y Orientation"
              placeholder="Y Orientation"
              type="number"
              value={getFieldValue('YOrientation', 0)}
              onChange={(e) => setFieldValue('YOrientation', parseFloat(e.target.value) || 0)}
              step="0.01"
            />
          </div>
        )}
        {hasField('Bearing') && (
          <div className="property-group">
            <label>Bearing</label>
            <input
              title="Bearing"
              placeholder="Bearing"
              type="number"
              value={getFieldValue('Bearing', 0)}
              onChange={(e) => setFieldValue('Bearing', parseFloat(e.target.value) || 0)}
              step="0.01"
            />
          </div>
        )}
      </div>

      {/* Show all other fields generically */}
      <h4>All Fields</h4>
      <div className="all-fields">
        {instance.getFields().map((field, idx) => (
          <div key={idx} className="field-item">
            <span className="field-label">{field.label}:</span>
            <span className="field-value">{String(field.value).substring(0, 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
