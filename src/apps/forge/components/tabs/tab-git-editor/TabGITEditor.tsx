import React, { useState, useEffect } from "react";

import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import type { GFFFieldValue } from "@/apps/forge/interfaces/GFFFormField";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ModalInsertInstanceState } from "@/apps/forge/states/modal/ModalInsertInstanceState";
import { TabGITEditorState } from "@/apps/forge/states/tabs";
import "@/apps/forge/components/tabs/tab-git-editor/TabGITEditor.scss";

interface BaseTabProps {
  tab: TabGITEditorState;
}

export const TabGITEditor = function(props: BaseTabProps){
  const tab = props.tab as TabGITEditorState;
  const [git, setGit] = useState(tab.git);
  const [selectedInstance, setSelectedInstance] = useState(tab.selectedInstance);
  const [selectedType, setSelectedType] = useState(tab.selectedInstanceType);
  const [selectedIndex, setSelectedIndex] = useState(tab.selectedInstanceIndex);
  const [searchQuery, setSearchQuery] = useState('');
  const [_revision, setRevision] = useState(0);

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

  const markUnsavedAndRefresh = () => {
    tab.file.unsaved_changes = true;
    setRevision((v) => v + 1);
  };

  const openInsertInstanceModal = () => {
    const modal = new ModalInsertInstanceState({
      title: 'Insert GIT Instance',
      onSelect: (resref, ext) => {
        if (tab.addInstanceFromBlueprint(resref, ext)) {
          markUnsavedAndRefresh();
        }
      }
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  };

  const deleteSelectedInstance = () => {
    if (tab.deleteSelectedInstance()) {
      markUnsavedAndRefresh();
    }
  };

  const duplicateSelectedInstance = () => {
    if (tab.duplicateSelectedInstance()) {
      markUnsavedAndRefresh();
    }
  };

  const moveSelectedInstanceUp = () => {
    if (tab.moveSelectedInstanceUp()) {
      markUnsavedAndRefresh();
    }
  };

  const moveSelectedInstanceDown = () => {
    if (tab.moveSelectedInstanceDown()) {
      markUnsavedAndRefresh();
    }
  };

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

  const selectedListLength = selectedType
    ? (git.RootNode.getFieldByLabel(selectedType)?.getChildStructs()?.length || 0)
    : 0;

  return (
    <div className="forge-git-editor">
      <MenuBar items={menuItems} />
      <div className="forge-git-editor__container">
        <div className="forge-git-editor__sidebar">
          <div className="forge-git-editor__sidebar-actions">
            <button className="git-action-btn" onClick={openInsertInstanceModal}>Insert Instance</button>
            <button className="git-action-btn" onClick={duplicateSelectedInstance} disabled={!selectedInstance}>Duplicate Selected</button>
            <button className="git-action-btn" onClick={moveSelectedInstanceUp} disabled={!selectedInstance || selectedIndex <= 0}>Move Up</button>
            <button className="git-action-btn" onClick={moveSelectedInstanceDown} disabled={!selectedInstance || selectedIndex < 0 || selectedIndex >= selectedListLength - 1}>Move Down</button>
            <button className="git-action-btn git-action-btn--danger" onClick={deleteSelectedInstance} disabled={!selectedInstance}>Delete Selected</button>
          </div>
          <div className="forge-git-editor__sidebar-filter">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              placeholder="Filter by resref/tag..."
            />
          </div>
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
                searchQuery={searchQuery}
              />
            );
          })}
        </div>
        <div className="forge-git-editor__main">
          {selectedInstance ? (
            <InstanceProperties
              instance={selectedInstance}
              instanceType={selectedType}
              onUpdate={markUnsavedAndRefresh}
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
  searchQuery: string;
}

const InstanceList = (props: InstanceListProps) => {
  const { label, icon, instances, instanceType: _instanceType, selectedIndex, onSelect, searchQuery } = props;

  const filteredInstances = instances.filter((instance) => {
    if (!searchQuery) return true;
    const templateResRef = String(instance.getFieldByLabel('TemplateResRef')?.getValue() || '').toLowerCase();
    const tag = String(instance.getFieldByLabel('Tag')?.getValue() || '').toLowerCase();
    return templateResRef.includes(searchQuery) || tag.includes(searchQuery);
  });

  return (
    <div className="git-instance-list">
      <h4>{icon} {label} ({instances.length})</h4>
      <div className="git-instance-list__items">
        {filteredInstances.length === 0 && (
          <div className="git-instance-list__empty">No matching instances.</div>
        )}
        {filteredInstances.map((instance) => {
          const index = instances.indexOf(instance);
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

  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
    const v = instance.getFieldByLabel(label)?.getValue();
    return (v === undefined || v === null ? defaultVal : v) as GFFFieldValue;
  };

  const setFieldValue = (label: string, value: GFFFieldValue) => {
    const field = instance.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  const hasField = (label: string) => instance.hasField(label);

  const pickFieldLabel = (labels: string[]): string | null => {
    for (const label of labels) {
      if (hasField(label)) return label;
    }
    return null;
  };

  const xLabel = pickFieldLabel(['XPosition', 'X']);
  const yLabel = pickFieldLabel(['YPosition', 'Y']);
  const zLabel = pickFieldLabel(['ZPosition', 'Z']);
  const [selectedSpawnPointIndex, setSelectedSpawnPointIndex] = useState(0);
  const [selectedGeometryPointIndex, setSelectedGeometryPointIndex] = useState(0);

  const getOrCreateListField = (label: string): KotOR.GFFField => {
    let listField = instance.getFieldByLabel(label);
    if (!listField) {
      listField = instance.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, label));
    }
    return listField;
  };

  const getListCount = (label: string): number => {
    return instance.getFieldByLabel(label)?.getChildStructs()?.length || 0;
  };

  const getSpawnPoints = () => instance.getFieldByLabel('SpawnPointList')?.getChildStructs() || [];
  const getGeometryPoints = () => instance.getFieldByLabel('Geometry')?.getChildStructs() || [];

  const getSpawnPointFieldValue = (index: number, label: string, defaultVal: number = 0): number => {
    const list = getSpawnPoints();
    const strt = list[index];
    if (!strt) return defaultVal;
    const value = strt.getFieldByLabel(label)?.getValue();
    return typeof value === 'number' ? value : defaultVal;
  };

  const setSpawnPointFieldValue = (index: number, label: string, value: number) => {
    const list = getSpawnPoints();
    const strt = list[index];
    const field = strt?.getFieldByLabel(label);
    if (!field) return;
    field.setValue(value);
    onUpdate();
  };

  const getGeometryPointFieldValue = (index: number, label: string, defaultVal: number = 0): number => {
    const list = getGeometryPoints();
    const strt = list[index];
    if (!strt) return defaultVal;
    const value = strt.getFieldByLabel(label)?.getValue();
    return typeof value === 'number' ? value : defaultVal;
  };

  const setGeometryPointFieldValue = (index: number, label: string, value: number) => {
    const list = getGeometryPoints();
    const strt = list[index];
    const field = strt?.getFieldByLabel(label);
    if (!field) return;
    field.setValue(value);
    onUpdate();
  };

  const addSpawnPoint = () => {
    const listField = getOrCreateListField('SpawnPointList');
    const spawnStruct = new KotOR.GFFStruct(3);
    spawnStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', 0));
    spawnStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', 0));
    spawnStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', 0));
    spawnStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Orientation', 0));
    listField.addChildStruct(spawnStruct);
    setSelectedSpawnPointIndex(listField.getChildStructs().length - 1);
    onUpdate();
  };

  const removeSpawnPoint = () => {
    const listField = instance.getFieldByLabel('SpawnPointList');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (!list.length) return;
    list.pop();
    setSelectedSpawnPointIndex(Math.max(0, Math.min(selectedSpawnPointIndex, list.length - 1)));
    onUpdate();
  };

  const removeSelectedSpawnPoint = () => {
    const listField = instance.getFieldByLabel('SpawnPointList');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (!list.length) return;
    const index = Math.min(selectedSpawnPointIndex, list.length - 1);
    list.splice(index, 1);
    setSelectedSpawnPointIndex(Math.max(0, Math.min(index, list.length - 1)));
    onUpdate();
  };

  const duplicateSelectedSpawnPoint = () => {
    const listField = instance.getFieldByLabel('SpawnPointList');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (!list.length) return;
    const index = Math.min(selectedSpawnPointIndex, list.length - 1);
    const selected = list[index];
    if (!selected) return;

    const duplicate = new KotOR.GFFStruct(selected.type);
    duplicate.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', selected.getFieldByLabel('X')?.getValue() || 0));
    duplicate.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', selected.getFieldByLabel('Y')?.getValue() || 0));
    duplicate.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', selected.getFieldByLabel('Z')?.getValue() || 0));
    duplicate.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Orientation', selected.getFieldByLabel('Orientation')?.getValue() || 0));

    list.splice(index + 1, 0, duplicate);
    setSelectedSpawnPointIndex(index + 1);
    onUpdate();
  };

  const moveSelectedSpawnPointUp = () => {
    const listField = instance.getFieldByLabel('SpawnPointList');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (list.length < 2) return;
    const index = Math.min(selectedSpawnPointIndex, list.length - 1);
    if (index <= 0) return;
    const tmp = list[index - 1];
    list[index - 1] = list[index];
    list[index] = tmp;
    setSelectedSpawnPointIndex(index - 1);
    onUpdate();
  };

  const moveSelectedSpawnPointDown = () => {
    const listField = instance.getFieldByLabel('SpawnPointList');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (list.length < 2) return;
    const index = Math.min(selectedSpawnPointIndex, list.length - 1);
    if (index >= list.length - 1) return;
    const tmp = list[index + 1];
    list[index + 1] = list[index];
    list[index] = tmp;
    setSelectedSpawnPointIndex(index + 1);
    onUpdate();
  };

  const addGeometryPoint = () => {
    const listField = getOrCreateListField('Geometry');
    const pointStruct = new KotOR.GFFStruct(3);
    pointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointX', 0));
    pointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointY', 0));
    pointStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointZ', 0));
    listField.addChildStruct(pointStruct);
    setSelectedGeometryPointIndex(listField.getChildStructs().length - 1);
    onUpdate();
  };

  const removeGeometryPoint = () => {
    const listField = instance.getFieldByLabel('Geometry');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (!list.length) return;
    list.pop();
    setSelectedGeometryPointIndex(Math.max(0, Math.min(selectedGeometryPointIndex, list.length - 1)));
    onUpdate();
  };

  const removeSelectedGeometryPoint = () => {
    const listField = instance.getFieldByLabel('Geometry');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (!list.length) return;
    const index = Math.min(selectedGeometryPointIndex, list.length - 1);
    list.splice(index, 1);
    setSelectedGeometryPointIndex(Math.max(0, Math.min(index, list.length - 1)));
    onUpdate();
  };

  const duplicateSelectedGeometryPoint = () => {
    const listField = instance.getFieldByLabel('Geometry');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (!list.length) return;
    const index = Math.min(selectedGeometryPointIndex, list.length - 1);
    const selected = list[index];
    if (!selected) return;

    const duplicate = new KotOR.GFFStruct(selected.type);
    duplicate.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointX', selected.getFieldByLabel('PointX')?.getValue() || 0));
    duplicate.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointY', selected.getFieldByLabel('PointY')?.getValue() || 0));
    duplicate.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'PointZ', selected.getFieldByLabel('PointZ')?.getValue() || 0));

    list.splice(index + 1, 0, duplicate);
    setSelectedGeometryPointIndex(index + 1);
    onUpdate();
  };

  const moveSelectedGeometryPointUp = () => {
    const listField = instance.getFieldByLabel('Geometry');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (list.length < 2) return;
    const index = Math.min(selectedGeometryPointIndex, list.length - 1);
    if (index <= 0) return;
    const tmp = list[index - 1];
    list[index - 1] = list[index];
    list[index] = tmp;
    setSelectedGeometryPointIndex(index - 1);
    onUpdate();
  };

  const moveSelectedGeometryPointDown = () => {
    const listField = instance.getFieldByLabel('Geometry');
    if (!listField) return;
    const list = listField.getChildStructs();
    if (list.length < 2) return;
    const index = Math.min(selectedGeometryPointIndex, list.length - 1);
    if (index >= list.length - 1) return;
    const tmp = list[index + 1];
    list[index + 1] = list[index];
    list[index] = tmp;
    setSelectedGeometryPointIndex(index + 1);
    onUpdate();
  };

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

      {hasField('ResRef') && (
        <div className="property-group">
          <label>ResRef</label>
          <input
            type="text"
            value={getFieldValue('ResRef')}
            onChange={(e) => setFieldValue('ResRef', e.target.value)}
            placeholder="Resource ResRef..."
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

      {(xLabel || yLabel || zLabel) && (
        <>
          <h4>Position</h4>
          <div className="property-row">
            {xLabel && (
              <div className="property-group">
                <label>X</label>
                <input
                  title="X Position"
                  placeholder="X Position"
                  type="number"
                  value={getFieldValue(xLabel, 0)}
                  onChange={(e) => setFieldValue(xLabel, parseFloat(e.target.value) || 0)}
                  step="0.1"
                />
              </div>
            )}
            {yLabel && (
              <div className="property-group">
                <label>Y</label>
                <input
                  title="Y Position"
                  placeholder="Y Position"
                  type="number"
                  value={getFieldValue(yLabel, 0)}
                  onChange={(e) => setFieldValue(yLabel, parseFloat(e.target.value) || 0)}
                  step="0.1"
                />
              </div>
            )}
            {zLabel && (
              <div className="property-group">
                <label>Z</label>
                <input
                  title="Z Position"
                  placeholder="Z Position"
                  type="number"
                  value={getFieldValue(zLabel, 0)}
                  onChange={(e) => setFieldValue(zLabel, parseFloat(e.target.value) || 0)}
                  step="0.1"
                />
              </div>
            )}
          </div>
        </>
      )}

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

      {(hasField('LinkedTo') || hasField('LinkedToFlags') || hasField('LinkedToModule') || hasField('GeneratedType') || hasField('Appearance') || hasField('PaletteID') || hasField('HasMapNote') || hasField('MapNoteEnabled')) && (
        <>
          <h4>Instance Settings</h4>
          <div className="property-row">
            {hasField('LinkedTo') && (
              <div className="property-group">
                <label>Linked To</label>
                <input
                  type="text"
                  value={getFieldValue('LinkedTo')}
                  onChange={(e) => setFieldValue('LinkedTo', e.target.value)}
                  placeholder="Linked object tag..."
                />
              </div>
            )}
            {hasField('LinkedToModule') && (
              <div className="property-group">
                <label>Linked Module</label>
                <input
                  type="text"
                  value={getFieldValue('LinkedToModule')}
                  onChange={(e) => setFieldValue('LinkedToModule', e.target.value)}
                  placeholder="Module ResRef..."
                />
              </div>
            )}
          </div>
          <div className="property-row">
            {hasField('LinkedToFlags') && (
              <div className="property-group">
                <label>Linked Flags</label>
                <input
                  title="Linked Flags"
                  placeholder="Linked Flags"
                  type="number"
                  value={getFieldValue('LinkedToFlags', 0)}
                  onChange={(e) => setFieldValue('LinkedToFlags', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
            {hasField('GeneratedType') && (
              <div className="property-group">
                <label>Generated Type</label>
                <input
                  title="Generated Type"
                  placeholder="Generated Type"
                  type="number"
                  value={getFieldValue('GeneratedType', 0)}
                  onChange={(e) => setFieldValue('GeneratedType', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
            {hasField('Appearance') && (
              <div className="property-group">
                <label>Appearance</label>
                <input
                  title="Appearance"
                  placeholder="Appearance"
                  type="number"
                  value={getFieldValue('Appearance', 0)}
                  onChange={(e) => setFieldValue('Appearance', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
            {hasField('PaletteID') && (
              <div className="property-group">
                <label>Palette ID</label>
                <input
                  title="Palette ID"
                  placeholder="Palette ID"
                  type="number"
                  value={getFieldValue('PaletteID', 0)}
                  onChange={(e) => setFieldValue('PaletteID', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
          <div className="property-row">
            {hasField('HasMapNote') && (
              <div className="property-group">
                <label>Has Map Note</label>
                <input
                  title="Has Map Note"
                  type="checkbox"
                  checked={Boolean(getFieldValue('HasMapNote', 0))}
                  onChange={(e) => setFieldValue('HasMapNote', e.target.checked ? 1 : 0)}
                />
              </div>
            )}
            {hasField('MapNoteEnabled') && (
              <div className="property-group">
                <label>Map Note Enabled</label>
                <input
                  title="Map Note Enabled"
                  type="checkbox"
                  checked={Boolean(getFieldValue('MapNoteEnabled', 0))}
                  onChange={(e) => setFieldValue('MapNoteEnabled', e.target.checked ? 1 : 0)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {(hasField('SpawnPointList') || hasField('Geometry')) && (
        <>
          <h4>Shape Data</h4>
          {hasField('SpawnPointList') && (
            <div className="property-group">
              <label>Spawn Points</label>
              <div className="git-inline-actions">
                <span>{getListCount('SpawnPointList')} entries</span>
                <button className="git-action-btn git-action-btn--inline" onClick={addSpawnPoint}>Add</button>
                <button
                  className="git-action-btn git-action-btn--inline"
                  onClick={duplicateSelectedSpawnPoint}
                  disabled={getListCount('SpawnPointList') === 0}
                >
                  Duplicate Selected
                </button>
                <button
                  className="git-action-btn git-action-btn--inline"
                  onClick={moveSelectedSpawnPointUp}
                  disabled={getListCount('SpawnPointList') < 2 || selectedSpawnPointIndex <= 0}
                >
                  Move Up
                </button>
                <button
                  className="git-action-btn git-action-btn--inline"
                  onClick={moveSelectedSpawnPointDown}
                  disabled={getListCount('SpawnPointList') < 2 || selectedSpawnPointIndex >= getListCount('SpawnPointList') - 1}
                >
                  Move Down
                </button>
                <button
                  className="git-action-btn git-action-btn--inline git-action-btn--danger"
                  onClick={removeSelectedSpawnPoint}
                  disabled={getListCount('SpawnPointList') === 0}
                >
                  Remove Selected
                </button>
                <button
                  className="git-action-btn git-action-btn--inline git-action-btn--danger"
                  onClick={removeSpawnPoint}
                  disabled={getListCount('SpawnPointList') === 0}
                >
                  Remove Last
                </button>
              </div>
              {getListCount('SpawnPointList') > 0 && (
                <>
                  <div className="git-inline-actions">
                    <label>Selected</label>
                    <select
                      title="Selected Spawn Point"
                      value={Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1)}
                      onChange={(e) => setSelectedSpawnPointIndex(parseInt(e.target.value) || 0)}
                    >
                      {getSpawnPoints().map((_, i) => (
                        <option key={`spawn-point-${i}`} value={i}>{`#${i}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="property-row">
                    <div className="property-group">
                      <label>Spawn X</label>
                      <input
                        title="Spawn X"
                        placeholder="Spawn X"
                        type="number"
                        value={getSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'X', 0)}
                        onChange={(e) => setSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'X', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </div>
                    <div className="property-group">
                      <label>Spawn Y</label>
                      <input
                        title="Spawn Y"
                        placeholder="Spawn Y"
                        type="number"
                        value={getSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'Y', 0)}
                        onChange={(e) => setSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'Y', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </div>
                    <div className="property-group">
                      <label>Spawn Z</label>
                      <input
                        title="Spawn Z"
                        placeholder="Spawn Z"
                        type="number"
                        value={getSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'Z', 0)}
                        onChange={(e) => setSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'Z', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </div>
                    <div className="property-group">
                      <label>Orientation</label>
                      <input
                        title="Spawn Orientation"
                        placeholder="Spawn Orientation"
                        type="number"
                        value={getSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'Orientation', 0)}
                        onChange={(e) => setSpawnPointFieldValue(Math.min(selectedSpawnPointIndex, getListCount('SpawnPointList') - 1), 'Orientation', parseFloat(e.target.value) || 0)}
                        step="0.01"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {hasField('Geometry') && (
            <div className="property-group">
              <label>Geometry Points</label>
              <div className="git-inline-actions">
                <span>{getListCount('Geometry')} entries</span>
                <button className="git-action-btn git-action-btn--inline" onClick={addGeometryPoint}>Add</button>
                <button
                  className="git-action-btn git-action-btn--inline"
                  onClick={duplicateSelectedGeometryPoint}
                  disabled={getListCount('Geometry') === 0}
                >
                  Duplicate Selected
                </button>
                <button
                  className="git-action-btn git-action-btn--inline"
                  onClick={moveSelectedGeometryPointUp}
                  disabled={getListCount('Geometry') < 2 || selectedGeometryPointIndex <= 0}
                >
                  Move Up
                </button>
                <button
                  className="git-action-btn git-action-btn--inline"
                  onClick={moveSelectedGeometryPointDown}
                  disabled={getListCount('Geometry') < 2 || selectedGeometryPointIndex >= getListCount('Geometry') - 1}
                >
                  Move Down
                </button>
                <button
                  className="git-action-btn git-action-btn--inline git-action-btn--danger"
                  onClick={removeSelectedGeometryPoint}
                  disabled={getListCount('Geometry') === 0}
                >
                  Remove Selected
                </button>
                <button
                  className="git-action-btn git-action-btn--inline git-action-btn--danger"
                  onClick={removeGeometryPoint}
                  disabled={getListCount('Geometry') === 0}
                >
                  Remove Last
                </button>
              </div>
              {getListCount('Geometry') > 0 && (
                <>
                  <div className="git-inline-actions">
                    <label>Selected</label>
                    <select
                      title="Selected Geometry Point"
                      value={Math.min(selectedGeometryPointIndex, getListCount('Geometry') - 1)}
                      onChange={(e) => setSelectedGeometryPointIndex(parseInt(e.target.value) || 0)}
                    >
                      {getGeometryPoints().map((_, i) => (
                        <option key={`geometry-point-${i}`} value={i}>{`#${i}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="property-row">
                    <div className="property-group">
                      <label>Point X</label>
                      <input
                        title="Point X"
                        placeholder="Point X"
                        type="number"
                        value={getGeometryPointFieldValue(Math.min(selectedGeometryPointIndex, getListCount('Geometry') - 1), 'PointX', 0)}
                        onChange={(e) => setGeometryPointFieldValue(Math.min(selectedGeometryPointIndex, getListCount('Geometry') - 1), 'PointX', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </div>
                    <div className="property-group">
                      <label>Point Y</label>
                      <input
                        title="Point Y"
                        placeholder="Point Y"
                        type="number"
                        value={getGeometryPointFieldValue(Math.min(selectedGeometryPointIndex, getListCount('Geometry') - 1), 'PointY', 0)}
                        onChange={(e) => setGeometryPointFieldValue(Math.min(selectedGeometryPointIndex, getListCount('Geometry') - 1), 'PointY', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </div>
                    <div className="property-group">
                      <label>Point Z</label>
                      <input
                        title="Point Z"
                        placeholder="Point Z"
                        type="number"
                        value={getGeometryPointFieldValue(Math.min(selectedGeometryPointIndex, getListCount('Geometry') - 1), 'PointZ', 0)}
                        onChange={(e) => setGeometryPointFieldValue(Math.min(selectedGeometryPointIndex, getListCount('Geometry') - 1), 'PointZ', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

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
