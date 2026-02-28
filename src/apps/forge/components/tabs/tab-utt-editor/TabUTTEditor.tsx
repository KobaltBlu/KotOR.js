import React, { useState, useEffect, useCallback } from "react"

import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { FormField } from "@/apps/forge/components/form-field/FormField";
import { SubTab, SubTabHost } from "@/apps/forge/components/SubTabHost";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps"
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";
import { TabUTTEditorState } from "@/apps/forge/states/tabs";

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

  const onTriggerChange = useCallback(() => {
    if (!tab.trigger || !tab.blueprint) return;
    setAutoRemoveKey(tab.trigger.autoRemoveKey);
    setComment(tab.trigger.comment);
    setCursor(tab.trigger.cursor);
    setDisarmDC(tab.trigger.disarmDC);
    setFaction(tab.trigger.faction);
    setHighlightHeight(tab.trigger.highlightHeight);
    setKeyName(tab.trigger.keyName);
    setLoadScreenID(tab.trigger.loadScreenID);
    setLocalizedName(tab.trigger.localizedName);
    setOnClick(tab.trigger.onClick);
    setOnDisarm(tab.trigger.onDisarm);
    setOnTrapTriggered(tab.trigger.onTrapTriggered);
    setPaletteID(tab.trigger.paletteID);
    setPortraitId(tab.trigger.portraitId);
    setOnHeartbeat(tab.trigger.onHeartbeat);
    setOnEnter(tab.trigger.onEnter);
    setOnExit(tab.trigger.onExit);
    setOnUserDefined(tab.trigger.onUserDefined);
    setTag(tab.trigger.tag);
    setTemplateResRef(tab.trigger.templateResRef);
    setTrapDetectDC(tab.trigger.trapDetectDC);
    setTrapDetectable(tab.trigger.trapDetectable);
    setTrapDisarmable(tab.trigger.trapDisarmable);
    setTrapFlag(tab.trigger.trapFlag);
    setTrapOneShot(tab.trigger.trapOneShot);
    setTrapType(tab.trigger.trapType);
    setType(tab.trigger.t_type);
  }, [tab]);

  // Helper functions using ForgeTrigger methods
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof ForgeTrigger, parser: (value: number) => number = (v) => v) => 
    tab.trigger.createNumberFieldHandler(setter, property, tab.trigger, tab, parser);
  
  const onUpdateByteField = (setter: (value: number) => void, property: keyof ForgeTrigger) => 
    tab.trigger.createByteFieldHandler(setter, property, tab.trigger, tab);
  
  const onUpdateWordField = (setter: (value: number) => void, property: keyof ForgeTrigger) => 
    tab.trigger.createWordFieldHandler(setter, property, tab.trigger, tab);
  
  const _onUpdateBooleanField = (setter: (value: boolean) => void, property: keyof ForgeTrigger) => 
    tab.trigger.createBooleanFieldHandler(setter, property, tab.trigger, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof ForgeTrigger) => 
    tab.trigger.createResRefFieldHandler(setter, property, tab.trigger, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof ForgeTrigger) => 
    tab.trigger.createCExoStringFieldHandler(setter, property, tab.trigger, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof ForgeTrigger) => 
    tab.trigger.createCExoLocStringFieldHandler(setter, property, tab.trigger, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof ForgeTrigger) => 
    tab.trigger.createForgeCheckboxFieldHandler(setter, property, tab.trigger, tab);

  useEffect(() => {
    if(!tab) return;
    onTriggerChange();
    tab.addEventListener('onEditorFileLoad', onTriggerChange);
    tab.addEventListener('onEditorFileChange', onTriggerChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onTriggerChange);
      tab.removeEventListener('onEditorFileChange', onTriggerChange);
    };
  }, [tab, onTriggerChange]);

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
                <select value={type} onChange={onUpdateByteField(setType, 't_type')}>
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