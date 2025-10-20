import React, { useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { TabUTDEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { SubTabHost, SubTab } from "../../SubTabHost";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";

export const TabUTDEditor = function(props: BaseTabProps){

  const tab: TabUTDEditorState = props.tab as TabUTDEditorState;

  // Basic tab
  const [name, setName] = useState<string>('');
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
  const [description, setDescription] = useState<string>('');

  // Comments tab
  const [comments, setComments] = useState<string>('');

  const loadDoorData = () => {
    if (!tab.moduleDoor) return;

    setName(tab.moduleDoor.getName());
    setTag(tab.moduleDoor.tag);
    setAppearance(tab.moduleDoor.appearance);
    setPlot(tab.moduleDoor.plot);
    setStatic(tab.moduleDoor.static);
    setHardness(tab.moduleDoor.hardness);
    setHitpoints(tab.moduleDoor.hp);
    setFort(tab.moduleDoor.fort);
    setRef(tab.moduleDoor.ref);
    setWill(tab.moduleDoor.will);

    setLocked(tab.moduleDoor.locked);
    setLockable(tab.moduleDoor.lockable);
    setAutoRemoveKey(tab.moduleDoor.autoRemoveKey);
    setKeyRequired(tab.moduleDoor.keyRequired);
    setOpenLockDC(tab.moduleDoor.openLockDC);
    setCloseLockDC(tab.moduleDoor.closeLockDC);
    setKeyName(tab.moduleDoor.keyName);

    setTemplateResRef(tab.moduleDoor.templateResRef);
    setFactionId(tab.moduleDoor.factionId || 0);
    setConversationResRef(tab.moduleDoor.conversation?.resref || '');
    setInterruptable(tab.moduleDoor.interruptable);
    setAnimationState(tab.moduleDoor.animationState);

    setOnClick(tab.moduleDoor.scripts.onClick?.name || '');
    setOnClosed(tab.moduleDoor.scripts.onClosed?.name || '');
    setOnDamaged(tab.moduleDoor.scripts.onDamaged?.name || '');
    setOnDeath(tab.moduleDoor.scripts.onDeath?.name || '');
    setOnDisarm(tab.moduleDoor.scripts.onDisarm?.name || '');
    setOnFailToOpen(tab.moduleDoor.scripts.onFailToOpen?.name || '');
    setOnHeartbeat(tab.moduleDoor.scripts.onHeartbeat?.name || '');
    setOnLock(tab.moduleDoor.scripts.onLock?.name || '');
    setOnMeleeAttacked(tab.moduleDoor.scripts.onMeleeAttacked?.name || '');
    setOnOpen(tab.moduleDoor.scripts.onOpen?.name || '');
    setOnSpellCastAt(tab.moduleDoor.scripts.onSpellCastAt?.name || '');
    setOnTrapTriggered(tab.moduleDoor.scripts.onTrapTriggered?.name || '');
    setOnUnlock(tab.moduleDoor.scripts.onUnlock?.name || '');
    setOnUserDefined(tab.moduleDoor.scripts.onUserDefined?.name || '');

    setDescription(tab.moduleDoor.description?.getValue() || '');
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
                  <td><input type="text" value={name} onChange={(e) => { setName(e.target.value); if(tab.moduleDoor) tab.moduleDoor.locName.setValue(e.target.value); }} /></td>
                </tr>
                <tr>
                  <td><label>Tag</label></td>
                  <td><input type="text" maxLength={16} value={tag} onChange={(e) => { setTag(e.target.value); if(tab.moduleDoor) tab.moduleDoor.tag = e.target.value; }} /></td>
                </tr>
                <tr>
                  <td><label>Door Type</label></td>
                  <td><input type="number" value={appearance} onChange={(e) => { setAppearance(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.appearance = Number(e.target.value); }} /></td>
                </tr>
                <tr>
                  <td><input type="checkbox" className="ui" checked={plot} onChange={(e) => { setPlot(e.target.checked); if(tab.moduleDoor) tab.moduleDoor.plot = e.target.checked; }} /><label>Plot Item</label></td>
                  <td><input type="checkbox" className="ui" checked={static_} onChange={(e) => { setStatic(e.target.checked); if(tab.moduleDoor) tab.moduleDoor.static = e.target.checked; }} /><label>Static</label></td>
                </tr>
                <tr>
                  <td><label>Hardness</label></td>
                  <td><input type="number" min="0" value={hardness} onChange={(e) => { setHardness(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.hardness = Number(e.target.value); }} /></td>
                </tr>
                <tr>
                  <td><label>Hitpoints</label></td>
                  <td><input type="number" min="0" value={hitpoints} onChange={(e) => { setHitpoints(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.hp = Number(e.target.value); }} /></td>
                </tr>
                <tr>
                  <td><label>Fortitude Save</label></td>
                  <td><input type="number" min="0" value={fort} onChange={(e) => { setFort(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.fort = Number(e.target.value); }} /></td>
                </tr>
                <tr>
                  <td><label>Reflex Save</label></td>
                  <td><input type="number" min="0" value={ref} onChange={(e) => { setRef(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.ref = Number(e.target.value); }} /></td>
                </tr>
                <tr>
                  <td><label>Will Save</label></td>
                  <td><input type="number" min="0" value={will} onChange={(e) => { setWill(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.will = Number(e.target.value); }} /></td>
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
                  <input type="checkbox" className="ui" checked={locked} onChange={(e) => { setLocked(e.target.checked); if(tab.moduleDoor) tab.moduleDoor.locked = e.target.checked; }} /><label className="checkbox-label">Locked</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" checked={lockable} onChange={(e) => { setLockable(e.target.checked); if(tab.moduleDoor) tab.moduleDoor.lockable = e.target.checked; }} /><label className="checkbox-label">Can be relocked</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" checked={autoRemoveKey} onChange={(e) => { setAutoRemoveKey(e.target.checked); if(tab.moduleDoor) tab.moduleDoor.autoRemoveKey = e.target.checked; }} /><label className="checkbox-label">Auto remove key after use</label>
                </td>
              </tr>
              <tr>
                <td>
                  <input type="checkbox" className="ui" checked={keyRequired} onChange={(e) => { setKeyRequired(e.target.checked); if(tab.moduleDoor) tab.moduleDoor.keyRequired = e.target.checked; }} /><label className="checkbox-label">Key required to unlock or lock</label>
                </td>
              </tr>
            </tbody>
          </table>
          <br />
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td><label>Open Lock DC</label></td>
                <td><input type="number" value={openLockDC} onChange={(e) => { setOpenLockDC(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.openLockDC = Number(e.target.value); }} /></td>
              </tr>
              <tr>
                <td><label>Close Lock DC</label></td>
                <td><input type="number" value={closeLockDC} onChange={(e) => { setCloseLockDC(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.closeLockDC = Number(e.target.value); }} /></td>
              </tr>
              <tr>
                <td><label>Key Name</label></td>
                <td><input type="text" maxLength={16} value={keyName} onChange={(e) => { setKeyName(e.target.value); if(tab.moduleDoor) tab.moduleDoor.keyName = e.target.value; }} /></td>
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
                <td><input type="number" value={factionId} onChange={(e) => { setFactionId(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.factionId = Number(e.target.value); }} /></td>
              </tr>
              <tr>
                <td><label>Conversation</label></td>
                <td>
                  <input type="text" maxLength={16} style={{width: 'auto'}} value={conversationResRef} readOnly />
                  <div className="ui-checkbox" style={{display: 'inline-block'}}>
                    <input type="checkbox" className="ui" checked={!interruptable} onChange={(e) => { setInterruptable(!e.target.checked); if(tab.moduleDoor) tab.moduleDoor.interruptable = !e.target.checked; }} />
                    <label>No Interrupt</label>
                  </div>
                </td>
              </tr>
              <tr>
                <td><label>Animation State</label></td>
                <td><input type="number" value={animationState} onChange={(e) => { setAnimationState(Number(e.target.value)); if(tab.moduleDoor) tab.moduleDoor.animationState = Number(e.target.value); }} /></td>
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
                  <td><input type="text" maxLength={16} value={onClick} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnClosed</label></td>
                  <td><input type="text" maxLength={16} value={onClosed} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnDamaged</label></td>
                  <td><input type="text" maxLength={16} value={onDamaged} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnDeath</label></td>
                  <td><input type="text" maxLength={16} value={onDeath} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnDisarm</label></td>
                  <td><input type="text" maxLength={16} value={onDisarm} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnFailToOpen</label></td>
                  <td><input type="text" maxLength={16} value={onFailToOpen} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnHeartbeat</label></td>
                  <td><input type="text" maxLength={16} value={onHeartbeat} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnLock</label></td>
                  <td><input type="text" maxLength={16} value={onLock} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnMeleeAttacked</label></td>
                  <td><input type="text" maxLength={16} value={onMeleeAttacked} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnOpen</label></td>
                  <td><input type="text" maxLength={16} value={onOpen} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnSpellCastAt</label></td>
                  <td><input type="text" maxLength={16} value={onSpellCastAt} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnTrapTriggered</label></td>
                  <td><input type="text" maxLength={16} value={onTrapTriggered} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnUnlock</label></td>
                  <td><input type="text" maxLength={16} value={onUnlock} readOnly /></td>
                </tr>
                <tr>
                  <td><label>OnUserDefined</label></td>
                  <td><input type="text" maxLength={16} value={onUserDefined} readOnly /></td>
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
          <textarea data-type="cexolocstring" value={description} onChange={(e) => { setDescription(e.target.value); if(tab.moduleDoor) tab.moduleDoor.description.setValue(e.target.value); }}></textarea>
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