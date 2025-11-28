import { type CreatureClass } from "../combat/CreatureClass";
import { EffectACDecrease, EffectAttackDecrease } from "../effects";
import { ModuleObjectType, TalentObjectType } from "../enums";
import { GameEffectDurationType } from "../enums/effects";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { TwoDAManager } from "../managers/TwoDAManager";
import type { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TwoDAObject } from "../resource/TwoDAObject";
import { BitWise } from "../utility/BitWise";
import { TalentObject } from "./TalentObject";

/**
 * TalentFeat class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TalentFeat.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TalentFeat extends TalentObject {
  rowLabel: number;
  label: string;
  name: number; //TLK
  description: number; //TLK
  icon: string;
  minCharLevel: number;
  minAttackBonus: number;
  minStr: number;
  minDex: number;
  minInt: number;
  minWis: number;
  minSpellLvl: number;
  prereqFeat1: number;
  prereqFeat2: number;
  gainMultiple: number;
  effectsStack: number;
  allClassesCanUse: number;
  declare category: number;
  maxCR: number;
  spellId: number;
  successor: number;
  crValue: number;
  usesPerDay: number;
  masterFeat: number;
  targetSelf: number;
  orReqFeat0: number;
  orReqFeat1: number;
  orReqFeat2: number;
  orReqFeat3: number;
  orReqFeat4: number;
  reqSkill: number;
  constant: string;
  toolsCategories: number;
  hostileFeat: number;
  scdList: number;
  scdGranted: number;
  scdRecom: number;
  solList: number;
  solGranted: number;
  solRecom: number;
  sctList: number;
  sctGranted: number;
  sctRecom: number;
  jcnList: number;
  jcnGranted: number;
  jcnPcGranted: number;
  jcnRecom: number;
  jgdList: number;
  jgdGranted: number;
  jgdPcGranted: number;
  jgdRecom: number;
  jsnList: number;
  jsnGranted: number;
  jsnPcGranted: number;
  jsnRecom: number;
  sasList: number;
  sasGranted: number;
  sasRecom: number;
  sldList: number;
  sldGranted: number;
  sldRecom: number;
  smaList: number;
  smaGranted: number;
  smaRecom: number;
  jwaList: number;
  jwaGranted: number;
  jwaRecom: number;
  jmaList: number;
  jmaGranted: number;
  jmaRecom: number;
  jwmList: number;
  jwmGranted: number;
  jwmRecom: number;
  tecList: number;
  tecGranted: number;
  tecRecom: number;
  drxList: number;
  drxGranted: number;
  drxRecom: number;
  drcList: number;
  drcGranted: number;
  drcRecom: number;
  handmaiden: number;
  baodur: number;
  hanharr: number;
  hk47: number;
  g0t0: number;
  atton: number;
  kreia: number;
  exclusion: number;
  useType: number;
  pips: number;

  nextFeat: TalentFeat;

  constructor( id = 0){
    super(id);
    this.objectType = TalentObjectType.TalentObject | TalentObjectType.TalentFeat;

    //Merge the feat properties from the feat.2da row with this feat
    if(TwoDAManager.datatables.get('feat').rows[this.id]){
      this.apply2DA(TwoDAManager.datatables.get('feat').rows[this.id]);
    }

  }

  setId( value = 0 ){
    this.id = value;
    //Merge the feat properties from the feat.2da row with this feat
    if(TwoDAManager.datatables.get('feat').rows[this.id]){
      this.apply2DA(TwoDAManager.datatables.get('feat').rows[this.id]);
    }
  }

  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject){
    super.useTalentOnObject(oTarget, oCaster);

    //MELEE
    if(this.category == 0x1104){
      oCaster.attackCreature(oTarget, this);
      return;
      // oCaster.actionQueue.add({
      //   type: ActionType.ActionPhysicalAttacks,
      //   object: oTarget,
      //   feat: this.id
      // });
      // oCaster.combatData.lastCombatFeatUsed = this;
    }

    //RANGED
    if(this.category == 0x1111){
      oCaster.attackCreature(oTarget, this);
      return;
      // oCaster.actionQueue.add({
      //   type: ActionType.ActionPhysicalAttacks,
      //   object: oTarget,
      //   feat: this.id
      // });
      // oCaster.combatData.lastCombatFeatUsed = this;
    }

  }

  inRange(oTarget: ModuleObject, oCaster: ModuleObject){
    if(oTarget == oCaster){
      return true;
    }
    let distance = oCaster.position.distanceTo(oTarget.position);
    let rangeTolerance = 0.25;

    //MELEE
    if(this.category == 0x1104){
      return distance <= 2.0 + rangeTolerance;
    }

    //RANGED
    if(this.category == 0x1111){
      return distance <= 15.0 + rangeTolerance;
    }

    return true;
  }

  getCastRange(){
    //MELEE
    if(this.category == 0x1104){
      return 2.0;
    }

    //RANGED
    if(this.category == 0x1111){
      return 15;
    }

    return 1;
  }
  
  impactCaster(object: ModuleObject){
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)) return;

    let armorClassPenalty = 0;
    let armorClassPenaltyDuration = 3000;
    let attackPenalty = 0;
    let attackPenatlyDuration = 3000;

    switch(this.id){
      case 11: //FLURRY
      case 30: //RAPID SHOT
        armorClassPenalty = 4;
        attackPenalty = 4;
      break;
      case 91: //IMPROVED FLURRY
      case 92: //IMPROVED RAPID SHOT
        armorClassPenalty = 2;
        attackPenalty = 2;
      break;
      case 51: //MASTER FLURRY
      case 21: //MASTER RAPID SHOT
        armorClassPenalty = 1;
        attackPenalty = 1;
      break;
      case 28: //CRITICAL STRIKE
      case 19: //IMPROVED CRITICAL STRIKE
      case 81: //MASTER CRITICAL STRIKE
        armorClassPenalty = 5;
      break;
      case 8: //POWER ATTACK
        attackPenalty = 3;
      break;
      case 17: //IMPROVED POWER ATTACK
        attackPenalty = 3;
      break;
      case 83: //MASTER POWER ATTACK
        attackPenalty = 3;
      break;
      case 29: //POWER BLAST
        attackPenalty = 3;
      break;
      case 18: //IMPROVED POWER BLAST
        attackPenalty = 3;
      break;
      case 82: //MASTER POWER BLAST
        attackPenalty = 3;
      break;
    }

    if(armorClassPenalty > 0){
      const acDecreaseEffect = new EffectACDecrease();
      acDecreaseEffect.setDurationType(GameEffectDurationType.TEMPORARY);
      acDecreaseEffect.setDuration(armorClassPenaltyDuration);
      acDecreaseEffect.setInt(1, armorClassPenalty);
      object.addEffect(acDecreaseEffect);
    }

    if(attackPenalty > 0){
      const attackDecreaseEffect = new EffectAttackDecrease();
      attackDecreaseEffect.setDurationType(GameEffectDurationType.TEMPORARY);
      attackDecreaseEffect.setDuration(attackPenatlyDuration);
      attackDecreaseEffect.setInt(0, attackPenalty);
      object.addEffect(attackDecreaseEffect);
    }

  }

  impactTarget(object: ModuleObject){
    // if(!(object instanceof ModuleCreature)) return;

  }

  getGranted(classData: CreatureClass): number {
    switch(classData.skillstable){
      case 'scd':
        return this.scdGranted;
      case 'sol':
        return this.solGranted;
      case 'sct':
        return this.sctGranted;
      case 'jcn':
        return this.jcnGranted;
      case 'jgd':
        return this.jgdGranted;
      case 'jsn':
        return this.jsnGranted; 
      case 'sas':
        return this.sasGranted;
      case 'sld':
        return this.sldGranted;
      case 'sma':
        return this.smaGranted;   
      case 'jwa':
        return this.jwaGranted;
      case 'jma':
        return this.jmaGranted;
      case 'jwm':
        return this.jwmGranted; 
      case 'tec':
        return this.tecGranted;
      case 'drx':
        return this.drxGranted;
      case 'drc':
        return this.drcGranted; 
      default:
        return -1;
    }
  }

  getRecom(classData: CreatureClass): number {
    switch(classData.skillstable){
      case 'scd':
        return this.scdRecom;
      case 'sol':
        return this.solRecom; 
      case 'sct':
        return this.sctRecom;
      case 'jcn':
        return this.jcnRecom;
      case 'jgd':
        return this.jgdRecom; 
      case 'jsn':
        return this.jsnRecom;
      case 'sas':
        return this.sasRecom;
      case 'sld':
        return this.sldRecom;   
      case 'sma':
        return this.smaRecom;
      case 'jwa':
        return this.jwaRecom;
      case 'jma':
        return this.jmaRecom;
      case 'jwm':
        return this.jwmRecom;
      case 'tec':
        return this.tecRecom;
      case 'drx':
        return this.drxRecom;
      case 'drc':
        return this.drcRecom;
      default:
        return -1;
    }
  }

  getList(classData: CreatureClass): number {
    switch(classData.skillstable){
      case 'scd':
        return this.scdList;
      case 'sol':
        return this.solList;
      case 'sct':
        return this.sctList;
      case 'jcn':
        return this.jcnList;
      case 'jgd':
        return this.jgdList;
      case 'jsn':
        return this.jsnList;
      case 'sas':
        return this.sasList;
      case 'sld':
        return this.sldList;
      case 'sma':
        return this.smaList;
      case 'jwa':
        return this.jwaList;
      case 'jma':
        return this.jmaList;  
      case 'jwm':
        return this.jwmList;
      case 'tec':
        return this.tecList;
      case 'drx':
        return this.drxList;
      case 'drc':
        return this.drcList;
      default:
        return -1;
    }
  }

  apply2DA(row: any = {}){
    if (row.hasOwnProperty('__rowlabel'))
      this.rowLabel = TwoDAObject.normalizeValue(row.__rowlabel, 'number', 0);

    if (row.hasOwnProperty('label'))
      this.label = TwoDAObject.normalizeValue(row.label, 'string', '');

    if (row.hasOwnProperty('name'))
      this.name = TwoDAObject.normalizeValue(row.name, 'number', -1);

    if (row.hasOwnProperty('description'))
      this.description = TwoDAObject.normalizeValue(row.description, 'number', -1);

    if (row.hasOwnProperty('icon'))
      this.icon = TwoDAObject.normalizeValue(row.icon, 'string', '');

    if (row.hasOwnProperty('mincharlevel'))
      this.minCharLevel = TwoDAObject.normalizeValue(row.mincharlevel, 'number', 0);

    if (row.hasOwnProperty('minattackbonus'))
      this.minAttackBonus = TwoDAObject.normalizeValue(row.minattackbonus, 'number', -1);

    if (row.hasOwnProperty('minstr'))
      this.minStr = TwoDAObject.normalizeValue(row.minstr, 'number', -1);

    if (row.hasOwnProperty('mindex'))
      this.minDex = TwoDAObject.normalizeValue(row.mindex, 'number', -1);

    if (row.hasOwnProperty('minint'))
      this.minInt = TwoDAObject.normalizeValue(row.minint, 'number', -1);

    if (row.hasOwnProperty('minwis'))
      this.minWis = TwoDAObject.normalizeValue(row.minwis, 'number', -1);

    if (row.hasOwnProperty('minspelllvl'))
      this.minSpellLvl = TwoDAObject.normalizeValue(row.minspelllvl, 'number', -1);

    if (row.hasOwnProperty('prereqfeat1'))
      this.prereqFeat1 = TwoDAObject.normalizeValue(row.prereqfeat1, 'number', -1);

    if (row.hasOwnProperty('prereqfeat2'))
      this.prereqFeat2 = TwoDAObject.normalizeValue(row.prereqfeat2, 'number', -1);

    if (row.hasOwnProperty('gainmultiple'))
      this.gainMultiple = TwoDAObject.normalizeValue(row.gainmultiple, 'number', 0);

    if (row.hasOwnProperty('effectsstack'))
      this.effectsStack = TwoDAObject.normalizeValue(row.effectsstack, 'number', 0);

    if (row.hasOwnProperty('allclassescanuse'))
      this.allClassesCanUse = TwoDAObject.normalizeValue(row.allclassescanuse, 'number', 0);

    if (row.hasOwnProperty('category'))
      this.category = TwoDAObject.normalizeValue(row.category, 'number', -1);

    if (row.hasOwnProperty('maxcr'))
      this.maxCR = TwoDAObject.normalizeValue(row.maxcr, 'number', -1);

    if (row.hasOwnProperty('spellid'))
      this.spellId = TwoDAObject.normalizeValue(row.spellid, 'number', -1);

    if (row.hasOwnProperty('successor'))
      this.successor = TwoDAObject.normalizeValue(row.successor, 'number', -1);

    if (row.hasOwnProperty('crvalue'))
      this.crValue = TwoDAObject.normalizeValue(row.crvalue, 'number', -1);

    if (row.hasOwnProperty('usesperday'))
      this.usesPerDay = TwoDAObject.normalizeValue(row.usesperday, 'number', -1);

    if (row.hasOwnProperty('masterfeat'))
      this.masterFeat = TwoDAObject.normalizeValue(row.masterfeat, 'number', -1);

    if (row.hasOwnProperty('targetself'))
      this.targetSelf = TwoDAObject.normalizeValue(row.targetself, 'number', -1);

    if (row.hasOwnProperty('orreqfeat0'))
      this.orReqFeat0 = TwoDAObject.normalizeValue(row.orreqfeat0, 'number', -1);

    if (row.hasOwnProperty('orreqfeat1'))
      this.orReqFeat1 = TwoDAObject.normalizeValue(row.orreqfeat1, 'number', -1);

    if (row.hasOwnProperty('orreqfeat2'))
      this.orReqFeat2 = TwoDAObject.normalizeValue(row.orreqfeat2, 'number', -1);

    if (row.hasOwnProperty('orreqfeat3'))
      this.orReqFeat3 = TwoDAObject.normalizeValue(row.orreqfeat3, 'number', -1);

    if (row.hasOwnProperty('orreqfeat4'))
      this.orReqFeat4 = TwoDAObject.normalizeValue(row.orreqfeat4, 'number', -1);

    if (row.hasOwnProperty('reqskill'))
      this.reqSkill = TwoDAObject.normalizeValue(row.reqskill, 'number', -1);

    if (row.hasOwnProperty('constant'))
      this.constant = TwoDAObject.normalizeValue(row.constant, 'string', '');

    if (row.hasOwnProperty('toolscategories'))
      this.toolsCategories = TwoDAObject.normalizeValue(row.toolscategories, 'number', 0);

    if (row.hasOwnProperty('hostilefeat'))
      this.hostileFeat = TwoDAObject.normalizeValue(row.hostilefeat, 'number', -1);

    // Add parsing for the new properties
    if (row.hasOwnProperty('scd_list'))
      this.scdList = TwoDAObject.normalizeValue(row.scd_list, 'number', -1);

    if (row.hasOwnProperty('scd_granted'))
      this.scdGranted = TwoDAObject.normalizeValue(row.scd_granted, 'number', -1);

    if (row.hasOwnProperty('scd_recom'))
      this.scdRecom = TwoDAObject.normalizeValue(row.scd_recom, 'number', -1);

    if (row.hasOwnProperty('sol_list'))
      this.solList = TwoDAObject.normalizeValue(row.sol_list, 'number', -1);

    if (row.hasOwnProperty('sol_granted'))
      this.solGranted = TwoDAObject.normalizeValue(row.sol_granted, 'number', -1);

    if (row.hasOwnProperty('sol_recom'))
      this.solRecom = TwoDAObject.normalizeValue(row.sol_recom, 'number', -1);

    if (row.hasOwnProperty('sct_list'))
      this.sctList = TwoDAObject.normalizeValue(row.sct_list, 'number', -1);

    if (row.hasOwnProperty('sct_granted'))
      this.sctGranted = TwoDAObject.normalizeValue(row.sct_granted, 'number', -1);

    if (row.hasOwnProperty('sct_recom'))
      this.sctRecom = TwoDAObject.normalizeValue(row.sct_recom, 'number', -1);

    if (row.hasOwnProperty('jcn_list'))
      this.jcnList = TwoDAObject.normalizeValue(row.jcn_list, 'number', -1);

    if (row.hasOwnProperty('jcn_granted'))
      this.jcnGranted = TwoDAObject.normalizeValue(row.jcn_granted, 'number', -1);

    if (row.hasOwnProperty('jcn_pc_granted'))
      this.jcnPcGranted = TwoDAObject.normalizeValue(row.jcn_pc_granted, 'number', -1);

    if (row.hasOwnProperty('jcn_recom'))
      this.jcnRecom = TwoDAObject.normalizeValue(row.jcn_recom, 'number', -1);

    if (row.hasOwnProperty('jgd_list'))
      this.jgdList = TwoDAObject.normalizeValue(row.jgd_list, 'number', -1);

    if (row.hasOwnProperty('jgd_granted'))
      this.jgdGranted = TwoDAObject.normalizeValue(row.jgd_granted, 'number', -1);

    if (row.hasOwnProperty('jgd_pc_granted'))
      this.jgdPcGranted = TwoDAObject.normalizeValue(row.jgd_pc_granted, 'number', -1);

    if (row.hasOwnProperty('jgd_recom'))
      this.jgdRecom = TwoDAObject.normalizeValue(row.jgd_recom, 'number', -1);

    if (row.hasOwnProperty('jsn_list'))
      this.jsnList = TwoDAObject.normalizeValue(row.jsn_list, 'number', -1);

    if (row.hasOwnProperty('jsn_granted'))
      this.jsnGranted = TwoDAObject.normalizeValue(row.jsn_granted, 'number', -1);

    if (row.hasOwnProperty('jsn_pc_granted'))
      this.jsnPcGranted = TwoDAObject.normalizeValue(row.jsn_pc_granted, 'number', -1);

    if (row.hasOwnProperty('jsn_recom'))
      this.jsnRecom = TwoDAObject.normalizeValue(row.jsn_recom, 'number', -1);

    if (row.hasOwnProperty('sas_list'))
      this.sasList = TwoDAObject.normalizeValue(row.sas_list, 'number', -1);

    if (row.hasOwnProperty('sas_granted'))
      this.sasGranted = TwoDAObject.normalizeValue(row.sas_granted, 'number', -1);

    if (row.hasOwnProperty('sas_recom'))
      this.sasRecom = TwoDAObject.normalizeValue(row.sas_recom, 'number', -1);

    if (row.hasOwnProperty('sld_list'))
      this.sldList = TwoDAObject.normalizeValue(row.sld_list, 'number', -1);

    if (row.hasOwnProperty('sld_granted'))
      this.sldGranted = TwoDAObject.normalizeValue(row.sld_granted, 'number', -1);

    if (row.hasOwnProperty('sld_recom'))
      this.sldRecom = TwoDAObject.normalizeValue(row.sld_recom, 'number', -1);

    if (row.hasOwnProperty('sma_list'))
      this.smaList = TwoDAObject.normalizeValue(row.sma_list, 'number', -1);

    if (row.hasOwnProperty('sma_granted'))
      this.smaGranted = TwoDAObject.normalizeValue(row.sma_granted, 'number', -1);

    if (row.hasOwnProperty('sma_recom'))
      this.smaRecom = TwoDAObject.normalizeValue(row.sma_recom, 'number', -1);

    if (row.hasOwnProperty('jwa_list'))
      this.jwaList = TwoDAObject.normalizeValue(row.jwa_list, 'number', -1);

    if (row.hasOwnProperty('jwa_granted'))
      this.jwaGranted = TwoDAObject.normalizeValue(row.jwa_granted, 'number', -1);

    if (row.hasOwnProperty('jwa_recom'))
      this.jwaRecom = TwoDAObject.normalizeValue(row.jwa_recom, 'number', -1);

    if (row.hasOwnProperty('jma_list'))
      this.jmaList = TwoDAObject.normalizeValue(row.jma_list, 'number', -1);

    if (row.hasOwnProperty('jma_granted'))
      this.jmaGranted = TwoDAObject.normalizeValue(row.jma_granted, 'number', -1);

    if (row.hasOwnProperty('jma_recom'))
      this.jmaRecom = TwoDAObject.normalizeValue(row.jma_recom, 'number', -1);

    if (row.hasOwnProperty('jwm_list'))
      this.jwmList = TwoDAObject.normalizeValue(row.jwm_list, 'number', -1);

    if (row.hasOwnProperty('jwm_granted'))
      this.jwmGranted = TwoDAObject.normalizeValue(row.jwm_granted, 'number', -1);

    if (row.hasOwnProperty('jwm_recom'))
      this.jwmRecom = TwoDAObject.normalizeValue(row.jwm_recom, 'number', -1);

    if (row.hasOwnProperty('tec_list'))
      this.tecList = TwoDAObject.normalizeValue(row.tec_list, 'number', -1);

    if (row.hasOwnProperty('tec_granted'))
      this.tecGranted = TwoDAObject.normalizeValue(row.tec_granted, 'number', -1);

    if (row.hasOwnProperty('tec_recom'))
      this.tecRecom = TwoDAObject.normalizeValue(row.tec_recom, 'number', -1);

    if (row.hasOwnProperty('drx_list'))
      this.drxList = TwoDAObject.normalizeValue(row.drx_list, 'number', -1);

    if (row.hasOwnProperty('drx_granted'))
      this.drxGranted = TwoDAObject.normalizeValue(row.drx_granted, 'number', -1);

    if (row.hasOwnProperty('drx_recom'))
      this.drxRecom = TwoDAObject.normalizeValue(row.drx_recom, 'number', -1);

    if (row.hasOwnProperty('drc_list'))
      this.drcList = TwoDAObject.normalizeValue(row.drc_list, 'number', -1);

    if (row.hasOwnProperty('drc_granted'))
      this.drcGranted = TwoDAObject.normalizeValue(row.drc_granted, 'number', -1);

    if (row.hasOwnProperty('drc_recom'))
      this.drcRecom = TwoDAObject.normalizeValue(row.drc_recom, 'number', -1);

    if (row.hasOwnProperty('handmaiden'))
      this.handmaiden = TwoDAObject.normalizeValue(row.handmaiden, 'number', 0);

    if (row.hasOwnProperty('baodur'))
      this.baodur = TwoDAObject.normalizeValue(row.baodur, 'number', 0);

    if (row.hasOwnProperty('hanharr'))
      this.hanharr = TwoDAObject.normalizeValue(row.hanharr, 'number', 0);

    if (row.hasOwnProperty('hk47'))
      this.hk47 = TwoDAObject.normalizeValue(row.hk47, 'number', 0);

    if (row.hasOwnProperty('g0t0'))
      this.g0t0 = TwoDAObject.normalizeValue(row.g0t0, 'number', 0);

    if (row.hasOwnProperty('atton'))
      this.atton = TwoDAObject.normalizeValue(row.atton, 'number', 0);

    if (row.hasOwnProperty('kreia'))
      this.kreia = TwoDAObject.normalizeValue(row.kreia, 'number', 0);

    if (row.hasOwnProperty('exclusion'))
      this.exclusion = TwoDAObject.normalizeValue(row.exclusion, 'number', 0);

    if (row.hasOwnProperty('usetype'))
      this.useType = TwoDAObject.normalizeValue(row.usetype, 'number', -1);

    if (row.hasOwnProperty('pips'))
      this.pips = TwoDAObject.normalizeValue(row.pips, 'number', -1);
  }

  static From2DA(row: any = {}) {
    const talentFeat = new TalentFeat();
    talentFeat.apply2DA(row);
    return talentFeat;
  }

  save(){
    let featStruct = new GFFStruct(1);
    featStruct.addField( new GFFField(GFFDataType.WORD, 'Feat') ).setValue(this.getId());
    return featStruct;
  }

}
