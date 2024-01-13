import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentObject } from "./TalentObject";
import type { ModuleObject } from "../module";
import { OdysseyModel3D } from "../three/odyssey";
import { TwoDAManager } from "../managers/TwoDAManager";
import { ActionType } from "../enums/actions/ActionType";
import { ActionCombat } from "../actions/ActionCombat";
import { CombatRoundAction, SpellCastInstance } from "../combat";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { TalentObjectType } from "../enums/engine/TalentObjectType";

export class TalentSpell extends TalentObject {
  conjtime: string;
  casttime: string;
  catchtime: string;
  conjanim: string;
  hostilesetting: number;
  iconresref: any;
  projectileHook: any;
  projectileOrigin: any;
  projectileTarget: any;
  projectileCurve: any;
  projmodel: string;
  projectile: any;
  castTimeProgress: number;
  projectileDistance: any;
  range: string;
  casthandmodel: OdysseyModel3D;
  impactscript: string;
  casthandvisual: string;
  flags: number;

  constructor( id = 0 ){
    super(id);
    this.objectType = TalentObjectType.TalentObject | TalentObjectType.TalentSpell;

    //Merge the spell properties from the spells.2da row with this spell
    if(TwoDAManager.datatables.get('spells').rows[this.id]){
      Object.assign(this, TwoDAManager.datatables.get('spells').rows[this.id]);
    }

  }

  setId( value = 0 ){
    this.id = value;
    //Merge the spell properties from the spells.2da row with this spell
    if(TwoDAManager.datatables.get('spells').rows[this.id]){
      Object.assign(this, TwoDAManager.datatables.get('spells').rows[this.id]);
    }
  }

  getConjureTime(){
    return this.conjtime != '****' ? parseInt(this.conjtime) : 0;
  }

  getCastTime(){
    return this.casttime != '****' ? parseInt(this.casttime) : 0;
  }

  getCatchTime(){
    return this.catchtime != '****' ? parseInt(this.catchtime) : 0;
  }

  getConjureAnimation(){
    if(this.conjanim == 'throw'){
      if(this.id == 4 || this.id == 46){
        return 'throwsab';
      }else{
        return 'throwgren';

        //throwgen1 is an unnder-handed throw. I think it's used if the target is close
        //this.conjanim = 'throwgen1';
      }
    }

    if(this.conjanim == 'up'){
      return 'castout3';
    }
    return 'castout1';
  }

  getCastingAnimation(){
    if(this.conjanim == 'throw'){
      if(this.id == 4 || this.id == 46){
        return 'throwsablp';
      }else{
        return '';

        //throwgen1 is an unnder-handed throw. I think it's used if the target is close
        //this.conjanim = 'throwgen1';
      }
    }

    if(this.conjanim == 'up'){
      return 'castoutlp3';
    }
    return 'castoutlp1';
  }

  getCasterAnimation(){
    
  }

  getImpactAnimation(){
    
  }

  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject){
    super.useTalentOnObject(oTarget, oCaster);

    console.log('Talent.useTalentOnObject', this);
    
    oCaster.combatData.lastSpellTarget = oTarget;
    oTarget.combatData.lastSpellAttacker = oCaster;
    if(this.hostilesetting == 1){
      oCaster.resetExcitedDuration();
    }

    const combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.CAST_SPELL;
    combatAction.target = oTarget;
    combatAction.setSpell(this);
    combatAction.animation = ModuleCreatureAnimState.CASTOUT1;
    combatAction.animationName = this.getConjureAnimation();
    combatAction.animationTime = 1500;

    combatAction.addSpellInstance(
      new SpellCastInstance(combatAction.owner, combatAction.target, this)
    );

    oCaster.combatRound.addAction(combatAction);

    if(!oCaster.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new ActionCombat(0xFFFF);
      oCaster.actionQueue.add(action);
    }

  }

  inRange(oTarget: ModuleObject, oCaster: ModuleObject){
    if(oTarget == oCaster){
      return true;
    }
    let distance = oCaster.position.distanceTo(oTarget.position);
    //Spell ranges are defined in the ranges.2da file
    switch(this.range){
      case 'L': //Large
        return distance < 28;
      case 'M': //Medium
        return distance < 15;
      case 'P': //Personal
        return true;
      case 'S': //Small
        return distance < 10;
      case 'T': //Touch
        return true;//distance < 2.25;
      case 'W': //Throw
        return distance < 15;
    }
    return true;
  }

  getCastRange(){
    switch(this.range){
      case 'L': //Large
        return 28;
      case 'M': //Medium
        return 15;
      case 'P': //Personal
        return Infinity;
      case 'S': //Small
        return 10;
      case 'T': //Touch
        return Infinity;//distance < 2.25;
      case 'W': //Throw
        return 15;
    }
  }

  static From2DA( object: any ){
    if(typeof object == 'object'){
      let spell = new TalentSpell();
      Object.assign(spell, TwoDAManager.datatables.get('spells').rows[object.__index]);
      spell.id = object.__index;
      return spell;
    }
    return false;
  }

  getFlags(){
    return 0;
  }

  getMetaMagic(){
    return this.metaMagic;
  }

  setFlags( flags = 0 ){
    this.flags = flags;
  }

  setMetaMagic( metaMagic = 0 ){
    this.metaMagic = metaMagic;
  }

  save(){
    let spellStruct = new GFFStruct(3);
    spellStruct.addField( new GFFField(GFFDataType.WORD, 'Spell') ).setValue(this.getId());
    //spellStruct.addField( new GFFField(GFFDataType.SHORT, 'SpellFlags') ).setValue(this.getFlags());
    //spellStruct.addField( new GFFField(GFFDataType.SHORT, 'SpellMetaMagic') ).setValue(this.getMetaMagic());
    return spellStruct;
  }

}
