import { TwoDAManager } from "./TwoDAManager";
import { AudioLoader } from "../audio/AudioLoader";
import { GameEngineType } from "../enums/engine";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { CharGenClasses } from "../game/CharGenClasses";
import { GameState } from "../GameState";
import { LBL_3DView } from "../gui";
import type { ModulePlayer } from "../module/ModulePlayer";
import { OdysseyModel } from "../odyssey";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { OdysseyModel3D } from "../three/odyssey";
import { AudioEngine } from "../audio/AudioEngine";
import { LTRObject } from "../resource/LTRObject";
import { MDLLoader, ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";

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
    await GameState.MenuManager.CharGenClass.Init();
    GameState.MenuManager.LoadScreen.close();
    GameState.MenuManager.CharGenClass.open();
  }

  static StartBackgroundMusic(){
    return new Promise<void>( (resolve, reject) => {
      let audioResRef = GameState.GameKey == GameEngineType.KOTOR ? 'mus_theme_rep' : 'mus_a_main';
      AudioLoader.LoadMusic(audioResRef).then((data: ArrayBuffer) => {
        AudioEngine.GetAudioEngine().setAudioBuffer('BACKGROUND_MUSIC', data);
        AudioEngine.GetAudioEngine().areaMusicAudioEmitter.play();
        resolve();
      }, () => {
        resolve();
      });
    });
  }

  static async Init(){
    CharGenManager.ltrMaleName = new LTRObject(await ResourceLoader.loadResource(ResourceTypes.ltr, 'humanm'));
    CharGenManager.ltrFemaleName = new LTRObject(await ResourceLoader.loadResource(ResourceTypes.ltr, 'humanf'));
    CharGenManager.ltrLastName = new LTRObject(await ResourceLoader.loadResource(ResourceTypes.ltr, 'humanl'));
    CharGenManager.InitializeCreatureTemplate();
    await CharGenManager.InitCharBackgroundModel();
  }

  static InitCharBackgroundModel(){
    return new Promise<void>((resolve, reject) => {
      CharGenManager.LoadCGMainLight().then(() => {
        CharGenManager.LoadCGBodyLight().then(() => {
          CharGenManager.LoadCGHeadLight().then(() => {
            resolve();
          });
        });
      });
    });
  }

  static LoadCGMainLight(){
    return new Promise<void>((resolve, reject) => {
      MDLLoader.loader.load('cgmain_light')
      .then((mdl: OdysseyModel) => {
        CharGenManager.cgmain_light = mdl;
        resolve();
      }).catch(resolve);
    });
  }

  static LoadCGBodyLight(){
    return new Promise<void>((resolve, reject) => {
      MDLLoader.loader.load('cgbody_light')
      .then((mdl: OdysseyModel) => {
        CharGenManager.cgbody_light = mdl;
        resolve();
      }).catch(resolve);
    });
  }

  static LoadCGHeadLight(){
    return new Promise<void>((resolve, reject) => {
      MDLLoader.loader.load('cghead_light')
      .then((mdl: OdysseyModel) => {
        CharGenManager.cghead_light = mdl;
        resolve();
      }).catch(resolve);
    });
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

  

  static resetSkillPoints() {
    for (let i = 0; i < 8; i++) {
      CharGenManager.selectedCreature.skills[i].rank = 0;
    }
    CharGenManager.computerUse = CharGenManager.selectedCreature.skills[0].rank;
    CharGenManager.demolitions = CharGenManager.selectedCreature.skills[1].rank;
    CharGenManager.stealth = CharGenManager.selectedCreature.skills[2].rank;
    CharGenManager.awareness = CharGenManager.selectedCreature.skills[3].rank;
    CharGenManager.persuade = CharGenManager.selectedCreature.skills[4].rank;
    CharGenManager.repair = CharGenManager.selectedCreature.skills[5].rank;
    CharGenManager.security = CharGenManager.selectedCreature.skills[6].rank;
    CharGenManager.treatInjury = CharGenManager.selectedCreature.skills[7].rank;
  }

  

  static getMaxSkillPoints() {
    return 10 + parseInt(CharGenManager.selectedCreature.classes[0].skillpointbase as any);
  }

  static getSkillTableColumn() {
    return CharGenManager.selectedCreature.classes[0].skillstable.toLowerCase() + '_class';
  }

  static getSkillTableColumnRecommended() {
    return CharGenManager.selectedCreature.classes[0].skillstable.toLowerCase() + '_reco';
  }

  static getRecommendedOrder() {
    let skillOrder: any = {
      '0': -1,
      '1': -1,
      '2': -1,
      '3': -1,
      '4': -1,
      '5': -1,
      '6': -1,
      '7': -1
    };
    
    for (let i = 0; i < 8; i++) {
      let value = TwoDAManager.datatables.get('skills').rows[i][this.getSkillTableColumnRecommended()];
      if (value != '****') {
        skillOrder[value - 1] = i;
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