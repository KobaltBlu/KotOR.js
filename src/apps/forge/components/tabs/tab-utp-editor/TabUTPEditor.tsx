import React, { useCallback, useEffect, useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTIEditorState, TabUTPEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import * as KotOR from "../../../KotOR";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { ForgePlaceable } from "../../../module-editor/ForgePlaceable";
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
import { SubTab, SubTabHost } from "../../SubTabHost";
import { FormField } from "../../form-field/FormField";
import { InfoBubble } from "../../info-bubble/info-bubble";

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
  const [_paletteID, setPaletteID] = useState<number>(0);
  const [partyInteract, setPartyInteract] = useState<boolean>(false);
  const [plot, setPlot] = useState<boolean>(false);
  const [_portraitId, setPortraitId] = useState<number>(0);
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

  // Helper functions using ForgePlaceable methods
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof ForgePlaceable, parser: (value: number) => number = (v) => v) => 
    tab.placeable.createNumberFieldHandler(setter, property, tab.placeable, tab, parser);
  
  const onUpdateByteField = (setter: (value: number) => void, property: keyof ForgePlaceable) => 
    tab.placeable.createByteFieldHandler(setter, property, tab.placeable, tab);
  
  const onUpdateWordField = (setter: (value: number) => void, property: keyof ForgePlaceable) => 
    tab.placeable.createWordFieldHandler(setter, property, tab.placeable, tab);
  
  const updateBooleanField = (setter: (value: boolean) => void, property: keyof ForgePlaceable) => 
    tab.placeable.createBooleanFieldHandler(setter, property, tab.placeable, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof ForgePlaceable) => 
    tab.placeable.createResRefFieldHandler(setter, property, tab.placeable, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof ForgePlaceable) => 
    tab.placeable.createCExoStringFieldHandler(setter, property, tab.placeable, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof ForgePlaceable) => 
    tab.placeable.createCExoLocStringFieldHandler(setter, property, tab.placeable, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof ForgePlaceable) => 
    tab.placeable.createForgeCheckboxFieldHandler(setter, property, tab.placeable, tab);

  const onPlaceableChange = useCallback(() => {
    if(!tab.placeable) return;
    setAnimationState(tab.placeable.animationState);
    setAppearance(tab.placeable.appearance);
    setAutoRemoveKey(tab.placeable.autoRemoveKey);
    setBodyBag(tab.placeable.bodyBag);
    setCloseLockDC(tab.placeable.closeLockDC);
    setComment(tab.placeable.comment);
    setConversation(tab.placeable.conversation);
    setCurrentHP(tab.placeable.currentHP);
    setDescription(tab.placeable.description);
    setDisarmDC(tab.placeable.disarmDC);
    setFaction(tab.placeable.faction);
    setFort(tab.placeable.fort);
    setHP(tab.placeable.hp);
    setHardness(tab.placeable.hardness);
    setHasInventory(tab.placeable.hasInventory);
    setInterruptable(tab.placeable.interruptable);
    setKeyName(tab.placeable.keyName);
    setKeyRequired(tab.placeable.keyRequired);
    setLocName(tab.placeable.locName);
    setLockable(tab.placeable.lockable);
    setLocked(tab.placeable.locked);
    setMin1HP(tab.placeable.min1HP);
    setOnClick(tab.placeable.onClick);
    setOnClosed(tab.placeable.onClosed);
    setOnDamaged(tab.placeable.onDamaged);
    setOnDeath(tab.placeable.onDeath);
    setOnDisarm(tab.placeable.onDisarm);
    setOnEndDialogue(tab.placeable.onEndDialogue);
    setOnFailToOpen(tab.placeable.onFailToOpen);
    setOnHeartbeat(tab.placeable.onHeartbeat);
    setOnInvDisturbed(tab.placeable.onInvDisturbed);
    setOnLock(tab.placeable.onLock);
    setOnMeleeAttacked(tab.placeable.onMeleeAttacked);
    setOnOpen(tab.placeable.onOpen);
    setOnSpellCastAt(tab.placeable.onSpellCastAt);
    setOnTrapTriggered(tab.placeable.onTrapTriggered);
    setOnUnlock(tab.placeable.onUnlock);
    setOnUsed(tab.placeable.onUsed);
    setOnUserDefined(tab.placeable.onUserDefined);
    setOpenLockDC(tab.placeable.openLockDC);
    setPaletteID(tab.placeable.paletteID);
    setPartyInteract(tab.placeable.partyInteract);
    setPlot(tab.placeable.plot);
    setPortraitId(tab.placeable.portraitId);
    setRef(tab.placeable.ref);
    setStatic(tab.placeable.static);
    setTag(tab.placeable.tag);
    setTemplateResRef(tab.placeable.templateResRef);
    setTrapDetectDC(tab.placeable.trapDetectDC);
    setTrapDetectable(tab.placeable.trapDetectable);
    setTrapDisarmable(tab.placeable.trapDisarmable);
    setTrapFlag(tab.placeable.trapFlag);
    setTrapOneShot(tab.placeable.trapOneShot);
    setTrapType(tab.placeable.trapType);
    setType(tab.placeable.t_type);
    setUseable(tab.placeable.useable);
    setWill(tab.placeable.will);
    setKPlaceableAppearances(tab.placeable.kPlaceableAppearances || []);
    setKFactions(tab.placeable.kFactions || []);
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

  const tabs: SubTab[] = [
    {
      id: 'basic',
      label: 'Basic',
      headerIcon: 'fa-info-circle',
      headerTitle: 'Basic',
      content: (
        <>
          <table style={{width: '100%;'}}>
            <tbody>
              <FormField label="Name" info="The display name of the placeable. This is what players will see in-game and can be localized for different languages.">
                <CExoLocStringEditor value={locName} onChange={onUpdateCExoLocStringField(setLocName, 'locName')} />
              </FormField>
              <FormField label="Tag" info="A unique identifier for this placeable. Used by scripts to reference this specific object. Must be unique within the module.">
                <input type="text" maxLength={16} value={tag} onChange={onUpdateResRefField(setTag, 'tag')} />
              </FormField>
              <FormField label="Appearance" info="The appearance of the placeable. This is the model that will be used to display the placeable in-game.">
                <select className="form-select" value={appearance} onChange={onUpdateByteField(setAppearance, 'appearance')}>
                  {kPlaceableAppearances.map((appearance: any, index: number) => (
                    <option key={index} value={index}>{appearance.label}</option>
                  ))}
                </select>
              </FormField>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td>
                  <ForgeCheckbox label="Plot Item" info="Whether this placeable is a plot item. This is used to determine if the placeable should be displayed in the plot window." value={plot} onChange={onUpdateForgeCheckboxField(setPlot, 'plot')} />
                </td>
                <td>
                  <ForgeCheckbox label="Static" info="Whether this placeable is static. This is used to determine if the placeable should be displayed in the static window." value={static_} onChange={onUpdateForgeCheckboxField(setStatic, 'static')} />
                </td>
                <td>
                  <ForgeCheckbox label="Min 1HP" info="Whether this placeable should have at least 1 hitpoint. This is used to determine if the placeable should be displayed in the min 1HP window." value={min1HP} onChange={onUpdateForgeCheckboxField(setMin1HP, 'min1HP')} />
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <FormField label="Hardness" info="The hardness of the placeable. This is used to determine if the placeable should be displayed in the hardness window.">
                <input type="number" min="0" value={hardness} onChange={onUpdateByteField(setHardness, 'hardness')} />
              </FormField>
              <FormField label="Hitpoints" info="The hitpoints of the placeable. This is used to determine if the placeable should be displayed in the hitpoints window.">
                <input type="number" min="0" value={hp} onChange={onUpdateWordField(setHP, 'hp')} />
              </FormField>
              <FormField label="Forititude Save" info="The forititude save of the placeable. This is used to determine if the placeable should be displayed in the forititude save window.">
                <input type="number" min="0" value={fort} onChange={onUpdateByteField(setFort, 'fort')} />
              </FormField>
              <FormField label="Reflex Save" info="The reflex save of the placeable. This is used to determine if the placeable should be displayed in the reflex save window.">
                <input type="number" min="0" value={ref} onChange={onUpdateByteField(setRef, 'ref')} />
              </FormField>
              <FormField label="Will Save" info="The will save of the placeable. This is used to determine if the placeable should be displayed in the will save window.">
                <input type="number" min="0" value={will} onChange={onUpdateByteField(setWill, 'will')} />
              </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'lock',
      label: 'Lock',
      headerIcon: 'fa-lock',
      headerTitle: 'Lock',
      content: (
        <>
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
              </tr>
              <tr>
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
        </>
      )
    },
    {
      id: 'advanced',
      label: 'Advanced',
      headerIcon: 'fa-gear',
      headerTitle: 'Advanced',
      content: (
        <>
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
                <td><input type="number" value={type} onChange={onUpdateByteField(setType, 't_type')} /></td>
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
        </>
      )
    },
    {
      id: 'scripts',
      label: 'Scripts',
      headerIcon: 'fa-code',
      headerTitle: 'Scripts',
      content: (
        <>
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
        </>
      )
    },
    {
      id: 'description',
      label: 'Description',
      headerIcon: 'fa-file-text',
      headerTitle: 'Description',
      content: (
        <>
          <InfoBubble content="The description text that appears when players examine this placeable. This can be localized for different languages and is what players see in the examine window." position="right">
            <label style={{ cursor: 'help' }}>Description</label>
          </InfoBubble>
          <CExoLocStringEditor value={description} onChange={onUpdateCExoLocStringField(setDescription, 'description')} />
        </>
      )
    },
    {
      id: 'comments',
      label: 'Comments',
      headerIcon: 'fa-comments',
      headerTitle: 'Comments',
      content: (
        <>
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Comments</label></td>
                <td><textarea value={comment} onChange={onUpdateCExoStringField(setComment, 'comment')} rows={5} /></td>
              </tr>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'trap',
      label: 'Trap',
      headerIcon: 'fa-bomb',
      headerTitle: 'Trap',
      content: (
        <>
          <table style={{width: '100%;'}}>
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
        </>
      )
    }
  ];
  return <>
    <SubTabHost
      tabs={tabs}
      defaultTab="basic"
      leftPanel={<UI3DRendererView context={tab.ui3DRenderer} />}
    />
  </>;

};