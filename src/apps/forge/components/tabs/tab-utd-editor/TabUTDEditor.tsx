import React, { useState, useEffect, useCallback } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTDEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { SubTabHost, SubTab } from "../../SubTabHost";
import { CExoLocStringEditor } from "../../CExoLocStringEditor";
import * as KotOR from "../../../KotOR";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";
import { InfoBubble } from "../../info-bubble/info-bubble";
import { FormField } from "../../form-field/FormField";

export const TabUTDEditor = function(props: BaseTabProps){

  const tab: TabUTDEditorState = props.tab as TabUTDEditorState;

  // Basic tab
  const [locName, setLocName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [tag, setTag] = useState<string>('');
  const [appearance, setAppearance] = useState<number>(0);
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

  const loadDoorData = useCallback(() => {
    if (!tab.blueprint) return;

    setLocName(tab.locName);
    setTag(tab.tag);
    setAppearance(tab.appearance);
    setPlot(tab.plot);
    setStatic(tab.static);
    setHardness(tab.hardness);
    setHitpoints(tab.hp);
    setFort(tab.fort);
    setRef(tab.ref);
    setWill(tab.will);

    setLocked(tab.locked);
    setLockable(tab.lockable);
    setAutoRemoveKey(tab.autoRemoveKey);
    setKeyRequired(tab.keyRequired);
    setOpenLockDC(tab.openLockDC);
    setCloseLockDC(tab.closeLockDC);
    setKeyName(tab.keyName);

    setTemplateResRef(tab.templateResRef);
    setFactionId(tab.factionId || 0);
    setConversationResRef(tab.conversation);
    setInterruptable(tab.interruptable);
    setAnimationState(tab.animationState);

    setOnClick(tab.onClick);
    setOnClosed(tab.onClosed);
    setOnDamaged(tab.onDamaged);
    setOnDeath(tab.onDeath);
    setOnDisarm(tab.onDisarm);
    setOnFailToOpen(tab.onFailToOpen);
    setOnHeartbeat(tab.onHeartbeat);
    setOnLock(tab.onLock);
    setOnMeleeAttacked(tab.onMeleeAttacked);
    setOnOpen(tab.onOpen);
    setOnSpellCastAt(tab.onSpellCastAt);
    setOnTrapTriggered(tab.onTrapTriggered);
    setOnUnlock(tab.onUnlock);
    setOnUserDefined(tab.onUserDefined);

    setDescription(tab.description);
    setComments(''); // Comments not stored in door
  }, [tab]);

  const togglePlot = (value: boolean) => {
    setPlot(value);
    if(tab.blueprint) { tab.plot = value; tab.updateFile(); }
  }

  const toggleStatic = (value: boolean) => {
    setStatic(value);
    if(tab.blueprint) { tab.static = value; tab.updateFile(); }
  }

  const toggleLocked = (value: boolean) => {
    setLocked(value);
    if(tab.blueprint) { tab.locked = value; tab.updateFile(); }
  }

  const toggleLockable = (value: boolean) => {
    setLockable(value);
    if(tab.blueprint) { tab.lockable = value; tab.updateFile(); }
  }

  const toggleAutoRemoveKey = (value: boolean) => {
    setAutoRemoveKey(value);
    if(tab.blueprint) { tab.autoRemoveKey = value; tab.updateFile(); }
  }

  const toggleKeyRequired = (value: boolean) => {
    setKeyRequired(value);
    if(tab.blueprint) { tab.keyRequired = value; tab.updateFile(); }
  }

  const toggleInterruptable = (value: boolean) => {
    setInterruptable(value);
    if(tab.blueprint) { tab.interruptable = value; tab.updateFile(); }
  }

  useEffect(() => {
    if(!tab) return;
    loadDoorData(); // Load initial data if already loaded
    tab.addEventListener('onEditorFileLoad', loadDoorData);
    return () => {
      tab.removeEventListener('onEditorFileLoad', loadDoorData);
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
                    onChange={(newValue) => { setLocName(newValue); if(tab.blueprint) { tab.locName = newValue; tab.updateFile(); } }}
                  />
                </FormField>
                <FormField 
                  label="Tag" 
                  info="A unique identifier for this door/trigger. Used by scripts to reference this specific object. Must be unique within the module."
                >
                  <input type="text" placeholder="Enter tag" maxLength={32} value={tag} onChange={(e) => { setTag(e.target.value); if(tab.blueprint) { tab.tag = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="Door Type" 
                  info="The visual appearance type of the door. Different types have different models and animations. Check the game's door appearance list for valid values."
                >
                  <input type="number" min="0" value={appearance} onChange={(e) => { setAppearance(Number(e.target.value)); if(tab.blueprint) { tab.appearance = Number(e.target.value); tab.updateFile(); } }} />
                </FormField>
                <tr>
                  <td>
                    <InfoBubble content="If checked, this door/trigger is part of the main story and cannot be destroyed or bypassed by normal means." position="right">
                      <ForgeCheckbox label="Plot Item" value={plot} onChange={(value) => { togglePlot(value); }} />
                    </InfoBubble>
                  </td>
                  <td>
                    <InfoBubble content="If checked, this door/trigger cannot be moved, rotated, or modified by scripts or other game mechanics." position="right">
                      <ForgeCheckbox label="Static" value={static_} onChange={(value) => { toggleStatic(value); }} />
                    </InfoBubble>
                  </td>
                </tr>
                <FormField 
                  label="Hardness" 
                  info="The difficulty to damage this door/trigger. Higher values make it more resistant to physical attacks and spells."
                >
                  <input type="number" min="0" value={hardness} onChange={(e) => { setHardness(Number(e.target.value)); if(tab.blueprint) { tab.hardness = Number(e.target.value); tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="Hitpoints" 
                  info="The amount of damage this door/trigger can take before being destroyed. When reduced to 0, the object is destroyed."
                >
                  <input type="number" min="0" value={hitpoints} onChange={(e) => { setHitpoints(Number(e.target.value)); if(tab.blueprint) { tab.hp = Number(e.target.value); tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="Fortitude Save" 
                  info="The difficulty class for Fortitude saving throws against effects that target this door/trigger's physical constitution."
                >
                  <input type="number" min="0" value={fort} onChange={(e) => { setFort(Number(e.target.value)); if(tab.blueprint) { tab.fort = Number(e.target.value); tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="Reflex Save" 
                  info="The difficulty class for Reflex saving throws against effects that require quick reactions or dodging."
                >
                  <input type="number" min="0" value={ref} onChange={(e) => { setRef(Number(e.target.value)); if(tab.blueprint) { tab.ref = Number(e.target.value); tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="Will Save" 
                  info="The difficulty class for Will saving throws against mental effects, illusions, and mind-affecting spells."
                >
                  <input type="number" min="0" value={will} onChange={(e) => { setWill(Number(e.target.value)); if(tab.blueprint) { tab.will = Number(e.target.value); tab.updateFile(); } }} />
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
                    <ForgeCheckbox label="Locked" value={locked} onChange={(value) => { toggleLocked(value); }} />
                  </InfoBubble>
                </td>
              </tr>
              <tr>
                <td>
                  <InfoBubble content="If checked, this door/trigger can be locked again after being unlocked. If unchecked, it remains unlocked once opened." position="right">
                    <ForgeCheckbox label="Can be relocked" value={lockable} onChange={(value) => { toggleLockable(value); }} />
                  </InfoBubble>
                </td>
              </tr>
              <tr>
                <td>
                  <InfoBubble content="If checked, the key will be automatically removed from the player's inventory after successfully unlocking the door/trigger." position="right">
                    <ForgeCheckbox label="Auto remove key after use" value={autoRemoveKey} onChange={(value) => { toggleAutoRemoveKey(value); }} />
                  </InfoBubble>
                </td>
              </tr>
              <tr>
                <td>
                  <InfoBubble content="If checked, a key is required to both lock and unlock this door/trigger. If unchecked, it can be locked/unlocked without a key." position="right">
                    <ForgeCheckbox label="Key required to unlock or lock" value={keyRequired} onChange={(value) => { toggleKeyRequired(value); }} />
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
                <input type="number" min="0" value={openLockDC} onChange={(e) => { setOpenLockDC(Number(e.target.value)); if(tab.blueprint) { tab.openLockDC = Number(e.target.value); tab.updateFile(); } }} />
              </FormField>
              <FormField 
                label="Close Lock DC" 
                info="The difficulty class for lockpicking this door/trigger when it's unlocked but needs to be locked again."
              >
                <input type="number" min="0" value={closeLockDC} onChange={(e) => { setCloseLockDC(Number(e.target.value)); if(tab.blueprint) { tab.closeLockDC = Number(e.target.value); tab.updateFile(); } }} />
              </FormField>
              <FormField 
                label="Key Name" 
                info="The tag of the key item that can unlock this door/trigger. Must match the tag of an existing item in the module."
              >
                <input type="text" placeholder="Enter key tag" maxLength={16} value={keyName} onChange={(e) => { setKeyName(e.target.value); if(tab.blueprint) { tab.keyName = e.target.value; tab.updateFile(); } }} />
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
                <input type="number" min="0" value={factionId} onChange={(e) => { setFactionId(Number(e.target.value)); if(tab.blueprint) { tab.factionId = Number(e.target.value); tab.updateFile(); } }} />
              </FormField>
              <tr>
                <td>
                  <InfoBubble content="The conversation that plays when this door/trigger is interacted with. Leave empty for no conversation." position="right">
                    <label style={{ cursor: 'help' }}>Conversation</label>
                  </InfoBubble>
                </td>
                <td>
                  <input type="text" placeholder="Enter conversation resref" maxLength={16} style={{width: 'auto'}} value={conversationResRef} onChange={(e) => { setConversationResRef(e.target.value); if(tab.blueprint) { tab.conversation = e.target.value; tab.updateFile(); } }} />
                  <div className="ui-checkbox" style={{display: 'inline-block'}}>
                    <InfoBubble content="If checked, this conversation can be interrupted by combat or other events. If unchecked, the conversation must complete before other actions." position="right">
                      <ForgeCheckbox label="Interruptable" value={interruptable} onChange={(value) => { toggleInterruptable(value); }} />
                    </InfoBubble>
                  </div>
                </td>
              </tr>
              <FormField 
                label="Animation State" 
                info="The initial animation state of the door/trigger. Different states control how the door appears and behaves (open, closed, locked, etc.)."
              >
                <input type="number" min="0" value={animationState} onChange={(e) => { setAnimationState(Number(e.target.value)); if(tab.blueprint) { tab.animationState = Number(e.target.value); tab.updateFile(); } }} />
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
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onClick} onChange={(e) => { setOnClick(e.target.value); if(tab.blueprint) { tab.onClick = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnClosed" 
                  info="Script that runs when the door is closed. Useful for triggering events, playing sounds, or updating game state."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onClosed} onChange={(e) => { setOnClosed(e.target.value); if(tab.blueprint) { tab.onClosed = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnDamaged" 
                  info="Script that runs when the door/trigger takes damage. Can be used to trigger defensive mechanisms or destruction sequences."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onDamaged} onChange={(e) => { setOnDamaged(e.target.value); if(tab.blueprint) { tab.onDamaged = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnDeath" 
                  info="Script that runs when the door/trigger is destroyed or 'dies'. Often used for cleanup or triggering destruction effects."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onDeath} onChange={(e) => { setOnDeath(e.target.value); if(tab.blueprint) { tab.onDeath = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnDisarm" 
                  info="Script that runs when a trap on the door/trigger is successfully disarmed. Used for trap-related door mechanics."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onDisarm} onChange={(e) => { setOnDisarm(e.target.value); if(tab.blueprint) { tab.onDisarm = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnFailToOpen" 
                  info="Script that runs when a player attempts to open the door but fails (due to lock, insufficient skill, etc.)."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onFailToOpen} onChange={(e) => { setOnFailToOpen(e.target.value); if(tab.blueprint) { tab.onFailToOpen = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnHeartbeat" 
                  info="Script that runs periodically while the door/trigger is active. Useful for continuous monitoring or timed events."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onHeartbeat} onChange={(e) => { setOnHeartbeat(e.target.value); if(tab.blueprint) { tab.onHeartbeat = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnLock" 
                  info="Script that runs when the door/trigger is locked. Can be used to trigger security measures or update game state."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onLock} onChange={(e) => { setOnLock(e.target.value); if(tab.blueprint) { tab.onLock = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnMeleeAttacked" 
                  info="Script that runs when the door/trigger is attacked in melee combat. Useful for defensive responses or damage handling."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onMeleeAttacked} onChange={(e) => { setOnMeleeAttacked(e.target.value); if(tab.blueprint) { tab.onMeleeAttacked = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnOpen" 
                  info="Script that runs when the door is successfully opened. Often used for triggering events, playing sounds, or updating quest states."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onOpen} onChange={(e) => { setOnOpen(e.target.value); if(tab.blueprint) { tab.onOpen = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnSpellCastAt" 
                  info="Script that runs when a spell is cast at the door/trigger. Useful for magical interactions or spell-based door mechanics."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onSpellCastAt} onChange={(e) => { setOnSpellCastAt(e.target.value); if(tab.blueprint) { tab.onSpellCastAt = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnTrapTriggered" 
                  info="Script that runs when a trap on the door/trigger is activated. Used for trap effects and consequences."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onTrapTriggered} onChange={(e) => { setOnTrapTriggered(e.target.value); if(tab.blueprint) { tab.onTrapTriggered = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnUnlock" 
                  info="Script that runs when the door/trigger is successfully unlocked. Often used for triggering events or updating quest progress."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onUnlock} onChange={(e) => { setOnUnlock(e.target.value); if(tab.blueprint) { tab.onUnlock = e.target.value; tab.updateFile(); } }} />
                </FormField>
                <FormField 
                  label="OnUserDefined" 
                  info="A custom script event that can be triggered by other scripts or game events. Useful for custom door behaviors and interactions."
                >
                  <input type="text" placeholder="Enter script name" maxLength={16} value={onUserDefined} onChange={(e) => { setOnUserDefined(e.target.value); if(tab.blueprint) { tab.onUserDefined = e.target.value; tab.updateFile(); } }} />
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
            onChange={(newValue) => { 
              setDescription(newValue); 
              if(tab.blueprint) { tab.description = newValue; tab.updateFile(); } 
            }}
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
          <textarea placeholder="Enter comments" value={comments} rows={5} onChange={(e) => setComments(e.target.value)}></textarea>
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