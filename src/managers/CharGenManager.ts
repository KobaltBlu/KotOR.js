import { AudioLoader } from "../audio/AudioLoader";
import { GameEngineType } from "../enums/engine/GameEngineType";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { CharGenClasses } from "../game/CharGenClasses";
import { GameState } from "../GameState";
import { LBL_3DView } from "../gui";
import { ModuleCreature, ModulePlayer } from "../module";
import { OdysseyModel } from "../odyssey";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { OdysseyModel3D } from "../three/odyssey";
import { MenuManager } from "./MenuManager";
import { TwoDAManager } from "./TwoDAManager";

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

  static async Start(){
    await MenuManager.LoadScreen.setLoadBackground('load_chargen');
    MenuManager.LoadScreen.Open();
    MenuManager.LoadScreen.setHintMessage('');
    await CharGenManager.StartBackgroundMusic();
    await CharGenManager.Init();
    await MenuManager.CharGenClass.Init();
    MenuManager.LoadScreen.Close();
    MenuManager.CharGenClass.Open();
  }

  static StartBackgroundMusic(){
    return new Promise<void>( (resolve, reject) => {
      let audioResRef = GameState.GameKey == GameEngineType.KOTOR ? 'mus_theme_rep' : 'mus_a_main';
      AudioLoader.LoadMusic(audioResRef, (data: any) => {
        GameState.audioEngine.SetBackgroundMusic(data);
        resolve();
      }, () => {
        resolve();
      });
    });
  }

  static async Init(){
    return new Promise<void>( async (resolve, reject) => {
      CharGenManager.InitializeCreatureTemplate();
      CharGenManager.InitCharBackgroundModel().then( () => {
        resolve();
      });
    });
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
      GameState.ModelLoader.load('cgmain_light')
      .then((mdl: OdysseyModel) => {
        CharGenManager.cgmain_light = mdl;
        resolve();
      }).catch(resolve);
    });
  }

  static LoadCGBodyLight(){
    return new Promise<void>((resolve, reject) => {
      GameState.ModelLoader.load('cgbody_light')
      .then((mdl: OdysseyModel) => {
        CharGenManager.cgbody_light = mdl;
        resolve();
      }).catch(resolve);
    });
  }

  static LoadCGHeadLight(){
    return new Promise<void>((resolve, reject) => {
      GameState.ModelLoader.load('cghead_light')
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
      CharGenManager.creatures.set(i, new ModulePlayer(template));
    }
    let template = CharGenManager.templates.get(CharGenManager.selectedClass);
    CharGenManager.selectedCreature = new ModulePlayer(template);
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
    const portraits2DA = TwoDAManager.datatables.get('portraits');
    if(portraits2DA){
      for (let i = 0; i < portraits2DA.RowCount; i++) {
        let port = portraits2DA.rows[i];
        if (parseInt(port['appearancenumber']) == appearanceIdx) {
          portraitId = i;
          break;
        } else if (parseInt(port['appearance_l']) == appearanceIdx) {
          portraitId = i;
          break;
        } else if (parseInt(port['appearance_s']) == appearanceIdx) {
          portraitId = i;
          break;
        }
      }
    }
    template.RootNode.AddField(new GFFField(GFFDataType.INT, 'AIState')).SetValue(appearanceIdx);
    template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'ActionList'));
    template.RootNode.AddField(new GFFField(GFFDataType.INT, 'Age')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'AmbientAnimState')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.INT, 'Animation')).SetValue(10000);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Appearance_Head')).SetValue(1);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'Appearance_Type')).SetValue(appearanceIdx);
    template.RootNode.AddField(new GFFField(GFFDataType.SHORT, 'ArmorClass')).SetValue(10);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'BodyBag')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'FactionID')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'PortraitId')).SetValue(portraitId);
    template.RootNode.AddField(new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName')).SetValue('New Player');
    template.RootNode.AddField(new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName'));
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'HitPoints')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'CurrentHitPoints')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'MaxHitPoints')).SetValue(20);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'ForcePoints')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'CurrentForce')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Gender')).SetValue(nth < 3 ? 0 : 1);
    let equipment = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'Equip_ItemList'));
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptAttacked')).SetValue('k_hen_attacked01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDamaged')).SetValue('k_hen_damage01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDeath')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDialogue')).SetValue('k_hen_dialogue01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptDisturbed')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptEndRound')).SetValue('k_hen_combend01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat')).SetValue('k_hen_heartbt01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked')).SetValue('k_hen_blocked01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptOnNotice')).SetValue('k_hen_percept01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptRested')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptSpawn')).SetValue('k_hen_spawn01');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptSpellAt')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'ScriptUserDefine')).SetValue('');
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'GoodEvil')).SetValue(50);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'NaturalAC')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Con')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Dex')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Str')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Wis')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Cha')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Int')).SetValue(8);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'fortbonus')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'refbonus')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'willbonus')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'PerceptionRange')).SetValue(13);
    let skillList = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'SkillList'));
    for (let i = 0; i < 8; i++) {
      let _skill = new GFFStruct();
      _skill.AddField(new GFFField(GFFDataType.BYTE, 'Rank')).SetValue(0);
      skillList.AddChildStruct(_skill);
    }
    let classList = template.RootNode.AddField(new GFFField(GFFDataType.LIST, 'ClassList'));
    let classStruct = new GFFStruct();
    classStruct.AddField(new GFFField(GFFDataType.INT, 'Class')).SetValue(classId);
    classStruct.AddField(new GFFField(GFFDataType.SHORT, 'ClassLevel')).SetValue(1);
    classStruct.AddField(new GFFField(GFFDataType.LIST, 'KnownList0'));
    classList.AddChildStruct(classStruct);
    let armorStruct = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
    armorStruct.AddField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).SetValue('g_a_clothes01');
    equipment.AddChildStruct(armorStruct);
    if (appearanceIdx >= 91 && appearanceIdx <= 105) {
      template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(83);
    } else if (appearanceIdx >= 106 && appearanceIdx <= 120) {
      template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(82);
    } else if (appearanceIdx >= 121 && appearanceIdx <= 135) {
      template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(83);
    } else if (appearanceIdx >= 136 && appearanceIdx <= 150) {
      template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(85);
    } else if (appearanceIdx >= 151 && appearanceIdx <= 165) {
      template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(84);
    } else if (appearanceIdx >= 166 && appearanceIdx <= 180) {
      template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(85);
    } else {
      template.RootNode.AddField(new GFFField(GFFDataType.WORD, 'SoundSetFile')).SetValue(nth < 3 ? 85 : 83);
    }
    template.RootNode.AddField(new GFFField(GFFDataType.BYTE, 'Race')).SetValue(6);
    template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'XPosition')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'YPosition')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'XOrientation')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'YOrientation')).SetValue(0);
    template.RootNode.AddField(new GFFField(GFFDataType.FLOAT, 'ZOrientation')).SetValue(0);
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
    return 10 + parseInt(CharGenManager.selectedCreature.classes[0].skillpointbase);
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

}