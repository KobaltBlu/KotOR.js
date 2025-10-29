import React, { useRef, useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTWEditorState } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import "../../../styles/tabs/tab-uts-editor.scss";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { FormField } from "../../form-field/FormField";
import * as KotOR from "../../../KotOR";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";
import { InfoBubble } from "../../info-bubble/info-bubble";

export const TabUTWEditor = function(props: BaseTabProps){

  const tab: TabUTWEditorState = props.tab as TabUTWEditorState;
  const [selectedTab, setSelectedTab] = useState<string>('basic');
  const [appearance, setAppearance] = useState<number>(0);
  const [description, setDescription] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [hasMapNote, setHasMapNote] = useState<boolean>(false);
  const [linkedTo, setLinkedTo] = useState<string>('');
  const [localizedName, setLocalizedName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [mapNote, setMapNote] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [mapNoteEnabled, setMapNoteEnabled] = useState<boolean>(false);
  const [paletteID, setPaletteID] = useState<number>(0);
  const [tag, setTag] = useState<string>('');
  const [templateResRef, setTemplateResRef] = useState<string>('');

  const onWaypointChange = () => {
    const tab: TabUTWEditorState = props.tab as TabUTWEditorState;
    setAppearance(tab.appearance);
    setDescription(tab.description);
    setHasMapNote(tab.hasMapNote);
    setLinkedTo(tab.linkedTo);
    setLocalizedName(tab.localizedName);
    setMapNote(tab.mapNote);
    setMapNoteEnabled(tab.mapNoteEnabled);
    setPaletteID(tab.paletteID);
    setTag(tab.tag);
    setTemplateResRef(tab.templateResRef);
  }

  const onUpdateTag = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTag(e.target.value);
    if(!tab) return;
    tab.tag = e.target.value; 
    tab.updateFile(); 
  }

  const onUpdateLinkedTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkedTo(e.target.value);
    if(!tab) return;
    tab.linkedTo = e.target.value; 
    tab.updateFile(); 
  }

  const onMapNoteEnabledChange = (value: boolean) => {
    setMapNoteEnabled(value);
    if(!tab) return;
    tab.mapNoteEnabled = value; 
    tab.updateFile(); 
  }

  const onHasMapNoteChange = (value: boolean) => {
    setHasMapNote(value);
    if(!tab) return;
    tab.hasMapNote = value; 
    tab.updateFile(); 
  }

  const onUpdatePaletteID = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaletteID(Number(e.target.value));
    if(!tab) return;
    tab.paletteID = Number(e.target.value); 
    tab.updateFile(); 
  }

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onWaypointChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onWaypointChange);
    }
  });

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
                  onChange={(newValue) => { setLocalizedName(newValue); if(tab.blueprint) { tab.localizedName = newValue; tab.updateFile(); } }}
                />
              </FormField>
              <FormField
                label="Tag" 
                info="A unique identifier for this waypoint. Used by scripts to reference this specific object. Must be unique within the module."
              >
                <input type="text" maxLength={32} value={tag} onChange={onUpdateTag} />
              </FormField>
              <FormField
                label="Linked To" 
                info="The object that this waypoint is linked to. This is the object that will be used to display the waypoint on the map."
              >
                <input type="text" maxLength={32} value={linkedTo} onChange={onUpdateLinkedTo} />
              </FormField>
              <tr>
                <td></td>
                <td>
                  <table style={{width: '100%'}}>
                    <tbody>
                      <tr>
                        <td>
                          <InfoBubble content="If checked, the map note will be displayed on the map when the waypoint is selected." position="right">
                            <ForgeCheckbox label="Map Note Enabled" value={mapNoteEnabled} onChange={(value) => { onMapNoteEnabledChange(value); }} />
                          </InfoBubble>
                        </td>
                        <td>
                          <InfoBubble content="If checked, the map note will be displayed on the map when the waypoint is moused overed in-game." position="right">
                            <ForgeCheckbox label="Has Map Note" value={hasMapNote} onChange={(value) => { onHasMapNoteChange(value); }} />
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
                <CExoLocStringEditor value={mapNote} onChange={(newValue) => { setMapNote(newValue); if(tab.blueprint) { tab.mapNote = newValue; tab.updateFile(); } }} />
              </FormField>
              <FormField
                label="Palette ID" 
                info="The palette ID that will be used to display the waypoint on the map."
              >
                <input type="number" min="0" max="255" value={paletteID} onChange={onUpdatePaletteID} />
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