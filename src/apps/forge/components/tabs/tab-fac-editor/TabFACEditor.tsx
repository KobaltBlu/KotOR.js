import React, { useState, useEffect } from "react";
import { TabFACEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabFACEditor.scss";

interface BaseTabProps {
  tab: TabFACEditorState;
}

export const TabFACEditor = function(props: BaseTabProps){
  const tab = props.tab as TabFACEditorState;
  const [fac, setFac] = useState(tab.fac);
  const [selectedFaction, setSelectedFaction] = useState(tab.selectedFaction);
  const [selectedIndex, setSelectedIndex] = useState(tab.selectedFactionIndex);

  useEffect(() => {
    const loadHandler = () => setFac(tab.fac);
    const selectHandler = () => {
      setSelectedFaction(tab.selectedFaction);
      setSelectedIndex(tab.selectedFactionIndex);
    };

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onFactionSelected', selectHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onFactionSelected', selectHandler);
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

  if(!fac){
    return (
      <div className="forge-fac-editor">
        <MenuBar items={menuItems} />
        <div className="forge-fac-editor__loading">Loading factions...</div>
      </div>
    );
  }

  const factionList = fac.RootNode.getFieldByLabel('FactionList')?.getChildStructs() || [];

  return (
    <div className="forge-fac-editor">
      <MenuBar items={menuItems} />
      <div className="forge-fac-editor__container">
        <div className="forge-fac-editor__sidebar">
          <h4>Factions ({factionList.length})</h4>
          <div className="faction-list">
            {factionList.map((faction, index) => {
              const name = faction.getFieldByLabel('FactionName')?.getValue() || `Faction ${index}`;
              const parentID = faction.getFieldByLabel('FactionParentID')?.getValue() || 0;

              return (
                <div
                  key={index}
                  className={`faction-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => tab.selectFaction(faction, index)}
                >
                  <span className="faction-index">[{index}]</span>
                  <span className="faction-name">{name}</span>
                  {parentID > 0 && <span className="faction-parent">(Parent: {parentID})</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="forge-fac-editor__main">
          {selectedFaction ? (
            <FactionProperties
              faction={selectedFaction}
              allFactions={factionList}
              onUpdate={() => {
                tab.file.unsaved_changes = true;
              }}
            />
          ) : (
            <div className="forge-fac-editor__no-selection">
              <p>Select a faction to view and edit its properties.</p>
              <p className="help-text">
                Factions define reputation relationships between NPC groups.
                Each faction has a name, parent faction, and reputation values with other factions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface FactionPropertiesProps {
  faction: KotOR.GFFStruct;
  allFactions: KotOR.GFFStruct[];
  onUpdate: () => void;
}

const FactionProperties = (props: FactionPropertiesProps) => {
  const { faction, allFactions, onUpdate } = props;

  const getFieldValue = (label: string, defaultVal: any = '') => {
    return faction.getFieldByLabel(label)?.getValue() ?? defaultVal;
  };

  const setFieldValue = (label: string, value: any) => {
    const field = faction.getFieldByLabel(label);
    if(field){
      field.setValue(value);
      onUpdate();
    }
  };

  const reputations = faction.getFieldByLabel('FactionList')?.getChildStructs() || [];

  return (
    <div className="faction-properties">
      <h3>Faction Properties</h3>

      <div className="property-group">
        <label>Faction Name</label>
        <input
          type="text"
          value={getFieldValue('FactionName')}
          onChange={(e) => setFieldValue('FactionName', e.target.value)}
          placeholder="Faction name..."
        />
      </div>

      <div className="property-group">
        <label>Parent Faction ID</label>
        <input
          title="Parent Faction ID"
          placeholder="Parent Faction ID"
          type="number"
          value={getFieldValue('FactionParentID', 0)}
          onChange={(e) => setFieldValue('FactionParentID', parseInt(e.target.value) || 0)}
          min="0"
        />
      </div>

      <div className="property-group">
        <label>Global Faction</label>
        <input
          title="Global Faction"
          placeholder="Global Faction"
          type="checkbox"
          checked={!!getFieldValue('FactionGlobal', 0)}
          onChange={(e) => setFieldValue('FactionGlobal', e.target.checked ? 1 : 0)}
        />
        <small>If checked, this faction's reputation affects all creatures with the same faction ID</small>
      </div>

      <h4>Reputation with Other Factions</h4>
      <div className="reputation-list">
        {reputations.length === 0 ? (
          <p className="no-data">No reputation relationships defined.</p>
        ) : (
          reputations.map((rep, index) => {
            const targetID = rep.getFieldByLabel('FactionID')?.getValue() || 0;
            const repValue = rep.getFieldByLabel('FactionRep')?.getValue() || 50;
            const targetFaction = allFactions[targetID];
            const targetName = targetFaction?.getFieldByLabel('FactionName')?.getValue() || `Faction ${targetID}`;

            return (
              <div key={index} className="reputation-item">
                <span className="rep-target">{targetName} (ID: {targetID})</span>
                <input
                  title="Reputation Value"
                  placeholder="Reputation Value"
                  type="number"
                  className="rep-value"
                  value={repValue}
                  onChange={(e) => {
                    const field = rep.getFieldByLabel('FactionRep');
                    if(field){
                      field.setValue(parseInt(e.target.value) || 50);
                      onUpdate();
                    }
                  }}
                  min="0"
                  max="100"
                />
                <span className="rep-description">{getReputationDescription(repValue)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function getReputationDescription(value: number): string {
  if(value >= 90) return 'Friendly';
  if(value >= 70) return 'Ally';
  if(value >= 50) return 'Neutral';
  if(value >= 30) return 'Unfriendly';
  if(value >= 10) return 'Hostile';
  return 'Enemy';
}
