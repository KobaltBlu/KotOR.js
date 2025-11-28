import React, { useCallback, useEffect, useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { CreatureClassEntry, TabUTCEditorState } from "../../../states/tabs";
import { UI3DRendererView } from "../../UI3DRendererView";
import { SubTabHost, SubTab } from "../../SubTabHost";
import { createNumberFieldHandler, createBooleanFieldHandler, createResRefFieldHandler, createCExoStringFieldHandler, createCExoLocStringFieldHandler, createForgeCheckboxFieldHandler, createNumberArrayFieldHandler } from "../../../helpers/UTxEditorHelpers";
import * as KotOR from "../../../KotOR";
import { CExoLocStringEditor } from "../../CExoLocStringEditor";
import { ForgeCheckbox } from "../../forge-checkbox/forge-checkbox";
import { TextureCanvas } from "../../TextureCanvas/TextureCanvas";
import { ModalItemBrowserState } from "../../../states/modal/ModalItemBrowserState";
import { ForgeState } from "../../../states/ForgeState";
import { InfoBubble } from "../../info-bubble/info-bubble";
import './TabUTCEditor.scss';

export const TabUTCEditor = function(props: BaseTabProps){

  const tab: TabUTCEditorState = props.tab as TabUTCEditorState;

  const handleItemSlotClick = (slotType: KotOR.ModuleCreatureArmorSlot) => {
    const modal = new ModalItemBrowserState((item) => {
      console.log('Item selected:', item);
      // TODO: Update the slot with the selected item
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  };
  const [appearanceType, setAppearanceType] = useState<number>(0);
  const [bodyBag, setBodyBag] = useState<number>(0);
  const [bodyVariation, setBodyVariation] = useState<number>(0);
  const [cha, setCha] = useState<number>(10);
  const [challengeRating, setChallengeRating] = useState<number>(0);
  const [classList, setClassList] = useState<CreatureClassEntry[]>([]);
  const [comment, setComment] = useState<string>('');
  const [con, setCon] = useState<number>(10);
  const [conversation, setConversation] = useState<string>('');
  const [currentForce, setCurrentForce] = useState<number>(0);
  const [currentHitPoints, setCurrentHitPoints] = useState<number>(0);
  const [deity, setDeity] = useState<string>('');
  const [description, setDescription] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [dex, setDex] = useState<number>(10);
  const [disarmable, setDisarmable] = useState<boolean>(false);
  const [factionID, setFactionID] = useState<number>(0);
  const [featList, setFeatList] = useState<number[]>([]);
  const [firstName, setFirstName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [forcePoints, setForcePoints] = useState<number>(0);
  const [gender, setGender] = useState<number>(0);
  const [goodEvil, setGoodEvil] = useState<number>(50);
  const [hitPoints, setHitPoints] = useState<number>(0);
  const [int, setInt] = useState<number>(10);
  const [interruptable, setInterruptable] = useState<boolean>(true);
  const [isPC, setIsPC] = useState<boolean>(false);
  const [itemList, setItemList] = useState<string[]>([]);
  const [lastName, setLastName] = useState<KotOR.CExoLocString>(new KotOR.CExoLocString());
  const [lawfulChaotic, setLawfulChaotic] = useState<number>(0);
  const [maxHitPoints, setMaxHitPoints] = useState<number>(0);
  const [min1HP, setMin1HP] = useState<boolean>(false);
  const [naturalAC, setNaturalAC] = useState<number>(0);
  const [noPermDeath, setNoPermDeath] = useState<boolean>(false);
  const [notReorienting, setNotReorienting] = useState<boolean>(false);
  const [partyInteract, setPartyInteract] = useState<boolean>(false);
  const [perceptionRange, setPerceptionRange] = useState<number>(0);
  const [phenotype, setPhenotype] = useState<number>(0);
  const [plot, setPlot] = useState<boolean>(false);
  const [palletID, setPalletID] = useState<number>(0);
  const [portraitId, setPortraitId] = useState<number>(0);
  const [race, setRace] = useState<number>(0);
  const [scriptAttacked, setScriptAttacked] = useState<string>('');
  const [scriptDamaged, setScriptDamaged] = useState<string>('');
  const [scriptDeath, setScriptDeath] = useState<string>('');
  const [scriptDialogu, setScriptDialogu] = useState<string>('');
  const [scriptDisturbed, setScriptDisturbed] = useState<string>('');
  const [scriptEndDialogue, setScriptEndDialogue] = useState<string>('');
  const [scriptEndRound, setScriptEndRound] = useState<string>('');
  const [scriptHeartbeat, setScriptHeartbeat] = useState<string>('');
  const [scriptOnBlocked, setScriptOnBlocked] = useState<string>('');
  const [scriptOnNotice, setScriptOnNotice] = useState<string>('');
  const [scriptRested, setScriptRested] = useState<string>('');
  const [scriptSpawn, setScriptSpawn] = useState<string>('');
  const [scriptSpellAt, setScriptSpellAt] = useState<string>('');
  const [scriptUserDefined, setScriptUserDefined] = useState<string>('');
  const [skillList, setSkillList] = useState<number[]>([]);
  const [soundSetFile, setSoundSetFile] = useState<number>(0);
  const [str, setStr] = useState<number>(10);
  const [subrace, setSubrace] = useState<string>('');
  const [subraceIndex, setSubraceIndex] = useState<number>(0);
  const [tag, setTag] = useState<string>('');
  const [templateResRef, setTemplateResRef] = useState<string>('');
  const [textureVar, setTextureVar] = useState<number>(1);
  const [walkRate, setWalkRate] = useState<number>(7);
  const [wis, setWis] = useState<number>(10);
  const [fortbonus, setFortbonus] = useState<number>(0);
  const [refbonus, setRefbonus] = useState<number>(0);
  const [willbonus, setWillbonus] = useState<number>(0);

  // Equipment Slots
  const [slotArmor, setSlotArmor] = useState<string>('');
  const [slotBelt, setSlotBelt] = useState<string>('');
  const [slotClaw1, setSlotClaw1] = useState<string>('');
  const [slotClaw2, setSlotClaw2] = useState<string>('');
  const [slotClaw3, setSlotClaw3] = useState<string>('');
  const [slotHide, setSlotHide] = useState<string>('');
  const [slotLeftArmband, setSlotLeftArmband] = useState<string>('');
  const [slotLeftHand, setSlotLeftHand] = useState<string>('');
  const [slotRightArmband, setSlotRightArmband] = useState<string>('');
  const [slotRightHand, setSlotRightHand] = useState<string>('');
  const [slotRightHand2, setSlotRightHand2] = useState<string>('');
  const [slotLeftHand2, setSlotLeftHand2] = useState<string>('');
  const [slotImplant, setSlotImplant] = useState<string>('');
  const [slotHead, setSlotHead] = useState<string>('');
  const [slotArms, setSlotArms] = useState<string>('');

  const [feats, setFeats] = useState<KotOR.TalentFeat[]>([]);

  const onCreatureChange = useCallback(() => {
    setAppearanceType(tab.appearanceType);
    setBodyBag(tab.bodyBag);
    setBodyVariation(tab.bodyVariation);
    setCha(tab.cha);
    setChallengeRating(tab.challengeRating);
    setClassList([...tab.classList]);
    setComment(tab.comment);
    setCon(tab.con);
    setConversation(tab.conversation);
    setCurrentForce(tab.currentForce);
    setCurrentHitPoints(tab.currentHitPoints);
    setDeity(tab.deity);
    setDescription(tab.description);
    setDex(tab.dex);
    setDisarmable(tab.disarmable);
    setFactionID(tab.factionID);
    setFeatList([...tab.featList]);
    setFirstName(tab.firstName);
    setForcePoints(tab.forcePoints);
    setGender(tab.gender);
    setGoodEvil(tab.goodEvil);
    setHitPoints(tab.hitPoints);
    setInt(tab.int);
    setInterruptable(tab.interruptable);
    setIsPC(tab.isPC);
    setItemList([...tab.itemList]);
    setLastName(tab.lastName);
    setLawfulChaotic(tab.lawfulChaotic);
    setMaxHitPoints(tab.maxHitPoints);
    setMin1HP(tab.min1HP);
    setNaturalAC(tab.naturalAC);
    setNoPermDeath(tab.noPermDeath);
    setNotReorienting(tab.notReorienting);
    setPartyInteract(tab.partyInteract);
    setPerceptionRange(tab.perceptionRange);
    setPhenotype(tab.phenotype);
    setPlot(tab.plot);
    setPalletID(tab.palletID);
    setPortraitId(tab.portraitId);
    setRace(tab.race);
    setScriptAttacked(tab.scriptAttacked);
    setScriptDamaged(tab.scriptDamaged);
    setScriptDeath(tab.scriptDeath);
    setScriptDialogu(tab.scriptDialogu);
    setScriptDisturbed(tab.scriptDisturbed);
    setScriptEndDialogue(tab.scriptEndDialogue);
    setScriptEndRound(tab.scriptEndRound);
    setScriptHeartbeat(tab.scriptHeartbeat);
    setScriptOnBlocked(tab.scriptOnBlocked);
    setScriptOnNotice(tab.scriptOnNotice);
    setScriptRested(tab.scriptRested);
    setScriptSpawn(tab.scriptSpawn);
    setScriptSpellAt(tab.scriptSpellAt);
    setScriptUserDefined(tab.scriptUserDefined);
    setSkillList([...tab.skillList]);
    setSoundSetFile(tab.soundSetFile);
    setStr(tab.str);
    setSubrace(tab.subrace);
    setSubraceIndex(tab.subraceIndex);
    setTag(tab.tag);
    setTemplateResRef(tab.templateResRef);
    setTextureVar(tab.textureVar);
    setWalkRate(tab.walkRate);
    setWis(tab.wis);
    setFortbonus(tab.fortbonus);
    setRefbonus(tab.refbonus);
    setWillbonus(tab.willbonus);

    // Equipment Slots
    setSlotArmor(tab.slotArmor);
    setSlotBelt(tab.slotBelt);
    setSlotClaw1(tab.slotClaw1);
    setSlotClaw2(tab.slotClaw2);
    setSlotClaw3(tab.slotClaw3);
    setSlotHide(tab.slotHide);
    setSlotLeftArmband(tab.slotLeftArmband);
    setSlotLeftHand(tab.slotLeftHand);
    setSlotRightArmband(tab.slotRightArmband);
    setSlotRightHand(tab.slotRightHand);
    setSlotRightHand2(tab.slotRightHand2);
    setSlotLeftHand2(tab.slotLeftHand2);
    setSlotImplant(tab.slotImplant);
    setSlotHead(tab.slotHead);
    setSlotArms(tab.slotArms);
  }, [tab]);

  useEffect(() => {
    if(!tab) return;
    setFeats(KotOR.SWRuleSet.feats.filter(feat => feat.label != '' && feat.prereqFeat2 == -1 && feat.prereqFeat1 == -1));
    onCreatureChange();
    tab.addEventListener('onEditorFileLoad', onCreatureChange);
    tab.addEventListener('onEditorFileChange', onCreatureChange);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onCreatureChange);
      tab.removeEventListener('onEditorFileChange', onCreatureChange);
    };
  }, []);

  const onUpdateNumberField = (setter: (value: number) => void, property: keyof TabUTCEditorState, parser: (value: number) => number = (v) => v) => 
    createNumberFieldHandler(setter, property, tab, parser);

  const onUpdateNumberArrayField = (setter: (value: number[]) => void, index: number, property: keyof TabUTCEditorState) => 
    createNumberArrayFieldHandler(setter, index, property, tab);

  const onUpdateBooleanField = (setter: (value: boolean) => void, property: keyof TabUTCEditorState) => 
    createBooleanFieldHandler(setter, property, tab);

  const onUpdateResRefField = (setter: (value: string) => void, property: keyof TabUTCEditorState) => 
    createResRefFieldHandler(setter, property, tab);

  const onUpdateCExoStringField = (setter: (value: string) => void, property: keyof TabUTCEditorState) => 
    createCExoStringFieldHandler(setter, property, tab);

  const onUpdateCExoLocStringField = (setter: (value: KotOR.CExoLocString) => void, property: keyof TabUTCEditorState) => 
    createCExoLocStringFieldHandler(setter, property, tab);

  const onUpdateForgeCheckboxField = (setter: (value: boolean) => void, property: keyof TabUTCEditorState) => 
    createForgeCheckboxFieldHandler(setter, property, tab);

  const hasPrereqFeat = (feat: KotOR.TalentFeat) => {
    const hasPrereqFeat1 = feat.prereqFeat1 >= 0 ? featList.includes(feat.prereqFeat1) : true;
    const hasPrereqFeat2 = feat.prereqFeat2 >= 0 ? featList.includes(feat.prereqFeat2) : true;
    return hasPrereqFeat1 && hasPrereqFeat2;
  }

  const onFeatClick = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const feat = KotOR.SWRuleSet.feats[index];
    if(!feat) return;

    const wasEnabled = featList.includes(index);
    const idx = featList.indexOf(index);
    const updated: number[] = [...featList];

    //remove the feat from the list if it already exists
    if(idx >= 0){
      updated.splice(idx, 1);
    }

    //add the feat to the list if it doesn't exist and has met the prerequisites
    if(!wasEnabled && hasPrereqFeat(feat)){
      updated.push(index);
    }

    //remove child feats if the feat is disabled
    if(wasEnabled){
      if(feat.nextFeat){
        const idx = updated.indexOf(feat.nextFeat.id);
        if(idx >= 0){
          updated.splice(idx, 1);
        }
      }
      if(feat.nextFeat?.nextFeat){
        const idx = updated.indexOf(feat.nextFeat.nextFeat.id);
        if(idx >= 0){
          updated.splice(idx, 1);
        }
      }
    }

    setFeatList(updated);
    tab.setProperty('featList', updated.sort((a, b) => a - b));
    tab.updateFile();
  };

  const tabs: SubTab[] = [
    {
      id: 'basic',
      label: 'Basic',
      headerIcon: 'fa-user',
      headerTitle: 'Basic',
      content: (
        <>
          <fieldset>
            <legend>Personal</legend>
            <table>
              <tbody>
                  <tr>
                    <td><label>First Name</label></td>
                    <td>
                      <CExoLocStringEditor
                        value={firstName}
                        onChange={onUpdateCExoLocStringField(setFirstName, 'firstName')}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td><label>Last Name</label></td>
                    <td>
                      <CExoLocStringEditor
                        value={lastName}
                        onChange={onUpdateCExoLocStringField(setLastName, 'lastName')}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td><label>Tag</label></td>
                    <td><input type="text" maxLength={16} value={tag} onChange={onUpdateResRefField(setTag, 'tag')} /></td>
                  </tr>
                  <tr>
                    <td><label>Race</label></td>
                    <td><select className="form-select" value={race} onChange={onUpdateNumberField(setRace, 'race')}></select></td>
                  </tr>
                  <tr>
                    <td><label>Appearance</label></td>
                    <td><select className="form-select" value={appearanceType} onChange={onUpdateNumberField(setAppearanceType, 'appearanceType')}></select></td>
                  </tr>
                  <tr>
                    <td><label>Phenotype</label></td>
                    <td><select className="form-select" value={phenotype} onChange={onUpdateNumberField(setPhenotype, 'phenotype')}></select></td>
                  </tr>
                  <tr>
                    <td><label>Gender</label></td>
                    <td><select className="form-select" value={gender} onChange={onUpdateNumberField(setGender, 'gender')}></select></td>
                  </tr>
                  <tr>
                    <td><label>Description</label></td>
                    <td><CExoLocStringEditor
                        value={description}
                        onChange={onUpdateCExoLocStringField(setDescription, 'description')}
                      /></td>
                  </tr>
                  <tr>
                    <td><label>BodyBag</label></td>
                    <td><select className="form-select" value={bodyBag} onChange={onUpdateNumberField(setBodyBag, 'bodyBag')}></select></td>
                  </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset>
            <legend>Portrait</legend>
            <select className="form-select" value={portraitId} onChange={onUpdateNumberField(setPortraitId, 'portraitId')}></select>
          </fieldset>

          <fieldset>
            <legend>Conversation</legend>
            <table style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td><input type="text" value={conversation} onChange={onUpdateResRefField(setConversation, 'conversation')} /></td>
                  <td><ForgeCheckbox label="No Interrupt" value={interruptable} onChange={onUpdateForgeCheckboxField(setInterruptable, 'interruptable')} /></td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </>
      )
    },
    {
      id: 'stats',
      label: 'Stats',
      headerIcon: 'fa-chart-bar',
      headerTitle: 'Stats',
      content: (
        <>
          <fieldset>
            <legend>Ability Scores</legend>
            <table style={{width: '100%'}}>
              <thead>
                <tr>
                  <th></th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><label>Strength</label></td>
                  <td><input type="number" min="0" value={str} onChange={onUpdateNumberField(setStr, 'str')} /></td>
                </tr>

                <tr>
                  <td><label>Dexterity</label></td>
                  <td><input type="number" min="0" value={dex} onChange={onUpdateNumberField(setDex, 'dex')} /></td>
                </tr>

                <tr>
                  <td><label>Constitution</label></td>
                  <td><input type="number" min="0" value={con} onChange={onUpdateNumberField(setCon, 'con')} /></td>
                </tr>

                <tr>
                  <td><label>Intelligence</label></td>
                  <td><input type="number" min="0" value={int} onChange={onUpdateNumberField(setInt, 'int')} /></td>
                </tr>

                <tr>
                  <td><label>Wisdom</label></td>
                  <td><input type="number" min="0" value={wis} onChange={onUpdateNumberField(setWis, 'wis')} /></td>
                </tr>

                <tr>
                  <td><label>Charisma</label></td>
                  <td><input type="number" min="0" value={cha} onChange={onUpdateNumberField(setCha, 'cha')} /></td>
                </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset>
            <legend>Saves</legend>
            <table style={{width: '100%'}}>
              <thead>
                <tr>
                  <th></th>
                  <th>Bonus</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><label>Fortitude</label></td>
                  <td><input type="number" min="0" value={fortbonus} onChange={onUpdateNumberField(setFortbonus, 'fortbonus')} /></td>
                </tr>
                <tr>
                  <td><label>Reflex</label></td>
                  <td><input type="number" min="0" value={refbonus} onChange={onUpdateNumberField(setRefbonus, 'refbonus')} /></td>
                </tr>
                <tr>
                  <td><label>Will</label></td>
                  <td><input type="number" min="0" value={willbonus} onChange={onUpdateNumberField(setWillbonus, 'willbonus')} /></td>
                </tr>
              </tbody>
            </table>
          </fieldset>
          
          <table>
            <tr>
              <td style={{width: '50%'}}>
                <fieldset>
                  <legend>Armor Class</legend>
                  <label>Natural AC</label>
                  <input type="number" min="0" value={naturalAC} onChange={onUpdateNumberField(setNaturalAC, 'naturalAC')} />
                </fieldset>
                <fieldset>
                  <legend>Speed</legend>
                  <label>Movement Rate</label>
                  <select className="form-select" value={walkRate} onChange={onUpdateNumberField(setWalkRate, 'walkRate')}></select>
                </fieldset>
              </td>
              <td style={{width: '50%'}}>
                <fieldset>
                  <legend>Hit Points</legend>
                  <label>Base Hit Points</label>
                  <input type="number" min="0" value={hitPoints} onChange={onUpdateNumberField(setHitPoints, 'hitPoints')} />
      
                  <label>Current Hit Points</label>
                  <input type="number" min="0" value={currentHitPoints} onChange={onUpdateNumberField(setCurrentHitPoints, 'currentHitPoints')} />
      
                  <label>Max Hit Points</label>
                  <input type="number" min="0" value={maxHitPoints} onChange={onUpdateNumberField(setMaxHitPoints, 'maxHitPoints')} />
                </fieldset>
              </td>
            </tr>
          </table>
        </>
      )
    },
    {
      id: 'skills',
      label: 'Skills',
      headerIcon: 'fa-wrench',
      headerTitle: 'Skills',
      content: (
        <>
          <label>Computer Use</label>
          <input type="number" min="0" value={skillList[0]} onChange={onUpdateNumberArrayField(setSkillList, 0, 'skillList')} />

          <label>Demolitions</label>
          <input type="number" min="0" value={skillList[1]} onChange={onUpdateNumberArrayField(setSkillList, 1, 'skillList')} />

          <label>Stealth</label>
          <input type="number" min="0" value={skillList[2]} onChange={onUpdateNumberArrayField(setSkillList, 2, 'skillList')} />

          <label>Awareness</label>
          <input type="number" min="0" value={skillList[3]} onChange={onUpdateNumberArrayField(setSkillList, 3, 'skillList')} />

          <label>Persuade</label>
          <input type="number" min="0" value={skillList[4]} onChange={onUpdateNumberArrayField(setSkillList, 4, 'skillList')} />

          <label>Repair</label>
          <input type="number" min="0" value={skillList[5]} onChange={onUpdateNumberArrayField(setSkillList, 5, 'skillList')} />

          <label>Security</label>
          <input type="number" min="0" value={skillList[6]} onChange={onUpdateNumberArrayField(setSkillList, 6, 'skillList')} />

          <label>Treat Injury</label>
          <input type="number" min="0" value={skillList[7]} onChange={onUpdateNumberArrayField(setSkillList, 7, 'skillList')} />
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
            </tbody>
          </table>

          <fieldset>
            <legend>Interface</legend>
            <table style={{width: '100%'}}>
              <tbody>
                <tr>
                  <td><label>Disarmable</label></td>
                  <td><ForgeCheckbox label="Disarmable" value={disarmable} onChange={onUpdateForgeCheckboxField(setDisarmable, 'disarmable')} /></td>
                </tr>
                <tr>
                  <td><label>Plot</label></td>
                  <td><ForgeCheckbox label="Plot" value={plot} onChange={onUpdateForgeCheckboxField(setPlot, 'plot')} /></td>
                </tr>
                <tr>
                  <td><label>No Permanent Death</label></td>
                  <td><ForgeCheckbox label="No Permanent Death" value={noPermDeath} onChange={onUpdateForgeCheckboxField(setNoPermDeath, 'noPermDeath')} /></td>
                </tr>
                <tr>
                  <td><label>Is PC</label></td>
                  <td><ForgeCheckbox label="Is PC" value={isPC} onChange={onUpdateForgeCheckboxField(setIsPC, 'isPC')} /></td>
                </tr>
                <tr>
                  <td><label>Minimum 1 HP</label></td>
                  <td><ForgeCheckbox label="Minimum 1 HP" value={min1HP} onChange={onUpdateForgeCheckboxField(setMin1HP, 'min1HP')} /></td>
                </tr>
                <tr>
                  <td><label>Subrace</label></td>
                  <td><select className="form-select" value={subraceIndex} onChange={onUpdateNumberField(setSubraceIndex, 'subraceIndex')}></select></td>
                </tr>
              </tbody>
            </table>
          </fieldset>

          <table style={{width: '100%'}}>
            <tbody>
              <tr>
                <td>
                  <fieldset>
                    <legend>Challenge Rating</legend>
                    <input type="number" value={challengeRating} onChange={onUpdateNumberField(setChallengeRating, 'challengeRating')} />
                  </fieldset>
                </td>
                <td>
                  <fieldset>
                    <legend>Sound Set</legend>
                    <select className="form-select" value={soundSetFile} onChange={onUpdateNumberField(setSoundSetFile, 'soundSetFile')}></select>
                  </fieldset>
                </td>
              </tr>
              <tr>
                <td>
                  <fieldset>
                    <legend>Faction</legend>
                    <select className="form-select" value={factionID} onChange={onUpdateNumberField(setFactionID, 'factionID')}></select>
                  </fieldset>
                </td>
                <td>
                  <fieldset>
                    <legend>Perception Range</legend>
                    <select className="form-select" value={perceptionRange} onChange={onUpdateNumberField(setPerceptionRange, 'perceptionRange')}></select>
                  </fieldset>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'feats',
      label: 'Feats',
      headerIcon: 'fa-trophy',
      headerTitle: 'Feats',
      content: (
        <>
          <div className="feats">
            {feats.map((feat, index) => (
              <div 
                className="feat-row"
                key={`feat-${feat.id}`} 
              >
                <div className={`feat-icon ${featList.includes(feat.id) ? 'enabled' : 'disabled'}`} onClick={onFeatClick(feat.id)}>
                  <InfoBubble
                    content={feat.label}
                    position="right"
                  >
                    <TextureCanvas texture={feat.icon} width={32} height={32} />
                  </InfoBubble>
                </div>

                {feat.nextFeat ? (
                  <>
                    <TextureCanvas texture={`lbl_skarr`} width={32} height={32} />
                    <div className={`feat-icon ${featList.includes(feat.nextFeat.id) ? 'enabled' : 'disabled'}`} onClick={onFeatClick(feat.nextFeat.id)}>
                      <InfoBubble
                        content={feat.nextFeat.label}
                        position="right"
                      >
                        <TextureCanvas texture={feat.nextFeat.icon} width={32} height={32} />
                      </InfoBubble>
                    </div>
                  </>
                ) : (
                <>
                  <div className="blank-icon" />
                  <div className="blank-icon" />
                </>)
                }

                {feat.nextFeat?.nextFeat ? (
                  <>
                    <TextureCanvas texture={`lbl_skarr`} width={32} height={32} />
                    <div className={`feat-icon ${featList.includes(feat.nextFeat.nextFeat.id) ? 'enabled' : 'disabled'}`} onClick={onFeatClick(feat.nextFeat.nextFeat.id)}>
                      <InfoBubble
                        content={feat.nextFeat.nextFeat.label}
                        position="right"
                      >
                        <TextureCanvas texture={feat.nextFeat.nextFeat.icon} width={32} height={32} />
                      </InfoBubble>
                    </div>
                  </>
                ) : (
                <>
                  <div className="blank-icon" />
                  <div className="blank-icon" />
                </>)
                }
              </div>
            ))}
          </div>
        </>
      )
    },
    {
      id: 'spells',
      label: 'Force Powers',
      headerIcon: 'fa-hand-sparkles',
      headerTitle: 'Force Powers',
      content: (
        <>
          
        </>
      )
    },
    {
      id: 'class',
      label: 'Class',
      headerIcon: 'fa-user-graduate',
      headerTitle: 'Class',
      content: (
        <>
          
        </>
      )
    },
    {
      id: 'abilities',
      label: 'Special Abilities',
      headerIcon: 'fa-star',
      headerTitle: 'Special Abilities',
      content: (
        <>
          
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
              <tr>
                <td><label>Attacked</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptAttacked} onChange={onUpdateResRefField(setScriptAttacked, 'scriptAttacked')} /></td>
              </tr>
              <tr>
                <td><label>Damaged</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptDamaged} onChange={onUpdateResRefField(setScriptDamaged, 'scriptDamaged')} /></td>
              </tr>
              <tr>
                <td><label>Death</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptDeath} onChange={onUpdateResRefField(setScriptDeath, 'scriptDeath')} /></td>
              </tr>
              <tr>
                <td><label>Dialogue</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptDialogu} onChange={onUpdateResRefField(setScriptDialogu, 'scriptDialogu')} /></td>
              </tr>
              <tr>
                <td><label>Disturbed</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptDisturbed} onChange={onUpdateResRefField(setScriptDisturbed, 'scriptDisturbed')} /></td>
              </tr>
              <tr>
                <td><label>End Dialogue</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptEndDialogue} onChange={onUpdateResRefField(setScriptEndDialogue, 'scriptEndDialogue')} /></td>
              </tr>
              <tr>
                <td><label>End Round</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptEndRound} onChange={onUpdateResRefField(setScriptEndRound, 'scriptEndRound')} /></td>
              </tr>
              <tr>
                <td><label>Heartbeat</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptHeartbeat} onChange={onUpdateResRefField(setScriptHeartbeat, 'scriptHeartbeat')} /></td>
              </tr>
              <tr>
                <td><label>On Blocked</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptOnBlocked} onChange={onUpdateResRefField(setScriptOnBlocked, 'scriptOnBlocked')} /></td>
              </tr>
              <tr>
                <td><label>On Notice</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptOnNotice} onChange={onUpdateResRefField(setScriptOnNotice, 'scriptOnNotice')} /></td>
              </tr>
              <tr>
                <td><label>Rested</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptRested} onChange={onUpdateResRefField(setScriptRested, 'scriptRested')} /></td>
              </tr>
              <tr>
                <td><label>Spawn</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptSpawn} onChange={onUpdateResRefField(setScriptSpawn, 'scriptSpawn')} /></td>
              </tr>
              <tr>
                <td><label>Spell At</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptSpellAt} onChange={onUpdateResRefField(setScriptSpellAt, 'scriptSpellAt')} /></td>
              </tr>
              <tr>
                <td><label>User Define</label></td>
                <td><input type="text" placeholder="Script ResRef" value={scriptUserDefined} onChange={onUpdateResRefField(setScriptUserDefined, 'scriptUserDefined')} /></td>
              </tr>
            </tbody>
          </table>
        </>
      )
    },
    {
      id: 'inventory',
      label: 'Inventory',
      headerIcon: 'fa-suitcase',
      headerTitle: 'Inventory',
      content: (
        <>
          <div className="iSlots">
            <TextureCanvas texture={`${race == 5 ? 'idimplant' : 'iimplant'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.IMPLANT)} />
            <TextureCanvas texture={`${race == 5 ? 'idhead' : 'ihead'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.HEAD)} />
            <TextureCanvas texture={`${race == 5 ? 'idhands' : 'ihands'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.ARMS)} />
            <TextureCanvas texture={`${race == 5 ? 'idforearm_l' : 'iforearm_l'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.LEFTARMBAND)} />
            <TextureCanvas texture={`${race == 5 ? 'idarmor' : 'iarmor'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.ARMOR)} />
            <TextureCanvas texture={`${race == 5 ? 'idforearm_r' : 'iforearm_r'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.RIGHTARMBAND)} />
            <TextureCanvas texture={`${race == 5 ? 'idweap_l' : 'ihand_l'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.LEFTHAND)} />
            <TextureCanvas texture={`${race == 5 ? 'idbelt' : 'ibelt'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.BELT)} />
            <TextureCanvas texture={`${race == 5 ? 'idweap_r' : 'ihand_r'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.RIGHTHAND)} />
          </div>
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
          <textarea value={comment} onChange={onUpdateCExoStringField(setComment, 'comment')} rows={5} />
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