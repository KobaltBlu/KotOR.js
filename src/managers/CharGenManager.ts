import { AudioLoader } from "@/audio/AudioLoader";
import { GameEngineType } from "@/enums/engine";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { getCharGenClass, getCharGenSlotGender } from "@/game/CharGenClasses";
import { GameState } from "@/GameState";
import { LBL_3DView } from "@/gui";
import type { ModulePlayer } from "@/module/ModulePlayer";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { CreatureClass } from "@/combat/CreatureClass";
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

  

  /**
   * Skill working copy for the chargen Skills screen. Ranks are addressed by
   * skills.2da row (SkillType) through getWorkingSkillRank/setWorkingSkillRank;
   * the accepted ranks live in selectedCreature.skills[i].rank.
   */
  static availSkillPoints = 0;

  static computerUse = 0;
  static demolitions = 0;
  static stealth = 0;
  static awareness = 0;
  static persuade = 0;
  static repair = 0;
  static security = 0;
  static treatInjury = 0;

  /** Static keys of the skill working copy, indexed by skills.2da row (SkillType) */
  static readonly skillWorkingKeys = ['computerUse', 'demolitions', 'stealth', 'awareness', 'persuade', 'repair', 'security', 'treatInjury'] as const;


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

  static step1_complete: boolean = false;
  static step2_complete: boolean = false;
  static step3_complete: boolean = false;
  static step4_complete: boolean = false;
  static step5_complete: boolean = false;
  static step6_complete: boolean = false;

  static ltrMaleName: LTRObject;
  static ltrFemaleName: LTRObject;
  static ltrLastName: LTRObject;

  /** Attribute point-buy constants shared with the Abilities screen */
  static readonly ATTRIBUTE_MIN = 8;
  static readonly ATTRIBUTE_POINTS = 30;

  static async Start(){
    //A second character generation in the same session starts clean
    CharGenManager.ResetState();
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
    CharGenManager.InitializeCreatureTemplate();
    await CharGenManager.InitCharBackgroundModel();
  }

  static async InitCharBackgroundModel(): Promise<void> {
    await CharGenManager.LoadCGMainLight();
    await CharGenManager.LoadCGBodyLight();
    await CharGenManager.LoadCGHeadLight();
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

  /**
   * Resets everything a previous character generation may have left behind:
   * the attribute and skill working copies, the custom-panel step flags and
   * the slot selection. Called from Start() and on every class selection.
   */
  static ResetState(){
    CharGenManager.resetWorkingCopies();
    CharGenManager.resetStepFlags();
    CharGenManager.selectedClass = 0;
    CharGenManager.hoveredClass = 0;
  }

  /**
   * Attribute + skill working copies back to their starting values.
   */
  static resetWorkingCopies(){
    CharGenManager.availPoints = CharGenManager.ATTRIBUTE_POINTS;
    CharGenManager.str = CharGenManager.ATTRIBUTE_MIN;
    CharGenManager.dex = CharGenManager.ATTRIBUTE_MIN;
    CharGenManager.con = CharGenManager.ATTRIBUTE_MIN;
    CharGenManager.wis = CharGenManager.ATTRIBUTE_MIN;
    CharGenManager.int = CharGenManager.ATTRIBUTE_MIN;
    CharGenManager.cha = CharGenManager.ATTRIBUTE_MIN;
    for(let i = 0; i < CharGenManager.skillWorkingKeys.length; i++){
      CharGenManager.setWorkingSkillRank(i, 0);
    }
    CharGenManager.availSkillPoints = CharGenManager.getMaxSkillPoints();
  }

  static resetStepFlags(){
    CharGenManager.step1_complete = false;
    CharGenManager.step2_complete = false;
    CharGenManager.step3_complete = false;
    CharGenManager.step4_complete = false;
    CharGenManager.step5_complete = false;
    CharGenManager.step6_complete = false;
  }

  static isStepComplete(step: number): boolean {
    switch(step){
      case 1: return CharGenManager.step1_complete;
      case 2: return CharGenManager.step2_complete;
      case 3: return CharGenManager.step3_complete;
      case 4: return CharGenManager.step4_complete;
      case 5: return CharGenManager.step5_complete;
      case 6: return CharGenManager.step6_complete;
    }
    return false;
  }

  static setStepComplete(step: number, complete: boolean = true){
    switch(step){
      case 1: CharGenManager.step1_complete = complete; break;
      case 2: CharGenManager.step2_complete = complete; break;
      case 3: CharGenManager.step3_complete = complete; break;
      case 4: CharGenManager.step4_complete = complete; break;
      case 5: CharGenManager.step5_complete = complete; break;
      case 6: CharGenManager.step6_complete = complete; break;
    }
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

  /**
   * The class of the character being built (classes.2da row via the
   * creature's ClassList), never the class-select slot.
   */
  static getSelectedClass(creature: ModuleCreature = CharGenManager.selectedCreature): CreatureClass | undefined {
    if(creature && creature.classes && creature.classes.length){
      return creature.classes[0];
    }
    const slot = getCharGenClass(CharGenManager.selectedClass);
    return slot ? GameState.SWRuleSet.classes[slot.id] : undefined;
  }

  /**
   * Level-1 vitality: classes.2da hitdie + CON modifier (reone chargen.cpp
   * updateAttributes; strategywiki Attributes). No per-level minimum is
   * documented, so the result is only kept above 0.
   */
  static getLevel1HitPoints(creature: ModuleCreature = CharGenManager.selectedCreature): number {
    const cls = CharGenManager.getSelectedClass(creature);
    if(!creature || !cls){ return 1; }
    const hitdie = parseInt(cls.hitdie as any) || 0;
    return Math.max(1, hitdie + CharGenManager.getAbilityModifier(creature.con));
  }

  /**
   * Level-1 force points: 0 for classes without a forcedie (K1 Soldier /
   * Scout / Scoundrel), otherwise forcedie + WIS modifier, plus the CHA
   * modifier in K1 (strategywiki K1 Attributes lists FP per Jedi level under
   * both WIS and CHA; K2 under WIS only).
   * UNCERTAIN: no engine source computes FP (reone/xoreos read it from the
   * template); the modifier handling is wiki-sourced and negative modifiers
   * are floored at 0 total.
   */
  static getLevel1ForcePoints(creature: ModuleCreature = CharGenManager.selectedCreature): number {
    const cls = CharGenManager.getSelectedClass(creature);
    if(!creature || !cls){ return 0; }
    const forcedie = parseInt(cls.forcedie as any) || 0;
    if(forcedie <= 0){ return 0; }
    let fp = forcedie + CharGenManager.getAbilityModifier(creature.wis);
    if(GameState.GameKey == GameEngineType.KOTOR){
      fp += CharGenManager.getAbilityModifier(creature.cha);
    }
    return Math.max(0, fp);
  }

  /**
   * Gives the creature every feat its class grants at level 1
   * (feat.2da <code>_list == 3, <code>_granted <= level). Idempotent: feats the
   * creature already holds are skipped, so Quick -> Back -> Quick or Custom
   * never duplicates them.
   */
  static applyGrantedFeats(creature: ModuleCreature = CharGenManager.selectedCreature){
    const cls = CharGenManager.getSelectedClass(creature);
    if(!creature || !cls){ return; }
    const level = Math.max(1, creature.getTotalClassLevel() || 1);
    const feats = GameState.SWRuleSet.feats;
    for(let i = 0; i < feats.length; i++){
      const feat = feats[i];
      if(!feat){ continue; }
      if(!cls.isFeatGrantedAtLevel(feat, level)){ continue; }
      //addFeat(id) builds a fresh TalentFeat and skips duplicates
      creature.addFeat(feat.id);
    }
  }

  /**
   * Quick-character feat picks: the class's featgain level-1 picks are spent
   * on the feats with the lowest <code>_recom values (1 = first choice) that
   * are selectable, not yet held and whose prerequisite feats are held.
   */
  static applyRecommendedFeats(creature: ModuleCreature = CharGenManager.selectedCreature){
    const cls = CharGenManager.getSelectedClass(creature);
    if(!creature || !cls){ return; }
    const level = Math.max(1, creature.getTotalClassLevel() || 1);
    let picks = cls.getFeatPickCount(level);
    if(picks <= 0){ return; }

    const feats = GameState.SWRuleSet.feats;
    const ranked: { id: number; order: number }[] = [];
    for(let i = 0; i < feats.length; i++){
      const feat = feats[i];
      if(!feat){ continue; }
      const order = cls.getFeatRecommendedOrder(feat);
      if(order > 0 && cls.isFeatSelectable(feat)){
        ranked.push({ id: feat.id, order: order });
      }
    }
    ranked.sort((a, b) => (a.order - b.order) || (a.id - b.id));

    //Loop so chain members whose prerequisite was just picked become eligible
    let picked = true;
    while(picks > 0 && picked){
      picked = false;
      for(let i = 0; i < ranked.length && picks > 0; i++){
        const feat = feats[ranked[i].id];
        if(!feat || creature.getHasFeat(feat.id)){ continue; }
        if(feat.prereqFeat1 >= 0 && !creature.getHasFeat(feat.prereqFeat1)){ continue; }
        if(feat.prereqFeat2 >= 0 && !creature.getHasFeat(feat.prereqFeat2)){ continue; }
        creature.addFeat(feat.id);
        picks--;
        picked = true;
      }
    }
  }

  /**
   * Quick character: the class's recommended attributes (classes.2da
   * str..cha), recommended skills, granted feats and recommended feat picks.
   */
  static applyQuickCharacter(creature: ModuleCreature = CharGenManager.selectedCreature){
    const cls = CharGenManager.getSelectedClass(creature);
    if(!creature || !cls){ return; }

    creature.str = cls.str;
    creature.dex = cls.dex;
    creature.con = cls.con;
    creature.wis = cls.wis;
    creature.int = cls.int;
    creature.cha = cls.cha;

    //Skills: the Recommended fill, written straight to the creature
    CharGenManager.applyRecommendedSkills();
    CharGenManager.commitSkillPoints();

    //Feats: only the class-granted ones survive a Custom -> Back -> Quick round trip
    const level = Math.max(1, creature.getTotalClassLevel() || 1);
    creature.feats = creature.feats.filter((feat) => cls.isFeatGrantedAtLevel(feat, level));
    CharGenManager.applyGrantedFeats(creature);
    CharGenManager.applyRecommendedFeats(creature);
    CharGenManager.applyClassSaveBonuses(creature);
  }

  /**
   * Custom character: the granted feats are applied up front so the Feats
   * screen and the summary panel show them; everything else is chosen on
   * the step screens.
   */
  static prepareCustomCharacter(creature: ModuleCreature = CharGenManager.selectedCreature){
    const cls = CharGenManager.getSelectedClass(creature);
    if(!creature || !cls){ return; }
    //Like the attribute/skill resets on entering the custom path: earlier picks are dropped, granted feats stay
    const level = Math.max(1, creature.getTotalClassLevel() || 1);
    creature.feats = creature.feats.filter((feat) => cls.isFeatGrantedAtLevel(feat, level));
    CharGenManager.applyGrantedFeats(creature);
    CharGenManager.applyClassSaveBonuses(creature);
  }

  /**
   * The UTC fortbonus/refbonus/willbonus fields are the miscellaneous save
   * bonuses (0 on every vanilla K1 party member). The class base saves and
   * the ability modifiers are derived at runtime by
   * ModuleCreature.getFortitudeSave()/getReflexSave()/getWillSave(), so a new
   * character stores no bonus at all.
   */
  static applyClassSaveBonuses(creature: ModuleCreature = CharGenManager.selectedCreature){
    if(!creature){ return; }
    creature.fortbonus = 0;
    creature.refbonus = 0;
    creature.willbonus = 0;
  }

  /**
   * Derives the level-1 vitality / force points from the class and the
   * accepted attributes and writes them to the creature the way the vanilla
   * UTCs store them: HitPoints = base (hitdie), MaxHitPoints = base + CON
   * bonus, CurrentHitPoints = base (ModuleCreature.getHP() = max + current -
   * base). Force points are stored as the total in all three FP fields.
   */
  static applyDerivedStats(creature: ModuleCreature = CharGenManager.selectedCreature){
    const cls = CharGenManager.getSelectedClass(creature);
    if(!creature || !cls){ return; }

    const maxHP = CharGenManager.getLevel1HitPoints(creature);
    const baseHP = Math.max(1, parseInt(cls.hitdie as any) || 0);
    creature.hitPoints = Math.min(baseHP, maxHP);
    creature.maxHitPoints = maxHP;
    creature.currentHitPoints = creature.hitPoints;

    const fp = CharGenManager.getLevel1ForcePoints(creature);
    creature.forcePoints = fp;
    creature.maxForcePoints = fp;
    creature.currentForce = fp;
  }

  /**
   * Everything that has to be on the creature before it becomes the player
   * template: granted feats, a usable name, derived HP/FP and no bogus save
   * bonuses. Used by the Quick and Custom Play steps of both games.
   */
  static finalizeCreature(creature: ModuleCreature = CharGenManager.selectedCreature){
    if(!creature){ return; }
    CharGenManager.applyGrantedFeats(creature);
    CharGenManager.applyClassSaveBonuses(creature);

    const name = (creature.firstName || '').trim();
    creature.firstName = name.length ? name : CharGenManager.generateRandomName(creature.getGender());

    CharGenManager.applyDerivedStats(creature);
  }

  /**
   * First module of a new game: end_m01aa (K1) / 001EBO (TSL), as in
   * reone CharacterGeneration::finish().
   */
  static getStartModule(): string {
    return GameState.GameKey == GameEngineType.TSL ? '001EBO' : 'end_m01aa';
  }

  /**
   * Play: finalizes the creature, makes it the player template and loads the
   * start module. Shared by the Quick and Custom panels of both games.
   */
  static async startNewGame(){
    const creature = CharGenManager.selectedCreature;
    if(!creature){
      console.error('CharGenManager.startNewGame', 'No creature selected');
      return;
    }

    CharGenManager.finalizeCreature(creature);

    //The start module hands out the starting gear
    creature.equipment.ARMOR = undefined;
    const equipList = creature.template.getFieldByLabel('Equip_ItemList');
    if(equipList){
      equipList.childStructs = [];
    }

    GameState.GlobalVariableManager.Init();
    GameState.PartyManager.PlayerTemplate = creature.save();
    GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
    GameState.PartyManager.AddPortraitToOrder(creature.getPortraitResRef());
    await CurrentGame.InitGameInProgressFolder(true);
    GameState.LoadModule(CharGenManager.getStartModule());
  }

  /**
   * Builds the creature template for a class-select slot (0-5). The class id,
   * the name strrefs and the PC appearance rows come from the game-specific
   * slot table (K1 or TSL) in CharGenClasses.
   */
  static GetPlayerTemplate(nth = 0) {
    let template = new GFFObject();
    const slot = getCharGenClass(nth);
    const classId = slot.id;
    const creatureClass = GameState.SWRuleSet.classes ? GameState.SWRuleSet.classes[classId] : undefined;
    const appearanceRows = slot.appearances;
    let idx = Math.floor(Math.random() * appearanceRows.length);
    let portraitId = 0;
    let appearanceIdx = appearanceRows[idx] || 0;
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
    const gender = getCharGenSlotGender(nth);
    //Level-1 vitality/force points of a fresh (all 8s) character; recomputed on Play
    const conMod = CharGenManager.getAbilityModifier(CharGenManager.ATTRIBUTE_MIN);
    const hitdie = creatureClass ? (parseInt(creatureClass.hitdie as any) || 0) : 8;
    const forcedie = creatureClass ? (parseInt(creatureClass.forcedie as any) || 0) : 0;
    const baseHP = Math.max(1, hitdie);
    const maxHP = Math.max(1, hitdie + conMod);
    let fp = 0;
    if(forcedie > 0){
      const wisMod = CharGenManager.getAbilityModifier(CharGenManager.ATTRIBUTE_MIN);
      const chaMod = GameState.GameKey == GameEngineType.KOTOR ? CharGenManager.getAbilityModifier(CharGenManager.ATTRIBUTE_MIN) : 0;
      fp = Math.max(0, forcedie + wisMod + chaMod);
    }
    template.RootNode.addField(new GFFField(GFFDataType.INT, 'AIState')).setValue(appearanceIdx);
    template.RootNode.addField(new GFFField(GFFDataType.LIST, 'ActionList'));
    template.RootNode.addField(new GFFField(GFFDataType.INT, 'Age')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'AmbientAnimState')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.INT, 'Animation')).setValue(10000);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Appearance_Head')).setValue(1);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'Appearance_Type')).setValue(appearanceIdx);
    template.RootNode.addField(new GFFField(GFFDataType.SHORT, 'ArmorClass')).setValue(10);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'BodyBag')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'FactionID')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'PortraitId')).setValue(portraitId);
    template.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName')).setValue(CharGenManager.generateRandomName(gender));
    template.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName'));
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'HitPoints')).setValue(Math.min(baseHP, maxHP));
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'CurrentHitPoints')).setValue(Math.min(baseHP, maxHP));
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'MaxHitPoints')).setValue(maxHP);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'ForcePoints')).setValue(fp);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'CurrentForce')).setValue(fp);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'MaxForcePoints')).setValue(fp);
    template.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Gender')).setValue(gender);
    let equipment = template.RootNode.addField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptAttacked')).setValue('k_hen_attacked01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDamaged')).setValue('k_hen_damage01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDeath')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDialogue')).setValue('k_hen_dialogue01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptDisturbed')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptEndRound')).setValue('k_hen_combend01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat')).setValue('k_hen_heartbt01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked')).setValue('k_hen_blocked01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptOnNotice')).setValue('k_hen_percept01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptRested')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpawn')).setValue('k_hen_spawn01');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptSpellAt')).setValue('');
    template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine')).setValue('');
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
    //K1 PC sound sets by appearance row; TSL rows are not verified (no TSL data available) and use the gender fallback
    if (GameState.GameKey == GameEngineType.KOTOR && appearanceIdx >= 91 && appearanceIdx <= 105) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(83);
    } else if (GameState.GameKey == GameEngineType.KOTOR && appearanceIdx >= 106 && appearanceIdx <= 120) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(82);
    } else if (GameState.GameKey == GameEngineType.KOTOR && appearanceIdx >= 121 && appearanceIdx <= 135) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(83);
    } else if (GameState.GameKey == GameEngineType.KOTOR && appearanceIdx >= 136 && appearanceIdx <= 150) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(85);
    } else if (GameState.GameKey == GameEngineType.KOTOR && appearanceIdx >= 151 && appearanceIdx <= 165) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(84);
    } else if (GameState.GameKey == GameEngineType.KOTOR && appearanceIdx >= 166 && appearanceIdx <= 180) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(85);
    } else {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(gender == 0 ? 85 : 83);
    }
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
   * Number of skills tracked by the working copy (skills.2da rows / creature.skills).
   */
  static getSkillCount(): number {
    const creature = CharGenManager.selectedCreature;
    if(creature && creature.skills){
      return Math.min(creature.skills.length, CharGenManager.skillWorkingKeys.length);
    }
    return CharGenManager.skillWorkingKeys.length;
  }

  static getWorkingSkillRank(skillIndex: number): number {
    const key = CharGenManager.skillWorkingKeys[skillIndex];
    if(!key){ return 0; }
    return CharGenManager[key] || 0;
  }

  static setWorkingSkillRank(skillIndex: number, rank: number){
    const key = CharGenManager.skillWorkingKeys[skillIndex];
    if(!key){ return; }
    CharGenManager[key] = Math.max(0, Math.floor(rank) || 0);
  }

  /**
   * D20 ability modifier: floor((score - 10) / 2).
   */
  static getAbilityModifier(score: number): number {
    const parsed = parseInt(score as any);
    return Math.floor(((isNaN(parsed) ? 10 : parsed) - 10) / 2);
  }

  /**
   * The character level the skill caps are computed for (1 during chargen).
   */
  static getSkillLevel(): number {
    const creature = CharGenManager.selectedCreature;
    const level = creature ? creature.getTotalClassLevel() : 1;
    return Math.max(1, level || 1);
  }

  /**
   * classes.2da skillstable code of the class being built (e.g. 'SOL'); used to
   * look up the <code>_class / <code>_reco columns of skills.2da.
   */
  static getSkillClassCode(): string {
    const creature = CharGenManager.selectedCreature;
    const cls = creature && creature.classes ? creature.classes[0] : undefined;
    return cls ? cls.skillstable : '';
  }

  /**
   * Zeroes the accepted ranks on the creature and the working copy, and
   * refills the point pool.
   */
  static resetSkillPoints() {
    const creature = CharGenManager.selectedCreature;
    const count = CharGenManager.getSkillCount();
    for (let i = 0; i < count; i++) {
      if(creature && creature.skills[i]){
        creature.skills[i].rank = 0;
      }
      CharGenManager.setWorkingSkillRank(i, 0);
    }
    CharGenManager.availSkillPoints = CharGenManager.getMaxSkillPoints();
  }

  /**
   * Level-1 skill point pool: 4 x max(1, floor(skillpointbase / 2) + INT modifier).
   * With the K1 classes.2da skillpointbase values (Soldier 2, Scout 6, Scoundrel 8)
   * this yields the (1+INT)*4 / (3+INT)*4 / (4+INT)*4 character generation tables
   * with a minimum of 4 points.
   * UNCERTAIN (TSL): the TSL classes.2da could not be inspected; the same formula
   * reproduces the TSL Guardian/Sentinel/Consular tables only if their
   * skillpointbase values are 2/6/4.
   */
  static getMaxSkillPoints(): number {
    const creature = CharGenManager.selectedCreature;
    const cls = creature && creature.classes ? creature.classes[0] : undefined;
    if(!creature || !cls){
      return 4;
    }
    const base = parseInt(cls.skillpointbase as any) || 0;
    const intMod = CharGenManager.getAbilityModifier(creature.int);
    return 4 * Math.max(1, Math.floor(base / 2) + intMod);
  }

  static isClassSkill(skillIndex: number): boolean {
    const skill = GameState.SWRuleSet.skills[skillIndex];
    return skill ? skill.isClassSkill(CharGenManager.getSkillClassCode()) : false;
  }

  /**
   * Points per rank: class skills cost 1, cross-class skills cost 2.
   */
  static getSkillPointCost(skillIndex: number): number {
    return CharGenManager.isClassSkill(skillIndex) ? 1 : 2;
  }

  /**
   * Maximum rank: class skills level + 3, cross-class skills floor((level + 3) / 2)
   * (4 and 2 at level 1).
   */
  static getMaxSkillRank(skillIndex: number): number {
    const level = CharGenManager.getSkillLevel();
    return CharGenManager.isClassSkill(skillIndex) ? level + 3 : Math.floor((level + 3) / 2);
  }

  /**
   * Points spent by the working copy.
   */
  static getSpentSkillPoints(): number {
    let spent = 0;
    const count = CharGenManager.getSkillCount();
    for (let i = 0; i < count; i++) {
      spent += CharGenManager.getWorkingSkillRank(i) * CharGenManager.getSkillPointCost(i);
    }
    return spent;
  }

  /**
   * Loads the working copy from the creature's accepted ranks and recomputes the
   * remaining points from the current class / INT pool. Ranks that no longer fit
   * the pool (e.g. INT was lowered after the skills were accepted) are discarded.
   */
  static loadSkillPointsFromCreature() {
    const creature = CharGenManager.selectedCreature;
    const count = CharGenManager.getSkillCount();
    for (let i = 0; i < count; i++) {
      const rank = creature && creature.skills[i] ? creature.skills[i].rank : 0;
      CharGenManager.setWorkingSkillRank(i, rank);
    }

    const pool = CharGenManager.getMaxSkillPoints();
    if(CharGenManager.getSpentSkillPoints() > pool){
      console.warn('CharGenManager.loadSkillPointsFromCreature', 'accepted skill ranks exceed the current point pool; resetting');
      CharGenManager.resetSkillPoints();
      return;
    }

    CharGenManager.availSkillPoints = pool - CharGenManager.getSpentSkillPoints();
  }

  /**
   * Writes the working copy to the creature's accepted ranks.
   */
  static commitSkillPoints() {
    const creature = CharGenManager.selectedCreature;
    if(!creature){ return; }
    const count = CharGenManager.getSkillCount();
    for (let i = 0; i < count; i++) {
      if(creature.skills[i]){
        creature.skills[i].rank = CharGenManager.getWorkingSkillRank(i);
      }
    }
  }

  static canIncreaseSkill(skillIndex: number): boolean {
    return CharGenManager.getWorkingSkillRank(skillIndex) < CharGenManager.getMaxSkillRank(skillIndex)
      && CharGenManager.getSkillPointCost(skillIndex) <= CharGenManager.availSkillPoints;
  }

  static canDecreaseSkill(skillIndex: number): boolean {
    return CharGenManager.getWorkingSkillRank(skillIndex) > 0;
  }

  static increaseSkill(skillIndex: number): boolean {
    if(!CharGenManager.canIncreaseSkill(skillIndex)){ return false; }
    CharGenManager.setWorkingSkillRank(skillIndex, CharGenManager.getWorkingSkillRank(skillIndex) + 1);
    CharGenManager.availSkillPoints = Math.max(0, CharGenManager.availSkillPoints - CharGenManager.getSkillPointCost(skillIndex));
    return true;
  }

  static decreaseSkill(skillIndex: number): boolean {
    if(!CharGenManager.canDecreaseSkill(skillIndex)){ return false; }
    CharGenManager.setWorkingSkillRank(skillIndex, CharGenManager.getWorkingSkillRank(skillIndex) - 1);
    CharGenManager.availSkillPoints += CharGenManager.getSkillPointCost(skillIndex);
    return true;
  }

  static getSkillTableColumn() {
    return CharGenManager.getSkillClassCode().toLowerCase() + '_class';
  }

  static getSkillTableColumnRecommended() {
    return CharGenManager.getSkillClassCode().toLowerCase() + '_reco';
  }

  /**
   * Skill indexes in the class's Recommended pick order (skills.2da <code>_reco,
   * ascending); skills without a _reco value are left out.
   */
  static getRecommendedOrder(): number[] {
    const classCode = CharGenManager.getSkillClassCode();
    const count = CharGenManager.getSkillCount();
    const ranked: { index: number; rank: number }[] = [];
    for (let i = 0; i < count; i++) {
      const skill = GameState.SWRuleSet.skills[i];
      const rank = skill ? skill.getRecommendedRank(classCode) : 0;
      if(rank > 0){
        ranked.push({ index: i, rank: rank });
      }
    }
    ranked.sort((a, b) => (a.rank - b.rank) || (a.index - b.index));
    return ranked.map((entry) => entry.index);
  }

  /**
   * Recommended button: refills the pool and raises the skills to their maximum
   * rank in the class's recommended order for as long as points remain
   * (class skill: 4 ranks for 4 points, cross-class: 2 ranks for 4 points).
   * Leftover points stay unspent. Only the working copy is changed.
   */
  static applyRecommendedSkills() {
    const count = CharGenManager.getSkillCount();
    for (let i = 0; i < count; i++) {
      CharGenManager.setWorkingSkillRank(i, 0);
    }
    CharGenManager.availSkillPoints = CharGenManager.getMaxSkillPoints();

    const order = CharGenManager.getRecommendedOrder();
    for (let i = 0; i < order.length; i++) {
      const skillIndex = order[i];
      //Each iteration raises the rank towards a fixed cap, so this terminates.
      while(CharGenManager.increaseSkill(skillIndex)){}
      if(CharGenManager.availSkillPoints <= 0){
        break;
      }
    }
  }

  /**
   * Random name from the humanm/humanf + humanl LTR tables. An explicit gender
   * (0 male, 1 female) wins; only an omitted gender falls back to the
   * selected creature's.
   */
  static generateRandomName(gender?: number){
    const creature = CharGenManager.selectedCreature;
    if(gender === undefined || gender === null || isNaN(gender)){
      gender = creature ? creature.getGender() : 0;
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