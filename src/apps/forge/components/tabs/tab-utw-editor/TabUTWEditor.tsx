import React, { useState, useEffect, useCallback } from "react"

import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { FormField } from "@/apps/forge/components/form-field/FormField";
import { InfoBubble } from "@/apps/forge/components/info-bubble/info-bubble";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";
import { TabUTWEditorState } from "@/apps/forge/states/tabs";
import "@/apps/forge/styles/tabs/tab-uts-editor.scss";

export const TabUTWEditor = function(props: BaseTabProps){

  const tab: TabUTWEditorState = props.tab as TabUTWEditorState;
  const [selectedTab, setSelectedTab] = useState<string>('basic');
  const [_appearance, setAppearance] = useState<number>(0);
  const [_description, setDescription] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [hasMapNote, setHasMapNote] = useState<boolean>(false);
  const [linkedTo, setLinkedTo] = useState<string>('');
  const [localizedName, setLocalizedName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [mapNote, setMapNote] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [mapNoteEnabled, setMapNoteEnabled] = useState<boolean>(false);
  const [paletteID, setPaletteID] = useState<number>(0);
  const [tag, setTag] = useState<string>('');
  const [_templateResRef, setTemplateResRef] = useState<string>('');

  const onWaypointChange = useCallback(() => {
    if (!tab.waypoint || !tab.blueprint) return;
    setAppearance(tab.waypoint.appearance);
    setDescription(tab.waypoint.description);
    setHasMapNote(tab.waypoint.hasMapNote);
    setLinkedTo(tab.waypoint.linkedTo);
    setLocalizedName(tab.waypoint.localizedName);
    setMapNote(tab.waypoint.mapNote);
    setMapNoteEnabled(tab.waypoint.mapNoteEnabled);
    setPaletteID(tab.waypoint.paletteID);
    setTag(tab.waypoint.tag);
    setTemplateResRef(tab.waypoint.templateResRef);
  }, [tab]);

  // Helper functions using ForgeWaypoint methods
  const _onUpdateNumberField = (setter: (value: number) => void, property: keyof ForgeWaypoint, parser: (value: number) => number = (v) => v) =>
    tab.waypoint.createNumberFieldHandler(setter, property, tab.waypoint, tab, parser);

  const onUpdateByteField = (setter: (value: number) => void, property: keyof ForgeWaypoint) =>
    tab.waypoint.createByteFieldHandler(setter, property, tab.waypoint, tab);

  const _onUpdateBooleanField = (setter: (value: boolean) => void, property: keyof ForgeWaypoint) =>
    tab.waypoint.createBooleanFieldHandler(setter, property, tab.waypoint, tab);

  const onUpdateResRefField = (setter: (value: string) => void, property: keyof ForgeWaypoint) =>
    tab.waypoint.createResRefFieldHandler(setter, property, tab.waypoint, tab);

  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof ForgeWaypoint) =>
    tab.waypoint.createCExoStringFieldHandler(setter, property, tab.waypoint, tab);

  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof ForgeWaypoint) =>
    tab.waypoint.createCExoLocStringFieldHandler(setter, property, tab.waypoint, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof ForgeWaypoint) =>
    tab.waypoint.createForgeCheckboxFieldHandler(setter, property, tab.waypoint, tab);

  useEffect(() => {
    if(!tab) return;
    onWaypointChange();
    tab.addEventListener('onEditorFileLoad', onWaypointChange);
    tab.addEventListener('onEditorFileChange', onWaypointChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onWaypointChange);
      tab.removeEventListener('onEditorFileChange', onWaypointChange);
    };
  }, [tab, onWaypointChange]);

  return <>
<div style={{height: '100%'}}>
  <div className="vertical-tabs" style={{height: '100%'}}>
    <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
      <ul className="tabs-menu" style={{textAlign: 'center'}}>
        <li className={`btn btn-tab ${selectedTab == 'basic' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('basic') }>Basic</a></li>
      </ul>
    </div>
    <div className="vertical-tabs-container">
      <div className="tabs" style={{position: 'absolute', top:0, bottom: 0, left: 0, right: 0, overflowY: 'auto', padding: '0 10px'}}>
        <div className="tab-pane" style={{display: (selectedTab == 'basic' ? 'block' : 'none')}}>
          <h3>Basic</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <FormField
                label="Name"
                info="The display name of the waypoint. This is what players will see in-game and can be localized for different languages."
              >
                <CExoLocStringEditor
                  value={localizedName}
                  onChange={onUpdateCExoLocStringField(setLocalizedName, 'localizedName')}
                />
              </FormField>
              <FormField
                label="Tag"
                info="A unique identifier for this waypoint. Used by scripts to reference this specific object. Must be unique within the module."
              >
                <input type="text" maxLength={32} value={tag} onChange={onUpdateResRefField(setTag, 'tag')} />
              </FormField>
              <FormField
                label="Linked To"
                info="The object that this waypoint is linked to. This is the object that will be used to display the waypoint on the map."
              >
                <input type="text" maxLength={32} value={linkedTo} onChange={onUpdateCExoStringField(setLinkedTo, 'linkedTo')} />
              </FormField>
              <tr>
                <td></td>
                <td>
                  <table style={{width: '100%'}}>
                    <tbody>
                      <tr>
                        <td>
                          <InfoBubble content="If checked, the map note will be displayed on the map when the waypoint is selected." position="right">
                            <ForgeCheckbox label="Map Note Enabled" value={mapNoteEnabled} onChange={onUpdateForgeCheckboxField(setMapNoteEnabled, 'mapNoteEnabled')} />
                          </InfoBubble>
                        </td>
                        <td>
                          <InfoBubble content="If checked, the map note will be displayed on the map when the waypoint is moused overed in-game." position="right">
                            <ForgeCheckbox label="Has Map Note" value={hasMapNote} onChange={onUpdateForgeCheckboxField(setHasMapNote, 'hasMapNote')} />
                          </InfoBubble>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <FormField
                label="Map Note"
                info="The note that will be displayed on the map when the waypoint is moused overed in-game."
              >
                <CExoLocStringEditor value={mapNote} onChange={onUpdateCExoLocStringField(setMapNote, 'mapNote')} />
              </FormField>
              <FormField
                label="Palette ID"
                info="The palette ID that will be used to display the waypoint on the map."
              >
                <input type="number" min="0" max="255" value={paletteID} onChange={onUpdateByteField(setPaletteID, 'paletteID')} />
              </FormField>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
  </>;
};
