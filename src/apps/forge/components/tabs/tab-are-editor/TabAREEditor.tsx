import React, { useMemo, useState, useEffect } from 'react';

import { CExoLocStringEditor } from '@/apps/forge/components/CExoLocStringEditor/CExoLocStringEditor';
import { LazyTextureCanvas } from '@/apps/forge/components/LazyTextureCanvas/LazyTextureCanvas';
import { MenuBar, MenuItem } from '@/apps/forge/components/common/MenuBar';
import type { GFFFieldValue } from '@/apps/forge/interfaces/GFFFormField';
import * as KotOR from '@/apps/forge/KotOR';
import { TabAREEditorState } from '@/apps/forge/states/tabs';
import '@/apps/forge/components/tabs/tab-are-editor/TabAREEditor.scss';

interface BaseTabProps {
  tab: TabAREEditorState;
}

export const TabAREEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabAREEditorState;
  const [are, setAre] = useState(tab.are);
  const [activeTab, setActiveTab] = useState(tab.activeTab);

  useEffect(() => {
    const loadHandler = () => setAre(tab.are);
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
        { label: 'Save As', onClick: () => tab.saveAs() },
      ],
    },
  ];

  if (!are) {
    return (
      <div className="forge-are-editor">
        <MenuBar items={menuItems} />
        <div className="forge-are-editor__loading">Loading area...</div>
      </div>
    );
  }

  const markUnsaved = () => {
    tab.file.unsaved_changes = true;
  };

  return (
    <div className="forge-are-editor">
      <MenuBar items={menuItems} />
      <div className="forge-are-editor__tabs">
        <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => tab.setActiveTab('basic')}>
          Basic
        </button>
        <button className={activeTab === 'audio' ? 'active' : ''} onClick={() => tab.setActiveTab('audio')}>
          Audio
        </button>
        <button className={activeTab === 'map' ? 'active' : ''} onClick={() => tab.setActiveTab('map')}>
          Map
        </button>
        <button className={activeTab === 'environment' ? 'active' : ''} onClick={() => tab.setActiveTab('environment')}>
          Environment
        </button>
        <button className={activeTab === 'scripts' ? 'active' : ''} onClick={() => tab.setActiveTab('scripts')}>
          Scripts
        </button>
        <button className={activeTab === 'rooms' ? 'active' : ''} onClick={() => tab.setActiveTab('rooms')}>
          Rooms
        </button>
      </div>
      <div className="forge-are-editor__content">
        {activeTab === 'basic' && <BasicTab are={are} onUpdate={markUnsaved} />}
        {activeTab === 'audio' && <AudioTab are={are} onUpdate={markUnsaved} />}
        {activeTab === 'map' && <MapTab are={are} onUpdate={markUnsaved} areaResRef={tab.file?.resref || ''} />}
        {activeTab === 'environment' && <EnvironmentTab are={are} onUpdate={markUnsaved} />}
        {activeTab === 'scripts' && <ScriptsTab are={are} onUpdate={markUnsaved} />}
        {activeTab === 'rooms' && <RoomsTab are={are} onUpdate={markUnsaved} />}
      </div>
    </div>
  );
};

interface TabProps {
  are: KotOR.GFFObject;
  onUpdate: () => void;
}

interface MapTabProps extends TabProps {
  areaResRef: string;
}

const BasicTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
    const v = are.RootNode.getFieldByLabel(label)?.getValue();
    return (v === undefined || v === null ? defaultVal : v) as GFFFieldValue;
  };

  const setFieldValue = (label: string, value: GFFFieldValue) => {
    const field = are.RootNode.getFieldByLabel(label);
    if (field) {
      field.setValue(value);
      onUpdate();
    }
  };

  const getLocStringValue = (label: string): KotOR.CExoLocString => {
    const field = are.RootNode.getFieldByLabel(label);
    return field?.getCExoLocString() || new KotOR.CExoLocString();
  };

  return (
    <div className="are-tab-content">
      <div className="property-group">
        <label>Tag</label>
        <input
          type="text"
          value={getFieldValue('Tag')}
          onChange={(e) => setFieldValue('Tag', e.target.value)}
          placeholder="Area tag..."
        />
      </div>
      <div className="property-group">
        <label>Name (LocString)</label>
        <CExoLocStringEditor value={getLocStringValue('Name')} onChange={(value) => setFieldValue('Name', value)} />
      </div>
      <div className="property-group">
        <label>Comments</label>
        <textarea
          value={getFieldValue('Comments')}
          onChange={(e) => setFieldValue('Comments', e.target.value)}
          rows={4}
          placeholder="Developer comments..."
        />
      </div>
      <div className="property-group">
        <label>Chance of Lightning</label>
        <input
          title="Chance of Lightning"
          placeholder="Chance of Lightning"
          type="number"
          value={getFieldValue('ChanceLightning', 0)}
          onChange={(e) => setFieldValue('ChanceLightning', parseInt(e.target.value) || 0)}
          min="0"
          max="100"
        />
      </div>
      <div className="property-group">
        <label>Chance of Rain</label>
        <input
          title="Chance of Rain"
          placeholder="Chance of Rain"
          type="number"
          value={getFieldValue('ChanceRain', 0)}
          onChange={(e) => setFieldValue('ChanceRain', parseInt(e.target.value) || 0)}
          min="0"
          max="100"
        />
      </div>
      <div className="property-group">
        <label>Chance of Snow</label>
        <input
          title="Chance of Snow"
          placeholder="Chance of Snow"
          type="number"
          value={getFieldValue('ChanceSnow', 0)}
          onChange={(e) => setFieldValue('ChanceSnow', parseInt(e.target.value) || 0)}
          min="0"
          max="100"
        />
      </div>
    </div>
  );
};

const AudioTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
    const v = are.RootNode.getFieldByLabel(label)?.getValue();
    return (v === undefined || v === null ? defaultVal : v) as GFFFieldValue;
  };

  const setFieldValue = (label: string, value: GFFFieldValue) => {
    const field = are.RootNode.getFieldByLabel(label);
    if (field) {
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="are-tab-content">
      <h4>Background Music</h4>
      <div className="property-group">
        <label>Music Day</label>
        <input
          type="text"
          value={getFieldValue('MusicDay')}
          onChange={(e) => setFieldValue('MusicDay', e.target.value)}
          placeholder="Music ResRef..."
        />
      </div>
      <div className="property-group">
        <label>Music Night</label>
        <input
          type="text"
          value={getFieldValue('MusicNight')}
          onChange={(e) => setFieldValue('MusicNight', e.target.value)}
          placeholder="Music ResRef..."
        />
      </div>
      <div className="property-group">
        <label>Music Battle</label>
        <input
          type="text"
          value={getFieldValue('MusicBattle')}
          onChange={(e) => setFieldValue('MusicBattle', e.target.value)}
          placeholder="Battle Music ResRef..."
        />
      </div>
      <h4>Ambient Audio</h4>
      <div className="property-group">
        <label>Ambient Day</label>
        <input
          type="text"
          value={getFieldValue('AmbientSndDay')}
          onChange={(e) => setFieldValue('AmbientSndDay', e.target.value)}
          placeholder="Ambient ResRef..."
        />
      </div>
      <div className="property-group">
        <label>Ambient Night</label>
        <input
          type="text"
          value={getFieldValue('AmbientSndNight')}
          onChange={(e) => setFieldValue('AmbientSndNight', e.target.value)}
          placeholder="Ambient ResRef..."
        />
      </div>
      <div className="property-group">
        <label>Ambient Volume</label>
        <input
          title="Ambient Volume"
          placeholder="Ambient Volume"
          type="number"
          value={getFieldValue('AmbientSndDayVol', 0)}
          onChange={(e) => setFieldValue('AmbientSndDayVol', parseInt(e.target.value) || 0)}
          min="0"
          max="127"
        />
      </div>
    </div>
  );
};

const MapTab = ({ are, onUpdate, areaResRef }: MapTabProps) => {
  const minimapTexture = areaResRef ? `lbl_map${areaResRef.toLowerCase()}` : '';

  const ensureMapStruct = () => {
    let mapField = are.RootNode.getFieldByLabel('Map');
    if (!mapField) {
      mapField = are.RootNode.addField(new KotOR.GFFField(KotOR.GFFDataType.LIST, 'Map'));
    }

    let mapStruct = mapField?.getChildStructs()?.[0];
    if (!mapStruct) {
      mapStruct = new KotOR.GFFStruct(14);
      mapField?.addChildStruct(mapStruct);
    }

    const ensureField = (label: string, type: number, defaultValue: GFFFieldValue) => {
      let field = mapStruct.getFieldByLabel(label);
      if (!field) {
        field = mapStruct.addField(new KotOR.GFFField(type, label, defaultValue));
      }
      return field;
    };

    // Keep map schema aligned with AreaMap.FromStruct/export and observed original game behavior defaults.
    ensureField('MapPt1X', KotOR.GFFDataType.FLOAT, 0);
    ensureField('MapPt1Y', KotOR.GFFDataType.FLOAT, 0);
    ensureField('MapPt2X', KotOR.GFFDataType.FLOAT, 0);
    ensureField('MapPt2Y', KotOR.GFFDataType.FLOAT, 0);
    ensureField('MapResX', KotOR.GFFDataType.INT, 0);
    ensureField('MapZoom', KotOR.GFFDataType.INT, 1);
    ensureField('NorthAxis', KotOR.GFFDataType.INT, 0);
    ensureField('WorldPt1X', KotOR.GFFDataType.FLOAT, 0);
    ensureField('WorldPt1Y', KotOR.GFFDataType.FLOAT, 0);
    ensureField('WorldPt2X', KotOR.GFFDataType.FLOAT, 0);
    ensureField('WorldPt2Y', KotOR.GFFDataType.FLOAT, 0);

    return mapStruct;
  };

  const getMapStruct = () => ensureMapStruct();

  const getMapFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
    const mapStruct = getMapStruct();
    const v = mapStruct?.getFieldByLabel(label)?.getValue();
    return (v === undefined || v === null ? defaultVal : v) as GFFFieldValue;
  };

  const setMapFieldValue = (label: string, value: GFFFieldValue) => {
    const mapStruct = getMapStruct();
    const field = mapStruct?.getFieldByLabel(label);
    if (field) {
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="are-tab-content">
      <h4>Minimap Texture</h4>
      <div className="property-group">
        {minimapTexture ? (
          <>
            <div className="are-map-preview-label">
              <code>{minimapTexture}</code>
            </div>
            <LazyTextureCanvas texture={minimapTexture} width={256} height={149} />
          </>
        ) : (
          <div>No area resref available yet (save/open a named ARE to preview minimap texture).</div>
        )}
      </div>

      <h4>Map Settings</h4>
      <div className="property-row">
        <div className="property-group">
          <label>Map Res X</label>
          <input
            title="Map Res X"
            type="number"
            value={getMapFieldValue('MapResX', 0)}
            onChange={(e) => setMapFieldValue('MapResX', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="property-group">
          <label>Map Zoom</label>
          <input
            title="Map Zoom"
            type="number"
            value={getMapFieldValue('MapZoom', 1)}
            onChange={(e) => setMapFieldValue('MapZoom', parseInt(e.target.value) || 1)}
            min="1"
          />
        </div>
        <div className="property-group">
          <label>North Axis</label>
          <select
            title="North Axis"
            value={getMapFieldValue('NorthAxis', 0)}
            onChange={(e) => setMapFieldValue('NorthAxis', parseInt(e.target.value) || 0)}
          >
            <option value={0}>North</option>
            <option value={1}>South</option>
            <option value={2}>East</option>
            <option value={3}>West</option>
          </select>
        </div>
      </div>

      <h4>World Coordinates (Map Bounds)</h4>
      <div className="property-row">
        <div className="property-group">
          <label>World X1</label>
          <input
            title="World X1"
            type="number"
            value={getMapFieldValue('WorldPt1X', 0)}
            onChange={(e) => setMapFieldValue('WorldPt1X', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>World Y1</label>
          <input
            title="World Y1"
            type="number"
            value={getMapFieldValue('WorldPt1Y', 0)}
            onChange={(e) => setMapFieldValue('WorldPt1Y', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>World X2</label>
          <input
            title="World X2"
            type="number"
            value={getMapFieldValue('WorldPt2X', 0)}
            onChange={(e) => setMapFieldValue('WorldPt2X', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>World Y2</label>
          <input
            title="World Y2"
            type="number"
            value={getMapFieldValue('WorldPt2Y', 0)}
            onChange={(e) => setMapFieldValue('WorldPt2Y', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>

      <h4>Image Coordinates (0-1)</h4>
      <div className="property-row">
        <div className="property-group">
          <label>Map Pt1 X</label>
          <input
            title="Map Pt1 X"
            type="number"
            value={getMapFieldValue('MapPt1X', 0)}
            onChange={(e) => setMapFieldValue('MapPt1X', parseFloat(e.target.value) || 0)}
            step="0.001"
          />
        </div>
        <div className="property-group">
          <label>Map Pt1 Y</label>
          <input
            title="Map Pt1 Y"
            type="number"
            value={getMapFieldValue('MapPt1Y', 0)}
            onChange={(e) => setMapFieldValue('MapPt1Y', parseFloat(e.target.value) || 0)}
            step="0.001"
          />
        </div>
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Map Pt2 X</label>
          <input
            title="Map Pt2 X"
            type="number"
            value={getMapFieldValue('MapPt2X', 0)}
            onChange={(e) => setMapFieldValue('MapPt2X', parseFloat(e.target.value) || 0)}
            step="0.001"
          />
        </div>
        <div className="property-group">
          <label>Map Pt2 Y</label>
          <input
            title="Map Pt2 Y"
            type="number"
            value={getMapFieldValue('MapPt2Y', 0)}
            onChange={(e) => setMapFieldValue('MapPt2Y', parseFloat(e.target.value) || 0)}
            step="0.001"
          />
        </div>
      </div>
    </div>
  );
};

const EnvironmentTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
    const v = are.RootNode.getFieldByLabel(label)?.getValue();
    return (v === undefined || v === null ? defaultVal : v) as GFFFieldValue;
  };

  const setFieldValue = (label: string, value: GFFFieldValue) => {
    const field = are.RootNode.getFieldByLabel(label);
    if (field) {
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="are-tab-content">
      <h4>Sun Fog</h4>
      <div className="property-group">
        <label>Sun Fog Enabled</label>
        <input
          title="Sun Fog Enabled"
          type="checkbox"
          checked={!!getFieldValue('SunFogOn', 0)}
          onChange={(e) => setFieldValue('SunFogOn', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Sun Fog Near</label>
          <input
            title="Sun Fog Near"
            type="number"
            value={getFieldValue('SunFogNear', 0)}
            onChange={(e) => setFieldValue('SunFogNear', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>Sun Fog Far</label>
          <input
            title="Sun Fog Far"
            type="number"
            value={getFieldValue('SunFogFar', 0)}
            onChange={(e) => setFieldValue('SunFogFar', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
      <div className="property-group">
        <label>Sun Fog Color (ARGB Int)</label>
        <input
          title="Sun Fog Color"
          type="number"
          value={getFieldValue('SunFogColor', 0)}
          onChange={(e) => setFieldValue('SunFogColor', parseInt(e.target.value) || 0)}
        />
      </div>

      <h4>Moon Fog</h4>
      <div className="property-group">
        <label>Moon Fog Enabled</label>
        <input
          title="Moon Fog Enabled"
          type="checkbox"
          checked={!!getFieldValue('MoonFogOn', 0)}
          onChange={(e) => setFieldValue('MoonFogOn', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Moon Fog Near</label>
          <input
            title="Moon Fog Near"
            type="number"
            value={getFieldValue('MoonFogNear', 0)}
            onChange={(e) => setFieldValue('MoonFogNear', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>Moon Fog Far</label>
          <input
            title="Moon Fog Far"
            type="number"
            value={getFieldValue('MoonFogFar', 0)}
            onChange={(e) => setFieldValue('MoonFogFar', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
      <div className="property-group">
        <label>Moon Fog Color (ARGB Int)</label>
        <input
          title="Moon Fog Color"
          type="number"
          value={getFieldValue('MoonFogColor', 0)}
          onChange={(e) => setFieldValue('MoonFogColor', parseInt(e.target.value) || 0)}
        />
      </div>

      <h4>Lighting</h4>
      <div className="property-group">
        <label>Sun Ambient Color (ARGB Int)</label>
        <input
          title="Sun Ambient Color"
          type="number"
          value={getFieldValue('SunAmbientColor', 0)}
          onChange={(e) => setFieldValue('SunAmbientColor', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="property-group">
        <label>Sun Diffuse Color (ARGB Int)</label>
        <input
          title="Sun Diffuse Color"
          type="number"
          value={getFieldValue('SunDiffuseColor', 0)}
          onChange={(e) => setFieldValue('SunDiffuseColor', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="property-group">
        <label>Moon Ambient Color (ARGB Int)</label>
        <input
          title="Moon Ambient Color"
          type="number"
          value={getFieldValue('MoonAmbientColor', 0)}
          onChange={(e) => setFieldValue('MoonAmbientColor', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="property-group">
        <label>Moon Diffuse Color (ARGB Int)</label>
        <input
          title="Moon Diffuse Color"
          type="number"
          value={getFieldValue('MoonDiffuseColor', 0)}
          onChange={(e) => setFieldValue('MoonDiffuseColor', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="property-group">
        <label>Dynamic Ambient Color (ARGB Int)</label>
        <input
          title="Dynamic Ambient Color"
          type="number"
          value={getFieldValue('DynAmbientColor', 0)}
          onChange={(e) => setFieldValue('DynAmbientColor', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="property-group">
        <label>Shadow Opacity</label>
        <input
          title="Shadow Opacity"
          placeholder="Shadow Opacity"
          type="number"
          value={getFieldValue('ShadowOpacity', 0)}
          onChange={(e) => setFieldValue('ShadowOpacity', parseInt(e.target.value) || 0)}
          min="0"
          max="100"
        />
      </div>
      <div className="property-group">
        <label>Day/Night Cycle</label>
        <input
          title="Day/Night Cycle"
          type="checkbox"
          checked={!!getFieldValue('DayNightCycle', 0)}
          onChange={(e) => setFieldValue('DayNightCycle', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-group">
        <label>Is Night</label>
        <input
          title="Is Night"
          type="checkbox"
          checked={!!getFieldValue('IsNight', 0)}
          onChange={(e) => setFieldValue('IsNight', e.target.checked ? 1 : 0)}
        />
      </div>

      <h4>Weather</h4>
      <div className="property-group">
        <label>Wind Power</label>
        <input
          title="Wind Power"
          type="number"
          value={getFieldValue('WindPower', 0)}
          onChange={(e) => setFieldValue('WindPower', parseInt(e.target.value) || 0)}
          min="0"
          max="3"
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Rain</label>
          <input
            title="Rain Enabled"
            type="checkbox"
            checked={parseInt(String(getFieldValue('ChanceRain', 0)), 10) >= 100}
            onChange={(e) => setFieldValue('ChanceRain', e.target.checked ? 100 : 0)}
          />
        </div>
        <div className="property-group">
          <label>Snow</label>
          <input
            title="Snow Enabled"
            type="checkbox"
            checked={parseInt(String(getFieldValue('ChanceSnow', 0)), 10) >= 100}
            onChange={(e) => setFieldValue('ChanceSnow', e.target.checked ? 100 : 0)}
          />
        </div>
        <div className="property-group">
          <label>Lightning</label>
          <input
            title="Lightning Enabled"
            type="checkbox"
            checked={parseInt(String(getFieldValue('ChanceLightning', 0)), 10) >= 100}
            onChange={(e) => setFieldValue('ChanceLightning', e.target.checked ? 100 : 0)}
          />
        </div>
      </div>

      <h4>Other</h4>
      <div className="property-group">
        <label>No Rest</label>
        <input
          title="No Rest"
          type="checkbox"
          checked={!!getFieldValue('NoRest', 0)}
          onChange={(e) => setFieldValue('NoRest', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-group">
        <label>No Hang Back</label>
        <input
          title="No Hang Back"
          type="checkbox"
          checked={!!getFieldValue('NoHangBack', 0)}
          onChange={(e) => setFieldValue('NoHangBack', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-group">
        <label>Player Only</label>
        <input
          title="Player Only"
          type="checkbox"
          checked={!!getFieldValue('PlayerOnly', 0)}
          onChange={(e) => setFieldValue('PlayerOnly', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-group">
        <label>Unescapable</label>
        <input
          title="Unescapable"
          type="checkbox"
          checked={!!getFieldValue('Unescapable', 0)}
          onChange={(e) => setFieldValue('Unescapable', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-group">
        <label>Stealth XP Enabled</label>
        <input
          title="Stealth XP Enabled"
          type="checkbox"
          checked={!!getFieldValue('StealthXPEnabled', 0)}
          onChange={(e) => setFieldValue('StealthXPEnabled', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Stealth XP Max</label>
          <input
            title="Stealth XP Max"
            type="number"
            value={getFieldValue('StealthXPMax', 0)}
            onChange={(e) => setFieldValue('StealthXPMax', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="property-group">
          <label>Stealth XP Loss</label>
          <input
            title="Stealth XP Loss"
            type="number"
            value={getFieldValue('StealthXPLoss', 0)}
            onChange={(e) => setFieldValue('StealthXPLoss', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
};

const ScriptsTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: GFFFieldValue = ''): GFFFieldValue => {
    const v = are.RootNode.getFieldByLabel(label)?.getValue();
    return (v === undefined || v === null ? defaultVal : v) as GFFFieldValue;
  };

  const setFieldValue = (label: string, value: GFFFieldValue) => {
    const field = are.RootNode.getFieldByLabel(label);
    if (field) {
      field.setValue(value);
      onUpdate();
    }
  };

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

  const suggestionListId = 'are-script-suggestions';

  return (
    <div className="are-tab-content">
      <datalist id={suggestionListId}>
        {scriptSuggestions.map((name) => (
          <option key={`are-script-${name}`} value={name} />
        ))}
      </datalist>
      <div className="property-group">
        <label>OnEnter Script</label>
        <input
          title="On Enter Script"
          placeholder="Script ResRef..."
          type="text"
          value={getFieldValue('OnEnter')}
          onChange={(e) => setFieldValue('OnEnter', e.target.value)}
          list={suggestionListId}
          maxLength={16}
        />
      </div>
      <div className="property-group">
        <label>OnExit Script</label>
        <input
          title="On Exit Script"
          type="text"
          value={getFieldValue('OnExit')}
          onChange={(e) => setFieldValue('OnExit', e.target.value)}
          placeholder="Script ResRef..."
          list={suggestionListId}
          maxLength={16}
        />
      </div>
      <div className="property-group">
        <label>OnHeartbeat Script</label>
        <input
          title="On Heartbeat Script"
          type="text"
          value={getFieldValue('OnHeartbeat')}
          onChange={(e) => setFieldValue('OnHeartbeat', e.target.value)}
          placeholder="Script ResRef..."
          list={suggestionListId}
          maxLength={16}
        />
      </div>
      <div className="property-group">
        <label>OnUserDefined Script</label>
        <input
          type="text"
          value={getFieldValue('OnUserDefined')}
          onChange={(e) => setFieldValue('OnUserDefined', e.target.value)}
          placeholder="Script ResRef..."
          list={suggestionListId}
          maxLength={16}
        />
      </div>
    </div>
  );
};

const RoomsTab = ({ are, onUpdate }: TabProps) => {
  const rooms = are.RootNode.getFieldByLabel('Rooms')?.getChildStructs() || [];

  const updateRoomField = (room: KotOR.GFFStruct, label: string, value: GFFFieldValue) => {
    const field = room.getFieldByLabel(label);
    if (field) {
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="are-tab-content">
      <h4>Rooms ({rooms.length})</h4>
      {rooms.length === 0 ? (
        <p className="no-data">No rooms defined in this area.</p>
      ) : (
        <div className="rooms-list">
          {rooms.map((room, index) => {
            const envAudio = room.getFieldByLabel('EnvAudio')?.getValue() || 0;
            const ambScale = room.getFieldByLabel('AmbientScale')?.getValue() || 0;
            const roomName = room.getFieldByLabel('RoomName')?.getValue() || `Room ${index}`;

            return (
              <div key={index} className="room-item">
                <strong>{roomName}</strong>
                <div className="property-row">
                  <div className="property-group">
                    <label>EnvAudio</label>
                    <input
                      title="Room EnvAudio"
                      type="number"
                      value={envAudio}
                      onChange={(e) => updateRoomField(room, 'EnvAudio', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="property-group">
                    <label>AmbientScale</label>
                    <input
                      title="Room AmbientScale"
                      type="number"
                      step="0.1"
                      value={ambScale}
                      onChange={(e) => updateRoomField(room, 'AmbientScale', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
