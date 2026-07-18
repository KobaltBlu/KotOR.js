import { TwoDAManager } from "@/managers/TwoDAManager";
import { AudioLoader } from "@/audio/AudioLoader";
import { GameEngineType } from "@/enums/engine";
import { computeSkillPointsGained, getCreatureSkillPointBase } from "@/engine/rules/skill-points";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CharGenClasses } from "@/game/CharGenClasses";
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

  static step1_complete: boolean = false;
  static step2_complete: boolean = false;
  static step3_complete: boolean = false;
  static step4_complete: boolean = false;
  static step5_complete: boolean = false;
  static step6_complete: boolean = false;

  static ltrMaleName: LTRObject;
  static ltrFemaleName: LTRObject;
  static ltrLastName: LTRObject;

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
    let classId = 0;
    switch (nth) {
    case 0:
      classId = 2;
      break;
    case 1:
      classId = 1;
      break;
    case 2:
      classId = 0;
      break;
    case 3:
      classId = 0;
      break;
    case 4:
      classId = 1;
      break;
    case 5:
      classId = 2;
      break;
    }
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
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'HitPoints')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'CurrentHitPoints')).setValue(8);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'MaxHitPoints')).setValue(20);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'ForcePoints')).setValue(0);
    template.RootNode.addField(new GFFField(GFFDataType.WORD, 'CurrentForce')).setValue(0);
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
    if (appearanceIdx >= 91 && appearanceIdx <= 105) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(83);
    } else if (appearanceIdx >= 106 && appearanceIdx <= 120) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(82);
    } else if (appearanceIdx >= 121 && appearanceIdx <= 135) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(83);
    } else if (appearanceIdx >= 136 && appearanceIdx <= 150) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(85);
    } else if (appearanceIdx >= 151 && appearanceIdx <= 165) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(84);
    } else if (appearanceIdx >= 166 && appearanceIdx <= 180) {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(85);
    } else {
      template.RootNode.addField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).setValue(nth < 3 ? 85 : 83);
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

  /** Retail AddSkillPointsPerLevel for first-level CharGen. */
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

  static getSkillTableColumn() {
    return CharGenManager.selectedCreature.classes[0].skillstable.toLowerCase() + '_class';
  }

  static getSkillTableColumnRecommended() {
    return CharGenManager.selectedCreature.classes[0].skillstable.toLowerCase() + '_reco';
  }

  /** Returns skill indices in recommended spend order (-1 = unused slot). */
  static getRecommendedOrder(): number[] {
    const skillOrder: number[] = [-1, -1, -1, -1, -1, -1, -1, -1];
    const table = TwoDAManager.datatables.get('skills');
    if(!table) return skillOrder;

    for (let i = 0; i < 8; i++) {
      const value = table.rows[i][this.getSkillTableColumnRecommended()];
      if (value != '****' && value != null && value !== '') {
        const order = parseInt(String(value), 10) - 1;
        if(order >= 0 && order < 8){
          skillOrder[order] = i;
        }
      }
    }
    return skillOrder;
  }

  static generateRandomName(gender: number = 0){
    const creature = CharGenManager.selectedCreature;
    if(creature && !gender){
      gender = creature.getGender();
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