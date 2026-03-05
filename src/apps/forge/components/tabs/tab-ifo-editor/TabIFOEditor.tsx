import React, { useMemo, useState, useEffect } from "react";

import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor/CExoLocStringEditor";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import type { GFFFieldValue } from "@/apps/forge/interfaces/GFFFormField";
import * as KotOR from "@/apps/forge/KotOR";
import { TabIFOEditorState } from "@/apps/forge/states/tabs";
import "@/apps/forge/components/tabs/tab-ifo-editor/TabIFOEditor.scss";

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

interface RootFieldSpec {
  type: number;
  defaultValue: GFFFieldValue;
}

const getRootFieldValue = (ifo: KotOR.GFFObject, label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
  const v = ifo.RootNode.getFieldByLabel(label)?.getValue();
  return (v === undefined || v === null ? defaultVal : v) as GFFFieldValue;
};

const setRootFieldValue = (
  ifo: KotOR.GFFObject,
  label: string,
  value: GFFFieldValue,
  onUpdate: () => void,
  spec?: RootFieldSpec
) => {
  let field = ifo.RootNode.getFieldByLabel(label);
  if(!field && spec){
    field = ifo.RootNode.addField(new KotOR.GFFField(spec.type, label, spec.defaultValue));
  }

  if(field){
    field.setValue(value);
    onUpdate();
  }
};

const formatModIdHex = (ifo: KotOR.GFFObject): string => {
  const field = ifo.RootNode.getFieldByLabel('Mod_ID');
  const bytes = field?.getVoid();
  if(!bytes || bytes.length === 0){
    return '';
  }

  return Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join(' ');
};

const BasicTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => getRootFieldValue(ifo, label, defaultVal);

  const setFieldValue = (label: string, value: GFFFieldValue, spec?: RootFieldSpec) => {
    setRootFieldValue(ifo, label, value, onUpdate, spec);
  };

  const getLocStringValue = (label: string): KotOR.CExoLocString => {
    const field = ifo.RootNode.getFieldByLabel(label);
    return field?.getCExoLocString() || new KotOR.CExoLocString();
  };

  const generateModuleTag = () => {
    const moduleName = getLocStringValue('Mod_Name').getValue().trim();
    const voId = String(getFieldValue('Mod_VO_ID', '') || '').trim();
    const source = moduleName || voId;
    if (!source) return;

    const generated = source
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32);

    if (generated.length > 0) {
      setFieldValue('Mod_Tag', generated, { type: KotOR.GFFDataType.CEXOSTRING, defaultValue: '' });
    }
  };

  return (
    <div className="ifo-tab-content">
      <div className="property-group">
        <label>Module Tag</label>
        <input
          type="text"
          value={getFieldValue('Mod_Tag')}
          onChange={(e) => setFieldValue('Mod_Tag', e.target.value, { type: KotOR.GFFDataType.CEXOSTRING, defaultValue: '' })}
          placeholder="Module tag..."
        />
        <div className="ifo-inline-actions">
          <button className="ifo-action-btn" onClick={generateModuleTag}>Generate From Name/VO ID</button>
        </div>
      </div>
      <div className="property-group">
        <label>Module Name (LocString)</label>
        <CExoLocStringEditor
          value={getLocStringValue('Mod_Name')}
          onChange={(value) => setFieldValue('Mod_Name', value, { type: KotOR.GFFDataType.CEXOLOCSTRING, defaultValue: new KotOR.CExoLocString() })}
        />
      </div>
      <div className="property-group">
        <label>Description (LocString)</label>
        <CExoLocStringEditor
          value={getLocStringValue('Mod_Description')}
          onChange={(value) => setFieldValue('Mod_Description', value, { type: KotOR.GFFDataType.CEXOLOCSTRING, defaultValue: new KotOR.CExoLocString() })}
        />
      </div>
      <div className="property-group">
        <label>VO ID</label>
        <input
          type="text"
          value={getFieldValue('Mod_VO_ID')}
          onChange={(e) => setFieldValue('Mod_VO_ID', e.target.value, { type: KotOR.GFFDataType.CEXOSTRING, defaultValue: '' })}
          placeholder="Voice-over ID..."
        />
      </div>
      <div className="property-group">
        <label>HAK File</label>
        <input
          type="text"
          value={getFieldValue('Mod_Hak')}
          onChange={(e) => setFieldValue('Mod_Hak', e.target.value, { type: KotOR.GFFDataType.CEXOSTRING, defaultValue: '' })}
          placeholder="HAK file..."
        />
      </div>
      <div className="property-group">
        <label>Module ID (Hex)</label>
        <input
          title="Module ID"
          placeholder="Generated module identifier"
          type="text"
          value={formatModIdHex(ifo)}
          readOnly
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
            onChange={(e) => setFieldValue('Mod_Creator_ID', parseInt(e.target.value) || 0, { type: KotOR.GFFDataType.INT, defaultValue: 0 })}
          />
        </div>
        <div className="property-group">
          <label>Version</label>
          <input
            title="Version"
            placeholder="Version"
            type="number"
            value={getFieldValue('Mod_Version', 1)}
            onChange={(e) => setFieldValue('Mod_Version', parseInt(e.target.value) || 1, { type: KotOR.GFFDataType.DWORD, defaultValue: 1 })}
          />
        </div>
      </div>
    </div>
  );
};

const EntryPointTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => getRootFieldValue(ifo, label, defaultVal);

  const setFieldValue = (label: string, value: GFFFieldValue, spec?: RootFieldSpec) => {
    setRootFieldValue(ifo, label, value, onUpdate, spec);
  };

  const getDirectionDegrees = (): number => {
    const dirX = Number(getFieldValue('Mod_Entry_Dir_X', 0));
    const dirY = Number(getFieldValue('Mod_Entry_Dir_Y', 0));
    if (dirX === 0 && dirY === 0) {
      return 0;
    }
    const radians = Math.atan2(dirY, dirX);
    const degrees = (radians * 180) / Math.PI;
    return ((degrees % 360) + 360) % 360;
  };

  const setDirectionDegrees = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    const dirX = Math.cos(radians);
    const dirY = Math.sin(radians);
    setFieldValue('Mod_Entry_Dir_X', dirX, { type: KotOR.GFFDataType.FLOAT, defaultValue: 0 });
    setFieldValue('Mod_Entry_Dir_Y', dirY, { type: KotOR.GFFDataType.FLOAT, defaultValue: 0 });
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
          onChange={(e) => setFieldValue('Mod_Entry_Area', e.target.value, { type: KotOR.GFFDataType.RESREF, defaultValue: '' })}
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
            onChange={(e) => setFieldValue('Mod_Entry_X', parseFloat(e.target.value) || 0, { type: KotOR.GFFDataType.FLOAT, defaultValue: 0 })}
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
            onChange={(e) => setFieldValue('Mod_Entry_Y', parseFloat(e.target.value) || 0, { type: KotOR.GFFDataType.FLOAT, defaultValue: 0 })}
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
            onChange={(e) => setFieldValue('Mod_Entry_Z', parseFloat(e.target.value) || 0, { type: KotOR.GFFDataType.FLOAT, defaultValue: 0 })}
            step="0.1"
          />
        </div>
      </div>
      <h4>Direction (Facing)</h4>
      <div className="property-group">
        <label>Direction (Degrees)</label>
        <input
          title="Direction Degrees"
          placeholder="0-359"
          type="number"
          value={getDirectionDegrees()}
          onChange={(e) => setDirectionDegrees(parseFloat(e.target.value) || 0)}
          min="0"
          max="359"
          step="1"
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Dir X</label>
          <input
            title="Dir X"
            placeholder="Dir X"
            type="number"
            value={getFieldValue('Mod_Entry_Dir_X', 0)}
            onChange={(e) => setFieldValue('Mod_Entry_Dir_X', parseFloat(e.target.value) || 0, { type: KotOR.GFFDataType.FLOAT, defaultValue: 0 })}
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
            onChange={(e) => setFieldValue('Mod_Entry_Dir_Y', parseFloat(e.target.value) || 0, { type: KotOR.GFFDataType.FLOAT, defaultValue: 0 })}
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
};

const ScriptsTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => getRootFieldValue(ifo, label, defaultVal);

  const setFieldValue = (label: string, value: GFFFieldValue) => {
    setRootFieldValue(ifo, label, value, onUpdate, { type: KotOR.GFFDataType.RESREF, defaultValue: '' });
  };

  const scriptFields = [
    { label: 'OnHeartbeat', field: 'Mod_OnHeartbeat' },
    { label: 'OnModLoad', field: 'Mod_OnModLoad' },
    { label: 'OnModStart', field: 'Mod_OnModStart' },
    { label: 'OnClientEntr', field: 'Mod_OnClientEntr' },
    { label: 'OnClientLeav', field: 'Mod_OnClientLeav' },
    { label: 'OnActivateItem', field: 'Mod_OnActvtItem' },
    { label: 'OnPlayerDeath', field: 'Mod_OnPlrDeath' },
    { label: 'OnPlayerDying', field: 'Mod_OnPlrDying' },
    { label: 'OnPlayerLevelUp', field: 'Mod_OnPlrLvlUp' },
    { label: 'OnPlayerRest', field: 'Mod_OnPlrRest' },
    { label: 'OnPlayerRespawn (Spawn Button)', field: 'Mod_OnSpawnBtnDn' },
    { label: 'OnAcquireItem', field: 'Mod_OnAcquirItem' },
    { label: 'OnUnacquireItem', field: 'Mod_OnUnAqreItem' },
    { label: 'OnUserDefined', field: 'Mod_OnUsrDefined' },
  ];

  const scriptSuggestions = useMemo(() => {
    const keyObject = KotOR.KEYManager?.Key;
    if (!keyObject?.keys?.length) {
      return [] as string[];
    }

    const ncsType = KotOR.ResourceTypes['ncs'];
    const names = keyObject.keys
      .filter((entry: KotOR.IKEYEntry) => entry.resType === ncsType)
      .map((entry: KotOR.IKEYEntry) => String(entry.resRef || '').toLowerCase())
      .filter((name: string) => name.length > 0);

    return Array.from(new Set(names)).sort();
  }, []);

  const suggestionListId = 'ifo-script-suggestions';

  return (
    <div className="ifo-tab-content">
      <datalist id={suggestionListId}>
        {scriptSuggestions.map((name) => (
          <option key={`ifo-script-${name}`} value={name} />
        ))}
      </datalist>
      {scriptFields.map(({ label, field }) => (
        <div key={field} className="property-group">
          <label>{label}</label>
          <input
            type="text"
            value={getFieldValue(field)}
            onChange={(e) => setFieldValue(field, e.target.value)}
            placeholder="Script ResRef..."
            list={suggestionListId}
            maxLength={16}
          />
        </div>
      ))}
    </div>
  );
};

const AreasTab = ({ ifo, onUpdate: _onUpdate }: TabProps) => {
  const onUpdate = _onUpdate;
  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
  const [revision, setRevision] = useState(0);

  const ensureAreaList = () => {
    let areaList = ifo.RootNode.getFieldByLabel('Mod_Area_list');
    if (!areaList) {
      areaList = ifo.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Mod_Area_list'));
    }
    return areaList;
  };

  const getAreas = () => ensureAreaList()?.getChildStructs() || [];
  const areas = getAreas();
  const activeAreaIndex = Math.min(selectedAreaIndex, Math.max(areas.length - 1, 0));

  const bumpRevision = () => setRevision((value) => value + 1);

  const addArea = () => {
    const areaList = ensureAreaList();
    const areaStruct = new KotOR.GFFStruct(6);
    areaStruct.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Area_Name', ''));
    areaList.addChildStruct(areaStruct);
    setSelectedAreaIndex(areaList.getChildStructs().length - 1);
    onUpdate();
    bumpRevision();
  };

  const removeSelectedArea = () => {
    const areaList = ensureAreaList();
    const list = areaList.getChildStructs();
    if (list.length === 0) {
      return;
    }

    list.splice(activeAreaIndex, 1);
    setSelectedAreaIndex(Math.max(0, Math.min(activeAreaIndex, list.length - 1)));
    onUpdate();
    bumpRevision();
  };

  const setAreaName = (index: number, value: string) => {
    const area = getAreas()[index];
    if (!area) {
      return;
    }

    let areaNameField = area.getFieldByLabel('Area_Name');
    if (!areaNameField) {
      areaNameField = area.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Area_Name', ''));
    }

    areaNameField.setValue(value);
    onUpdate();
    bumpRevision();
  };

  return (
    <div className="ifo-tab-content">
      <h4>Areas ({areas.length})</h4>
      <div className="ifo-inline-actions">
        <button className="ifo-action-btn" onClick={addArea}>Add Area</button>
        <button className="ifo-action-btn ifo-action-btn--danger" onClick={removeSelectedArea} disabled={areas.length === 0}>Remove Selected</button>
      </div>
      {areas.length === 0 ? (
        <p className="no-data">No areas defined in this module.</p>
      ) : (
        <div className="areas-list" data-revision={revision}>
          <div className="property-group">
            <label>Selected Area</label>
            <select
              title="Selected Area"
              value={activeAreaIndex}
              onChange={(e) => setSelectedAreaIndex(parseInt(e.target.value) || 0)}
            >
              {areas.map((_, index) => (
                <option key={`area-select-${index}`} value={index}>{`#${index}`}</option>
              ))}
            </select>
          </div>
          {areas.map((area, index) => {
            const areaName = area.getFieldByLabel('Area_Name')?.getValue() || `Area ${index}`;
            const objectId = area.getFieldByLabel('ObjectId')?.getValue();

            return (
              <div key={index} className="area-item">
                <strong>{areaName}</strong>
                {index === activeAreaIndex && (
                  <div className="property-group">
                    <label>Area Name (ResRef)</label>
                    <input
                      title="Area Name"
                      type="text"
                      value={String(area.getFieldByLabel('Area_Name')?.getValue() || '')}
                      onChange={(e) => setAreaName(index, e.target.value)}
                      placeholder="e.g. m01aa"
                      maxLength={16}
                    />
                  </div>
                )}
                {objectId !== undefined && <span>{`ObjectId: ${objectId}`}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AdvancedTab = ({ ifo, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => getRootFieldValue(ifo, label, defaultVal);

  const setFieldValue = (label: string, value: GFFFieldValue, spec?: RootFieldSpec) => {
    setRootFieldValue(ifo, label, value, onUpdate, spec);
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
          onChange={(e) => setFieldValue('Expansion_Pack', parseInt(e.target.value) || 0, { type: KotOR.GFFDataType.WORD, defaultValue: 0 })}
        />
      </div>
      <div className="property-group">
        <label>Min Game Version</label>
        <input
          title="Min Game Version"
          placeholder="e.g. 1.0"
          type="text"
          value={getFieldValue('Mod_MinGameVer')}
          onChange={(e) => setFieldValue('Mod_MinGameVer', e.target.value, { type: KotOR.GFFDataType.CEXOSTRING, defaultValue: '' })}
        />
      </div>
      <div className="property-group">
        <label>XP Scale</label>
        <input
          title="XP Scale"
          placeholder="XP Scale"
          type="number"
          value={getFieldValue('Mod_XPScale', 100)}
          onChange={(e) => setFieldValue('Mod_XPScale', parseInt(e.target.value) || 100, { type: KotOR.GFFDataType.BYTE, defaultValue: 100 })}
          min="0"
        />
      </div>
      <div className="property-group">
        <label>Minutes Per Hour</label>
        <input
          title="Minutes Per Hour"
          placeholder="Minutes Per Hour"
          type="number"
          value={getFieldValue('Mod_MinPerHour', 2)}
          onChange={(e) => setFieldValue('Mod_MinPerHour', parseInt(e.target.value) || 2, { type: KotOR.GFFDataType.BYTE, defaultValue: 2 })}
          min="1"
          max="255"
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
            onChange={(e) => setFieldValue('Mod_DawnHour', parseInt(e.target.value) || 6, { type: KotOR.GFFDataType.BYTE, defaultValue: 6 })}
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
            onChange={(e) => setFieldValue('Mod_DuskHour', parseInt(e.target.value) || 18, { type: KotOR.GFFDataType.BYTE, defaultValue: 18 })}
            min="0"
            max="23"
          />
        </div>
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Start Year</label>
          <input
            title="Start Year"
            placeholder="Start Year"
            type="number"
            value={getFieldValue('Mod_StartYear', 0)}
            onChange={(e) => setFieldValue('Mod_StartYear', parseInt(e.target.value) || 0, { type: KotOR.GFFDataType.DWORD, defaultValue: 0 })}
            min="0"
          />
        </div>
        <div className="property-group">
          <label>Start Month</label>
          <input
            title="Start Month"
            placeholder="Start Month"
            type="number"
            value={getFieldValue('Mod_StartMonth', 0)}
            onChange={(e) => setFieldValue('Mod_StartMonth', parseInt(e.target.value) || 0, { type: KotOR.GFFDataType.BYTE, defaultValue: 0 })}
            min="0"
            max="12"
          />
        </div>
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Start Day</label>
          <input
            title="Start Day"
            placeholder="Start Day"
            type="number"
            value={getFieldValue('Mod_StartDay', 0)}
            onChange={(e) => setFieldValue('Mod_StartDay', parseInt(e.target.value) || 0, { type: KotOR.GFFDataType.BYTE, defaultValue: 0 })}
            min="0"
            max="31"
          />
        </div>
        <div className="property-group">
          <label>Start Hour</label>
          <input
            title="Start Hour"
            placeholder="Start Hour"
            type="number"
            value={getFieldValue('Mod_StartHour', 0)}
            onChange={(e) => setFieldValue('Mod_StartHour', parseInt(e.target.value) || 0, { type: KotOR.GFFDataType.BYTE, defaultValue: 0 })}
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
          onChange={(e) => setFieldValue('Mod_StartMovie', e.target.value, { type: KotOR.GFFDataType.RESREF, defaultValue: '' })}
        />
      </div>
    </div>
  );
};
