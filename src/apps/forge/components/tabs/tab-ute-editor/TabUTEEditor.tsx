import React, { useEffect, useState, useCallback } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { TabUTEEditorState } from "../../../states/tabs/TabUTEEditorState";
import { EncounterDifficulty } from "../../../interfaces/EncounterDifficulty";
import { CreatureListEntry } from "../../../interfaces/CreatureListEntry";
import * as KotOR from "../../../KotOR";
import { FormField } from "../../form-field/FormField";
import { CExoLocStringEditor } from "../../CExoLocStringEditor/CExoLocStringEditor";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";
import "../../../styles/tabs/tab-ute-editor.scss";
import { SubTab, SubTabHost } from "../../SubTabHost/SubTabHost";
import { createBooleanFieldHandler, createNumberFieldHandler, createResRefFieldHandler, createCExoStringFieldHandler, createCExoLocStringFieldHandler, createByteFieldHandler, createWordFieldHandler, createForgeCheckboxFieldHandler } from "../../../helpers/UTxEditorHelpers";

export const TabUTEEditor = function(props: BaseTabProps){
  const tab: TabUTEEditorState = props.tab as TabUTEEditorState;
  const [encounterDifficulties, setEncounterDifficulties] = useState<EncounterDifficulty[]>([]);

  const [active, setActive] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [creatureList, setCreatureList] = useState<CreatureListEntry[]>([]);
  const [difficultyIndex, setDifficultyIndex] = useState<number>(0);
  const [faction, setFaction] = useState<number>(0);
  const [localizedName, setLocalizedName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [maxCreatures, setMaxCreatures] = useState<number>(0);
  const [onEntered, setOnEntered] = useState<string>('');
  const [onExhausted, setOnExhausted] = useState<string>('');
  const [onExit, setOnExit] = useState<string>('');
  const [onHeartbeat, setOnHeartbeat] = useState<string>('');
  const [onUserDefined, setOnUserDefined] = useState<string>('');
  const [paletteID, setPaletteID] = useState<number>(0);
  const [playerOnly, setPlayerOnly] = useState<boolean>(false);
  const [recCreatures, setRecCreatures] = useState<number>(0);
  const [reset, setReset] = useState<boolean>(false);
  const [resetTime, setResetTime] = useState<number>(0);
  const [respawns, setRespawns] = useState<number>(0);
  const [spawnOption, setSpawnOption] = useState<number>(0);
  const [tag, setTag] = useState<string>('');
  const [templateResRef, setTemplateResRef] = useState<string>('');

  const onEncounterChange = useCallback(() => {
    setActive(tab.active);
    setComment(tab.comment);
    setCreatureList([...tab.creatureList]);
    setDifficultyIndex(tab.difficultyIndex);
    setFaction(tab.faction);
    setLocalizedName(tab.localizedName);
    setMaxCreatures(tab.maxCreatures);
    setOnEntered(tab.onEntered);
    setOnExhausted(tab.onExhausted);
    setOnExit(tab.onExit);
    setOnHeartbeat(tab.onHeartbeat);
    setOnUserDefined(tab.onUserDefined);
    setPaletteID(tab.paletteID);
    setPlayerOnly(tab.playerOnly);
    setRecCreatures(tab.recCreatures);
    setReset(tab.reset);
    setResetTime(tab.resetTime);
    setRespawns(tab.respawns);
    setSpawnOption(tab.spawnOption);
    setTag(tab.tag);
    setTemplateResRef(tab.templateResRef);
  }, [tab]);

  useEffect(() => {
    if(!tab) return;
    onEncounterChange();
    tab.addEventListener('onEditorFileChange', onEncounterChange);  
    tab.addEventListener('onEditorFileLoad', onEncounterChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEncounterChange);
      tab.removeEventListener('onEditorFileChange', onEncounterChange);
    };
  }, []);

  useEffect(() => {
    setEncounterDifficulties(tab.encounterDifficulties);
  }, [tab.encounterDifficulties]);

  // Helper functions using shared utilities
  const onUpdateNumberField = (setter: (value: number) => void, property: keyof TabUTEEditorState, parser: (value: number) => number = (v) => v) => 
    createNumberFieldHandler(setter, property, tab, parser);
  
  const onUpdateByteField = (setter: (value: number) => void, property: keyof TabUTEEditorState) => 
    createByteFieldHandler(setter, property, tab);
  
  const onUpdateWordField = (setter: (value: number) => void, property: keyof TabUTEEditorState) => 
    createWordFieldHandler(setter, property, tab);
  
  const updateBooleanField = (setter: (value: boolean) => void, property: keyof TabUTEEditorState) => 
    createBooleanFieldHandler(setter, property, tab);
  
  const onUpdateResRefField = (setter: (value: string) => void, property: keyof TabUTEEditorState) => 
    createResRefFieldHandler(setter, property, tab);
  
  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof TabUTEEditorState) => 
    createCExoStringFieldHandler(setter, property, tab);
  
  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof TabUTEEditorState) => 
    createCExoLocStringFieldHandler(setter, property, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof TabUTEEditorState) => 
    createForgeCheckboxFieldHandler(setter, property, tab);

  const onAddCreature = () => {
    const newCreature: CreatureListEntry = {
      appearance: 0,
      resref: '',
      cr: 0,
      singleSpawn: false
    };
    const updated = [...creatureList, newCreature];
    setCreatureList(updated);
    if(!tab) return;
    tab.creatureList = updated;
    tab.updateFile();
  }

  const onRemoveCreature = (index: number) => {
    const updated = creatureList.filter((_, i) => i !== index);
    setCreatureList(updated);
    if(!tab) return;
    tab.creatureList = updated;
    tab.updateFile();
  }

  const onUpdateCreature = (index: number, field: keyof CreatureListEntry, value: any) => {
    const updated = [...creatureList];
    updated[index] = { ...updated[index], [field]: value };
    setCreatureList(updated);
    if(!tab) return;
    tab.setProperty('creatureList', updated);
    tab.updateFile();
  }

  const tabs: SubTab[] = [
    {
      id: 'basic',
      label: 'Basic',
      headerIcon: 'fa-info-circle',
      headerTitle: 'Basic',
      content: (
        <>
          <table className="tab-ute-editor__table">
            <tbody>
              <FormField 
                label="Active" 
                info="Whether this encounter is currently active."
              >
                <ForgeCheckbox label="" value={active} onChange={onUpdateForgeCheckboxField(setActive, 'active')} />
              </FormField>
              <FormField
                label="Comment"
                info="Optional comment/notes about this encounter."
              >
                <textarea value={comment} onChange={onUpdateCExoStringField(setComment, 'comment')} className="tab-ute-editor__input" rows={2} />
              </FormField>
              <FormField
                label="Name"
                info="The localized display name for this encounter."
              >
                <CExoLocStringEditor 
                  value={localizedName}
                  onChange={onUpdateCExoLocStringField(setLocalizedName, 'localizedName')}
                />
              </FormField>
              <FormField
                label="Tag"
                info="A unique identifier for this encounter. Used by scripts to reference this specific object."
              >
                <input type="text" maxLength={32} value={tag} onChange={onUpdateResRefField(setTag, 'tag')} className="tab-ute-editor__input" />
              </FormField>
              <FormField
                label="Difficulty"
                info="The difficulty level of this encounter."
              >
                <select value={difficultyIndex} onChange={onUpdateNumberField(setDifficultyIndex, 'difficultyIndex')} className="tab-ute-editor__select">
                  {encounterDifficulties.map((diff, idx) => (
                    <option key={idx} value={idx}>{diff.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Faction"
                info="The faction ID that creatures in this encounter belong to."
              >
                <input type="number" value={faction} onChange={onUpdateNumberField(setFaction, 'faction')} className="tab-ute-editor__input" />
              </FormField>
              <FormField
                label="Max Creatures"
                info="Maximum number of creatures that can spawn from this encounter at once (1-8)."
              >
                <input 
                  type="number" 
                  min="1" 
                  max="8" 
                  value={maxCreatures} 
                  onChange={onUpdateNumberField(setMaxCreatures, 'maxCreatures')} 
                  className="tab-ute-editor__input"
                />
              </FormField>
              <FormField
                label="Recommended Creatures"
                info="Recommended number of creatures for this encounter (1-8). Maps to 'Min Creatures' in toolset. Must be less than or equal to Max Creatures."
              >
                <input 
                  type="number" 
                  min="1" 
                  max="8" 
                  value={recCreatures} 
                  onChange={onUpdateNumberField(setRecCreatures, 'recCreatures')} 
                  className="tab-ute-editor__input"
                />
              </FormField>
              <FormField
                label="Palette ID"
                info="The palette ID used for creature spawning appearance."
              >
                <input type="number" value={paletteID} onChange={onUpdateByteField(setPaletteID, 'paletteID')} className="tab-ute-editor__input" />
              </FormField>
              <FormField
                label="Spawn Option"
                info="0 = Continuous spawn (continuously evaluates and spawns as creatures die). 1 = Single-shot spawn (fires once when hostile creature enters)."
              >
                <select value={spawnOption} onChange={onUpdateByteField(setSpawnOption, 'spawnOption')} className="tab-ute-editor__select">
                  <option value={0}>Continuous Spawn</option>
                  <option value={1}>Single-Shot Spawn</option>
                </select>
              </FormField>
              <FormField
                label="Respawns"
                info="Number of times this encounter can respawn. Use -1 for unlimited respawns. Maximum 32000."
              >
                <input 
                  type="number" 
                  min="-1" 
                  max="32000" 
                  value={respawns} 
                  onChange={onUpdateNumberField(setRespawns, 'respawns')} 
                  className="tab-ute-editor__input"
                />
              </FormField>
              <FormField
                label="Reset"
                info="Whether this encounter resets after all creatures are defeated."
              >
                <ForgeCheckbox label="" value={reset} onChange={onUpdateForgeCheckboxField(setReset, 'reset')} />
              </FormField>
              <FormField
                label="Reset Time"
                info="Time in seconds before the encounter resets (if Reset is enabled). Maximum 32000 seconds."
              >
                <input 
                  type="number" 
                  min="0" 
                  max="32000" 
                  value={resetTime} 
                  onChange={onUpdateNumberField(setResetTime, 'resetTime')} 
                  className="tab-ute-editor__input"
                />
              </FormField>
              <FormField
                label="Player Only"
                info="Whether this encounter only spawns creatures when the player is nearby."
              >
                <ForgeCheckbox label="" value={playerOnly} onChange={onUpdateForgeCheckboxField(setPlayerOnly, 'playerOnly')} />
              </FormField>
              <FormField
                label="Template ResRef"
                info="For blueprints, this should match the filename of the UTE file. Used to reference the blueprint."
              >
                <input 
                  type="text" 
                  maxLength={16} 
                  value={templateResRef} 
                  disabled={true}
                  onChange={onUpdateResRefField(setTemplateResRef, 'templateResRef')} 
                  placeholder="Enter ResRef (16 chars max)"
                  className="tab-ute-editor__input-monospace"
                />
              </FormField>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'creatures',
      label: 'Creatures',
      headerIcon: 'fa-users',
      headerTitle: 'Creatures',
      content: (
        <>
          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td colSpan={2}>
                  <div className="tab-ute-editor__creature-list-header">
                    <strong className="tab-ute-editor__creature-list-label">Creature List</strong>
                    <button 
                      onClick={onAddCreature} 
                      className="tab-ute-editor__button-add"
                    >
                      Add Creature
                    </button>
                  </div>
                  {creatureList.length === 0 ? (
                    <div className="tab-ute-editor__creature-list-empty">No creatures in list. Click "Add Creature" to add one.</div>
                  ) : (
                    <table className="tab-ute-editor__creature-table">
                      <thead>
                        <tr>
                          <th>ResRef</th>
                          <th>Appearance</th>
                          <th>CR</th>
                          <th>Single Spawn</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creatureList.map((creature, index) => (
                          <tr key={index}>
                            <td>
                              <input 
                                type="text" 
                                maxLength={16} 
                                value={creature.resref} 
                                onChange={(e) => onUpdateCreature(index, 'resref', e.target.value)}
                                className="tab-ute-editor__creature-input"
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={creature.appearance} 
                                onChange={(e) => onUpdateCreature(index, 'appearance', parseInt(e.target.value) || 0)}
                                className="tab-ute-editor__creature-input"
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="0.1"
                                value={creature.cr} 
                                onChange={(e) => onUpdateCreature(index, 'cr', parseFloat(e.target.value) || 0)}
                                className="tab-ute-editor__creature-input"
                              />
                            </td>
                            <td className="tab-ute-editor__creature-table-cell--center">
                              <input 
                                type="checkbox" 
                                checked={creature.singleSpawn} 
                                onChange={(e) => onUpdateCreature(index, 'singleSpawn', e.target.checked)}
                                className="tab-ute-editor__creature-checkbox"
                              />
                            </td>
                            <td>
                              <button 
                                onClick={() => onRemoveCreature(index)}
                                className="tab-ute-editor__button-remove"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
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
      headerIcon: 'fa-file-code',
      headerTitle: 'Scripts',
      content: (
        <>
          <table style={{width: '100%'}}>
            <tbody>
              <FormField
                label="OnEntered"
                info="CResRef of script to execute when a creature enters the encounter area (16 characters max)."
              >
                <input 
                  type="text" 
                  maxLength={16} 
                  value={onEntered} 
                  onChange={onUpdateResRefField(setOnEntered, 'onEntered')} 
                  placeholder="Script ResRef"
                  className="tab-ute-editor__input-monospace"
                />
              </FormField>
              <FormField
                label="OnExhausted"
                info="CResRef of script to execute when the encounter is exhausted (all creatures defeated) (16 characters max)."
              >
                <input 
                  type="text" 
                  maxLength={16} 
                  value={onExhausted} 
                  onChange={onUpdateResRefField(setOnExhausted, 'onExhausted')} 
                  placeholder="Script ResRef"
                  className="tab-ute-editor__input-monospace"
                />
              </FormField>
              <FormField
                label="OnExit"
                info="CResRef of script to execute when a creature exits the encounter area (16 characters max)."
              >
                <input 
                  type="text" 
                  maxLength={16} 
                  value={onExit} 
                  onChange={onUpdateResRefField(setOnExit, 'onExit')} 
                  placeholder="Script ResRef"
                  className="tab-ute-editor__input-monospace"
                />
              </FormField>
              <FormField
                label="OnHeartbeat"
                info="CResRef of script to execute on each heartbeat/update cycle (16 characters max)."
              >
                <input 
                  type="text" 
                  maxLength={16} 
                  value={onHeartbeat} 
                  onChange={onUpdateResRefField(setOnHeartbeat, 'onHeartbeat')} 
                  placeholder="Script ResRef"
                  className="tab-ute-editor__input-monospace"
                />
              </FormField>
              <FormField
                label="OnUserDefined"
                info="CResRef of script to execute on user-defined events (16 characters max)."
              >
                <input 
                  type="text" 
                  maxLength={16} 
                  value={onUserDefined} 
                  onChange={onUpdateResRefField(setOnUserDefined, 'onUserDefined')} 
                  placeholder="Script ResRef"
                  className="tab-ute-editor__input-monospace"
                />
              </FormField>
            </tbody>
          </table>
        </>
      )
    }
  ];

  return (
    <>
      <SubTabHost
        tabs={tabs}
        defaultTab="basic"
      />
    </>
  );
};