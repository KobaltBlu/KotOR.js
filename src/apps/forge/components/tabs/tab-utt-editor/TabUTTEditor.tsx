import React, { useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTTEditorState } from "../../../states/tabs";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import * as KotOR from "../../../KotOR";
import { FormField } from "../../form-field/FormField";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";

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

  useEffectOnce(() => {
    onTriggerChange();
    tab.addEventListener('onEditorFileChange', () => { onTriggerChange(); });
    return () => {
      tab.removeEventListener('onEditorFileChange', () => { onTriggerChange(); });
    };
  });

  const sanitizeResRef = (value: string) => value.substring(0, 16).toLowerCase().replace(/[^a-z0-9_]/g, '');
  const clampByte = (value: number) => Math.max(0, Math.min(255, value));

  const updateTab = (updater: () => void) => {
    if(!tab) return;
    updater();
    tab.updateFile();
  };

  const onUpdateLocalizedName = (value: KotOR.CExoLocString) => {
    setLocalizedName(value);
    updateTab(() => { tab.localizedName = value; });
  }

  const onUpdateTemplateResRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeResRef(e.target.value);
    setTemplateResRef(value);
    updateTab(() => { tab.templateResRef = value; });
  }

  const onUpdateTag = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.substring(0, 32);
    setTag(value);
    updateTab(() => { tab.tag = value; });
  }

  const onUpdateComment = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    updateTab(() => { tab.comment = value; });
  }

  const onUpdateType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value) || 0;
    setType(value);
    updateTab(() => { tab.t_type = value; });
  }

  const onUpdateFaction = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setFaction(value);
    updateTab(() => { tab.faction = value; });
  }

  const onUpdatePaletteID = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setPaletteID(value);
    updateTab(() => { tab.paletteID = value; });
  }

  const onUpdateCursor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = clampByte(parseInt(e.target.value) || 0);
    setCursor(value);
    updateTab(() => { tab.cursor = value; });
  }

  const onUpdateHighlightHeight = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const parsed = isNaN(value) ? 0 : value;
    setHighlightHeight(parsed);
    updateTab(() => { tab.highlightHeight = parsed; });
  }

  const onUpdateLoadScreenID = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setLoadScreenID(value);
    updateTab(() => { tab.loadScreenID = value; });
  }

  const onUpdateKeyName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.substring(0, 32);
    setKeyName(value);
    updateTab(() => { tab.keyName = value; });
  }

  const onUpdateAutoRemoveKey = (value: boolean) => {
    setAutoRemoveKey(value);
    updateTab(() => { tab.autoRemoveKey = value; });
  }

  const onUpdatePortraitId = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setPortraitId(value);
    updateTab(() => { tab.portraitId = value; });
  }

  const onUpdateDisarmDC = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = clampByte(parseInt(e.target.value) || 0);
    setDisarmDC(value);
    updateTab(() => { tab.disarmDC = value; });
  }

  const onUpdateTrapDetectDC = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setTrapDetectDC(value);
    updateTab(() => { tab.trapDetectDC = value; });
  }

  const onUpdateTrapType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setTrapType(value);
    updateTab(() => { tab.trapType = value; });
  }

  const onUpdateTrapDetectable = (value: boolean) => {
    setTrapDetectable(value);
    updateTab(() => { tab.trapDetectable = value; });
  }

  const onUpdateTrapDisarmable = (value: boolean) => {
    setTrapDisarmable(value);
    updateTab(() => { tab.trapDisarmable = value; });
  }

  const onUpdateTrapFlag = (value: boolean) => {
    setTrapFlag(value);
    updateTab(() => { tab.trapFlag = value; });
  }

  const onUpdateTrapOneShot = (value: boolean) => {
    setTrapOneShot(value);
    updateTab(() => { tab.trapOneShot = value; });
  }

  const onUpdateScriptField = (setter: (value: string) => void, property: keyof TabUTTEditorState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeResRef(e.target.value);
    setter(value);
    updateTab(() => { (tab as any)[property] = value; });
  }

  const [selectedTab, setSelectedTab] = useState<string>('basic');

  return (
    <div className="tab-utt-editor" style={{height: '100%'}}>
      <div className="vertical-tabs" style={{height: '100%'}}>
        <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
          <ul className="tabs-menu" style={{textAlign: 'center'}}>
            <li className={`btn btn-tab ${selectedTab == 'basic' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('basic') }>Basic</a></li>
            <li className={`btn btn-tab ${selectedTab == 'scripts' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('scripts') }>Scripts</a></li>
            <li className={`btn btn-tab ${selectedTab == 'trap' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('trap') }>Trap</a></li>
          </ul>
        </div>
        <div className="vertical-tabs-container">
          <div className="tabs" style={{position: 'absolute', top:0, bottom: 0, left: 0, right: 0, overflowY: 'auto', padding: '0 10px'}}>
            <div className="tab-pane" style={{display: (selectedTab == 'basic' ? 'block' : 'none')}}>
              <h3>Basic</h3>
              <hr />
              <table style={{ width: '100%' }}>
                <tbody>
                  <FormField label="Name" info="Localized label shown in toolset lists.">
                    <CExoLocStringEditor value={localizedName} onChange={onUpdateLocalizedName} />
                  </FormField>
                  <FormField label="Template ResRef" info="Internal ResRef (max 16 chars, lowercase).">
                    <input type="text" value={templateResRef} onChange={onUpdateTemplateResRef} maxLength={16} />
                  </FormField>
                  <FormField label="Tag" info="Unique identifier (max 32 chars).">
                    <input type="text" value={tag} onChange={onUpdateTag} maxLength={32} />
                  </FormField>
                  <FormField label="Comment" info="Designer-only notes stored in blueprint.">
                    <textarea value={comment} onChange={onUpdateComment} rows={2} />
                  </FormField>
                  <FormField label="Type" info="0=Generic, 1=Area Transition, 2=Trap.">
                    <select value={type} onChange={onUpdateType}>
                      <option value={0}>Generic</option>
                      <option value={1}>Area Transition</option>
                      <option value={2}>Trap</option>
                    </select>
                  </FormField>
                  <FormField label="Faction" info="Faction index controlling hostility.">
                    <input type="number" value={faction} onChange={onUpdateFaction} />
                  </FormField>
                  <FormField label="Palette ID" info="Palette folder identifier in toolset.">
                    <input type="number" value={paletteID} onChange={onUpdatePaletteID} />
                  </FormField>
                  <FormField label="Cursor" info="Index into cursors.2da.">
                    <input type="number" min={0} max={255} value={cursor} onChange={onUpdateCursor} />
                  </FormField>
                  <FormField label="Highlight Height" info="Height in meters for trigger highlight glow.">
                    <input type="number" step="0.1" value={highlightHeight} onChange={onUpdateHighlightHeight} />
                  </FormField>
                  <FormField label="Load Screen ID" info="loadscreeen.2da row used for area transitions.">
                    <input type="number" min={0} value={loadScreenID} onChange={onUpdateLoadScreenID} />
                  </FormField>
                  <FormField label="Key Name" info="Optional required key tag for area transitions.">
                    <input type="text" value={keyName} onChange={onUpdateKeyName} maxLength={32} />
                  </FormField>
                  <FormField label="Auto Remove Key" info="Removes key item after transition.">
                    <ForgeCheckbox label="Enabled" value={autoRemoveKey} onChange={onUpdateAutoRemoveKey} />
                  </FormField>
                  <FormField label="Portrait ID" info="Index into portraits.2da for UI portrait.">
                    <input type="number" min={0} value={portraitId} onChange={onUpdatePortraitId} />
                  </FormField>
                </tbody>
              </table>
            </div>
            <div className="tab-pane" style={{display: (selectedTab == 'scripts' ? 'block' : 'none')}}>
              <h3>Scripts</h3>
              <hr />
              <table style={{ width: '100%' }}>
                <tbody>
                  <FormField label="On Click" info="ResRef of script executed when clicked.">
                    <input type="text" value={onClick} onChange={onUpdateScriptField(setOnClick, 'onClick')} maxLength={16} />
                  </FormField>
                  <FormField label="On Heartbeat" info="ResRef of ScriptOnHeartbeat.">
                    <input type="text" value={onHeartbeat} onChange={onUpdateScriptField(setOnHeartbeat, 'onHeartbeat')} maxLength={16} />
                  </FormField>
                  <FormField label="On Enter" info="ResRef of ScriptOnEnter.">
                    <input type="text" value={onEnter} onChange={onUpdateScriptField(setOnEnter, 'onEnter')} maxLength={16} />
                  </FormField>
                  <FormField label="On Exit" info="ResRef of ScriptOnExit.">
                    <input type="text" value={onExit} onChange={onUpdateScriptField(setOnExit, 'onExit')} maxLength={16} />
                  </FormField>
                  <FormField label="On User Defined" info="ResRef of ScriptOnUserDefine.">
                    <input type="text" value={onUserDefined} onChange={onUpdateScriptField(setOnUserDefined, 'onUserDefined')} maxLength={16} />
                  </FormField>
                  <FormField label="On Disarm" info="ResRef executed when trap is disarmed.">
                    <input type="text" value={onDisarm} onChange={onUpdateScriptField(setOnDisarm, 'onDisarm')} maxLength={16} />
                  </FormField>
                  <FormField label="On Trap Triggered" info="ResRef fired when trap trips.">
                    <input type="text" value={onTrapTriggered} onChange={onUpdateScriptField(setOnTrapTriggered, 'onTrapTriggered')} maxLength={16} />
                  </FormField>
                </tbody>
              </table>
            </div>
            <div className="tab-pane" style={{display: (selectedTab == 'trap' ? 'block' : 'none')}}>
              <h3>Trap</h3>
              <hr />
              <table style={{ width: '100%' }}>
                <tbody>
                  <FormField label="Trap Flag" info="Marks trigger as trap for engine.">
                    <ForgeCheckbox label="Enabled" value={trapFlag} onChange={onUpdateTrapFlag} />
                  </FormField>
                  <FormField label="Trap Type" info="Index into traps.2da.">
                    <input type="number" min={0} value={trapType} onChange={onUpdateTrapType} />
                  </FormField>
                  <FormField label="Disarm DC" info="Base DC to disarm (1-250).">
                    <input type="number" min={0} max={255} value={disarmDC} onChange={onUpdateDisarmDC} />
                  </FormField>
                  <FormField label="Trap Detect DC" info="DC to detect trap.">
                    <input type="number" min={0} value={trapDetectDC} onChange={onUpdateTrapDetectDC} />
                  </FormField>
                  <FormField label="Trap Detectable" info="Whether trap can be detected.">
                    <ForgeCheckbox label="Enabled" value={trapDetectable} onChange={onUpdateTrapDetectable} />
                  </FormField>
                  <FormField label="Trap Disarmable" info="Allows trap to be disarmed.">
                    <ForgeCheckbox label="Enabled" value={trapDisarmable} onChange={onUpdateTrapDisarmable} />
                  </FormField>
                  <FormField label="Trap One Shot" info="Trap is removed after firing.">
                    <ForgeCheckbox label="Enabled" value={trapOneShot} onChange={onUpdateTrapOneShot} />
                  </FormField>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}