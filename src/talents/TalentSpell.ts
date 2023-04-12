import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentObject } from "./TalentObject";
import * as THREE from "three";
import { GameState } from "../GameState";
import { ModuleObject } from "../module";
import { NWScript } from "../nwscript/NWScript";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModel } from "../odyssey";
import { TwoDAManager } from "../managers/TwoDAManager";
import { CombatRoundAction } from "../combat";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { ActionType } from "../enums/actions/ActionType";
import { ActionCombat } from "../actions";

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
    this.type = 0;

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

        //throwgen1 is an under-handed throw. I think it's used if the target is close
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
    
    //I'm assuming that usertype: 1 means force powers
    //if(this.usertype == 1){
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

      oCaster.combatRound.addAction(combatAction);

      if(!oCaster.actionQueue.actionTypeExists(ActionType.ActionCombat)){
        const action = new ActionCombat(0xFFFF);
        oCaster.actionQueue.add(action);
      }

      this.projectileHook = undefined;
      this.projectileOrigin = new THREE.Vector3();
      this.projectileTarget = new THREE.Vector3();
      this.projectileCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3( 0, 0, 0 ),
        new THREE.Vector3( 0, 0, 0 ),
        new THREE.Vector3( 0, 0, 0 )
      );

      if(oTarget){
        this.projectileTarget.copy(oTarget.position);
        this.projectileTarget.x += Math.random() * (0.25 - -0.25) + -0.25;
        this.projectileTarget.y += Math.random() * (0.25 - -0.25) + -0.25;
        this.projectileCurve.v2.copy(this.projectileTarget);
      }

      if(this.projmodel != '****'){
        console.log('projectile', this.projmodel);
        GameState.ModelLoader.load(this.projmodel.toLowerCase())
        .then((mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            context: oCaster.context
          }).then((model: OdysseyModel3D) => {
            this.projectile = model;
            console.log('projectile', model);
            if(oCaster.model){
              if(oCaster.model.rhand){
                GameState.group.effects.add(model);
                this.projectileHook = oCaster.model.rhand;
                //TextureLoader.LoadQueue();
              }else{
                this.projectile.dispose();
              }
            }else{
              this.projectile.dispose();
            }

          });
        });
      }

    //}

    //Medpacks, Armbands, etc...
    /*if(this.usertype == 4){
      oCaster.lastSpellTarget = oTarget;
      oCaster.lastAttemptedSpellTarget = oTarget;
      oCaster.casting.push({
        target: oTarget,
        type: ActionType.ActionCastSpell,
        icon: this.iconresref,
        spell: this,
        conjureTime: this.getConjureTime(),
        castTime: this.getCastTime(),
        catchTime: this.getCatchTime(),
        completed: false
      });
    }*/

  }
  
  update(oTarget: ModuleObject, oCaster: ModuleObject, combatAction: any, delta: number = 0){
    
    if(combatAction.conjureTime > 0){
      combatAction.conjuring = true;
      combatAction.conjureTime -= (1000 * delta);

      if(this.projectile && this.projectileHook){
        this.projectileHook.getWorldPosition(this.projectile.position);
        this.projectileOrigin.copy(this.projectile.position);
        this.projectileCurve.v0.copy(this.projectileOrigin);
      }
      //combatAction.casting = true;
    }else if(combatAction.castTime > 0){
      combatAction.conjuring = false;

      this.castTimeProgress = combatAction.castTime / (this.getCastTime() * 0.5);
      if(this.castTimeProgress > 1){
        this.castTimeProgress = 1;
      }

      if(this.projectile && !this.projectileDistance){
        this.projectileDistance = this.projectileTarget.clone().sub(this.projectileOrigin);
        this.projectileCurve.v1.copy(this.projectileDistance).multiplyScalar(0.25).add(this.projectileOrigin);
        this.projectileCurve.v1.z += 2
      }

      if(!combatAction.impact && this.range != 'L'){
        this.impact(oTarget, oCaster);
        //We only want to run the impact script once
        combatAction.impact = true;

      }

      if(this.projectile && this.projectileDistance){
        this.projectile.position.copy( this.projectileCurve.getPoint((1 - this.castTimeProgress)) );
      }

      combatAction.castTime -= (1000 * delta);
      //combatAction.casting = true;
    }else{
      combatAction.conjuring = false;
      combatAction.impact = false;
      //combatAction.casting = false;

      if(this.range == 'L'){
        this.impact(oTarget, oCaster);
      }

      //I guess the spell is over now
      combatAction.completed = true;
    }

    if(this.casthandmodel){
      this.casthandmodel.update(delta);
    }

    if(this.projectile){
      this.projectile.update(delta);
    }

  }

  impact(oTarget: ModuleObject, oCaster: ModuleObject){
    
    if(this.impactscript != '****'){
      console.log('Casting spell', this.impactscript, this);
      const instance = NWScript.Load(this.impactscript);
      if(instance) {
        //pass the talent to the script instance and run it
        instance.talent = this;
        //instance.spellTarget = oTarget;
        instance.run(oCaster, 0);
      };
    }

    if(this.casthandvisual != '****'){
      GameState.ModelLoader.load(this.casthandvisual)
      .then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: oCaster.context
        }).then((model: OdysseyModel3D) => {
          this.casthandmodel = model;

          if(oCaster.model){
            if(oCaster.model.lhand){
              oCaster.model.lhand.add(this.casthandmodel);
              //TextureLoader.LoadQueue();

              const anim = this.casthandmodel.playAnimation('cast01', false);
              setTimeout(() => {
                //Clean up the impact effect
                this.casthandmodel.dispose();
              }, (anim ? anim.length * 1000 : 1500) )
            }else{
              this.casthandmodel.dispose();
            }
          }else{
            this.casthandmodel.dispose();
          }

        });
      });
    }

    if(this.projectile){
      this.projectile.dispose();
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
    spellStruct.AddField( new GFFField(GFFDataType.WORD, 'Spell') ).SetValue(this.getId());
    //spellStruct.AddField( new GFFField(GFFDataType.SHORT, 'SpellFlags') ).SetValue(this.getFlags());
    //spellStruct.AddField( new GFFField(GFFDataType.SHORT, 'SpellMetaMagic') ).SetValue(this.getMetaMagic());
    return spellStruct;
  }

}
