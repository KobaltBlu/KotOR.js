import React, { useCallback, useEffect, useState } from "react"
import { BaseTabProps } from "../../../interfaces/BaseTabProps"
import { CreatureClassEntry, KnownSpellEntry, SpecialAbilityEntry, TabUTCEditorState } from "../../../states/tabs";
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
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  const [specialAbilities, setSpecialAbilities] = useState<SpecialAbilityEntry[]>([]);

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
  const [spells, setSpells] = useState<KotOR.TalentSpell[]>([]);
  const [specialAbilitiesList, setSpecialAbilitiesList] = useState<KotOR.TalentSpell[]>([]);
  const [classes, setClasses] = useState<KotOR.CreatureClass[]>([]);
  const [creatureClass, setCreatureClass] = useState<number>(0);
  const [creatureLevel, setCreatureLevel] = useState<number>(1);
  const [knownList0, setKnownList0] = useState<KnownSpellEntry[]>([]);
  const [appearanceList, setAppearanceList] = useState<KotOR.CreatureAppearance[]>([]);
  const [raceList, setRaceList] = useState<KotOR.SWRace[]>([]);

  const [portrait, setPortrait] = useState<KotOR.SWPortrait>(new KotOR.SWPortrait());

  useEffect(() => {
    if(!portraitId) return;
    setPortrait(KotOR.SWRuleSet.portraits[portraitId]);
  }, [portraitId]);

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
    setSpecialAbilities(tab.specAbilityList);

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

    // Update classList state
    if(tab.classList[0]){
      setCreatureClass(tab.classList[0].class);
      setCreatureLevel(tab.classList[0].level);
      setKnownList0(tab.classList[0].knownList0);
    }
  }, [tab]);

  useEffect(() => {
    if(!tab) return;
    setFeats(KotOR.SWRuleSet.feats.filter(feat => feat.label != '' && feat.prereqFeat2 == -1 && feat.prereqFeat1 == -1));
    setSpells(KotOR.SWRuleSet.spells.filter(spell => spell.userType == 1 && spell.prerequisites.length == 0));
    setSpecialAbilitiesList(KotOR.SWRuleSet.spells.filter(spell => spell.userType == 2 && spell.prerequisites.length == 0));
    setClasses(KotOR.SWRuleSet.classes.slice());
    setAppearanceList(Array.from(KotOR.AppearanceManager.appearances.values()));
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

  const onUpdateClassListField = (setter: (value: number) => void, property: 'class' | 'level') => {
    return (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
      const raw = parseInt(e.target.value) || 0;
      setter(raw);
      if(tab.classList[0]){
        const updated = [...tab.classList];
        updated[0] = { ...updated[0], [property]: raw };
        tab.setProperty('classList', updated);
        tab.updateFile();
      }
    };
  };

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

  const onSpellClick = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const spell = KotOR.SWRuleSet.spells[index];
    if(!spell) return;

    const spellList = classList[0].knownList0;

    const wasEnabled = spellList.find(spell => spell.spell == index);
    const idx = spellList.findIndex(spell => spell.spell == index);
    const updated: KnownSpellEntry[] = [...spellList];

    //remove the feat from the list if it already exists
    if(idx >= 0){
      updated.splice(idx, 1);
    }

    const hasPrereq = spell.prerequisites.length == 0 || spell.prerequisites.map(id => spellList.find(s => s.spell == id)).every(has => has);

    //add the feat to the list if it doesn't exist and has met the prerequisites
    if(!wasEnabled && hasPrereq){
      updated.push({
        spell: index,
        spellMetaMagic: 0,
        spellFlags: 0,
      });
    }

    //remove child feats if the feat is disabled
    if(wasEnabled){
      if(spell.nextSpell){
        const idx = updated.findIndex(s => s.spell == spell.nextSpell.id);
        if(idx >= 0){
          updated.splice(idx, 1);
        }
      }
      if(spell.nextSpell?.nextSpell){
        const idx = updated.findIndex(s => s.spell == spell.nextSpell.nextSpell.id);
        if(idx >= 0){
          updated.splice(idx, 1);
        }
      }
    }

    setKnownList0(updated);
    tab.classList[0].knownList0 = updated;
    tab.updateFile();
  };

  const onSpecialAbilityClick = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const specialAbility = KotOR.SWRuleSet.spells[index];
    if(!specialAbility) return;

    const wasEnabled = specialAbilities.find(s => s.spell == index);
    const idx = specialAbilities.findIndex(s => s.spell == index);
    const updated: SpecialAbilityEntry[] = [...specialAbilities];

    //remove the feat from the list if it already exists
    if(idx >= 0){
      updated.splice(idx, 1);
    }

    const hasPrereq = specialAbility.prerequisites.length == 0 || specialAbility.prerequisites.map(id => specialAbilities.find(s => s.spell == id)).every(has => has);

    //add the feat to the list if it doesn't exist and has met the prerequisites
    if(!wasEnabled && hasPrereq){
      updated.push({
        spell: index,
        spellCasterLevel: 1,
        spellFlags: 0,
      });
    }

    //remove child feats if the feat is disabled
    if(wasEnabled){
      if(specialAbility.nextSpell){
        const idx = updated.findIndex(s => s.spell == specialAbility.nextSpell.id);
        if(idx >= 0){
          updated.splice(idx, 1);
        }
      }
      if(specialAbility.nextSpell?.nextSpell){
        const idx = updated.findIndex(s => s.spell == specialAbility.nextSpell.nextSpell.id);
        if(idx >= 0){
          updated.splice(idx, 1);
        }
      }
    }

    setSpecialAbilities(updated);
    tab.setProperty('specAbilityList', updated);
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
                    <td>
                      <select className="form-select" value={race} onChange={onUpdateNumberField(setRace, 'race')}>
                        {KotOR.SWRuleSet.racialtypes.map((race) => (
                          <option key={race.id} value={race.id}>{race.getName()}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td><label>Appearance</label></td>
                    <td>
                      <select className="form-select" value={appearanceType} onChange={onUpdateNumberField(setAppearanceType, 'appearanceType')}>
                        {appearanceList.map((appearance) => (
                          <option key={appearance.id} value={appearance.id}>{appearance.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td><label>Phenotype</label></td>
                    <td>
                      <select className="form-select" value={phenotype} onChange={onUpdateNumberField(setPhenotype, 'phenotype')}>
                        {KotOR.SWRuleSet.phenotypes.map((phenotype) => (
                          <option key={phenotype.id} value={phenotype.id}>{phenotype.getName()}</option>
                        ))}
                      </select>
                      </td>
                  </tr>
                  <tr>
                    <td><label>Gender</label></td>
                    <td>
                      <select className="form-select" value={gender} onChange={onUpdateNumberField(setGender, 'gender')}>
                        {KotOR.SWRuleSet.genders.map((gender) => (
                          <option key={gender.id} value={gender.id}>{gender.getName()}</option>
                        ))}
                      </select>
                    </td>
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
                    <td>
                      <select className="form-select" value={bodyBag} onChange={onUpdateNumberField(setBodyBag, 'bodyBag')}>
                        {KotOR.SWRuleSet.bodyBags.map((bodyBag) => (
                          <option key={bodyBag.id} value={bodyBag.id}>{bodyBag.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset>
            <legend>Portrait</legend>
            <div className="d-flex">
              <div className="flex-grow-1">
                <TextureCanvas texture={portrait.baseresref || ''} width={64} height={64} />
              </div>
              <div className="flex-grow-1">
                <select className="form-select" value={portraitId} onChange={onUpdateNumberField(setPortraitId, 'portraitId')}>
                  {KotOR.SWRuleSet.portraits.map((portrait) => (
                    <option key={portrait.id} value={portrait.id}>{portrait.baseresref}</option>
                  ))}
                </select>
              </div>
            </div>
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
                  <select className="form-select" value={walkRate} onChange={onUpdateNumberField(setWalkRate, 'walkRate')}>
                    {KotOR.SWRuleSet.creatureSpeeds.map((speed) => (
                      <option key={speed.id} value={speed.id}>{speed.getName()}</option>
                    ))}
                  </select>
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
                  <td>
                    <select className="form-select" value={subraceIndex} onChange={onUpdateNumberField(setSubraceIndex, 'subraceIndex')}>
                      {KotOR.SWRuleSet.subRaces.map((subrace) => (
                        <option key={subrace.id} value={subrace.id}>{subrace.label}</option>
                      ))}
                    </select>
                  </td>
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
                    <select className="form-select" value={soundSetFile} onChange={onUpdateNumberField(setSoundSetFile, 'soundSetFile')}>
                      {KotOR.SWRuleSet.soundSets.map((soundSet) => (
                        <option key={soundSet.id} value={soundSet.id}>{soundSet.getName()}</option>
                      ))}
                    </select>
                  </fieldset>
                </td>
              </tr>
              <tr>
                <td>
                  <fieldset>
                    <legend>Faction</legend>
                    <select className="form-select" value={factionID} onChange={onUpdateNumberField(setFactionID, 'factionID')}>
                      {Object.values(KotOR.FactionManager.factions).map((faction, index) => (
                        <option key={index} value={index}>{faction.label}</option>
                      ))}
                    </select>
                  </fieldset>
                </td>
                <td>
                  <fieldset>
                    <legend>Perception Range</legend>
                    <select className="form-select" value={perceptionRange} onChange={onUpdateNumberField(setPerceptionRange, 'perceptionRange')}>
                      {KotOR.SWRuleSet.ranges.filter(range => range.getType() == 2).map((size) => (
                        <option key={size.id} value={size.id}>{size.getName()}</option>
                      ))}
                    </select>
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
                    <div className="sep-icon">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </div>
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
                    <div className="sep-icon">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </div>
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
          <div className="feats">
            {spells.map((spell, index) => (
              <div 
                className="feat-row"
                key={`feat-${spell.id}`} 
              >
                <div className={`feat-icon ${knownList0.find(s => s.spell == spell.id) ? 'enabled' : 'disabled'}`} onClick={onSpellClick(spell.id)}>
                  <InfoBubble
                    content={spell.label}
                    position="right"
                  >
                    <TextureCanvas texture={spell.iconresref} width={32} height={32} />
                  </InfoBubble>
                </div>

                {spell.nextSpell ? (
                  <>
                    <div className="sep-icon">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </div>
                    <div className={`feat-icon ${knownList0.find(s => s.spell == spell.nextSpell.id) ? 'enabled' : 'disabled'}`} onClick={onSpellClick(spell.nextSpell.id)}>
                      <InfoBubble
                        content={spell.nextSpell.label}
                        position="right"
                      >
                        <TextureCanvas texture={spell.nextSpell.iconresref} width={32} height={32} />
                      </InfoBubble>
                    </div>
                  </>
                ) : (
                <>
                  <div className="blank-icon" />
                  <div className="blank-icon" />
                </>)
                }

                {spell.nextSpell?.nextSpell ? (
                  <>
                    <div className="sep-icon">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </div>
                    <div className={`feat-icon ${knownList0.find(s => s.spell == spell.nextSpell.nextSpell.id) ? 'enabled' : 'disabled'}`} onClick={onSpellClick(spell.nextSpell.nextSpell.id)}>
                      <InfoBubble
                        content={spell.nextSpell.nextSpell.label}
                        position="right"
                      >
                        <TextureCanvas texture={spell.nextSpell.nextSpell.iconresref} width={32} height={32} />
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
      id: 'class',
      label: 'Class',
      headerIcon: 'fa-user-graduate',
      headerTitle: 'Class',
      content: (
        <>
          {classList[0] && (
            <>
              <div>
                <label>Good Evil</label>
                <input type="range" min="0" max="100" value={goodEvil} onChange={onUpdateNumberField(setGoodEvil, 'goodEvil')} />
                <span>{goodEvil}</span>
              </div>
              <div>
                <table>
                  <tbody>
                    <tr>
                      <td><label>Class</label></td>
                      <td>
                        <select className="form-select" value={creatureClass} onChange={onUpdateClassListField(setCreatureClass, 'class')}>
                          {classes.map((cls, index) => (
                            <option key={`class-${cls.id}`} value={cls.id}>{cls.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td><label>Level</label></td>
                      <td><input type="number" min="0" value={creatureLevel} onChange={onUpdateClassListField(setCreatureLevel, 'level')} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </>
          )}
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
          <div className="feats">
            {specialAbilitiesList.map((specialAbility, index) => (
              <div 
                className="feat-row"
                key={`feat-${specialAbility.id}`} 
              >
                <div className={`feat-icon ${specialAbilities.find(s => s.spell == specialAbility.id) ? 'enabled' : 'disabled'}`} onClick={onSpecialAbilityClick(specialAbility.id)}>
                  <InfoBubble
                    content={specialAbility.label}
                    position="right"
                  >
                    <TextureCanvas texture={specialAbility.iconresref} width={32} height={32} />
                  </InfoBubble>
                </div>

                {specialAbility.nextSpell ? (
                  <>
                    <div className="sep-icon">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </div>
                    <div className={`feat-icon ${specialAbilities.find(s => s.spell == specialAbility.nextSpell.id) ? 'enabled' : 'disabled'}`} onClick={onSpecialAbilityClick(specialAbility.nextSpell.id)}>
                      <InfoBubble
                        content={specialAbility.nextSpell.label}
                        position="right"
                      >
                        <TextureCanvas texture={specialAbility.nextSpell.iconresref} width={32} height={32} />
                      </InfoBubble>
                    </div>
                  </>
                ) : (
                <>
                  <div className="blank-icon" />
                  <div className="blank-icon" />
                </>)
                }

                {specialAbility.nextSpell?.nextSpell ? (
                  <>
                    <div className="sep-icon">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </div>
                    <div className={`feat-icon ${specialAbilities.find(s => s.spell == specialAbility.nextSpell.nextSpell.id) ? 'enabled' : 'disabled'}`} onClick={onSpecialAbilityClick(specialAbility.nextSpell.nextSpell.id)}>
                      <InfoBubble
                        content={specialAbility.nextSpell.nextSpell.label}
                        position="right"
                      >
                        <TextureCanvas texture={specialAbility.nextSpell.nextSpell.iconresref} width={32} height={32} />
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
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idimplant' : 'iimplant'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.IMPLANT)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idhead' : 'ihead'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.HEAD)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idhands' : 'ihands'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.ARMS)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idforearm_l' : 'iforearm_l'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.LEFTARMBAND)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idarmor' : 'iarmor'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.ARMOR)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idforearm_r' : 'iforearm_r'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.RIGHTARMBAND)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idweap_l' : 'ihand_l'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.LEFTHAND)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idbelt' : 'ibelt'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.BELT)} />
            <TextureCanvas width={64} height={64} texture={`${race == 5 ? 'idweap_r' : 'ihand_r'}`} onClick={() => handleItemSlotClick(KotOR.ModuleCreatureArmorSlot.RIGHTHAND)} />
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