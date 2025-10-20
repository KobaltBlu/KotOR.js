import React, { useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTDEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { SubTabHost, SubTab } from "../../SubTabHost";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { CExoLocStringEditor } from "../../CExoLocStringEditor";
import * as KotOR from "../../../KotOR";

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

  const loadDoorData = () => {
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
  };

  useEffectOnce(() => {
    tab.addEventListener('onEditorFileLoad', loadDoorData);
    loadDoorData(); // Load initial data if already loaded
    return () => {
      tab.removeEventListener('onEditorFileLoad', loadDoorData);
    };
  });

  const tabs: SubTab[] = [
    {
      id: 'basic',
      label: 'Basic',
      content: (
        <>
          <h3><i className="fa-solid fa-info-circle"></i> Basic</h3>
          <hr />

          <table style={{width: '100%;'}}>
            <tbody>
                <tr>
                  <td><label>Name</label></td>
                  <td>
                    <CExoLocStringEditor 
                      value={locName}
                      onChange={(newValue) => { setLocName(newValue); if(tab.blueprint) { tab.locName = newValue; tab.updateFile(); } }}
                    />
                  </td>
                </tr>
                <tr>
                  <td><label>Tag</label></td>
                  <td><input type="text" maxLength={16} value={tag} onChange={(e) => { setTag(e.target.value); if(tab.blueprint) { tab.tag = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>Door Type</label></td>
                  <td><input type="number" value={appearance} onChange={(e) => { setAppearance(Number(e.target.value)); if(tab.blueprint) { tab.appearance = Number(e.target.value); tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><input type="checkbox" className="ui" checked={plot} onChange={(e) => { setPlot(e.target.checked); if(tab.blueprint) { tab.plot = e.target.checked; tab.updateFile(); } }} /><label>Plot Item</label></td>
                  <td><input type="checkbox" className="ui" checked={static_} onChange={(e) => { setStatic(e.target.checked); if(tab.blueprint) { tab.static = e.target.checked; tab.updateFile(); } }} /><label>Static</label></td>
                </tr>
                <tr>
                  <td><label>Hardness</label></td>
                  <td><input type="number" min="0" value={hardness} onChange={(e) => { setHardness(Number(e.target.value)); if(tab.blueprint) { tab.hardness = Number(e.target.value); tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>Hitpoints</label></td>
                  <td><input type="number" min="0" value={hitpoints} onChange={(e) => { setHitpoints(Number(e.target.value)); if(tab.blueprint) { tab.hp = Number(e.target.value); tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>Fortitude Save</label></td>
                  <td><input type="number" min="0" value={fort} onChange={(e) => { setFort(Number(e.target.value)); if(tab.blueprint) { tab.fort = Number(e.target.value); tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>Reflex Save</label></td>
                  <td><input type="number" min="0" value={ref} onChange={(e) => { setRef(Number(e.target.value)); if(tab.blueprint) { tab.ref = Number(e.target.value); tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>Will Save</label></td>
                  <td><input type="number" min="0" value={will} onChange={(e) => { setWill(Number(e.target.value)); if(tab.blueprint) { tab.will = Number(e.target.value); tab.updateFile(); } }} /></td>
                </tr>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'lock',
      label: 'Lock',
      content: (
        <>
          <h3><i className="fa-solid fa-lock"></i> Lock</h3>
          <hr />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td>
                  <input type="checkbox" className="ui" checked={locked} onChange={(e) => { setLocked(e.target.checked); if(tab.blueprint) { tab.locked = e.target.checked; tab.updateFile(); } }} /><label className="checkbox-label">Locked</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" checked={lockable} onChange={(e) => { setLockable(e.target.checked); if(tab.blueprint) { tab.lockable = e.target.checked; tab.updateFile(); } }} /><label className="checkbox-label">Can be relocked</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" checked={autoRemoveKey} onChange={(e) => { setAutoRemoveKey(e.target.checked); if(tab.blueprint) { tab.autoRemoveKey = e.target.checked; tab.updateFile(); } }} /><label className="checkbox-label">Auto remove key after use</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" checked={keyRequired} onChange={(e) => { setKeyRequired(e.target.checked); if(tab.blueprint) { tab.keyRequired = e.target.checked; tab.updateFile(); } }} /><label className="checkbox-label">Key required to unlock or lock</label>
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Open Lock DC</label></td>
                <td><input type="number" value={openLockDC} onChange={(e) => { setOpenLockDC(Number(e.target.value)); if(tab.blueprint) { tab.openLockDC = Number(e.target.value); tab.updateFile(); } }} /></td>
              </tr>
              <tr>
                <td><label>Close Lock DC</label></td>
                <td><input type="number" value={closeLockDC} onChange={(e) => { setCloseLockDC(Number(e.target.value)); if(tab.blueprint) { tab.closeLockDC = Number(e.target.value); tab.updateFile(); } }} /></td>
              </tr>
              <tr>
                <td><label>Key Name</label></td>
                <td><input type="text" maxLength={16} value={keyName} onChange={(e) => { setKeyName(e.target.value); if(tab.blueprint) { tab.keyName = e.target.value; tab.updateFile(); } }} /></td>
              </tr>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'advanced',
      label: 'Advanced',
      content: (
        <>
          <h3><i className="fa-solid fa-gear"></i> Advanced</h3>
          <hr />

          <table style={{width: '100%;'}}>
            <tbody>
              <tr>
                <td><label>Blueprint ResRef</label></td>
                <td><input type="text" value={templateResRef} disabled /></td>
              </tr>
              <tr>
                <td><label>Faction</label></td>
                <td><input type="number" value={factionId} onChange={(e) => { setFactionId(Number(e.target.value)); if(tab.blueprint) { tab.factionId = Number(e.target.value); tab.updateFile(); } }} /></td>
              </tr>
              <tr>
                <td><label>Conversation</label></td>
                <td>
                  <input type="text" maxLength={16} style={{width: 'auto'}} value={conversationResRef} onChange={(e) => { setConversationResRef(e.target.value); if(tab.blueprint) { tab.conversation = e.target.value; tab.updateFile(); } }} />
                  <div className="ui-checkbox" style={{display: 'inline-block'}}>
                    <input type="checkbox" className="ui" checked={!interruptable} onChange={(e) => { setInterruptable(!e.target.checked); if(tab.blueprint) { tab.interruptable = !e.target.checked; tab.updateFile(); } }} />
                    <label>No Interrupt</label>
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Animation State</label></td>
                <td><input type="number" value={animationState} onChange={(e) => { setAnimationState(Number(e.target.value)); if(tab.blueprint) { tab.animationState = Number(e.target.value); tab.updateFile(); } }} /></td>
              </tr>
            </tbody>
          </table>

        </>
      )
    },
    {
      id: 'scripts',
      label: 'Scripts',
      content: (
        <>
          <h3><i className="fa-solid fa-file-code"></i> Scripts</h3>
          <hr />
          <table style={{width: '100%;'}}>
            <tbody>
                <tr>
                  <td><label>OnClick</label></td>
                  <td><input type="text" maxLength={16} value={onClick} onChange={(e) => { setOnClick(e.target.value); if(tab.blueprint) { tab.onClick = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnClosed</label></td>
                  <td><input type="text" maxLength={16} value={onClosed} onChange={(e) => { setOnClosed(e.target.value); if(tab.blueprint) { tab.onClosed = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnDamaged</label></td>
                  <td><input type="text" maxLength={16} value={onDamaged} onChange={(e) => { setOnDamaged(e.target.value); if(tab.blueprint) { tab.onDamaged = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnDeath</label></td>
                  <td><input type="text" maxLength={16} value={onDeath} onChange={(e) => { setOnDeath(e.target.value); if(tab.blueprint) { tab.onDeath = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnDisarm</label></td>
                  <td><input type="text" maxLength={16} value={onDisarm} onChange={(e) => { setOnDisarm(e.target.value); if(tab.blueprint) { tab.onDisarm = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnFailToOpen</label></td>
                  <td><input type="text" maxLength={16} value={onFailToOpen} onChange={(e) => { setOnFailToOpen(e.target.value); if(tab.blueprint) { tab.onFailToOpen = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnHeartbeat</label></td>
                  <td><input type="text" maxLength={16} value={onHeartbeat} onChange={(e) => { setOnHeartbeat(e.target.value); if(tab.blueprint) { tab.onHeartbeat = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnLock</label></td>
                  <td><input type="text" maxLength={16} value={onLock} onChange={(e) => { setOnLock(e.target.value); if(tab.blueprint) { tab.onLock = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnMeleeAttacked</label></td>
                  <td><input type="text" maxLength={16} value={onMeleeAttacked} onChange={(e) => { setOnMeleeAttacked(e.target.value); if(tab.blueprint) { tab.onMeleeAttacked = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnOpen</label></td>
                  <td><input type="text" maxLength={16} value={onOpen} onChange={(e) => { setOnOpen(e.target.value); if(tab.blueprint) { tab.onOpen = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnSpellCastAt</label></td>
                  <td><input type="text" maxLength={16} value={onSpellCastAt} onChange={(e) => { setOnSpellCastAt(e.target.value); if(tab.blueprint) { tab.onSpellCastAt = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnTrapTriggered</label></td>
                  <td><input type="text" maxLength={16} value={onTrapTriggered} onChange={(e) => { setOnTrapTriggered(e.target.value); if(tab.blueprint) { tab.onTrapTriggered = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnUnlock</label></td>
                  <td><input type="text" maxLength={16} value={onUnlock} onChange={(e) => { setOnUnlock(e.target.value); if(tab.blueprint) { tab.onUnlock = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
                <tr>
                  <td><label>OnUserDefined</label></td>
                  <td><input type="text" maxLength={16} value={onUserDefined} onChange={(e) => { setOnUserDefined(e.target.value); if(tab.blueprint) { tab.onUserDefined = e.target.value; tab.updateFile(); } }} /></td>
                </tr>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'description',
      label: 'Description',
      content: (
        <>
          <h3><i className="fa-solid fa-file-lines"></i> Description</h3>
          <hr />
          <label>Description</label>
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
      content: (
        <>
          <h3><i className="fa-solid fa-comment"></i> Comments</h3>
          <hr />
          <label>Comments</label>
          <textarea value={comments} onChange={(e) => setComments(e.target.value)}></textarea>
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