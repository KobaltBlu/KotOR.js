import React, { useCallback, useEffect, useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTIEditorState, TabUTPEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import * as KotOR from "../../../KotOR";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import {
  sanitizeResRef,
  clampByte,
  clampWord,
  createNumberFieldHandler,
  createByteFieldHandler,
  createWordFieldHandler,
  createBooleanFieldHandler,
  createResRefFieldHandler,
  createCExoStringFieldHandler,
  createCExoLocStringFieldHandler,
  createForgeCheckboxFieldHandler
} from "../../../helpers/UTxEditorHelpers";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";

export const TabUTPEditor = function(props: BaseTabProps){

  const tab: TabUTPEditorState = props.tab as TabUTPEditorState;
  const [selectedTab, setSelectedTab] = useState<string>('basic');

  const [animationState, setAnimationState] = useState<number>(0);
  const [appearance, setAppearance] = useState<number>(0);
  const [autoRemoveKey, setAutoRemoveKey] = useState<boolean>(false);
  const [bodyBag, setBodyBag] = useState<boolean>(false);
  const [closeLockDC, setCloseLockDC] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [conversation, setConversation] = useState<string>('');
  const [currentHP, setCurrentHP] = useState<number>(0);
  const [description, setDescription] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [disarmDC, setDisarmDC] = useState<number>(0);
  const [faction, setFaction] = useState<number>(0);
  const [fort, setFort] = useState<number>(0);
  const [hp, setHP] = useState<number>(0);
  const [hardness, setHardness] = useState<number>(0);
  const [hasInventory, setHasInventory] = useState<boolean>(false);
  const [interruptable, setInterruptable] = useState<boolean>(false);
  const [keyName, setKeyName] = useState<string>('');
  const [keyRequired, setKeyRequired] = useState<boolean>(false);
  const [locName, setLocName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [lockable, setLockable] = useState<boolean>(false);
  const [locked, setLocked] = useState<boolean>(false);
  const [min1HP, setMin1HP] = useState<boolean>(false);
  const [onClick, setOnClick] = useState<string>('');
  const [onClosed, setOnClosed] = useState<string>('');
  const [onDamaged, setOnDamaged] = useState<string>('');
  const [onDeath, setOnDeath] = useState<string>('');
  const [onDisarm, setOnDisarm] = useState<string>('');
  const [onEndDialogue, setOnEndDialogue] = useState<string>('');
  const [onFailToOpen, setOnFailToOpen] = useState<string>('');
  const [onHeartbeat, setOnHeartbeat] = useState<string>('');
  const [onInvDisturbed, setOnInvDisturbed] = useState<string>('');
  const [onLock, setOnLock] = useState<string>('');
  const [onMeleeAttacked, setOnMeleeAttacked] = useState<string>('');
  const [onOpen, setOnOpen] = useState<string>('');
  const [onSpellCastAt, setOnSpellCastAt] = useState<string>('');
  const [onTrapTriggered, setOnTrapTriggered] = useState<string>('');
  const [onUnlock, setOnUnlock] = useState<string>('');
  const [onUsed, setOnUsed] = useState<string>('');
  const [onUserDefined, setOnUserDefined] = useState<string>('');
  const [openLockDC, setOpenLockDC] = useState<number>(0);
  const [paletteID, setPaletteID] = useState<number>(0);
  const [partyInteract, setPartyInteract] = useState<boolean>(false);
  const [plot, setPlot] = useState<boolean>(false);
  const [portraitId, setPortraitId] = useState<number>(0);
  const [ref, setRef] = useState<number>(0);
  const [static_, setStatic] = useState<boolean>(false);
  const [tag, setTag] = useState<string>('');
  const [templateResRef, setTemplateResRef] = useState<string>('');
  const [trapDetectDC, setTrapDetectDC] = useState<number>(0);
  const [trapDetectable, setTrapDetectable] = useState<boolean>(false);
  const [trapDisarmable, setTrapDisarmable] = useState<boolean>(false);
  const [trapFlag, setTrapFlag] = useState<boolean>(false);
  const [trapOneShot, setTrapOneShot] = useState<boolean>(false);
  const [trapType, setTrapType] = useState<number>(0);
  const [type, setType] = useState<number>(0);
  const [useable, setUseable] = useState<boolean>(false);
  const [will, setWill] = useState<number>(0);

  const [kPlaceableAppearances, setKPlaceableAppearances] = useState<any[]>([]);
  const [kFactions, setKFactions] = useState<any[]>([]);

  // Helper functions using shared utilities
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof TabUTPEditorState, parser: (value: number) => number = (v) => v) => 
    createNumberFieldHandler(setter, property, tab, parser);
  
  const onUpdateByteField = (setter: (value: number) => void, property: keyof TabUTPEditorState) => 
    createByteFieldHandler(setter, property, tab);
  
  const onUpdateWordField = (setter: (value: number) => void, property: keyof TabUTPEditorState) => 
    createWordFieldHandler(setter, property, tab);
  
  const updateBooleanField = (setter: (value: boolean) => void, property: keyof TabUTPEditorState) => 
    createBooleanFieldHandler(setter, property, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof TabUTPEditorState) => 
    createResRefFieldHandler(setter, property, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof TabUTPEditorState) => 
    createCExoStringFieldHandler(setter, property, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof TabUTPEditorState) => 
    createCExoLocStringFieldHandler(setter, property, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof TabUTPEditorState) => 
    createForgeCheckboxFieldHandler(setter, property, tab);

  const onPlaceableChange = useCallback(() => {
    setAnimationState(tab.animationState);
    setAppearance(tab.appearance);
    setAutoRemoveKey(tab.autoRemoveKey);
    setBodyBag(tab.bodyBag);
    setCloseLockDC(tab.closeLockDC);
    setComment(tab.comment);
    setConversation(tab.conversation);
    setCurrentHP(tab.currentHP);
    setDescription(tab.description);
    setDisarmDC(tab.disarmDC);
    setFaction(tab.faction);
    setFort(tab.fort);
    setHP(tab.hp);
    setHardness(tab.hardness);
    setHasInventory(tab.hasInventory);
    setInterruptable(tab.interruptable);
    setKeyName(tab.keyName);
    setKeyRequired(tab.keyRequired);
    setLocName(tab.locName);
    setLockable(tab.lockable);
    setLocked(tab.locked);
    setMin1HP(tab.min1HP);
    setOnClick(tab.onClick);
    setOnClosed(tab.onClosed);
    setOnDamaged(tab.onDamaged);
    setOnDeath(tab.onDeath);
    setOnDisarm(tab.onDisarm);
    setOnEndDialogue(tab.onEndDialogue);
    setOnFailToOpen(tab.onFailToOpen);
    setOnHeartbeat(tab.onHeartbeat);
    setOnInvDisturbed(tab.onInvDisturbed);
    setOnLock(tab.onLock);
    setOnMeleeAttacked(tab.onMeleeAttacked);
    setOnOpen(tab.onOpen);
    setOnSpellCastAt(tab.onSpellCastAt);
    setOnTrapTriggered(tab.onTrapTriggered);
    setOnUnlock(tab.onUnlock);
    setOnUsed(tab.onUsed);
    setOnUserDefined(tab.onUserDefined);
    setOpenLockDC(tab.openLockDC);
    setPaletteID(tab.paletteID);
    setPartyInteract(tab.partyInteract);
    setPlot(tab.plot);
    setPortraitId(tab.portraitId);
    setRef(tab.ref);
    setStatic(tab.static);
    setTag(tab.tag);
    setTemplateResRef(tab.templateResRef);
    setTrapDetectDC(tab.trapDetectDC);
    setTrapDetectable(tab.trapDetectable);
    setTrapDisarmable(tab.trapDisarmable);
    setTrapFlag(tab.trapFlag);
    setTrapOneShot(tab.trapOneShot);
    setTrapType(tab.trapType);
    setType(tab.t_type);
    setUseable(tab.useable);
    setWill(tab.will);
    setKPlaceableAppearances(tab.kPlaceableAppearances);
    setKFactions(tab.kFactions);
  }, [tab]);

  useEffect(() => {
    if(!tab) return;
    onPlaceableChange();
    tab.addEventListener('onEditorFileChange', onPlaceableChange);
    tab.addEventListener('onEditorFileLoad', onPlaceableChange);
    return () => {
      tab.removeEventListener('onEditorFileChange', onPlaceableChange);
      tab.removeEventListener('onEditorFileLoad', onPlaceableChange);
    };
  }, [selectedTab]);

  return <>
<div style={{height: '100%'}}>
  <div className="vertical-tabs" style={{height: '100%'}}>
    <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
      <ul className="tabs-menu" style={{textAlign: 'center'}}>
        <li className={`btn btn-tab ${selectedTab == 'basic' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('basic') }>Basic</a></li>
        <li className={`btn btn-tab ${selectedTab == 'lock' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('lock') }>Lock</a></li>
        <li className={`btn btn-tab ${selectedTab == 'advanced' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('advanced') }>Advanced</a></li>
        <li className={`btn btn-tab ${selectedTab == 'scripts' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('scripts') }>Scripts</a></li>
        <li className={`btn btn-tab ${selectedTab == 'description' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('description') }>Description</a></li>
        <li className={`btn btn-tab ${selectedTab == 'comments' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('comments') }>Comments</a></li>
        <li className={`btn btn-tab ${selectedTab == 'trap' ? 'active' : ''}`}><a onClick={ () => setSelectedTab('trap') }>Trap</a></li>
      </ul>
    </div>
    <div className="vertical-tabs-container">
      <div className="editor-3d-preview" style={{position: 'absolute', top:0, bottom: 0, left: 0, right: '50%'}}>
        <UI3DRendererView context={tab.ui3DRenderer} />
      </div>
      <div className="tabs" style={{position: 'absolute', top:0, bottom: 0, left: '50%', right: 0, overflowY: 'auto', padding: '0 10px'}}>
        <div className="tab-pane" style={{display: (selectedTab == 'basic' ? 'block' : 'none')}}>
          <h3>Basic</h3>
          <hr />

          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Name</label></td>
                <td><CExoLocStringEditor value={locName} onChange={onUpdateCExoLocStringField(setLocName, 'locName')} /></td>
              </tr>
              <tr>
                <td><label>Tag</label></td>
                <td><input type="text" maxLength={16} value={tag} onChange={onUpdateResRefField(setTag, 'tag')} /></td>
              </tr>
              <tr>
                <td><label>Appearance</label></td>
                <td><select className="form-select" value={appearance} onChange={onUpdateByteField(setAppearance, 'appearance')}>
                  {kPlaceableAppearances.map((appearance: any, index: number) => (
                    <option key={index} value={index}>{appearance.label}</option>
                  ))}
                </select></td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td>
                  <ForgeCheckbox label="Plot Item" value={plot} onChange={onUpdateForgeCheckboxField(setPlot, 'plot')} />
                </td>
                <td>
                  <ForgeCheckbox label="Static" value={static_} onChange={onUpdateForgeCheckboxField(setStatic, 'static')} />
                </td>
                <td>
                  <ForgeCheckbox label="Min 1HP" value={min1HP} onChange={onUpdateForgeCheckboxField(setMin1HP, 'min1HP')} />
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Hardness</label></td>
                <td><input type="number" min="0" value={hardness} onChange={onUpdateByteField(setHardness, 'hardness')} /></td>
              </tr>
              <tr>
                <td><label>Hitpoints</label></td>
                <td><input type="number" min="0" value={hp} onChange={onUpdateWordField(setHP, 'hp')} /></td>
              </tr>
              <tr>
                <td><label>Forititude Save</label></td>
                <td><input type="number" min="0" value={fort} onChange={onUpdateByteField(setFort, 'fort')} /></td>
              </tr>
              <tr>
                <td><label>Reflex Save</label></td>
                <td><input type="number" min="0" value={ref} onChange={onUpdateByteField(setRef, 'ref')} /></td>
              </tr>
              <tr>
                <td><label>Will Save</label></td>
                <td><input type="number" min="0" value={will} onChange={onUpdateByteField(setWill, 'will')} /></td>
              </tr>
            </tbody>
          </table>

        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'lock' ? 'block' : 'none')}}>
          <h3>Lock</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td>
                  <ForgeCheckbox label="Locked" value={locked} onChange={onUpdateForgeCheckboxField(setLocked, 'locked')} />
                </td>
              </tr>
              <tr>
                <td>
                  <ForgeCheckbox label="Can be relocked" value={lockable} onChange={onUpdateForgeCheckboxField(setLockable, 'lockable')} />
                </td>
              <tr>
              </tr>
                <td>
                  <ForgeCheckbox label="Auto remove key after use" value={autoRemoveKey} onChange={onUpdateForgeCheckboxField(setAutoRemoveKey, 'autoRemoveKey')} />
                </td>
              </tr>
              <tr>
                <td>
                  <ForgeCheckbox label="Key required to unlock or lock" value={keyRequired} onChange={onUpdateForgeCheckboxField(setKeyRequired, 'keyRequired')} />
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Open Lock DC</label></td>
                <td><input type="number" value={openLockDC} onChange={onUpdateByteField(setOpenLockDC, 'openLockDC')} /></td>
              </tr>
              <tr>
                <td><label>Close Lock DC</label></td>
                <td><input type="number" value={closeLockDC} onChange={onUpdateByteField(setCloseLockDC, 'closeLockDC')} /></td>
              </tr>
              <tr>
                <td><label>Key Name</label></td>
                <td><input type="text" maxLength={16} value={keyName} onChange={onUpdateResRefField(setKeyName, 'keyName')} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'advanced' ? 'block' : 'none')}}>
          <h3>Advanced</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Blueprint ResRef</label></td>
                <td><input type="text" disabled={true} value={templateResRef} /></td>
              </tr>
              <tr>
                <td><label>Faction</label></td>
                <td><select className="form-select" value={faction} onChange={onUpdateByteField(setFaction, 'faction')}>
                  {kFactions.map((faction: any, index: number) => (
                    <option key={index} value={index}>{faction.label}</option>
                  ))}
                </select></td>
              </tr>
              <tr>
                <td><label>Conversation</label></td>
                <td>
                  <input type="text" maxLength={16} style={{width: 'auto' }} value={conversation} onChange={onUpdateResRefField(setConversation, 'conversation')} />
                  <ForgeCheckbox label="No Interrupt" value={interruptable} onChange={onUpdateForgeCheckboxField(setInterruptable, 'interruptable')} />
                </td>
              </tr>
              <tr>
                <td><label>Animation State</label></td>
                <td><input type="number" value={animationState} onChange={onUpdateByteField(setAnimationState, 'animationState')} /></td>
              </tr>
              <tr>
                <td><label>Type</label></td>
                <td><input type="number" value={type} onChange={onUpdateByteField(setType, 'type')} /></td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width:'100%'}}>
            <tbody>
              <tr>
                <td>
                  <ForgeCheckbox label="Has Inventory" value={hasInventory} onChange={onUpdateForgeCheckboxField(setHasInventory, 'hasInventory')} />
                </td>
                <td>
                  <ForgeCheckbox label="Party Interact" value={partyInteract} onChange={onUpdateForgeCheckboxField(setPartyInteract, 'partyInteract')} />
                </td>
                <td>
                  <ForgeCheckbox label="Usable" value={useable} onChange={onUpdateForgeCheckboxField(setUseable, 'useable')} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'scripts' ? 'block' : 'none')}}>
          <h3>Scripts</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
                <tr>
                  <td><label>OnClick</label></td>
                  <td><input type="text" maxLength={16} value={onClick} onChange={onUpdateResRefField(setOnClick, 'onClick')} /></td>
                </tr>
                <tr>
                  <td><label>OnClosed</label></td>
                  <td><input type="text" maxLength={16} value={onClosed} onChange={onUpdateResRefField(setOnClosed, 'onClosed')} /></td>
                </tr>
                <tr>
                  <td><label>OnDamaged</label></td>
                  <td><input type="text" maxLength={16} value={onDamaged} onChange={onUpdateResRefField(setOnDamaged, 'onDamaged')} /></td>
                </tr>
                <tr>
                  <td><label>OnDeath</label></td>
                  <td><input type="text" maxLength={16} value={onDeath} onChange={onUpdateResRefField(setOnDeath, 'onDeath')} /></td>
                </tr>
                <tr>
                  <td><label>OnDisarm</label></td>
                  <td><input type="text" maxLength={16} value={onDisarm} onChange={onUpdateResRefField(setOnDisarm, 'onDisarm')} /></td>
                </tr>
                <tr>
                  <td><label>OnEndDialogue</label></td>
                  <td><input type="text" maxLength={16} value={onEndDialogue} onChange={onUpdateResRefField(setOnEndDialogue, 'onEndDialogue')} /></td>
                </tr>
                <tr>
                  <td><label>OnFailToOpen</label></td>
                  <td><input type="text" maxLength={16} value={onFailToOpen} onChange={onUpdateResRefField(setOnFailToOpen, 'onFailToOpen')} /></td>
                </tr>
                <tr>
                  <td><label>OnInvDisturbed</label></td>
                  <td><input type="text" maxLength={16} value={onInvDisturbed} onChange={onUpdateResRefField(setOnInvDisturbed, 'onInvDisturbed')} /></td>
                </tr>
                <tr>
                  <td><label>OnHeartbeat</label></td>
                  <td><input type="text" maxLength={16} value={onHeartbeat} onChange={onUpdateResRefField(setOnHeartbeat, 'onHeartbeat')} /></td>
                </tr>
                <tr>
                  <td><label>OnLock</label></td>
                  <td><input type="text" maxLength={16} value={onLock} onChange={onUpdateResRefField(setOnLock, 'onLock')} /></td>
                </tr>
                <tr>
                  <td><label>OnMeleeAttacked</label></td>
                  <td><input type="text" maxLength={16} value={onMeleeAttacked} onChange={onUpdateResRefField(setOnMeleeAttacked, 'onMeleeAttacked')} /></td>
                </tr>
                <tr>
                  <td><label>OnOpen</label></td>
                  <td><input type="text" maxLength={16} value={onOpen} onChange={onUpdateResRefField(setOnOpen, 'onOpen')} /></td>
                </tr>
                <tr>
                  <td><label>OnSpellCastAt</label></td>
                  <td><input type="text" maxLength={16} value={onSpellCastAt} onChange={onUpdateResRefField(setOnSpellCastAt, 'onSpellCastAt')} /></td>
                </tr>
                <tr>
                  <td><label>OnTrapTriggered</label></td>
                  <td><input type="text" maxLength={16} value={onTrapTriggered} onChange={onUpdateResRefField(setOnTrapTriggered, 'onTrapTriggered')} /></td>
                </tr>
                <tr>
                  <td><label>OnUnlock</label></td>
                  <td><input type="text" maxLength={16} value={onUnlock} onChange={onUpdateResRefField(setOnUnlock, 'onUnlock')} /></td>
                </tr>
                <tr>
                  <td><label>OnUsed</label></td>
                  <td><input type="text" maxLength={16} value={onUsed} onChange={onUpdateResRefField(setOnUsed, 'onUsed')} /></td>
                </tr>
                <tr>
                  <td><label>OnUserDefined</label></td>
                  <td><input type="text" maxLength={16} value={onUserDefined} onChange={onUpdateResRefField(setOnUserDefined, 'onUserDefined')} /></td>
                </tr>
            </tbody>
          </table>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'comments' ? 'block' : 'none')}}>
          <h3>Comments</h3>
          <hr />
          <label>Comments</label>
          <textarea value={comment} onChange={onUpdateCExoStringField(setComment, 'comment')} ></textarea>
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'description' ? 'block' : 'none')}}>
          <h3>Description</h3>
          <hr />
          <label>Description</label>
          <CExoLocStringEditor value={description} onChange={onUpdateCExoLocStringField(setDescription, 'description')} />
        </div>
        <div className="tab-pane" style={{display: (selectedTab == 'trap' ? 'block' : 'none')}}>
          <h3>Trap</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Trap Type</label></td>
                <td><input type="number" value={trapType} onChange={onUpdateByteField(setTrapType, 'trapType')} /></td>
              </tr>
              <tr>
                <td><label>Disarm DC</label></td>
                <td><input type="number" value={disarmDC} onChange={onUpdateByteField(setDisarmDC, 'disarmDC')} /></td>
              </tr>
              <tr>
                <td><label>Trap Detect DC</label></td>
                <td><input type="number" value={trapDetectDC} onChange={onUpdateByteField(setTrapDetectDC, 'trapDetectDC')} /></td>
              </tr>
              <tr>
                <td><label>Trap Detectable</label></td>
                <td><ForgeCheckbox label="Trap Detectable" value={trapDetectable} onChange={onUpdateForgeCheckboxField(setTrapDetectable, 'trapDetectable')} /></td>
              </tr>
              <tr>
                <td><label>Trap Disarmable</label></td>
                <td><ForgeCheckbox label="Trap Disarmable" value={trapDisarmable} onChange={onUpdateForgeCheckboxField(setTrapDisarmable, 'trapDisarmable')} /></td>
              </tr>
              <tr>
                <td><label>Trap Flag</label></td>
                <td><ForgeCheckbox label="Trap Flag" value={trapFlag} onChange={onUpdateForgeCheckboxField(setTrapFlag, 'trapFlag')} /></td>
              </tr>
              <tr>
                <td><label>Trap One Shot</label></td>
                <td><ForgeCheckbox label="Trap One Shot" value={trapOneShot} onChange={onUpdateForgeCheckboxField(setTrapOneShot, 'trapOneShot')} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
  </>;

};