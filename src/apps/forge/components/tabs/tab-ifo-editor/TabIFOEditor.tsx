import React, { useState, useEffect } from "react";
import { TabIFOEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabIFOEditor.scss";

interface BaseTabProps {
  tab: TabIFOEditorState;
}

export const TabIFOEditor = function(props: BaseTabProps){
  const tab = props.tab as TabIFOEditorState;
  const [ifo, setIfo] = useState(tab.ifo);
  const [activeTab, setActiveTab] = useState(tab.activeTab);

  useEffect(() => {
    const loadHandler = () => setIfo(tab.ifo);
    const tabHandler = () => setActiveTab(tab.activeTab);

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onTabChange', tabHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onTabChange', tabHandler);
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

  if(!ifo){
    return (
      <div className="forge-ifo-editor">
        <MenuBar items={menuItems} />
        <div className="forge-ifo-editor__loading">Loading module info...</div>
      </div>
    );
  }

  const markUnsaved = () => {
    tab.file.unsaved_changes = true;
  };

  return (
    <div className="forge-ifo-editor">
      <MenuBar items={menuItems} />
      <div className="forge-ifo-editor__tabs">
        <button
          className={activeTab === 'basic' ? 'active' : ''}
          onClick={() => tab.setActiveTab('basic')}
        >
          Basic
        </button>
        <button
          className={activeTab === 'entry' ? 'active' : ''}
          onClick={() => tab.setActiveTab('entry')}
        >
          Entry Point
        </button>
        <button
          className={activeTab === 'scripts' ? 'active' : ''}
          onClick={() => tab.setActiveTab('scripts')}
        >
          Scripts
        </button>
        <button
          className={activeTab === 'areas' ? 'active' : ''}
          onClick={() => tab.setActiveTab('areas')}
        >
          Areas
        </button>
        <button
          className={activeTab === 'advanced' ? 'active' : ''}
          onClick={() => tab.setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>
      <div className="forge-ifo-editor__content">
        {activeTab === 'basic' && <BasicTab ifo={ifo} onUpdate={markUnsaved} />}
        {activeTab === 'entry' && <EntryPointTab ifo={ifo} onUpdate={markUnsaved} />}
        {activeTab === 'scripts' && <ScriptsTab ifo={ifo} onUpdate={markUnsaved} />}
        {activeTab === 'areas' && <AreasTab ifo={ifo} onUpdate={markUnsaved} />}
        {activeTab === 'advanced' && <AdvancedTab ifo={ifo} onUpdate={markUnsaved} />}
      </div>
    </div>
  );
};

interface TabProps {
  ifo: KotOR.GFFObject;
  onUpdate: () => void;
}

const BasicTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return ifo.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = ifo.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="ifo-tab-content">
      <div className="property-group">
        <label>Module Tag</label>
        <input
          type="text"
          value={getFieldValue('Mod_Tag')}
          onChange={(e) => setFieldValue('Mod_Tag', e.target.value)}
          placeholder="Module tag..."
        />
      </div>
      <div className="property-group">
        <label>Module Name (LocString)</label>
        <input
          type="text"
          value={getFieldValue('Mod_Name')}
          onChange={(e) => setFieldValue('Mod_Name', e.target.value)}
          placeholder="Module name..."
        />
      </div>
      <div className="property-group">
        <label>Description (LocString)</label>
        <textarea
          value={getFieldValue('Mod_Description')}
          onChange={(e) => setFieldValue('Mod_Description', e.target.value)}
          rows={4}
          placeholder="Module description..."
        />
      </div>
      <div className="property-group">
        <label>VO ID</label>
        <input
          type="text"
          value={getFieldValue('Mod_VO_ID')}
          onChange={(e) => setFieldValue('Mod_VO_ID', e.target.value)}
          placeholder="Voice-over ID..."
        />
      </div>
      <div className="property-group">
        <label>HAK File</label>
        <input
          type="text"
          value={getFieldValue('Mod_Hak')}
          onChange={(e) => setFieldValue('Mod_Hak', e.target.value)}
          placeholder="HAK file..."
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Creator ID</label>
          <input
            title="Creator ID"
            placeholder="Creator ID"
            type="number"
            value={getFieldValue('Mod_Creator_ID', 0)}
            onChange={(e) => setFieldValue('Mod_Creator_ID', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="property-group">
          <label>Version</label>
          <input
            title="Version"
            placeholder="Version"
            type="number"
            value={getFieldValue('Mod_Version', 1)}
            onChange={(e) => setFieldValue('Mod_Version', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>
    </div>
  );
};

const EntryPointTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return ifo.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = ifo.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="ifo-tab-content">
      <div className="property-group">
        <label>Entry Area</label>
        <input
          title="Entry Area"
          placeholder="Starting area ResRef..."
          type="text"
          value={getFieldValue('Mod_Entry_Area')}
          onChange={(e) => setFieldValue('Mod_Entry_Area', e.target.value)}
        />
      </div>
      <h4>Position</h4>
      <div className="property-row">
        <div className="property-group">
          <label>X</label>
          <input
            title="X"
            placeholder="X"
            type="number"
            value={getFieldValue('Mod_Entry_X', 0)}
            onChange={(e) => setFieldValue('Mod_Entry_X', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>Y</label>
          <input
            title="Y"
            placeholder="Y"
            type="number"
            value={getFieldValue('Mod_Entry_Y', 0)}
            onChange={(e) => setFieldValue('Mod_Entry_Y', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>Z</label>
          <input
            title="Z"
            placeholder="Z"
            type="number"
            value={getFieldValue('Mod_Entry_Z', 0)}
            onChange={(e) => setFieldValue('Mod_Entry_Z', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
      <h4>Direction (Facing)</h4>
      <div className="property-row">
        <div className="property-group">
          <label>Dir X</label>
          <input
            title="Dir X"
            placeholder="Dir X"
            type="number"
            value={getFieldValue('Mod_Entry_Dir_X', 0)}
            onChange={(e) => setFieldValue('Mod_Entry_Dir_X', parseFloat(e.target.value) || 0)}
            step="0.01"
          />
        </div>
        <div className="property-group">
          <label>Dir Y</label>
          <input
            title="Dir Y"
            placeholder="Dir Y"
            type="number"
            value={getFieldValue('Mod_Entry_Dir_Y', 0)}
            onChange={(e) => setFieldValue('Mod_Entry_Dir_Y', parseFloat(e.target.value) || 0)}
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
};

const ScriptsTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return ifo.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = ifo.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  const scriptFields = [
    { label: 'OnHeartbeat', field: 'Mod_OnHeartbeat' },
    { label: 'OnModLoad', field: 'Mod_OnModLoad' },
    { label: 'OnModStart', field: 'Mod_OnModStart' },
    { label: 'OnClientEntr', field: 'Mod_OnClientEntr' },
    { label: 'OnClientLeav', field: 'Mod_OnClientLeav' },
    { label: 'OnPlayerDeath', field: 'Mod_OnPlrDeath' },
    { label: 'OnPlayerDying', field: 'Mod_OnPlrDying' },
    { label: 'OnPlayerLevelUp', field: 'Mod_OnPlrLvlUp' },
    { label: 'OnPlayerRest', field: 'Mod_OnSpawnBtnDn' },
    { label: 'OnAcquireItem', field: 'Mod_OnAcquirItem' },
    { label: 'OnUnacquireItem', field: 'Mod_OnUsrDefined' },
    { label: 'OnUserDefined', field: 'Mod_OnUsrDefined' },
  ];

  return (
    <div className="ifo-tab-content">
      {scriptFields.map(({ label, field }) => (
        <div key={field} className="property-group">
          <label>{label}</label>
          <input
            type="text"
            value={getFieldValue(field)}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder="Script ResRef..."
          />
        </div>
      ))}
    </div>
  );
};

const AreasTab = ({ ifo, onUpdate }: TabProps) => {
  const areaList = ifo.RootNode.getFieldByLabel('Mod_Area_list');
  const areas = areaList?.getChildStructs() || [];

  return (
    <div className="ifo-tab-content">
      <h4>Areas ({areas.length})</h4>
      {areas.length === 0 ? (
        <p className="no-data">No areas defined in this module.</p>
      ) : (
        <div className="areas-list">
          {areas.map((area, index) => {
            const areaFields = area.getFields();
            const areaName = areaFields.find(f => f.label === 'Area_Name')?.value || `Area ${index}`;

            return (
              <div key={index} className="area-item">
                <strong>{areaName}</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdvancedTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return ifo.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = ifo.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="ifo-tab-content">
      <div className="property-group">
        <label>Expansion Pack</label>
        <input
          title="Expansion Pack"
          placeholder="Expansion Pack"
          type="number"
          value={getFieldValue('Expansion_Pack', 0)}
          onChange={(e) => setFieldValue('Expansion_Pack', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="property-group">
        <label>Min Game Version</label>
        <input
          title="Min Game Version"
          placeholder="e.g. 1.0"
          type="text"
          value={getFieldValue('Mod_MinGameVer')}
          onChange={(e) => setFieldValue('Mod_MinGameVer', e.target.value)}
        />
      </div>
      <div className="property-group">
        <label>XP Scale</label>
        <input
          title="XP Scale"
          placeholder="XP Scale"
          type="number"
          value={getFieldValue('Mod_XPScale', 100)}
          onChange={(e) => setFieldValue('Mod_XPScale', parseInt(e.target.value) || 100)}
          min="0"
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Dawn Hour</label>
          <input
            title="Dawn Hour"
            placeholder="Dawn Hour"
            type="number"
            value={getFieldValue('Mod_DawnHour', 6)}
            onChange={(e) => setFieldValue('Mod_DawnHour', parseInt(e.target.value) || 6)}
            min="0"
            max="23"
          />
        </div>
        <div className="property-group">
          <label>Dusk Hour</label>
          <input
            title="Dusk Hour"
            placeholder="Dusk Hour"
            type="number"
            value={getFieldValue('Mod_DuskHour', 18)}
            onChange={(e) => setFieldValue('Mod_DuskHour', parseInt(e.target.value) || 18)}
            min="0"
            max="23"
          />
        </div>
      </div>
      <div className="property-group">
        <label>Start Movie</label>
        <input
          title="Start Movie"
          placeholder="Movie ResRef..."
          type="text"
          value={getFieldValue('Mod_StartMovie')}
          onChange={(e) => setFieldValue('Mod_StartMovie', e.target.value)}
        />
      </div>
    </div>
  );
};
