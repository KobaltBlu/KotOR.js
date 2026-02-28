import React, { useState, useEffect, useCallback } from "react"

import { CExoLocStringEditor } from "@/apps/forge/components/CExoLocStringEditor";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { FormField } from "@/apps/forge/components/form-field/FormField";
import { InfoBubble } from "@/apps/forge/components/info-bubble/info-bubble";
import { SubTabHost, SubTab } from "@/apps/forge/components/SubTabHost";
import { UI3DRendererView } from "@/apps/forge/components/UI3DRendererView";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps"
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeDoor } from "@/apps/forge/module-editor/ForgeDoor";
import { TabUTDEditorState } from "@/apps/forge/states/tabs";

export const TabUTDEditor = function(props: BaseTabProps){

  const tab: TabUTDEditorState = props.tab as TabUTDEditorState;

  // Basic tab
  const [locName, setLocName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [tag, setTag] = useState<string>('');
  const [genericType, setGenericType] = useState<number>(0);
  const [plot, setPlot] = useState<boolean>(false);
  const [static_, setStatic] = useState<boolean>(false);
  const [hardness, setHardness] = useState<number>(0);
  const [hitpoints, setHitpoints] = useState<number>(0);
  const [fort, setFort] = useState<number>(0);
  const [ref, setRef] = useState<number>(0);
  const [will, setWill] = useState<number>(0);

  // Lock tab
  const [locked, setLocked] = useState<boolean>(false);
  const [lockable, setLockable] = useState<boolean>(false);
  const [autoRemoveKey, setAutoRemoveKey] = useState<boolean>(false);
  const [keyRequired, setKeyRequired] = useState<boolean>(false);
  const [openLockDC, setOpenLockDC] = useState<number>(0);
  const [closeLockDC, setCloseLockDC] = useState<number>(0);
  const [keyName, setKeyName] = useState<string>('');

  // Advanced tab
  const [templateResRef, setTemplateResRef] = useState<string>('');
  const [factionId, setFactionId] = useState<number>(0);
  const [conversationResRef, setConversationResRef] = useState<string>('');
  const [interruptable, setInterruptable] = useState<boolean>(false);
  const [animationState, setAnimationState] = useState<number>(0);

  // Scripts tab
  const [onClick, setOnClick] = useState<string>('');
  const [onClosed, setOnClosed] = useState<string>('');
  const [onDamaged, setOnDamaged] = useState<string>('');
  const [onDeath, setOnDeath] = useState<string>('');
  const [onDisarm, setOnDisarm] = useState<string>('');
  const [onFailToOpen, setOnFailToOpen] = useState<string>('');
  const [onHeartbeat, setOnHeartbeat] = useState<string>('');
  const [onLock, setOnLock] = useState<string>('');
  const [onMeleeAttacked, setOnMeleeAttacked] = useState<string>('');
  const [onOpen, setOnOpen] = useState<string>('');
  const [onSpellCastAt, setOnSpellCastAt] = useState<string>('');
  const [onTrapTriggered, setOnTrapTriggered] = useState<string>('');
  const [onUnlock, setOnUnlock] = useState<string>('');
  const [onUserDefined, setOnUserDefined] = useState<string>('');

  // Description tab
  const [description, setDescription] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());

  // Comments tab
  const [comments, setComments] = useState<string>('');

  const [loadingModel, setLoadingModel] = useState<boolean>(false);

  const loadDoorData = useCallback(() => {
    if (!tab.door || !tab.blueprint) return;

    setLocName(tab.door.locName);
    setTag(tab.door.tag);
    setGenericType(tab.door.genericType);
    setPlot(tab.door.plot);
    setStatic(tab.door.static);
    setHardness(tab.door.hardness);
    setHitpoints(tab.door.hp);
    setFort(tab.door.fort);
    setRef(tab.door.ref);
    setWill(tab.door.will);

    setLocked(tab.door.locked);
    setLockable(tab.door.lockable);
    setAutoRemoveKey(tab.door.autoRemoveKey);
    setKeyRequired(tab.door.keyRequired);
    setOpenLockDC(tab.door.openLockDC);
    setCloseLockDC(tab.door.closeLockDC);
    setKeyName(tab.door.keyName);

    setTemplateResRef(tab.door.templateResRef);
    setFactionId(tab.door.factionId || 0);
    setConversationResRef(tab.door.conversation);
    setInterruptable(tab.door.interruptable);
    setAnimationState(tab.door.animationState);

    setOnClick(tab.door.onClick);
    setOnClosed(tab.door.onClosed);
    setOnDamaged(tab.door.onDamaged);
    setOnDeath(tab.door.onDeath);
    setOnDisarm(tab.door.onDisarm);
    setOnFailToOpen(tab.door.onFailToOpen);
    setOnHeartbeat(tab.door.onHeartbeat);
    setOnLock(tab.door.onLock);
    setOnMeleeAttacked(tab.door.onMeleeAttacked);
    setOnOpen(tab.door.onOpen);
    setOnSpellCastAt(tab.door.onSpellCastAt);
    setOnTrapTriggered(tab.door.onTrapTriggered);
    setOnUnlock(tab.door.onUnlock);
    setOnUserDefined(tab.door.onUserDefined);

    setDescription(tab.door.description);
    setComments(tab.door.comment || ''); // Comments stored in door.comment
    setLoadingModel(tab.door.modelLoading);
  }, [tab]);

  // Helper functions using ForgeDoor methods
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof ForgeDoor, parser: (value: number) => number = (v) => v) => 
    tab.door.createNumberFieldHandler(setter, property, tab.door, tab, parser);
  
  const _onUpdateByteField = (setter: (value: number) => void, property: keyof ForgeDoor) => 
    tab.door.createByteFieldHandler(setter, property, tab.door, tab);
  
  const _onUpdateWordField = (setter: (value: number) => void, property: keyof ForgeDoor) => 
    tab.door.createWordFieldHandler(setter, property, tab.door, tab);
  
  const _onUpdateBooleanField = (setter: (value: boolean) => void, property: keyof ForgeDoor) => 
    tab.door.createBooleanFieldHandler(setter, property, tab.door, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof ForgeDoor) => 
    tab.door.createResRefFieldHandler(setter, property, tab.door, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof ForgeDoor) => 
    tab.door.createCExoStringFieldHandler(setter, property, tab.door, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof ForgeDoor) => 
    tab.door.createCExoLocStringFieldHandler(setter, property, tab.door, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof ForgeDoor) => 
    tab.door.createForgeCheckboxFieldHandler(setter, property, tab.door, tab);

  const onModelChange = useCallback(() => {
    setLoadingModel(tab.door.modelLoading);
  }, [tab]);

  useEffect(() => {
    if(!tab) return;
    loadDoorData(); // Load initial data if already loaded
    tab.addEventListener('onEditorFileLoad', loadDoorData);
    tab.addEventListener('onEditorFileChange', loadDoorData);
    tab.addEventListener('onModelChange', onModelChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', loadDoorData);
      tab.removeEventListener('onEditorFileChange', loadDoorData);
      tab.removeEventListener('onModelChange', onModelChange);
    };
  }, []);

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
                <FormField 
                  label="Name" 
                  info="The display name of the door/trigger. This is what players will see in-game and can be localized for different languages."
                >
                  <CExoLocStringEditor 
                    value={locName}
                    onChange={onUpdateCExoLocStringField(setLocName, 'locName')}
                  />
                </FormField>
                <FormField 
                  label="Tag" 
                  info="A unique identifier for this door/trigger. Used by scripts to reference this specific object. Must be unique within the module."
                >
                  <input type="text" placeholder="Enter tag" maxLength={32} value={tag} onChange={onUpdateResRefField(setTag, 'tag')} />
                </FormField>
                <FormField 
                  label="Door Type" 
                  info="The visual appearance type of the door. Different types have different models and animations. Check the game's door appearance list for valid values."
                >
                  <input type="number" min="0" disabled={loadingModel} value={genericType} onChange={onUpdateNumberField(setGenericType, 'genericType')} />
                </FormField>
                <tr>
                  <td>
                    <InfoBubble content="If checked, this door/trigger is part of the main story and cannot be destroyed or bypassed by normal means." position="right">
                      <ForgeCheckbox label="Plot Item" value={plot} onChange={onUpdateForgeCheckboxField(setPlot, 'plot')} />
                    </InfoBubble>
                  </td>
                  <td>
                    <InfoBubble content="If checked, this door/trigger cannot be moved, rotated, or modified by scripts or other game mechanics." position="right">
                      <ForgeCheckbox label="Static" value={static_} onChange={onUpdateForgeCheckboxField(setStatic, 'static')} />
                    </InfoBubble>
                  </td>
                </tr>
                <FormField 
                  label="Hardness" 
                  info="The difficulty to damage this door/trigger. Higher values make it more resistant to physical attacks and spells."
                >
                  <input type="number" min="0" value={hardness} onChange={onUpdateNumberField(setHardness, 'hardness')} />
                </FormField>
                <FormField 
                  label="Hitpoints" 
                  info="The amount of damage this door/trigger can take before being destroyed. When reduced to 0, the object is destroyed."
                >
                  <input type="number" min="0" value={hitpoints} onChange={onUpdateNumberField(setHitpoints, 'hp')} />
                </FormField>
                <FormField 
                  label="Fortitude Save" 
                  info="The difficulty class for Fortitude saving throws against effects that target this door/trigger's physical constitution."
                >
                  <input type="number" min="0" value={fort} onChange={onUpdateNumberField(setFort, 'fort')} />
                </FormField>
                <FormField 
                  label="Reflex Save" 
                  info="The difficulty class for Reflex saving throws against effects that require quick reactions or dodging."
                >
                  <input type="number" min="0" value={ref} onChange={onUpdateNumberField(setRef, 'ref')} />
                </FormField>
                <FormField 
                  label="Will Save" 
                  info="The difficulty class for Will saving throws against mental effects, illusions, and mind-affecting spells."
                >
                  <input type="number" min="0" value={will} onChange={onUpdateNumberField(setWill, 'will')} />
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
                  <InfoBubble content="If checked, this door/trigger starts in a locked state and requires a key or lockpicking to open." position="right">
                    <ForgeCheckbox label="Locked" value={locked} onChange={onUpdateForgeCheckboxField(setLocked, 'locked')} />
                  </InfoBubble>
                </td>
              </tr>
              <tr>
                <td>
                  <InfoBubble content="If checked, this door/trigger can be locked again after being unlocked. If unchecked, it remains unlocked once opened." position="right">
                    <ForgeCheckbox label="Can be relocked" value={lockable} onChange={onUpdateForgeCheckboxField(setLockable, 'lockable')} />
                  </InfoBubble>
                </td>
              </tr>
              <tr>
                <td>
                  <InfoBubble content="If checked, the key will be automatically removed from the player's inventory after successfully unlocking the door/trigger." position="right">
                    <ForgeCheckbox label="Auto remove key after use" value={autoRemoveKey} onChange={onUpdateForgeCheckboxField(setAutoRemoveKey, 'autoRemoveKey')} />
                  </InfoBubble>
                </td>
              </tr>
              <tr>
                <td>
                  <InfoBubble content="If checked, a key is required to both lock and unlock this door/trigger. If unchecked, it can be locked/unlocked without a key." position="right">
                    <ForgeCheckbox label="Key required to unlock or lock" value={keyRequired} onChange={onUpdateForgeCheckboxField(setKeyRequired, 'keyRequired')} />
                  </InfoBubble>
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <FormField 
                label="Open Lock DC" 
                info="The difficulty class for lockpicking this door/trigger when it's locked. Higher values make it more difficult to pick."
              >
                <input type="number" min="0" value={openLockDC} onChange={onUpdateNumberField(setOpenLockDC, 'openLockDC')} />
              </FormField>
              <FormField 
                label="Close Lock DC" 
                info="The difficulty class for lockpicking this door/trigger when it's unlocked but needs to be locked again."
              >
                <input type="number" min="0" value={closeLockDC} onChange={onUpdateNumberField(setCloseLockDC, 'closeLockDC')} />
              </FormField>
              <FormField 
                label="Key Name" 
                info="The tag of the key item that can unlock this door/trigger. Must match the tag of an existing item in the module."
              >
                <input type="text" placeholder="Enter key tag" maxLength={16} value={keyName} onChange={onUpdateResRefField(setKeyName, 'keyName')} />
              </FormField>
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
          <table style={{width: '100%;'}}>
            <tbody>
              <FormField 
                label="Blueprint ResRef" 
                info="The resource reference of this door/trigger's blueprint template. This is read-only and cannot be changed."
              >
                <input type="text" value={templateResRef} disabled />
              </FormField>
              <FormField 
                label="Faction" 
                info="The faction ID that this door/trigger belongs to. Used for determining hostile/friendly status and AI behavior."
              >
                <input type="number" min="0" value={factionId} onChange={onUpdateNumberField(setFactionId, 'factionId')} />
              </FormField>
              <tr>
                <td>
                  <InfoBubble content="The conversation that plays when this door/trigger is interacted with. Leave empty for no conversation." position="right">
                    <label style={{ cursor: 'help' }}>Conversation</label>
                  </InfoBubble>
                </td>
                <td>
                  <input type="text" placeholder="Enter conversation resref" maxLength={16} style={{width: 'auto'}} value={conversationResRef} onChange={onUpdateResRefField(setConversationResRef, 'conversation')} />
                  <div className="ui-checkbox" style={{display: 'inline-block'}}>
                    <InfoBubble content="If checked, this conversation can be interrupted by combat or other events. If unchecked, the conversation must complete before other actions." position="right">
                      <ForgeCheckbox label="Interruptable" value={interruptable} onChange={onUpdateForgeCheckboxField(setInterruptable, 'interruptable')} />
                    </InfoBubble>
                  </div>
                </td>
              </tr>
              <FormField 
                label="Animation State" 
                info="The initial animation state of the door/trigger. Different states control how the door appears and behaves (open, closed, locked, etc.)."
              >
                <input type="number" min="0" value={animationState} onChange={onUpdateNumberField(setAnimationState, 'animationState')} />
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
          <table style={{width: '100%;'}}>
            <tbody>
                <FormField 
                  label="OnClick" 
                  info="Script that runs when the door/trigger is clicked or activated by the player. This is the primary interaction script."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onClick} onChange={onUpdateResRefField(setOnClick, 'onClick')} />
                </FormField>
                <FormField 
                  label="OnClosed" 
                  info="Script that runs when the door is closed. Useful for triggering events, playing sounds, or updating game state."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onClosed} onChange={onUpdateResRefField(setOnClosed, 'onClosed')} />
                </FormField>
                <FormField 
                  label="OnDamaged" 
                  info="Script that runs when the door/trigger takes damage. Can be used to trigger defensive mechanisms or destruction sequences."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onDamaged} onChange={onUpdateResRefField(setOnDamaged, 'onDamaged')} />
                </FormField>
                <FormField 
                  label="OnDeath" 
                  info="Script that runs when the door/trigger is destroyed or 'dies'. Often used for cleanup or triggering destruction effects."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onDeath} onChange={onUpdateResRefField(setOnDeath, 'onDeath')} />
                </FormField>
                <FormField 
                  label="OnDisarm" 
                  info="Script that runs when a trap on the door/trigger is successfully disarmed. Used for trap-related door mechanics."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onDisarm} onChange={onUpdateResRefField(setOnDisarm, 'onDisarm')} />
                </FormField>
                <FormField 
                  label="OnFailToOpen" 
                  info="Script that runs when a player attempts to open the door but fails (due to lock, insufficient skill, etc.)."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onFailToOpen} onChange={onUpdateResRefField(setOnFailToOpen, 'onFailToOpen')} />
                </FormField>
                <FormField 
                  label="OnHeartbeat" 
                  info="Script that runs periodically while the door/trigger is active. Useful for continuous monitoring or timed events."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onHeartbeat} onChange={onUpdateResRefField(setOnHeartbeat, 'onHeartbeat')} />
                </FormField>
                <FormField 
                  label="OnLock" 
                  info="Script that runs when the door/trigger is locked. Can be used to trigger security measures or update game state."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onLock} onChange={onUpdateResRefField(setOnLock, 'onLock')} />
                </FormField>
                <FormField 
                  label="OnMeleeAttacked" 
                  info="Script that runs when the door/trigger is attacked in melee combat. Useful for defensive responses or damage handling."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onMeleeAttacked} onChange={onUpdateResRefField(setOnMeleeAttacked, 'onMeleeAttacked')} />
                </FormField>
                <FormField 
                  label="OnOpen" 
                  info="Script that runs when the door is successfully opened. Often used for triggering events, playing sounds, or updating quest states."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onOpen} onChange={onUpdateResRefField(setOnOpen, 'onOpen')} />
                </FormField>
                <FormField 
                  label="OnSpellCastAt" 
                  info="Script that runs when a spell is cast at the door/trigger. Useful for magical interactions or spell-based door mechanics."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onSpellCastAt} onChange={onUpdateResRefField(setOnSpellCastAt, 'onSpellCastAt')} />
                </FormField>
                <FormField 
                  label="OnTrapTriggered" 
                  info="Script that runs when a trap on the door/trigger is activated. Used for trap effects and consequences."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onTrapTriggered} onChange={onUpdateResRefField(setOnTrapTriggered, 'onTrapTriggered')} />
                </FormField>
                <FormField 
                  label="OnUnlock" 
                  info="Script that runs when the door/trigger is successfully unlocked. Often used for triggering events or updating quest progress."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onUnlock} onChange={onUpdateResRefField(setOnUnlock, 'onUnlock')} />
                </FormField>
                <FormField 
                  label="OnUserDefined" 
                  info="A custom script event that can be triggered by other scripts or game events. Useful for custom door behaviors and interactions."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onUserDefined} onChange={onUpdateResRefField(setOnUserDefined, 'onUserDefined')} />
                </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'description',
      label: 'Description',
      headerIcon: 'fa-file-lines',
      headerTitle: 'Description',
      content: (
        <>
          <InfoBubble content="The description text that appears when players examine this door/trigger. This can be localized for different languages and is what players see in the examine window." position="right">
            <label style={{ cursor: 'help' }}>Description</label>
          </InfoBubble>
          <CExoLocStringEditor 
            value={description}
            onChange={onUpdateCExoLocStringField(setDescription, 'description')}
          />
        </>
      )
    },
    {
      id: 'comments',
      label: 'Comments',
      headerIcon: 'fa-comment',
      headerTitle: 'Comments',
      content: (
        <>
          <InfoBubble content="Developer notes and comments about this door/trigger. These are not visible to players and are only for your reference during development." position="right">
            <label style={{ cursor: 'help' }}>Comments</label>
          </InfoBubble>
          <textarea placeholder="Enter comments" value={comments} rows={5} onChange={onUpdateCExoStringField(setComments, 'comment')}></textarea>
        </>
      )
    }
  ];

  return (
    <SubTabHost
      tabs={tabs}
      defaultTab="basic"
      leftPanel={<UI3DRendererView context={tab.ui3DRenderer} />}
    />
  );

};