import React, { useState, useEffect, useMemo } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTTEditorState } from "../../../states/tabs";
import * as KotOR from "../../../KotOR";
import { FormField } from "../../form-field/FormField";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";
import { sanitizeResRef, clampByte, createNumberFieldHandler, createBooleanFieldHandler, createResRefFieldHandler, createCExoStringFieldHandler, createCExoLocStringFieldHandler, createByteFieldHandler, createWordFieldHandler, createForgeCheckboxFieldHandler } from "../../../helpers/UTxEditorHelpers";
import { SubTab, SubTabHost } from "../../SubTabHost";

export const TabUTTEditor = function(props: BaseTabProps){

  const tab: TabUTTEditorState = props.tab as TabUTTEditorState;

  const [autoRemoveKey, setAutoRemoveKey] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [cursor, setCursor] = useState<number>(0);
  const [disarmDC, setDisarmDC] = useState<number>(0);
  const [faction, setFaction] = useState<number>(0);
  const [highlightHeight, setHighlightHeight] = useState<number>(0);
  const [keyName, setKeyName] = useState<string>('');
  const [loadScreenID, setLoadScreenID] = useState<number>(0);
  const [localizedName, setLocalizedName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [onClick, setOnClick] = useState<string>('');
  const [onDisarm, setOnDisarm] = useState<string>('');
  const [onTrapTriggered, setOnTrapTriggered] = useState<string>('');
  const [paletteID, setPaletteID] = useState<number>(0);
  const [portraitId, setPortraitId] = useState<number>(0);
  const [onHeartbeat, setOnHeartbeat] = useState<string>('');
  const [onEnter, setOnEnter] = useState<string>('');
  const [onExit, setOnExit] = useState<string>('');
  const [onUserDefined, setOnUserDefined] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [templateResRef, setTemplateResRef] = useState<string>('');
  const [trapDetectDC, setTrapDetectDC] = useState<number>(0);
  const [trapDetectable, setTrapDetectable] = useState<boolean>(false);
  const [trapDisarmable, setTrapDisarmable] = useState<boolean>(false);
  const [trapFlag, setTrapFlag] = useState<boolean>(false);
  const [trapOneShot, setTrapOneShot] = useState<boolean>(false);
  const [trapType, setTrapType] = useState<number>(0);
  const [type, setType] = useState<number>(0);

  const onTriggerChange = () => {
    setAutoRemoveKey(tab.autoRemoveKey);
    setComment(tab.comment);
    setCursor(tab.cursor);
    setDisarmDC(tab.disarmDC);
    setFaction(tab.faction);
    setHighlightHeight(tab.highlightHeight);
    setKeyName(tab.keyName);
    setLoadScreenID(tab.loadScreenID);
    setLocalizedName(tab.localizedName);
    setOnClick(tab.onClick);
    setOnDisarm(tab.onDisarm);
    setOnTrapTriggered(tab.onTrapTriggered);
    setPaletteID(tab.paletteID);
    setPortraitId(tab.portraitId);
    setOnHeartbeat(tab.onHeartbeat);
    setOnEnter(tab.onEnter);
    setOnExit(tab.onExit);
    setOnUserDefined(tab.onUserDefined);
    setTag(tab.tag);
    setTemplateResRef(tab.templateResRef);
    setTrapDetectDC(tab.trapDetectDC);
    setTrapDetectable(tab.trapDetectable);
    setTrapDisarmable(tab.trapDisarmable);
    setTrapFlag(tab.trapFlag);
    setTrapOneShot(tab.trapOneShot);
    setTrapType(tab.trapType);
    setType(tab.t_type);
  }

  useEffect(() => {
    if(!tab) return;
    onTriggerChange();
    tab.addEventListener('onEditorFileLoad', onTriggerChange);
    tab.addEventListener('onEditorFileChange', onTriggerChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onTriggerChange);
      tab.removeEventListener('onEditorFileChange', onTriggerChange);
    };
  }, []);

  // Helper functions using shared utilities
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof TabUTTEditorState, parser: (value: number) => number = (v) => v) => 
    createNumberFieldHandler(setter, property, tab, parser);
  
  const onUpdateByteField = (setter: (value: number) => void, property: keyof TabUTTEditorState) => 
    createByteFieldHandler(setter, property, tab);
  
  const onUpdateWordField = (setter: (value: number) => void, property: keyof TabUTTEditorState) => 
    createWordFieldHandler(setter, property, tab);
  
  const updateBooleanField = (setter: (value: boolean) => void, property: keyof TabUTTEditorState) => 
    createBooleanFieldHandler(setter, property, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof TabUTTEditorState) => 
    createResRefFieldHandler(setter, property, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof TabUTTEditorState) => 
    createCExoStringFieldHandler(setter, property, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof TabUTTEditorState) => 
    createCExoLocStringFieldHandler(setter, property, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof TabUTTEditorState) => 
    createForgeCheckboxFieldHandler(setter, property, tab);

  const tabs: SubTab[] = [
    {
      id: 'basic',
      label: 'Basic',
      headerIcon: 'fa-info-circle',
      headerTitle: 'Basic',
      content: (
        <>
          <table style={{ width: '100%' }}>
            <tbody>
              <FormField label="Name" info="Localized label shown in toolset lists.">
                <CExoLocStringEditor value={localizedName} onChange={onUpdateCExoLocStringField(setLocalizedName, 'localizedName')} />
              </FormField>
              <FormField label="Template ResRef" info="Internal ResRef (max 16 chars, lowercase).">
                <input type="text" value={templateResRef} onChange={onUpdateResRefField(setTemplateResRef, 'templateResRef')} maxLength={16} />
              </FormField>
              <FormField label="Tag" info="Unique identifier (max 32 chars).">
                <input type="text" value={tag} onChange={onUpdateResRefField(setTag, 'tag')} maxLength={32} />
              </FormField>
              <FormField label="Comment" info="Designer-only notes stored in blueprint.">
                <textarea value={comment} onChange={onUpdateCExoStringField(setComment, 'comment')} rows={2} />
              </FormField>
              <FormField label="Type" info="0=Generic, 1=Area Transition, 2=Trap.">
                <select value={type} onChange={onUpdateByteField(setType, 'type')}>
                  <option value={0}>Generic</option>
                  <option value={1}>Area Transition</option>
                  <option value={2}>Trap</option>
                </select>
              </FormField>
              <FormField label="Faction" info="Faction index controlling hostility.">
                <input type="number" value={faction} onChange={onUpdateByteField(setFaction, 'faction')} />
              </FormField>
              <FormField label="Palette ID" info="Palette folder identifier in toolset.">
                <input type="number" value={paletteID} onChange={onUpdateByteField(setPaletteID, 'paletteID')} />
              </FormField>
              <FormField label="Cursor" info="Index into cursors.2da.">
                <input type="number" min={0} max={255} value={cursor} onChange={onUpdateByteField(setCursor, 'cursor')} />
              </FormField>
              <FormField label="Highlight Height" info="Height in meters for trigger highlight glow.">
                <input type="number" step="0.1" value={highlightHeight} onChange={onUpdateNumberField(setHighlightHeight, 'highlightHeight')} />
              </FormField>
              <FormField label="Load Screen ID" info="loadscreeen.2da row used for area transitions.">
                <input type="number" min={0} value={loadScreenID} onChange={onUpdateWordField(setLoadScreenID, 'loadScreenID')} />
              </FormField>
              <FormField label="Key Name" info="Optional required key tag for area transitions.">
                <input type="text" value={keyName} onChange={onUpdateResRefField(setKeyName, 'keyName')} maxLength={32} />
              </FormField>
              <FormField label="Auto Remove Key" info="Removes key item after transition.">
                <ForgeCheckbox label="Enabled" value={autoRemoveKey} onChange={onUpdateForgeCheckboxField(setAutoRemoveKey, 'autoRemoveKey')} />
              </FormField>
              <FormField label="Portrait ID" info="Index into portraits.2da for UI portrait.">
                <input type="number" min={0} value={portraitId} onChange={onUpdateWordField(setPortraitId, 'portraitId')} />
              </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'scripts',
      label: 'Scripts',
      headerIcon: 'fa-file-code',
      headerTitle: 'Scripts',
      content: (
        <>
          <table style={{ width: '100%' }}>
            <tbody>
              <FormField label="On Click" info="ResRef of script executed when clicked.">
                <input type="text" value={onClick} onChange={onUpdateResRefField(setOnClick, 'onClick')} maxLength={16} />
              </FormField>
              <FormField label="On Heartbeat" info="ResRef of ScriptOnHeartbeat.">
                <input type="text" value={onHeartbeat} onChange={onUpdateResRefField(setOnHeartbeat, 'onHeartbeat')} maxLength={16} />
              </FormField>
              <FormField label="On Enter" info="ResRef of ScriptOnEnter.">
                <input type="text" value={onEnter} onChange={onUpdateResRefField(setOnEnter, 'onEnter')} maxLength={16} />
              </FormField>
              <FormField label="On Exit" info="ResRef of ScriptOnExit.">
                <input type="text" value={onExit} onChange={onUpdateResRefField(setOnExit, 'onExit')} maxLength={16} />
              </FormField>
              <FormField label="On User Defined" info="ResRef of ScriptOnUserDefine.">
                <input type="text" value={onUserDefined} onChange={onUpdateResRefField(setOnUserDefined, 'onUserDefined')} maxLength={16} />
              </FormField>
              <FormField label="On Disarm" info="ResRef executed when trap is disarmed.">
                <input type="text" value={onDisarm} onChange={onUpdateResRefField(setOnDisarm, 'onDisarm')} maxLength={16} />
              </FormField>
              <FormField label="On Trap Triggered" info="ResRef fired when trap trips.">
                <input type="text" value={onTrapTriggered} onChange={onUpdateResRefField(setOnTrapTriggered, 'onTrapTriggered')} maxLength={16} />
              </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'trap',
      label: 'Trap',
      headerIcon: 'fa-exclamation-triangle',
      headerTitle: 'Trap',
      content: (
        <>
          <table style={{ width: '100%' }}>
            <tbody>
              <FormField label="Trap Flag" info="Marks trigger as trap for engine.">
                <ForgeCheckbox label="Enabled" value={trapFlag} onChange={onUpdateForgeCheckboxField(setTrapFlag, 'trapFlag')} />
              </FormField>
              <FormField label="Trap Type" info="Index into traps.2da.">
                <input type="number" min={0} value={trapType} onChange={onUpdateByteField(setTrapType, 'trapType')} />
              </FormField>
              <FormField label="Disarm DC" info="Base DC to disarm (1-250).">
                <input type="number" min={0} max={255} value={disarmDC} onChange={onUpdateByteField(setDisarmDC, 'disarmDC')} />
              </FormField>
              <FormField label="Trap Detect DC" info="DC to detect trap.">
                <input type="number" min={0} value={trapDetectDC} onChange={onUpdateByteField(setTrapDetectDC, 'trapDetectDC')} />
              </FormField>
              <FormField label="Trap Detectable" info="Whether trap can be detected.">
                <ForgeCheckbox label="Enabled" value={trapDetectable} onChange={onUpdateForgeCheckboxField(setTrapDetectable, 'trapDetectable')} />
              </FormField>
              <FormField label="Trap Disarmable" info="Allows trap to be disarmed.">
                <ForgeCheckbox label="Enabled" value={trapDisarmable} onChange={onUpdateForgeCheckboxField(setTrapDisarmable, 'trapDisarmable')} />
              </FormField>
              <FormField label="Trap One Shot" info="Trap is removed after firing.">
                <ForgeCheckbox label="Enabled" value={trapOneShot} onChange={onUpdateForgeCheckboxField(setTrapOneShot, 'trapOneShot')} />
              </FormField>
            </tbody>
          </table>
        </>
      )
    }
  ];

  return (
    <SubTabHost tabs={tabs} defaultTab="basic" />
  );
}