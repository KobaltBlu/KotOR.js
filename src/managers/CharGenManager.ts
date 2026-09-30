import { TwoDAManager } from "@/managers/TwoDAManager";
import { AudioLoader } from "@/audio/AudioLoader";
import { GameEngineType } from "@/enums/engine";
import {
  canIncreaseSkillRank,
  computeSkillPointsGained,
  getCreatureSkillPointBase,
  getSkillPointCost,
  isSkillBlockedForCreature,
} from "@/engine/rules/skill-points";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CharGenClasses, type CharGenClassInterface } from "@/game/CharGenClasses";
import { GameState } from "@/GameState";
import { LBL_3DView } from "@/gui";
import type { ModulePlayer } from "@/module/ModulePlayer";
import { OdysseyModel } from "@/odyssey";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { OdysseyModel3D } from "@/three/odyssey";
import { AudioEngine } from "@/audio/AudioEngine";
import { LTRObject } from "@/resource/LTRObject";
import { MDLLoader, ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { CurrentGame } from "@/engine/CurrentGame";
import { TalentFeat } from "@/talents";
import type { CreatureClass } from "@/combat/CreatureClass";
import { SkillType } from "@/enums/nwscript/SkillType";
import { CExoLocString } from "@/resource/CExoLocString";
import {
  createEmptyLevelStatRecord,
  LevelUpAbilityIndex,
} from "@/engine/rules/level-up";
import {
  getCharGenSlotSoundSet,
  resolveCharGenAppearanceHead,
} from "@/engine/rules/chargen-appearance";
import { createDefaultPartyFollowInfo } from "@/module/ModuleCreature";
import { ModuleLoadCoordinator } from '@/engine/ModuleLoadCoordinator';

/** step indices. */
export enum CharGenQuickStep {
  PORTRAIT = 0,
  NAME = 1,
  PLAY = 2,
}

/** step indices. */
export enum CharGenCustomStep {
  PORTRAIT = 0,
  ABILITIES = 1,
  SKILLS = 2,
  FEATS = 3,
  NAME = 4,
  PLAY = 5,
}

/**
 * CharGenManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenManager {

  static availPoints = 30;
  static str = 8;
  static dex = 8;
  static con = 8;
  static wis = 8;
  static int = 8;
  static cha = 8;

  static availSkillPoints = 0;

  static computerUse = 0;
  static demolitions = 0;
  static stealth = 0;
  static awareness = 0;
  static persuade = 0;
  static repair = 0;
  static security = 0;
  static treatInjury = 0;

  static selectedClass: number = 0;
  static hoveredClass: number = 0;
  static selectedTemplate: GFFObject;
  static selectedCreature: ModulePlayer;
  static models: Map<number, OdysseyModel3D> = new Map();
  static templates: Map<number, GFFObject> = new Map();
  static creatures: Map<number, ModulePlayer> = new Map();
  static lbl_3d_views: Map<number, LBL_3DView> = new Map();

  static cgmain_light: OdysseyModel;
  static cgbody_light: OdysseyModel;
  static cghead_light: OdysseyModel;
  /** MainCG / Setup3DScene light model (not cgbody_light). */
  static charrec_light: OdysseyModel;

  /** Highest unlocked quick-panel step (portrait → name → play). */
  static quickStep: number = CharGenQuickStep.PORTRAIT;
  /** Highest unlocked custom-panel step (portrait → … → play). */
  static customStep: number = CharGenCustomStep.PORTRAIT;

  static ltrMaleName: LTRObject;
  static ltrFemaleName: LTRObject;
  static ltrLastName: LTRObject;

  static getSelectedClassSlot(): CharGenClassInterface {
    return CharGenClasses[CharGenManager.selectedClass];
  }

  static getSelectedClassId(): number {
    return CharGenManager.getSelectedClassSlot()?.id ?? 0;
  }

  static getSelectedClassData(): CreatureClass | undefined {
    return GameState.SWRuleSet.classes[CharGenManager.getSelectedClassId()];
  }

  static resetChargenProgress() {
    CharGenManager.quickStep = CharGenQuickStep.PORTRAIT;
    CharGenManager.customStep = CharGenCustomStep.PORTRAIT;
    CharGenManager.availPoints = 30;
    CharGenManager.str = 8;
    CharGenManager.dex = 8;
    CharGenManager.con = 8;
    CharGenManager.wis = 8;
    CharGenManager.int = 8;
    CharGenManager.cha = 8;
    CharGenManager.resetSkillPoints();
    CharGenManager.skillRankBaseline = [0, 0, 0, 0, 0, 0, 0, 0];
    CharGenManager.availSkillPoints = 0;
  }

  static advanceQuickStep(fromStep: number) {
    if(CharGenManager.quickStep <= fromStep){
      CharGenManager.quickStep = Math.min(fromStep + 1, CharGenQuickStep.PLAY);
    }
  }

  static advanceCustomStep(fromStep: number) {
    if(CharGenManager.customStep <= fromStep){
      CharGenManager.customStep = Math.min(fromStep + 1, CharGenCustomStep.PLAY);
    }
  }

  static getStartModuleResRef(): string {
    return GameState.GameKey == GameEngineType.TSL ? '001EBO' : 'end_m01aa';
  }

  static setCreatureName(name: string) {
    const creature = CharGenManager.selectedCreature;
    if(!creature) return;
    const loc = new CExoLocString();
    loc.addSubString(name, 0);
    creature.firstName = loc;
    const field = creature.template?.RootNode?.getFieldByLabel('FirstName');
    if(field){
      field.setValue(loc);
    }
  }

  /**
   * quick/custom PlayGame: strip temporary chargen armor, save player
   * template, init game-in-progress, load starting module.
   */
  static finalizeAndStartGame() {
    const creature = CharGenManager.selectedCreature;
    if(!creature) return;

    creature.equipment.ARMOR = undefined;
    const equipList = creature.template?.getFieldByLabel('Equip_ItemList');
    if(equipList){
      equipList.childStructs = [];
    }

    CharGenManager.seedInitialLevelStat(creature);
    creature.isPC = 1;
    if(!creature.partyFollowInfo){
      creature.partyFollowInfo = createDefaultPartyFollowInfo();
    }

    GameState.GlobalVariableManager.Init();
    GameState.PartyManager.PlayerTemplate = creature.save();
    GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
    GameState.PartyManager.AddPortraitToOrder(creature.getPortraitResRef());
    CurrentGame.InitGameInProgressFolder(true).then( () => {
      ModuleLoadCoordinator.LoadModule(CharGenManager.getStartModuleResRef());
    });
  }

  /**
   * Seed LvlStatList[0] for a newly created PC (CharGen / first level).
   */
  static seedInitialLevelStat(creature: ModulePlayer) {
    if(!creature) return;
    const cls = creature.classes?.[0];
    if(!cls) return;
    const rec = createEmptyLevelStatRecord();
    rec.classId = cls.id | 0;
    rec.hpChange = cls.hitdie | 0;
    rec.fpChange = cls.forcedie | 0;
    rec.attributeIndex = LevelUpAbilityIndex.NONE;
    for(let i = 0; i < SkillType.MAX_SKILLS; i++){
      rec.skillRankChanges[i] = creature.skills?.[i]?.rank | 0;
    }
    rec.skillPointsRemaining = creature.skillPoints | 0;
    rec.feats = (creature.feats || []).map((f) => f.id | 0);
    // Known powers at level 1 (jedi) if any
    const spells = cls.spells || [];
    for(let i = 0; i < spells.length; i++){
      rec.spellsAdded.push(spells[i].id | 0);
    }
    creature.levelStats = [rec];
  }

  /**
   * DoQuickStats — apply class package attributes,
   * granted/package feats, and recommended skills.
   */
  static doQuickStats() {
    const creature = CharGenManager.selectedCreature;
    const classData = CharGenManager.getSelectedClassData();
    if(!creature || !classData) return;

    creature.str = classData.str;
    creature.dex = classData.dex;
    creature.con = classData.con;
    creature.wis = classData.wis;
    creature.int = classData.int;
    creature.cha = classData.cha;

    CharGenManager.str = creature.str;
    CharGenManager.dex = creature.dex;
    CharGenManager.con = creature.con;
    CharGenManager.wis = creature.wis;
    CharGenManager.int = creature.int;
    CharGenManager.cha = creature.cha;
    CharGenManager.availPoints = 0;

    const savingTable = GameState.TwoDAManager.datatables.get(classData.savingthrowtable?.toLowerCase());
    const savingRow = savingTable?.rows?.[0];
    if(savingRow){
      creature.fortbonus = parseInt(String(savingRow.fortsave), 10) || 0;
      creature.willbonus = parseInt(String(savingRow.willsave), 10) || 0;
      creature.refbonus = parseInt(String(savingRow.refsave), 10) || 0;
    }

    creature.feats = [];
    CharGenManager.applyGrantedFeats(creature, classData);
    CharGenManager.applyDefaultPackageFeats(creature, classData, 1);
    CharGenManager.applyDefaultPackageSkills(creature);

    GameState.MenuManager.CharGenMain?.updateAttributes?.();
  }

  /** Apply class savingthrowtable row 0 (shared by quick + custom paths). */
  static applyClassSavingThrows(creature: ModulePlayer, classData?: CreatureClass) {
    const cls = classData || CharGenManager.getSelectedClassData();
    if(!creature || !cls) return;
    const savingTable = GameState.TwoDAManager.datatables.get(cls.savingthrowtable?.toLowerCase());
    const savingRow = savingTable?.rows?.[0];
    if(savingRow){
      creature.fortbonus = parseInt(String(savingRow.fortsave), 10) || 0;
      creature.willbonus = parseInt(String(savingRow.willsave), 10) || 0;
      creature.refbonus = parseInt(String(savingRow.refsave), 10) || 0;
    }
  }

  static applyGrantedFeats(creature: ModulePlayer, classData: CreatureClass) {
    const feats = GameState.SWRuleSet.feats;
    if(!feats) return;
    for(let i = 0; i < feats.length; i++){
      const feat = feats[i];
      if(!feat || feat.constant == '****') continue;
      const granted = feat.getGranted?.(classData);
      if(granted == 1){
        creature.addFeat(new TalentFeat(i));
      }else if(classData.isFeatAvailable?.(feat)){
        const status = classData.getFeatStatus(feat);
        if(status == 3 && (creature.getTotalClassLevel?.() || 1) >= classData.getFeatGrantedLevel(feat)){
          creature.addFeat(TalentFeat.From2DA(feat));
        }
      }
    }
  }

  /** AddDefaultPackageFeats for first-level picks. */
  static applyDefaultPackageFeats(creature: ModulePlayer, classData: CreatureClass, picks: number = 1) {
    const feats = GameState.SWRuleSet.feats;
    if(!feats || picks <= 0) return;

    let remaining = picks;
    for(let recom = 1; recom <= 20 && remaining > 0; recom++){
      for(let i = 0; i < feats.length && remaining > 0; i++){
        const feat = feats[i];
        if(!feat || feat.constant == '****') continue;
        if(feat.getRecom?.(classData) != recom) continue;
        if(creature.getHasFeat(i)) continue;
        if(classData.isFeatAvailable && !classData.isFeatAvailable(feat)) continue;
        creature.addFeat(new TalentFeat(i));
        remaining--;
      }
    }
  }

  /** AddDefaultPackageSkills for first-level CharGen. */
  static applyDefaultPackageSkills(creature: ModulePlayer) {
    CharGenManager.resetSkillPoints();
    CharGenManager.skillRankBaseline = [0, 0, 0, 0, 0, 0, 0, 0];
    CharGenManager.availSkillPoints = CharGenManager.getMaxSkillPoints();
    const skillOrder = CharGenManager.getRecommendedOrder(creature);

    let guard = 0;
    const maxIterations = CharGenManager.availSkillPoints * SkillType.MAX_SKILLS + 8;
    let spent = true;
    while(CharGenManager.availSkillPoints > 0 && spent && guard < maxIterations){
      spent = false;
      guard++;
      for(let i = 0; i < SkillType.MAX_SKILLS; i++){
        const skillIndex = skillOrder[i];
        if(skillIndex < 0) continue;
        if(CharGenManager.availSkillPoints <= 0) break;
        if(isSkillBlockedForCreature(creature, skillIndex)) continue;

        const rank = CharGenManager.getTempSkillRank(skillIndex);
        if(!canIncreaseSkillRank(creature, skillIndex, rank, CharGenManager.availSkillPoints)){
          continue;
        }
        const cost = getSkillPointCost(creature, skillIndex, true);
        CharGenManager.setTempSkillRank(skillIndex, rank + 1);
        CharGenManager.availSkillPoints -= cost;
        spent = true;
      }
    }
    CharGenManager.applyTempSkillsToCreature();
  }

  static async Start(){
    await GameState.MenuManager.LoadScreen.setLoadBackground('load_chargen');
    GameState.MenuManager.LoadScreen.open();
    GameState.MenuManager.LoadScreen.setHintMessage('');
    await CharGenManager.StartBackgroundMusic();
    await CharGenManager.Init();
    await GameState.MenuManager.LoadCharGenGameMenus();
    await GameState.MenuManager.CharGenClass.Init();
    GameState.MenuManager.LoadScreen.close();
    GameState.MenuManager.CharGenClass.open();
  }

  static async StartBackgroundMusic(): Promise<void> {
    const audioResRef = GameState.GameKey == GameEngineType.KOTOR ? 'mus_theme_rep' : 'mus_a_main';
    const data = await AudioLoader.LoadMusic(audioResRef);
    AudioEngine.GetAudioEngine().setAudioBuffer('BACKGROUND_MUSIC_DAY', data.buffer as ArrayBuffer, audioResRef);
    AudioEngine.GetAudioEngine().areaMusicDayAudioEmitter.play();
  }

  static async Init(){
    CharGenManager.ltrMaleName = new LTRObject(await ResourceLoader.loadResource(ResourceTypes.ltr, 'humanm'));
    CharGenManager.ltrFemaleName = new LTRObject(await ResourceLoader.loadResource(ResourceTypes.ltr, 'humanf'));
    CharGenManager.ltrLastName = new LTRObject(await ResourceLoader.loadResource(ResourceTypes.ltr, 'humanl'));
    CharGenManager.resetChargenProgress();
    CharGenManager.InitializeCreatureTemplate();
    await CharGenManager.InitCharBackgroundModel();
  }

  static async InitCharBackgroundModel(): Promise<void> {
    await CharGenManager.LoadCGMainLight();
    await CharGenManager.LoadCGBodyLight();
    await CharGenManager.LoadCGHeadLight();
    await CharGenManager.LoadCharRecLight();
  }

  static async LoadCGMainLight(): Promise<void> {
    const mdl = await MDLLoader.loader.load('cgmain_light')
    CharGenManager.cgmain_light = mdl;
  }

  static async LoadCGBodyLight(): Promise<void> {
    const mdl = await MDLLoader.loader.load('cgbody_light')
    CharGenManager.cgbody_light = mdl;
  }

  static async LoadCGHeadLight(): Promise<void> {
    const mdl = await MDLLoader.loader.load('cghead_light')
    CharGenManager.cghead_light = mdl;
  }

  static async LoadCharRecLight(): Promise<void> {
    const mdl = await MDLLoader.loader.load('charrec_light')
    CharGenManager.charrec_light = mdl;
  }

  static InitializeCreatureTemplate(){
    for(let i = 0; i < 6; i++){
      CharGenManager.lbl_3d_views.set(i, new LBL_3DView());
      let template = CharGenManager.GetPlayerTemplate(i);
      CharGenManager.templates.set(i, template);
      CharGenManager.creatures.set(i, new GameState.Module.ModuleArea.ModulePlayer(template));
    }
    let template = CharGenManager.templates.get(CharGenManager.selectedClass);
    CharGenManager.selectedCreature = new GameState.Module.ModuleArea.ModulePlayer(template);
  }

  static GetPlayerTemplate(nth = 0) {
    let template = new GFFObject();
    let idx = Math.floor(Math.random() * 15);
    const classId = CharGenClasses[nth]?.id ?? 0;
    let portraitId = 0;
    let appearanceIdx = CharGenClasses[nth].appearances[idx];
    const portraits2DA = GameState.SWRuleSet.portraits;
    if(portraits2DA){
      for (let i = 0; i < portraits2DA.length; i++) {
        let port = portraits2DA[i];
        if (port.appearancenumber == appearanceIdx) {
          portraitId = i;
          break;
        } else if (port.appearance_l == appearanceIdx) {
          portraitId = i;
          break;
        } else if (port.appearance_s == appearanceIdx) {
          portraitId = i;
          break;
        }
      }
    }
    const gender = nth < 3 ? 0 : 1;
    const appearanceHead = resolveCharGenAppearanceHead(
      GameState.SWRuleSet.appearances,
      appearanceIdx
    );
    const soundSet = CharGenClasses[nth]?.soundset ?? getCharGenSlotSoundSet(nth);
    template.RootNode.addField(new GFFField(GFFDataType.INT, 'AIState')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.LIST, 'ActionList'));
    template.RootNode.addField(new GFFField(GFFDataType.INT, 'Age')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'AmbientAnimState')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.INT, 'Animation')).setValue(10000);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Appearance_Head')).setValue(appearanceHead);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'Appearance_Type')).setValue(appearanceIdx);
    template.RootNode.addField(new GFFField(GFFDataType.SHORT, 'ArmorClass')).setValue(10);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'BodyBag')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'FactionID')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'PortraitId')).setValue(portraitId);
    template.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName')).setValue(CharGenManager.generateRandomName(gender));
    template.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName'));
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'HitPoints')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'CurrentHitPoints')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'MaxHitPoints')).setValue(20);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'ForcePoints')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'CurrentForce')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Gender')).setValue(gender);
    let equipment = template.RootNode.addField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
    // SaveCharGenCreature script set
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptAttacked')).setValue('k_hen_attacked01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDamaged')).setValue('k_def_damage01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDeath')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDialogue')).setValue('k_hen_dialogue01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDisturbed')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndRound')).setValue('k_hen_combend01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat')).setValue('k_hen_heartbt01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked')).setValue('k_def_blocked01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnNotice')).setValue('k_hen_percept01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptRested')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpawn')).setValue('k_hen_spawn01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpellAt')).setValue('k_def_spellat01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine')).setValue('k_def_userdef01');
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'GoodEvil')).setValue(50);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'NaturalAC')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Con')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Dex')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Str')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Wis')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Cha')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Int')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'fortbonus')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'refbonus')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'willbonus')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PerceptionRange')).setValue(13);
    let skillList = template.RootNode.addField(new GFFField(GFFDataType.LIST, 'SkillList'));
    for (let i = 0; i < 8; i++) {
      let _skill = new GFFStruct();
      _skill.addField(new GFFField(GFFDataType.BYTE, 'Rank')).setValue(0);
      skillList.addChildStruct(_skill);
    }
    let classList = template.RootNode.addField(new GFFField(GFFDataType.LIST, 'ClassList'));
    let classStruct = new GFFStruct();
    classStruct.addField(new GFFField(GFFDataType.INT, 'Class')).setValue(classId);
    classStruct.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel')).setValue(1);
    classStruct.addField(new GFFField(GFFDataType.LIST, 'KnownList0'));
    classList.addChildStruct(classStruct);
    let armorStruct = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
    armorStruct.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).setValue('g_a_clothes01');
    equipment.addChildStruct(armorStruct);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(soundSet);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Race')).setValue(6);
    template.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).setValue(0);
    return template;
  }

  /**
   * Apply portrait/appearance choice (UpdatePortraitButton / OnSelectDisplayButton).
   * Soundset stays on the class slot (does not retarget it on cycle).
   */
  static applyPortraitAppearance(creature: ModulePlayer, appearanceId: number, portraitId: number) {
    if(!creature) return;
    creature.appearance = appearanceId | 0;
    creature.portraitId = portraitId | 0;
    if(GameState.SWRuleSet.portraits?.[portraitId]){
      creature.portrait = GameState.SWRuleSet.portraits[portraitId];
    }
    creature.setAppearance(creature.appearance);
    creature.appearanceHead = resolveCharGenAppearanceHead(
      GameState.SWRuleSet.appearances,
      creature.appearance
    );
    const root = creature.template?.RootNode;
    if(root){
      root.getFieldByLabel('Appearance_Type')?.setValue(creature.appearance);
      root.getFieldByLabel('PortraitId')?.setValue(creature.portraitId);
      root.getFieldByLabel('Appearance_Head')?.setValue(creature.appearanceHead);
    }
  }

  /** Baseline ranks when the skills panel opened (minus cannot go below). */
  static skillRankBaseline: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

  static getTempSkillRanks(): number[] {
    return [
      CharGenManager.computerUse,
      CharGenManager.demolitions,
      CharGenManager.stealth,
      CharGenManager.awareness,
      CharGenManager.persuade,
      CharGenManager.repair,
      CharGenManager.security,
      CharGenManager.treatInjury,
    ];
  }

  static getTempSkillRank(skillId: number): number {
    return CharGenManager.getTempSkillRanks()[skillId] | 0;
  }

  static setTempSkillRank(skillId: number, rank: number) {
    switch(skillId){
      case 0: CharGenManager.computerUse = rank; break;
      case 1: CharGenManager.demolitions = rank; break;
      case 2: CharGenManager.stealth = rank; break;
      case 3: CharGenManager.awareness = rank; break;
      case 4: CharGenManager.persuade = rank; break;
      case 5: CharGenManager.repair = rank; break;
      case 6: CharGenManager.security = rank; break;
      case 7: CharGenManager.treatInjury = rank; break;
    }
  }

  /** Reset temporary skill ranks only — does not mutate the creature until Accept. */
  static resetSkillPoints() {
    CharGenManager.computerUse = 0;
    CharGenManager.demolitions = 0;
    CharGenManager.stealth = 0;
    CharGenManager.awareness = 0;
    CharGenManager.persuade = 0;
    CharGenManager.repair = 0;
    CharGenManager.security = 0;
    CharGenManager.treatInjury = 0;
  }

  static syncTempSkillsFromCreature() {
    const creature = CharGenManager.selectedCreature;
    if(!creature?.skills){
      CharGenManager.resetSkillPoints();
      CharGenManager.skillRankBaseline = [0, 0, 0, 0, 0, 0, 0, 0];
      return;
    }
    for(let i = 0; i < 8; i++){
      const rank = creature.skills[i]?.rank | 0;
      CharGenManager.setTempSkillRank(i, rank);
      CharGenManager.skillRankBaseline[i] = rank;
    }
  }

  static applyTempSkillsToCreature() {
    const creature = CharGenManager.selectedCreature;
    if(!creature?.skills) return;
    for(let i = 0; i < 8; i++){
      creature.skills[i].rank = CharGenManager.getTempSkillRank(i);
    }
  }

  /** AddSkillPointsPerLevel for first-level CharGen. */
  static getMaxSkillPoints() {
    const creature = CharGenManager.selectedCreature;
    if(!creature) return 4;
    const intScore = CharGenManager.int || creature.getINT?.(false) || creature.int || 8;
    return computeSkillPointsGained(
      getCreatureSkillPointBase(creature),
      intScore,
      1,
      GameState.GameKey
    );
  }

  /** uses the last (most recently gained) class for skill table columns. */
  static getCreatureSkillClass(creature?: { classes?: { skillstable?: string }[] }) {
    const c = creature ?? CharGenManager.selectedCreature;
    const classes = c?.classes;
    if(!classes?.length) return undefined;
    return classes[classes.length - 1] ?? classes[0];
  }

  static getSkillTableColumn(creature?: { classes?: { skillstable?: string }[] }) {
    const cls = CharGenManager.getCreatureSkillClass(creature);
    if(!cls?.skillstable) return '';
    return cls.skillstable.toLowerCase() + '_class';
  }

  static getSkillTableColumnRecommended(creature?: { classes?: { skillstable?: string }[] }) {
    const cls = CharGenManager.getCreatureSkillClass(creature);
    if(!cls?.skillstable) return '';
    return cls.skillstable.toLowerCase() + '_reco';
  }

  /** Returns skill indices in recommended spend order (-1 = unused slot). */
  static getRecommendedOrder(creature?: { classes?: { skillstable?: string }[] }): number[] {
    const skillOrder: number[] = [-1, -1, -1, -1, -1, -1, -1, -1];
    const cls = CharGenManager.getCreatureSkillClass(creature);
    const classCode = cls?.skillstable || '';
    const skills = GameState.SWRuleSet?.skills;
    if(skills?.length && classCode){
      for(let i = 0; i < 8 && i < skills.length; i++){
        const skill = skills[i];
        const data =
          skill?.classData?.get(classCode) ||
          skill?.classData?.get(classCode.toLowerCase());
        const recom = data?.recommendedLevel | 0;
        if(recom > 0){
          const order = recom - 1;
          if(order >= 0 && order < 8){
            skillOrder[order] = i;
          }
        }
      }
      return skillOrder;
    }

    const table = TwoDAManager.datatables.get('skills');
    const column = CharGenManager.getSkillTableColumnRecommended(creature);
    if(!table || !column) return skillOrder;

    for (let i = 0; i < 8; i++) {
      const value = table.rows[i]?.[column];
      if (value != '****' && value != null && value !== '') {
        const order = parseInt(String(value), 10) - 1;
        if(order >= 0 && order < 8){
          skillOrder[order] = i;
        }
      }
    }
    return skillOrder;
  }

  static generateRandomName(gender?: number){
    if(gender === undefined){
      gender = CharGenManager.selectedCreature?.getGender?.() ?? 0;
    }

    let firstName = '';
    if(gender == 0){
      firstName = CharGenManager.ltrMaleName.getName();
    }else{
      firstName = CharGenManager.ltrFemaleName.getName();
    }
    
    return firstName + ' ' + CharGenManager.ltrLastName.getName();
  }

}
