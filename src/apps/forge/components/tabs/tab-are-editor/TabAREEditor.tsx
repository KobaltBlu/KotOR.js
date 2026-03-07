import React, { useState, useEffect } from "react";
import { TabAREEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import './TabAREEditor.scss';

interface BaseTabProps {
  tab: TabAREEditorState;
}

export const TabAREEditor = function(props: BaseTabProps){
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
        { label: 'Save As', onClick: () => tab.saveAs() }
      ]
    }
  ];

  if(!are){
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
        <button
          className={activeTab === 'basic' ? 'active' : ''}
          onClick={() => tab.setActiveTab('basic')}
        >
          Basic
        </button>
        <button
          className={activeTab === 'audio' ? 'active' : ''}
          onClick={() => tab.setActiveTab('audio')}
        >
          Audio
        </button>
        <button
          className={activeTab === 'map' ? 'active' : ''}
          onClick={() => tab.setActiveTab('map')}
        >
          Map
        </button>
        <button
          className={activeTab === 'environment' ? 'active' : ''}
          onClick={() => tab.setActiveTab('environment')}
        >
          Environment
        </button>
        <button
          className={activeTab === 'scripts' ? 'active' : ''}
          onClick={() => tab.setActiveTab('scripts')}
        >
          Scripts
        </button>
        <button
          className={activeTab === 'rooms' ? 'active' : ''}
          onClick={() => tab.setActiveTab('rooms')}
        >
          Rooms
        </button>
      </div>
      <div className="forge-are-editor__content">
        {activeTab === 'basic' && <BasicTab are={are} onUpdate={markUnsaved} />}
        {activeTab === 'audio' && <AudioTab are={are} onUpdate={markUnsaved} />}
        {activeTab === 'map' && <MapTab are={are} onUpdate={markUnsaved} />}
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

const BasicTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return are.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = are.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
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
        <input
          type="text"
          value={getFieldValue('Name')}
          onChange={(e) => setFieldValue('Name', e.target.value)}
          placeholder="Area name..."
        />
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
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return are.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = are.RootNode.getFieldByLabel(label);
    if(field){
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

const MapTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return are.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = are.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="are-tab-content">
      <div className="property-group">
        <label>Map ResRef (Minimap Texture)</label>
        <input
          type="text"
          value={getFieldValue('Map')}
          onChange={(e) => setFieldValue('Map', e.target.value)}
          placeholder="Map texture ResRef..."
        />
      </div>
      <h4>World Coordinates (Map Bounds)</h4>
      <div className="property-row">
        <div className="property-group">
          <label>World X1</label>
          <input
            title="World X1"
            placeholder="World X1"
            type="number"
            value={getFieldValue('MapPt1X', 0)}
            onChange={(e) => setFieldValue('MapPt1X', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>World Y1</label>
          <input
            title="World Y1"
            placeholder="World Y1"
            type="number"
            value={getFieldValue('MapPt1Y', 0)}
            onChange={(e) => setFieldValue('MapPt1Y', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>World X2</label>
          <input
            title="World X2"
            placeholder="World X2"
            type="number"
            value={getFieldValue('MapPt2X', 0)}
            onChange={(e) => setFieldValue('MapPt2X', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>World Y2</label>
          <input
            title="World Y2"
            placeholder="World Y2"
            type="number"
            value={getFieldValue('MapPt2Y', 0)}
            onChange={(e) => setFieldValue('MapPt2Y', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
      <h4>Texture Coordinates</h4>
      <div className="property-row">
        <div className="property-group">
          <label>Map Res X</label>
          <input
            title="Map Res X"
            placeholder="Map Res X"
            type="number"
            value={getFieldValue('MapResX', 256)}
            onChange={(e) => setFieldValue('MapResX', parseInt(e.target.value) || 256)}
          />
        </div>
        <div className="property-group">
          <label>North Axis</label>
          <input
            title="North Axis"
            placeholder="North Axis"
            type="number"
            value={getFieldValue('NorthAxis', 0)}
            onChange={(e) => setFieldValue('NorthAxis', parseInt(e.target.value) || 0)}
            min="0"
            max="3"
          />
        </div>
      </div>
    </div>
  );
};

const EnvironmentTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return are.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = are.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="are-tab-content">
      <h4>Fog</h4>
      <div className="property-group">
        <label>Fog Enabled</label>
        <input
          title="Fog Enabled"
          placeholder="Fog Enabled"
          type="checkbox"
          checked={!!getFieldValue('Unescapable', 0)}
          onChange={(e) => setFieldValue('Unescapable', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-row">
        <div className="property-group">
          <label>Fog Near Clip</label>
          <input
            title="Fog Near Clip"
            placeholder="Fog Near Clip"
            type="number"
            value={getFieldValue('FogClipDist', 0)}
            onChange={(e) => setFieldValue('FogClipDist', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
        <div className="property-group">
          <label>Fog Far Clip</label>
          <input
            title="Fog Far Clip"
            placeholder="Fog Far Clip"
            type="number"
            value={getFieldValue('ModSpotCheck', 0)}
            onChange={(e) => setFieldValue('ModSpotCheck', parseFloat(e.target.value) || 0)}
            step="0.1"
          />
        </div>
      </div>
      <h4>Lighting</h4>
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
          placeholder="Day/Night Cycle"
          type="checkbox"
          checked={!!getFieldValue('DayNightCycle', 0)}
          onChange={(e) => setFieldValue('DayNightCycle', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-group">
        <label>Is Night</label>
        <input
          title="Is Night"
          placeholder="Is Night"
          type="checkbox"
          checked={!!getFieldValue('IsNight', 0)}
          onChange={(e) => setFieldValue('IsNight', e.target.checked ? 1 : 0)}
        />
      </div>
      <h4>Other</h4>
      <div className="property-group">
        <label>No Rest</label>
        <input
          title="No Rest"
          placeholder="No Rest"
          type="checkbox"
          checked={!!getFieldValue('NoRest', 0)}
          onChange={(e) => setFieldValue('NoRest', e.target.checked ? 1 : 0)}
        />
      </div>
      <div className="property-group">
        <label>Stealth XP Enabled</label>
        <input
          title="Stealth XP Enabled"
          placeholder="Stealth XP Enabled"
          type="checkbox"
          checked={!!getFieldValue('StealthXPEnabled', 0)}
          onChange={(e) => setFieldValue('StealthXPEnabled', e.target.checked ? 1 : 0)}
        />
      </div>
    </div>
  );
};

const ScriptsTab = ({ are, onUpdate }: TabProps) => {
  const getFieldValue = (label: string, defaultVal: any = '') => {
    return are.RootNode.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = are.RootNode.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  return (
    <div className="are-tab-content">
      <div className="property-group">
        <label>OnEnter Script</label>
        <input
          title="On Enter Script"
          placeholder="Script ResRef..."
          type="text"
          value={getFieldValue('OnEnter')}
          onChange={(e) => setFieldValue('OnEnter', e.target.value)}
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
        />
      </div>
      <div className="property-group">
        <label>OnUserDefined Script</label>
        <input
          type="text"
          value={getFieldValue('OnUserDefined')}
          onChange={(e) => setFieldValue('OnUserDefined', e.target.value)}
          placeholder="Script ResRef..."
        />
      </div>
    </div>
  );
};

const RoomsTab = ({ are, onUpdate }: TabProps) => {
  const rooms = are.RootNode.getFieldByLabel('Rooms')?.getChildStructs() || [];

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
                <span>EnvAudio: {envAudio}, AmbientScale: {ambScale}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

