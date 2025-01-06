import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { ModuleObject } from "./ModuleObject";
import type { ModuleItem } from "./ModuleItem";
import type { ModuleRoom } from "./ModuleRoom";

import { AudioEmitter } from "../audio/AudioEmitter";
import { CreatureClass } from "../combat/CreatureClass";
import { EffectRacialType } from "../effects";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { MDLLoader, ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { SSFObject } from "../resource/SSFObject";
import { TalentFeat } from "../talents/TalentFeat";
import { TalentObject } from "../talents/TalentObject";
import { TalentSkill } from "../talents/TalentSkill";
import { TalentSpell } from "../talents/TalentSpell";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { OdysseyModel, OdysseyModelAnimation } from "../odyssey";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { LIPObject } from "../resource/LIPObject";
import { Utility } from "../utility/Utility";
import { EngineMode } from "../enums/engine/EngineMode";
import { SSFType } from "../enums/resource/SSFType";
import { ActionType } from "../enums/actions/ActionType";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import EngineLocation from "../engine/EngineLocation";
import { AttackResult } from "../enums/combat/AttackResult";
// import { ICombatAction } from "../interface/combat/ICombatAction";
import { DLGObject } from "../resource/DLGObject";
import { ITwoDAAnimation } from "../interface/twoDA/ITwoDAAnimation";
import { CreatureAppearance } from "../engine/CreatureAppearance";
import { ICreatureAnimationState } from "../interface/animation/ICreatureAnimationState";
import { IOverlayAnimationState } from "../interface/animation/IOverlayAnimationState";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { AutoPauseState } from "../enums/engine/AutoPauseState";
import { AudioEngine } from "../audio/AudioEngine";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { PerceptionType } from "../enums/engine/PerceptionType";
import { AudioEmitterType } from "../enums/audio/AudioEmitterType";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { CombatRoundAction } from "../combat";
import { GameEffectFactory } from "../effects/GameEffectFactory";
import type { Action } from "../actions/Action";
import { ModuleTriggerType } from "../enums/module/ModuleTriggerType";
import { EngineDebugType } from "../enums/engine/EngineDebugType";
import { TextSprite3D } from "../engine/TextSprite3D";

/**
* ModuleCreature class.
* 
* Class representing a creature found in module areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleCreature.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleCreature extends ModuleObject {
  debugLabel: TextSprite3D;
  pm_IsDisguised: boolean; //polymorphIsDisguised
  pm_Appearance: number; //polymorphAppearance
  anim: any;
  head: OdysseyModel3D;
  aiStyle: number;
  isCommandable: boolean;
  lookAtObject: any;
  lookAtMatrix: THREE.Matrix4;
  bodyBag: number;
  bodyVariation: number;
  cha: number;
  challengeRating: number;
  classes: CreatureClass[];
  comment: string;
  con: number;
  currentForce: number;
  currentHitPoints: number;
  deity: string;
  dec: number;
  disarmable: number;
  isHologram: boolean;
  experience: number;
  feats: any[];
  firstName: string;
  forcePoints: number;
  gender: number;
  goodEvil: number;
  hitPoints: number;
  int: number;
  interruptable: number;
  isPC: number;
  lastName: string;
  maxHitPoints: number;
  naturalAC: number;
  noPermDeath: number;
  notReorienting: number;
  palletID: number;
  partyInteract: number;
  phenotype: number;
  race: number;
  skills: TalentSkill[];
  soundSetFile: number;
  specialAbilities: any[];
  str: number;
  subrace: number;
  subraceIndex: number;
  templateList: any[];
  textureVar: number;
  walkRate: number;
  wis: number;
  fortbonus: number;
  refbonus: number;
  willbonus: number;
  blockingTimer: number;
  groundTilt: THREE.Vector3;
  up: THREE.Vector3;
  declare lipObject: LIPObject;
  walk: boolean;
  targetPositions: any[];
  declare audioEmitter: AudioEmitter;
  declare footstepEmitter: AudioEmitter;
  props: any;
  maxForcePoints: any;
  dex: any;
  bodyModel: any;
  bodyTexture: any;
  headModel: any;
  ssf: SSFObject;
  joiningXP: any;
  skillPoints: any;
  npcId: number;
  // appearance: any;

  animationState: ICreatureAnimationState;
  overlayAnimationState: IOverlayAnimationState;
  
  equipment: { 
    HEAD: ModuleItem; 
    ARMOR: ModuleItem; 
    ARMS: ModuleItem; 
    RIGHTHAND: ModuleItem; 
    RIGHTHAND2: ModuleItem; 
    LEFTHAND: ModuleItem; 
    LEFTHAND2: ModuleItem; 
    LEFTARMBAND: ModuleItem; 
    RIGHTARMBAND: ModuleItem; 
    IMPLANT: ModuleItem; 
    BELT: ModuleItem; 
    CLAW1: ModuleItem; 
    CLAW2: ModuleItem; 
    CLAW3: ModuleItem; 
    HIDE: ModuleItem; 
  };
  regenTimer: number;
  regenTimerMax: number;
  excitedDuration: number;
  turning: number;
  deathAnimationPlayed: boolean;
  deathStarted: boolean;
  getUpAnimationPlayed: boolean;
  animSpeed: number;
  portrait: number;
  selectedNPC: number;
  creatureAppearance: CreatureAppearance;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleCreature;
    this.deferEventUpdate = true;

    this.template = gff;

    this.isReady = false;
    this.anim = null;
    this.head = null;
    this.deathAnimationPlayed = false;
    this.aiStyle = 0;

    this.isCommandable = true;
    this.lookAtObject = undefined;
    this.lookAtMatrix = new THREE.Matrix4();

    this.lastTriggerEntered = null;
    this.lastTriggerExited = null;
    this.lastAreaEntered = null;
    this.lastAreaExited = null;
    this.lastModuleEntered = null;
    this.lastModuleExited = null;
    this.lastDoorEntered = null;
    this.lastDoorExited = null;
    this.lastPlaceableEntered = null;
    this.lastPlaceableExited = null;
    this.lastAoeEntered = null;
    this.lastAoeExited = null;

    //Last target this creature attempted to attack
    this.combatData.lastAttemptedAttackTarget = undefined;
    //Last target attacked by this creature
    this.combatData.lastAttackTarget = undefined;
    //Last target attacked with a spell by this creature
    this.combatData.lastSpellTarget = undefined;
    //Last attempted target attacked with a spell by this creature
    this.combatData.lastAttemptedSpellTarget = undefined;
    //Last creature who damaged this creature
    this.combatData.lastDamager = undefined;
    //Last creature who attacked this creature
    this.combatData.lastAttacker = undefined;
    //Last creature who attacked this creature with a spell
    this.combatData.lastSpellAttacker = undefined;
    //Last Combat Feat Used
    this.combatData.lastCombatFeatUsed = undefined;
    //Last Force Power Used
    this.combatData.lastForcePowerUsed = undefined;
    //Last Attack Result
    this.combatData.lastAttackResult = undefined;

    this.excitedDuration = 0;

    this.appearance = 0;
    this.pm_Appearance = 0;
    this.pm_IsDisguised = false;
    this.bodyBag = 0;
    this.bodyVariation = 0;
    this.cha = 0;
    this.challengeRating = 0;
    this.classes = [];
    this.comment = '';
    this.con = 0;
    this.currentForce = 0;
    this.currentHitPoints = 0; //The Creature's current hit points, not counting any bonuses. This value may be higher or lower than the creature's maximum hit points.
    this.regenTimer = 0;
    this.regenTimerMax = 6;
    this.deity = '';
    this.description = '';
    this.dec = 0;
    this.disarmable = 0;
    this.isHologram = false;
    this.resetAnimationState();
    this.resetOverlayAnimationState();

    this.equipment = {
      HEAD: undefined,
      ARMOR: undefined,
      ARMS: undefined,
      RIGHTHAND: undefined,
      RIGHTHAND2: undefined,
      LEFTHAND: undefined,
      LEFTHAND2: undefined,
      LEFTARMBAND: undefined,
      RIGHTARMBAND: undefined,
      IMPLANT: undefined,
      BELT: undefined,
    
      CLAW1: undefined,
      CLAW2: undefined,
      CLAW3: undefined,
      HIDE:  undefined,
    };

    this.experience = 0;
    this.feats = [];
    this.firstName = '';
    this.forcePoints = 0;
    this.gender = 0;
    this.goodEvil = 50;
    this.hitPoints = 0; //Base Maximum Hit Points, not considering any bonuses. See Section 3.4 for more details.    
    this.int = 0;
    this.interruptable = 1;
    this.isPC = 0;
    this.lastName = '';
    this.maxHitPoints = 0; //Maximum Hit Points, after considering all bonuses and penalties.
    this.min1HP = false;
    this.naturalAC = 0;
    this.noPermDeath = 0;
    this.notReorienting = 0;
    this.palletID = 0; //for use in biowares editor
    this.partyInteract = 0;
    this.perceptionRange = 0;
    this.phenotype = 0;
    this.plot = false;
    this.portraidId = 0;
    this.race = 0;

    this.scripts = {
      onAttacked: undefined,
      onDamaged: undefined,
      onDeath: undefined,
      onDialog: undefined,
      onDisturbed: undefined,
      onEndDialog: undefined,
      onEndRound: undefined,
      onHeartbeat: undefined,
      onBlocked: undefined,
      onNotice: undefined,
      onRested: undefined,
      onSpawn: undefined,
      onSpellAt: undefined,
      onUserDefined: undefined
    };

    this.skills = [];

    this.soundSetFile = 0;
    this.specialAbilities = [];
    this.str = 0;
    this.subrace = 0;
    this.subraceIndex = 0;
    this.tag = '';
    this.templateList = [];
    this.templateResRef = '';
    this.textureVar = 1;
    this.walkRate = 7;
    this.wis = 0;
    this.fortbonus = 0;
    this.refbonus = 0;
    this.willbonus = 0;

    this.xOrientation = 0;
    this.yOrientation = 0;
    this.zOrientation = 0;

    this.perceptionList = [];

    this.setAnimationState(ModuleCreatureAnimState.IDLE);
    this.combatData.combatActionTimer = 3; 
    this.combatData.combatState = false;
    this.combatData.lastAttackAction = ActionType.ActionInvalid;
    this.collisionData.blockingTimer = 0;

    this.fp_push_played = false;
    this.fp_land_played = false;
    this.fp_getup_played = false;

    // this.groundFace = undefined;
    this.groundTilt = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 0, 1);

    this.lockDialogOrientation = false;
    this.lipObject = undefined;
    this.walk = false;

    this.isListening = false;
    this.listeningPatterns = {};
    this.heardStrings = [];

    this.targetPositions = [];
    let numNodes = 8;
    for (let i = 0; i < numNodes; i++) {
      let angle = (i / (numNodes/2)) * Math.PI; // Calculate the angle at which the element will be placed.
                                            // For a semicircle, we would use (i / numNodes) * Math.PI.
      this.targetPositions.push({
        angle:        angle,
        object:       undefined,
        cos:          Math.cos(angle),
        sin:          Math.sin(angle),
        owner:        this,
        targetVector: new THREE.Vector3()
      });
    }

    try{

      this.audioEmitter = new AudioEmitter(AudioEngine.GetAudioEngine());
      this.audioEmitter.maxDistance = 50;
      this.audioEmitter.type = AudioEmitterType.POSITIONAL;
      this.audioEmitter.load();

      this.footstepEmitter = new AudioEmitter(AudioEngine.GetAudioEngine());
      this.footstepEmitter.maxDistance = 50;
      this.footstepEmitter.type = AudioEmitterType.POSITIONAL;
      this.footstepEmitter.load();
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  update( delta = 0 ){
    
    super.update(delta);

    if(this.audioEmitter){
      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z + 1.0);
    }

    this.forceVector.set(0, 0, 0);
    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

    if(GameState.Mode == EngineMode.INGAME || GameState.Mode == EngineMode.MINIGAME || GameState.Mode == EngineMode.DIALOG){

      if(this.animationState.index == ModuleCreatureAnimState.IDLE){
        this.footstepEmitter.stop();
      }

      if(!this.isReady){
        //this.getModel().visible = true;
        return;
      }else{

      }

      //Get the first action in the queue
      this.action = this.actionQueue[0];

      this.area = GameState.module.area;

      /*if(this == GameState.getCurrentPlayer() && this.room instanceof ModuleRoom){
        //this.room.show(true);
      }else if(this.room instanceof ModuleRoom){
        if(this.room.model instanceof OdysseyModel3D){
          if(this.model){
            this.model.visible = this.room.model.visible;
          }
        }
      }*/

      if(!this.isDead() && (
          this.animationState.index == ModuleCreatureAnimState.DEAD ||
          this.animationState.index == ModuleCreatureAnimState.DEAD1 ||
          this.animationState.index == ModuleCreatureAnimState.GET_UP_DEAD || 
          this.animationState.index == ModuleCreatureAnimState.GET_UP_DEAD1
        )
      ){
        this.deathAnimationPlayed = false;
        this.setAnimationState(ModuleCreatureAnimState.GET_UP_DEAD);
      }

      if(!this.isDead()){

        //Process DamageList
        let elLen = this.damageList.length - 1;
        for(let i = elLen; i >= 0; i--){
          this.damageList[i].delay -= delta;
          if(this.damageList[i].delay <= 0){
            this.subtractHP(this.damageList[i].amount);

            let painsound = THREE.MathUtils.randInt(0, 1);
            switch(painsound){
              case 1:
                this.playSoundSet(SSFType.PAIN_2);
              break;
              default:
                this.playSoundSet(SSFType.PAIN_1);
              break;
            }
      
            this.damageList.splice(i, 1);
          }
        }

        this.deathStarted = false;
        
        if(this.animationState.index != ModuleCreatureAnimState.DEAD){
          this.updateActionQueue(delta);
        }

        if(this.dialogAnimation && (GameState.Mode == EngineMode.DIALOG) && (!this.action || this.action.type != ActionType.ActionPlayAnimation)){
          if(this.model){

            if(!this.speed){
                
              let _animIsValid = (this.dialogAnimation.animation instanceof OdysseyModelAnimation);
              if(_animIsValid){
                let _animIsPlaying = (this.model.animationManager.currentAnimation == this.dialogAnimation.animation);
                if(!_animIsPlaying && !this.dialogAnimation.started){
                  let _newAnim = this.dialogAnimation.animation;
                  if(_newAnim instanceof OdysseyModelAnimation){
                    this.model.playAnimation( _newAnim, !!parseInt(this.dialogAnimation.data.looping) );
                    this.dialogAnimation.started = true;
                  }else{
                    //Kill the dialogAnimation if the animation isn't valid
                    this.dialogAnimation = null;
                  }
                }else if(!_animIsPlaying && this.dialogAnimation.started){
                  //Kill the dialogAnimation if it has already played
                  this.dialogAnimation = null;
                }
              }else{
                //Kill the dialogAnimation if the animation isn't valid
                this.dialogAnimation = null;
              }

            }
  
          }else{
            //Kill the dialogAnimation if there is no model to animate?
            this.dialogAnimation = null;
          }
        }else{
          this.dialogAnimation = null;
        }

      }else{
        this.damageList = [];
        this.getUpAnimationPlayed = false;
        if(
          this.deathStarted && 
          this.animationState.index != ModuleCreatureAnimState.DEAD && 
          this.animationState.index != ModuleCreatureAnimState.DIE
        ){
          this.setAnimationState(ModuleCreatureAnimState.DEAD);
          this.deathAnimationPlayed = true;
        }
        if(!this.deathStarted){
          this.deathAnimationPlayed = false;
          this.deathStarted = true;
          this.clearAllActions();
          this.onDeath();
          this.playSoundSet(SSFType.DEAD);
          this.resetOverlayAnimationState();
          this.setAnimationState(ModuleCreatureAnimState.DIE);
        }
      }

      if(this.isDebilitated()){
        this.force = 0;
        this.speed = 0;
        this.setAnimationState(ModuleCreatureAnimState.IDLE);
      }

      //-------------------------//
      // BEGIN: Move Speed Logic //
      //-------------------------//

      if(
        this.isDead() ||
        (
          this.animationState.index == ModuleCreatureAnimState.DIE ||
          this.animationState.index == ModuleCreatureAnimState.DIE1 ||
          this.animationState.index == ModuleCreatureAnimState.GET_UP_DEAD ||
          this.animationState.index == ModuleCreatureAnimState.GET_UP_DEAD1 
        )
      ){
        this.force = 0;
        this.speed = 0;
        this.animSpeed = 1;
        this.forceVector.set(0, 0, 0);
      }

      this.forceVector.z = 0;

      this.speed += (this.getMovementSpeed() * 2.5) * this.force * delta;

      if(this.speed > this.getMovementSpeed()){
        this.speed = this.getMovementSpeed();
      }
      
      let forceDelta = Math.max(this.force * delta, this.speed * delta);
      let gravityDelta = -1 * delta;
      
      if(this.speed){
        this.animSpeed = this.speed / this.getRunSpeed();
      }else{
        this.animSpeed = 1;
      }
        
      if(!this.forceVector.length()){
        this.forceVector.x = ( Math.cos(this.rotation.z + Math.PI/2) * forceDelta );
        this.forceVector.y = ( Math.sin(this.rotation.z + Math.PI/2) * forceDelta );
        if(this.forceVector.length()){
          if(this.animSpeed > 0.75){
            this.setAnimationState(ModuleCreatureAnimState.RUNNING);
          }else{
            this.setAnimationState(ModuleCreatureAnimState.WALKING);
          }
        }
        //this.forceVector.z = gravityDelta;
      }else{
        this.forceVector.multiplyScalar(forceDelta);
      }

      if(this.force < 1){
        this.speed -= (this.getMovementSpeed() * 2.5) * delta;
      }

      if(this.speed < 0){
        this.speed = 0;
      }

      if(!this.forceVector.length() && ( this.animationState.index == ModuleCreatureAnimState.RUNNING || this.animationState.index == ModuleCreatureAnimState.WALKING )){
        this.setAnimationState(ModuleCreatureAnimState.IDLE);
        this.speed = 0;
        this.force = 0;
      }

      //-----------------------//
      // END: Move Speed Logic //
      //-----------------------//

      if(this.combatData.combatState && this.animationState.index == ModuleCreatureAnimState.PAUSE){
        this.setAnimationState(ModuleCreatureAnimState.READY);
      }

      this.updateExcitedDuration(delta);
      this.updateCombat(delta);
      this.updateCasting(delta);
      this.updateAnimationState();
      this.updateItems(delta);
      
      if(this.model instanceof OdysseyModel3D && this.model.bonesInitialized){

        //BEGIN: Animation Optimization
        this.model.animateFrame = true;
        //If the object is further than 50 meters, animate every other frame
        if(this.distanceToCamera > 50){
          this.model.animateFrame = this.model.oddFrame;
        }
        
        if(this.model.animateFrame){
          //If we can animate and there is fog, make sure the distance isn't greater than the far point of the fog effect
          if(GameState.PartyManager.party.indexOf(this) == -1 && this.context.scene.fog){
            if(this.distanceToCamera >= this.context.scene.fog.far){
              this.model.animateFrame = false;
              //If the object is past the near point, and the near point is greater than zero, animate every other frame
            }else if(this.context.scene.fog.near && this.distanceToCamera >= this.context.scene.fog.near){
              this.model.animateFrame = this.model.oddFrame;
            }
          }
        }
        //END: Animation Optimization

        if(GameState.Mode != EngineMode.DIALOG){
          this.model.update( this.movementSpeed * delta );
          if(this.lipObject instanceof LIPObject){
            this.lipObject.update(delta, this.model);
          }
        }else{
          this.model.update( delta );
          if(this.lipObject instanceof LIPObject){
            this.lipObject.update(delta, this.model);
          }
          if(this.cutsceneMode && this.model){
            for(let i = 0, len = this.model.skins.length; i < len; i++){
              this.model.skins[i].frustumCulled = false;
            }
          }
        }
      }

      if(this.collisionData.blockingObject != this.collisionData.lastBlockingObject){
        this.collisionData.lastBlockingObject = this.collisionData.blockingObject;
        //console.log('blocking script', this.blocking);
        this.onBlocked();
      }

      if(this.forceVector.length())
        this.collisionData.updateCollision(delta);

      this.updatePerceptionList(delta);
      this.updateListeningPatterns();


      //If a non controlled party member is stuck, warp them to their follow position
      if(this.npcId != undefined && this != (GameState.getCurrentPlayer() as any) && this.collisionTimer >= 1){
        this.setPosition(GameState.PartyManager.GetFollowPosition(this));
        this.collisionTimer = 0;
      }

      this.turning = 0;
      if(this.facingAnim){//this.facing != this.rotation.z){
        this.facingTweenTime += 10*delta;
        if(this.facingTweenTime >= 1){
          this.rotation.z = this.facing;
          this.facingAnim = false;
        }else{
          let oldFacing = Utility.NormalizeRadian(this.rotation.z);
          this.rotation.z = Utility.interpolateAngle(this.wasFacing, this.facing, this.facingTweenTime);
          let diff = oldFacing - Utility.NormalizeRadian(this.rotation.z);
          this.turning = Math.sign(Utility.NormalizeRadian(oldFacing - Utility.NormalizeRadian(this.rotation.z)));
          if(diff < 0.0000001 || diff > -0.0000001){
              this.facingAnim = false;
              this.rotation.z = Utility.interpolateAngle(this.wasFacing, this.facing, 1);
              this.wasFacing = this.facing;
          }
        }
      }

      //Update equipment
      if(this.equipment.HEAD){
        this.equipment.HEAD.update(delta);
      }
      if(this.equipment.ARMS){
        this.equipment.ARMS.update(delta);
      }

      if(this.equipment.RIGHTARMBAND){
        this.equipment.RIGHTARMBAND.update(delta);
      }

      if(this.equipment.LEFTARMBAND){
        this.equipment.LEFTARMBAND.update(delta);
      }

      if(this.equipment.RIGHTHAND){
        this.equipment.RIGHTHAND.update(delta);
      }

      if(this.equipment.LEFTHAND){
        this.equipment.LEFTHAND.update(delta);
      }

      if(this.equipment.ARMOR){
        this.equipment.ARMOR.update(delta);
      }
      
      if(this.equipment.BELT){
        this.equipment.BELT.update(delta);
      }

      if(this.equipment.CLAW1){
        this.equipment.CLAW1.update(delta);
      }

      if(this.equipment.CLAW2){
        this.equipment.CLAW2.update(delta);
      }

      if(this.equipment.CLAW3){
        this.equipment.CLAW3.update(delta);
      }

      //Loop through and update the effects
      if(this.deferEventUpdate){
        for(let i = 0, len = this.effects.length; i < len; i++){
          this.effects[i].update(delta);
        }
      }

    }else{
      this.updateAnimationState();
      this.updateItems(delta);
    }

    this.updateRegen(delta);

    this.collisionTimer -= delta;
    if(this.collisionTimer < 0)
      this.collisionTimer = 0;

    this.force = 0;
  }

  updateRegen(delta = 0){
    this.regenTimer -= delta;
    if(this.regenTimer <= 0){
      this.regenTimer = this.regenTimerMax;

      const regen2DA = GameState.TwoDAManager.datatables.get('regeneration').rows[this.combatData.combatState ? 0 : 1];
      if(regen2DA){
        const regen_force = parseFloat(regen2DA.forceregen);
        if(!isNaN(regen_force)){
          this.addFP(Math.abs(regen_force));
        }

        const regen_health = parseFloat(regen2DA.healthregen);
        if(!isNaN(regen_health)){
          this.addHP(Math.abs(regen_health));
        }
      }
    }
  }

  updateActionQueue(delta = 0){
    if(this.isDebilitated())
      return;

    if(!GameState.module.readyToProcessEvents)
      return;

      
    this.actionQueue.process( delta );
    this.action = this.actionQueue[0];
    if(!(this.action)){
      if(
        !this.combatData.combatState && 
        this.isPartyMember() && 
        this != GameState.getCurrentPlayer()
      ){
        this.setFacing(
          Math.atan2(
            this.position.y - GameState.getCurrentPlayer().position.y,
            this.position.x - GameState.getCurrentPlayer().position.x
          ) + Math.PI/2,
          false
        );
      }
    }

  }

  updateListeningPatterns(){

    if(this.isDead())
      return;

    if(this.heardStrings.length){

      //if(this.scripts.onDialog instanceof NWScriptInstance && this.scripts.onDialog.running)
      //  return;

      let str = this.heardStrings[0];
      //console.log('HeardString', this.id, str, this.isListening, this);
      if(this.isListening && str){
        const pattern = this.listeningPatterns[str.string];

        if(typeof pattern != 'undefined'){
          this.heardStrings.shift();
          this.onDialog(str.speaker, pattern);
        }
      }
    }
  }

  updatePerceptionList(delta = 0){

    if(this.isDead())
      return true;

    if(this.room){
      if(!this.room.model.visible){
        return;
      }
    }

    if(!this.spawned || !GameState.module.readyToProcessEvents){
      return;
    }

    if(this.perceptionTimer < 3){
      this.perceptionTimer += 1 * delta;
      return;
    }

    this.perceptionTimer = 0;

    //if(!Engine.Flags.CombatEnabled)
    //  return;

    //Check modules creatures
    let creatureLen = GameState.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++ ){
      let creature = GameState.module.area.creatures[i];
      if(this != creature){
        if(!creature.isDead()){
          let distance = this.position.distanceTo(creature.position);
          if(distance < this.getPerceptionRangePrimary() && this.hasLineOfSight(creature)){
            if(GameState.PartyManager.party.indexOf(this) == -1){
              if(this.isHostile(creature)){
                this.resetExcitedDuration();
                if(this == GameState.getCurrentPlayer() && !this.combatData.combatState){
                  GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.EnemySighted);
                }
              }
            }
            
            this.notifyPerceptionSeenObject(creature, true);
          }else if(distance < this.getPerceptionRangeSecondary() && this.hasLineOfSight(creature)){
            this.notifyPerceptionHeardObject(creature, true);
          }
        }else{
          this.notifyPerceptionSeenObject(creature, false);
        }
      }
    }

    //Check party creatures
    let partyLen = GameState.PartyManager.party.length;
    for(let i = 0; i < partyLen; i++ ){
      let creature = GameState.PartyManager.party[i];
      if(this != creature){
        if(!creature.isDead()){
          let distance = this.position.distanceTo(creature.position);
          if(distance < this.getPerceptionRangePrimary() && this.hasLineOfSight(creature)){
            if(GameState.PartyManager.party.indexOf(this) == -1){

              if(this.isHostile(creature)){
                this.resetExcitedDuration();
              }

              this.notifyPerceptionSeenObject(creature, true);
            }
          }else if(distance < this.getPerceptionRangeSecondary() && this.hasLineOfSight(creature)){
            this.notifyPerceptionHeardObject(creature, true);
          }
        }else{
          this.notifyPerceptionSeenObject(creature, false);
        }
      }
    }

    for(let i = 0, triglen = this.area.triggers.length; i < triglen; i++){
      const trig = this.area.triggers[i];
      if(trig.type != ModuleTriggerType.TRAP){ continue; }
      if(trig.trapDetected){ continue; }
      const actionFlag = new GameState.ActionFactory.ActionFlagMine();
      actionFlag.setParameter(0, ActionParameterType.DWORD, trig);
      this.actionQueue.addFront(actionFlag);
    }
    
  }

  updateCombat(delta = 0){
    // this.combatData.update(delta);
    this.combatRound.update(delta);

    if(this.combatData.lastAttackTarget instanceof ModuleObject && this.combatData.lastAttackTarget.isDead()){
      this.combatData.clearTarget(this.combatData.lastAttackTarget);
    }

    if(this.combatData.lastAttacker instanceof ModuleObject && this.combatData.lastAttacker.isDead())
      this.combatData.lastAttacker = undefined;

    if(this.combatData.lastAttemptedAttackTarget instanceof ModuleObject && this.combatData.lastAttemptedAttackTarget.isDead())
      this.combatData.lastAttemptedAttackTarget = undefined;

    if(this.combatData.lastAttemptedSpellTarget instanceof ModuleObject && this.combatData.lastAttemptedSpellTarget.isDead())
      this.combatData.lastAttemptedSpellTarget = undefined;

    if(this.combatData.lastDamager instanceof ModuleObject && this.combatData.lastDamager.isDead())
      this.combatData.lastDamager = undefined;

    if(this.combatData.lastSpellAttacker instanceof ModuleObject && this.combatData.lastSpellAttacker.isDead())
      this.combatData.lastSpellAttacker = undefined;

    if(this.isDead()){
      this.clearTarget();
      this.combatRound.clearActions();
    }

    if(this.combatData.combatState){
      //If creature is being controller by the player, keep at least one basic action in the attack queue while attack target is still alive 
      if(GameState.getCurrentPlayer() == this){
        if(!this.combatRound.scheduledActionList.length && !this.combatRound.action){
          if( this.combatData.lastAttackTarget ){
            this.attackCreature(this.combatData.lastAttackTarget, undefined);
          }else if( this.combatData.lastAttacker ){
            this.attackCreature(this.combatData.lastAttacker, undefined);
          }else{
            //TODO: Attack nearest perceived hostile creature?
          }
        }
      }
    }else{
      if(this.animationState.index == ModuleCreatureAnimState.READY){
        this.setAnimationState(ModuleCreatureAnimState.PAUSE);
      }
    }
  }

  updateCasting(delta = 0){
    //Update active spells
    for(let i = 0, len = this.casting.length; i < len; i++){
      this.casting[i].spell.update(this.casting[i].target, this, this.casting[i], delta);
    }

    //Remove completed spells
    let i = this.casting.length;
    while (i--) {
      if(this.casting[i].completed){
        this.casting.splice(i, 1);
      }
    }

  }

  clearTarget(){
    this.combatData.lastAttackTarget = undefined;
    this.combatData.lastDamager = undefined;
  }

  actionInRange(action: Action): boolean {
    if(action){
      if(action.type == ActionType.ActionCastSpell){
        const spell = new TalentSpell( action.getParameter(0) );
        const target: ModuleObject = action.getParameter(5);
        if(target instanceof ModuleObject){
          return spell.inRange(target, this);
        }else{
          return true;
        }
      }else if(action.type == ActionType.ActionItemCastSpell){
        const spell = new TalentSpell( action.getParameter(0) );
        const target: ModuleObject = action.getParameter(5);
        if(target instanceof ModuleObject){
          return spell.inRange(target, this);
        }else{
          return true;
        }
      }else if(action.type == ActionType.ActionPhysicalAttacks){
        const target: ModuleObject = action.getParameter(1);
        if(target instanceof ModuleObject){
          let distance = Infinity;
            /*if(this.openSpot){
              distance = this.position.distanceTo(this.openSpot.targetVector);
            }else{*/
              distance = this.position.distanceTo(target.position);
            // }
          return distance < ( (this.combatData.getEquippedWeaponType() == 1 || this.combatData.getEquippedWeaponType() == 3) ? 2.0 : 15.0 );
        }else{
          return true;
        }
      }else{
        console.warn(`actionInRange: Invalid action type ${action.type}`, action)
      }
    }else{
      console.warn(`actionInRange: Invalid action`, action)
    }
    return true;
  }

  //Return the best point surrounding this object for the attacker to move towards
  getBestAttackPoint(targeter: ModuleObject){
    return {x: 0, y: 0, z: 0};
  }

  updateAnimationState(){

    if(!(this.model instanceof OdysseyModel3D))
      return;

    let currentAnimation = this.model.getAnimationName();

    if(this.overlayAnimationState.animationName && !this.isDead()){
      //(this.animationState.index != ModuleCreatureAnimState.WALKING && this.animationState.index != ModuleCreatureAnimState.RUNNING)
      // if( this.overlayAnimationState.animation.overlay == '1'){
        if(currentAnimation != this.overlayAnimationState.animationName){
          if(!this.overlayAnimationState.started){
            this.overlayAnimationState.started = true;
            this.model.playOverlayAnimation(this.overlayAnimationState.animationName, this.overlayAnimationState.animation);
          }else{
            this.resetOverlayAnimationState();
          }
        }
        return;
      // }else{
      //   this.resetOverlayAnimationState();
      // }
    }else{
      this.resetOverlayAnimationState();
    }

    if((GameState.Mode == EngineMode.DIALOG) && this.dialogAnimation && !this.speed && !this.isDead())
      return;

    if(this.animationState.animation){
      if(currentAnimation != this.animationState.animation.name?.toLowerCase()){
        if(!this.animationState.started){
          this.animationState.started = true;
          let aLooping = (!parseInt(this.animationState.animation.fireforget) && parseInt(this.animationState.animation.looping) == 1);
          this.model.playAnimation(this.animationState.animation.name?.toLowerCase(), aLooping);
        }else{
          this.setAnimationState(ModuleCreatureAnimState.PAUSE);
        }
      }
    }else{
      console.error('Animation Missing', this.getTag(), this.getName(), this.animationState);
      this.setAnimationState(ModuleCreatureAnimState.PAUSE);
    }

  }

  damage(amount = 0, oAttacker: ModuleObject, delayTime = 0){
    if(delayTime){
      this.damageList.push({amount: amount, delay: delayTime});
    }else{
      this.subtractHP(amount);
    }
    this.combatData.lastDamager = oAttacker;
    this.combatData.lastAttacker = oAttacker;

    if(this.combatData.lastAttackTarget == undefined || (this.combatData.lastAttackTarget instanceof ModuleObject && this.combatData.lastAttackTarget.isDead()))
      this.combatData.lastAttackTarget = oAttacker;

    if(typeof oAttacker != 'undefined')
      this.onDamaged();
  }

  canMove(){
    return !this.isParalyzed() && !this.isStunned() && (
      this.animationState.index != ModuleCreatureAnimState.DEAD && 
      this.animationState.index != ModuleCreatureAnimState.DEAD1 && 
      this.animationState.index != ModuleCreatureAnimState.DIE && 
      this.animationState.index != ModuleCreatureAnimState.DIE1 && 
      this.animationState.index != ModuleCreatureAnimState.GET_UP_DEAD && 
      this.animationState.index != ModuleCreatureAnimState.GET_UP_DEAD1
    ) && !this.casting.length;
  }

  getCurrentAction(){
    if(this.actionQueue.length){
      return this.actionQueue[0].type;
    }
    return 65535;
  }

  JumpToLocation(lLocation: EngineLocation): void {
    super.JumpToLocation(lLocation);
    this.updateCollision();
  }

  moveToObject(target: ModuleObject, bRun = true, distance = 1.0){

    if(target instanceof ModuleObject){
        
      // this.openSpot = undefined;
      let action = new GameState.ActionFactory.ActionMoveToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      action.setParameter(4, ActionParameterType.DWORD, target.id);
      action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
      action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, distance));
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.actionQueue.add(action);
    }

  }

  detachFromRoom(room: ModuleRoom): void {
    if(!room) return;
    const index = room.creatures.indexOf(this);
    if(index >= 0){
      room.creatures.splice(index, 1);
    }
  }

  randomWalk(){

    if(this.room && this.room.collisionData.walkmesh){
      let run = false;
      let maxDistance = 1.5
      let position = new THREE.Vector3();

      const faces = this.room.collisionData.walkmesh.walkableFaces;
      const face = faces[Math.floor(Math.random()*faces.length)];
      if(face){
        position.copy(face.centroid);
        let action = new GameState.ActionFactory.ActionMoveToPoint();
        action.setParameter(0, ActionParameterType.FLOAT, position.x);
        action.setParameter(1, ActionParameterType.FLOAT, position.y);
        action.setParameter(2, ActionParameterType.FLOAT, position.z);
        action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        action.setParameter(4, ActionParameterType.DWORD, 0xFFFFFFFF);
        action.setParameter(5, ActionParameterType.INT, run ? 1 : 0);
        action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, maxDistance));
        action.setParameter(7, ActionParameterType.INT, 0);
        action.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.actionQueue.add(action);
      }

    }

  }

  moveToLocation(target: ModuleObject|EngineLocation, bRun = true){

    if(target instanceof EngineLocation || target instanceof ModuleObject){

      let distance = 0.1;
      let creatures = GameState.module.area.creatures;

      //Check if creatures are too close to location
      for(let i = 0; i < creatures.length; i++){
        let creature = creatures[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

      //Check if party are too close to location
      for(let i = 0; i < GameState.PartyManager.party.length; i++){
        let creature = GameState.PartyManager.party[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

        
      // this.openSpot = undefined;
      let action = new GameState.ActionFactory.ActionMoveToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      action.setParameter(4, ActionParameterType.DWORD, target instanceof EngineLocation ? ModuleObjectConstant.OBJECT_INVALID : target.id );
      action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
      action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, distance));
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.actionQueue.add(action);

    }

  }

  jumpToObject(target: ModuleObject){
    console.log('jumpToObject', target, this);
    if(target instanceof ModuleObject){

      let action = new GameState.ActionFactory.ActionJumpToObject();
      action.setParameter(0, ActionParameterType.DWORD, target.id );
      action.setParameter(1, ActionParameterType.INT, 0);
      this.actionQueue.add(action);

    }

  }

  jumpToLocation(target: EngineLocation){
    console.log('jumpToLocation', target, this);
    if(target instanceof EngineLocation){
      let action = new GameState.ActionFactory.ActionJumpToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      action.setParameter(4, ActionParameterType.INT, 0);
      action.setParameter(5, ActionParameterType.FLOAT, 20.0);
      action.setParameter(6, ActionParameterType.FLOAT, target.rotation.x);
      action.setParameter(7, ActionParameterType.FLOAT, target.rotation.y);
      this.actionQueue.add(action);
    }

  }

  resetExcitedDuration(){
    this.excitedDuration = 10000;
  }

  cancelExcitedDuration(){
    this.excitedDuration = 0;
  }

  updateExcitedDuration(delta = 0){
    if(this.isDead()){
      this.excitedDuration = 0;
      this.cancelCombat();
      this.weaponPowered(false);
    }

    if(this.excitedDuration > 0){
      this.excitedDuration -= (1000 * delta);
      this.combatData.combatState = true;
    }

    if(this.excitedDuration <= 0){
      this.combatData.combatState = false;
      this.excitedDuration = 0;
      this.weaponPowered(false);
    }
  }

  isDueling(): boolean {
    if(!(BitWise.InstanceOf(this.combatData.lastAttackTarget?.objectType, ModuleObjectType.ModuleCreature))) return false;
    const target = this.combatData.lastAttackTarget as ModuleCreature;
    if(target.combatData.lastAttackTarget != this) return false;
    return (target.isDuelingWeaponEquipped() && this.isDuelingWeaponEquipped());
  }

  isDuelingWeaponEquipped(){
    if(!this.equipment.RIGHTHAND) return false;
    return (
      this.equipment.RIGHTHAND.getWeaponWield() == WeaponWield.STUN_BATON ||
      this.equipment.RIGHTHAND.getWeaponWield() == WeaponWield.ONE_HANDED_SWORD ||
      this.equipment.RIGHTHAND.getWeaponWield() == WeaponWield.TWO_HANDED_SWORD
    );
  }

  isDuelingObject( oObject: ModuleObject ){
    return (oObject instanceof ModuleObject && this.combatData.lastAttackTarget == oObject && oObject.combatData.lastAttackTarget == this && oObject.combatData.getEquippedWeaponType() == 1 && this.combatData.getEquippedWeaponType() == 1);
  }

  attackCreature(
    target: ModuleObject, feat?: TalentFeat, isCutsceneAttack = false, 
    attackDamage = 0, attackAnimation?: string, attackResult?: AttackResult
  ){

    if(target == undefined)
      return;

    if(target == this)
      target = GameState.PartyManager.party[0];

    if(target.isDead())
      return;

    let combatAction = new CombatRoundAction();
    combatAction.actionType = CombatActionType.ATTACK;
    combatAction.target = target;
    combatAction.animation = ModuleCreatureAnimState.ATTACK;
    combatAction.animationTime = 1500;
    combatAction.isCutsceneAttack = isCutsceneAttack;

    if(feat){
      combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
      combatAction.setFeat(feat);
    }

    combatAction.attackResult = attackResult;
    combatAction.attackDamage = attackDamage;

    if(isCutsceneAttack){
      combatAction.animationName = attackAnimation;
      combatAction.twoDAAnimation = OdysseyModelAnimation.GetAnimation2DA(attackAnimation);
    }

    this.combatRound.addAction(combatAction);

    if(!this.actionQueue.actionTypeExists(ActionType.ActionCombat)){
      const action = new GameState.ActionFactory.ActionCombat(0xFFFF);
      this.actionQueue.add(action);
    }

  }

  useTalent(talent: TalentObject, oTarget: ModuleObject): Action {
    let action: Action;
    if(talent instanceof TalentObject){
      const combatAction = new CombatRoundAction();
      switch(talent.objectType){
        case 1: //FEAT
          combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
          combatAction.target = oTarget;
          combatAction.setFeat(talent as TalentFeat);
          this.combatRound.addAction(combatAction);
        break;
        case 2: //SKILL
          if(talent.id == 6){ //Security
            action = new GameState.ActionFactory.ActionUnlockObject();
            action.setParameter(0, ActionParameterType.DWORD, oTarget.id || ModuleObjectConstant.OBJECT_INVALID);
            this.actionQueue.add(action);
          }
        break;
        case 0: //SPELL
          combatAction.actionType = CombatActionType.CAST_SPELL;
          combatAction.setSpell(talent as TalentSpell);
          combatAction.target = oTarget;
          this.combatRound.addAction(combatAction);
        break;
      }
    }
    return action;
  }

  setAnimationState(animState: ModuleCreatureAnimState){
    if(!animState){ return; }
    
    this.animationState.index = animState;
    this.animationState.animation = this.animationConstantToAnimation(animState);
    this.animationState.started = false;
  }
  
  resetAnimationState(){
    this.animationState = {
      index: ModuleCreatureAnimState.PAUSE,
      animation: undefined,
      started: false,
      speed: 1,
    }
  }

  playTwoDAAnimation(animation: ITwoDAAnimation){
    if(animation){
      this.resetAnimationState();
      this.animationState = {
        index: ModuleCreatureAnimState.PAUSE,
        animation: animation,
        started: false,
        speed: 1,
      }
    }
  }

  playOverlayAnimation(NWScriptAnimId = -1){
    this.resetOverlayAnimationState();
    switch(NWScriptAnimId){
      case 123:
        this.overlayAnimationState.animationName = 'diveroll';
      break;
    }

    if(this.overlayAnimationState.animationName){
      const anim = OdysseyModelAnimation.GetAnimation2DA(this.overlayAnimationState.animationName);
      if(anim && anim.overlay == '1'){
        this.overlayAnimationState.animation = anim;
      }else{
        this.resetOverlayAnimationState();
      }
    }
  }
  
  resetOverlayAnimationState(){
    this.overlayAnimationState = {
      animationIndex: -1,
      animationName: '',
      animation: undefined,
      started: false,
      speed: 1,
    }
  }

  dialogPlayOdysseyAnimation(anim: OdysseyModelAnimation){
    console.log('dialogPlayOdysseyAnimation', anim)
    if(!this.model){ 
      console.warn('dialogPlayOdysseyAnimation failed');
      console.log(this, anim);
      return; 
    }
    this.dialogAnimation = {
      animation: anim,
      data: {
        fireforget: 1,
        looping: 0
      } as any,
      started: false,
    };
  }

  dialogPlayAnimation(data: ITwoDAAnimation = {} as ITwoDAAnimation){
    console.log('dialogPlayAnimation', data)
    if(!this.model){ 
      console.warn('dialogPlayAnimation failed');
      console.log(this, data);
      return; 
    }
    this.dialogAnimation = { 
      animation: this.model.getAnimationByName(data.name),
      data: data,
      started: false,
    };
  }

  cancelCombat(){
    this.clearTarget();
    this.combatData.combatState = false;
    this.cancelExcitedDuration();
    this.resetOverlayAnimationState();
    if(this.animationState.index == ModuleCreatureAnimState.READY)
      this.setAnimationState(ModuleCreatureAnimState.PAUSE)
  }

  getDamageAnimation( attackAnim: string ): ITwoDAAnimation {
    
    let attackAnimIndex = -1;

    let modeltype = this.creatureAppearance.modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = GameState.TwoDAManager.datatables.get('animations');
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    let combatAnimation = GameState.TwoDAManager.datatables.get('combatanimations').getByID(attackAnimIndex);
    //console.log('getDamageAnimation', this.getName(), attackAnim, attackAnimIndex, combatAnimation, 'damage'+weaponWield);
    if(combatAnimation){
      let damageAnimIndex = combatAnimation['damage'+weaponWield];
      let damageAnim = anims.getByID(damageAnimIndex);
      if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
        //console.log('damage anim', this.getName(), damageAnim.name)
        return OdysseyModelAnimation.GetAnimation2DA(damageAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdamages');
    }
    //console.log(attackAnim);
    
    switch(attackAnim){
      case 'c2a1':
        return OdysseyModelAnimation.GetAnimation2DA('c2d1')
      case 'c2a2':
        return OdysseyModelAnimation.GetAnimation2DA('c2d2')
      case 'c2a3':
        return OdysseyModelAnimation.GetAnimation2DA('c2d3')
      case 'c2a4':
        return OdysseyModelAnimation.GetAnimation2DA('c2d4')
      case 'c2a5':
        return OdysseyModelAnimation.GetAnimation2DA('c2d5')
    }

    return OdysseyModelAnimation.GetAnimation2DA('g'+weaponWield+'d1');

  }

  getDodgeAnimation( attackAnim: string ): ITwoDAAnimation {

    let attackAnimIndex = -1;

    let modeltype = this.creatureAppearance.modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = GameState.TwoDAManager.datatables.get('animations');
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    //console.log('getDodgeAnimation', this.getName(), attackAnim, attackAnimIndex);

    let combatAnimation = GameState.TwoDAManager.datatables.get('combatanimations').getByID(attackAnimIndex);
    if(combatAnimation){
      if(combatAnimation.hits == 1 && [4, 2, 3].indexOf(weaponWield) >= 0){
        let damageAnimIndex = combatAnimation['parry'+weaponWield];
        let damageAnim = anims.getByID(damageAnimIndex);
        if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
          //console.log('dodge/parry anim', this.getName(), damageAnim.name)
          return damageAnim.name;
        }
      }
      
      let damageAnimIndex = combatAnimation['dodge'+weaponWield];
      let damageAnim = anims.getByID(damageAnimIndex);
      if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
        //console.log('dodge anim', this.getName(), damageAnim.name)
        return OdysseyModelAnimation.GetAnimation2DA(damageAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdodgeg');
    }
    //console.log(attackAnim);
    
    switch(attackAnim){
      case 'c2a1':
        return OdysseyModelAnimation.GetAnimation2DA('c2d1')
      case 'c2a2':
        return OdysseyModelAnimation.GetAnimation2DA('c2d2')
      case 'c2a3':
        return OdysseyModelAnimation.GetAnimation2DA('c2d3')
      case 'c2a4':
        return OdysseyModelAnimation.GetAnimation2DA('c2d4')
      case 'c2a5':
        return OdysseyModelAnimation.GetAnimation2DA('c2d5')
    }

    return OdysseyModelAnimation.GetAnimation2DA('g'+weaponWield+'g1');

  }

  getParryAnimation( attackAnim: string ): ITwoDAAnimation {

    let attackAnimIndex = -1;

    let modeltype = this.creatureAppearance.modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = GameState.TwoDAManager.datatables.get('animations');
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    //console.log('getParryAnimation', this.getName(), attackAnim, attackAnimIndex);
    let combatAnimation = GameState.TwoDAManager.datatables.get('combatanimations').getByID(attackAnimIndex);
    if(combatAnimation){
      let damageAnimIndex = combatAnimation['parry'+weaponWield];
      let damageAnim = anims.getByID(damageAnimIndex);
      if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
        //console.log('parry anim', this.getName(), damageAnim.name)
        return OdysseyModelAnimation.GetAnimation2DA(damageAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdodgeg');
    }
    //console.log(attackAnim);
    switch(attackAnim){
      case 'c2a1':
        return OdysseyModelAnimation.GetAnimation2DA('c2p1')
      case 'c2a2':
        return OdysseyModelAnimation.GetAnimation2DA('c2p2')
      case 'c2a3':
        return OdysseyModelAnimation.GetAnimation2DA('c2p3')
      case 'c2a4':
        return OdysseyModelAnimation.GetAnimation2DA('c2p4')
      case 'c2a5':
        return OdysseyModelAnimation.GetAnimation2DA('c2p5')
    }

    return OdysseyModelAnimation.GetAnimation2DA('g'+weaponWield+'g1');
    
  }

  getDeflectAnimation(): ITwoDAAnimation {
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    //console.log('getDamageAnimation', 'g'+weaponWield+'d1');
    return OdysseyModelAnimation.GetAnimation2DA('g'+weaponWield+'n1');
  }

  getCombatAnimationAttackType(): string {
    let weapon = this.equipment.RIGHTHAND;
    let weaponType = 0;
    //let weaponWield = this.getCombatAnimationWeaponType();

    if(this.equipment.RIGHTHAND){
      weaponType = (this.equipment.RIGHTHAND.getWeaponType());

      switch(weaponType){
        case 4:
          return 'b';
        case 1:
          return 'm';
        break;
      }

    }else if(this.equipment.CLAW1){
      weaponType = (this.equipment.CLAW1.getWeaponType());

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else if(this.equipment.CLAW2){
      weaponType = (this.equipment.CLAW2.getWeaponType());

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else if(this.equipment.CLAW3){
      weaponType = (this.equipment.CLAW3.getWeaponType());

      switch(weaponType){
        case 1:
        case 3:
        case 4:
          return 'm';
      }
    }else{
      return 'g';
    }

    /*if(weaponWield == 0)//this.isSimpleCreature())
      return 'm';

    if(weaponWield == 5 || weaponWield == 6 || weaponWield == 7 || weaponWield == 8 || weaponWield == 9){
      return 'b';
    }
    return 'c';*/
  }

  //Return the WeaponType ID for the current equipped items
  // g*r1 in this case * is the value we are trying to determine

  getCombatAnimationWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let cWeapon1 = this.equipment.CLAW1;
    let cWeapon2 = this.equipment.CLAW2;
    let cWeapon3 = this.equipment.CLAW3;
    let bothHands = (lWeapon) && (rWeapon);

    if(cWeapon1 || cWeapon2 || cWeapon3 || this.isSimpleCreature()){
      return 0;
    }

    let weapon = rWeapon || lWeapon;

    if(weapon){

      if(bothHands){
        switch((weapon.getWeaponWield())){
          case 1: //Stun Baton
          case 2: //Single Blade Melee
            return 4;
          case 4: //Blaster
            return 6;
        }
      }else{
        switch((weapon.getWeaponWield())){
          case 1: //Stun Baton
            return 1;
          case 2: //Single Blade Melee
            return 2;
          case 3: //Double Blade Melee
            return 3;
          case 4: //Blaster
            return 5;
          case 5: //Blaster Rifle
            return 7;
          case 6: //Heavy Carbine
            return 9;
        }
      }
    }

    //If no weapons are equipped then use unarmed animations
    return 8;

  }

  getEquippedWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let claw1 = this.equipment.CLAW1;
    let claw2 = this.equipment.CLAW2;
    let claw3 = this.equipment.CLAW3;

    if(rWeapon){
      return (rWeapon.getWeaponType());
    }

    if(lWeapon){
      return (lWeapon.getWeaponType());
    }

    if(claw1){
      return (claw1.getWeaponType());
    }

    if(claw2){
      return (claw2.getWeaponType());
    }

    if(claw3){
      return (claw3.getWeaponType());
    }

    return 0;
  }

  isRangedEquipped(){
    if(this.equipment.RIGHTHAND){
      return this.equipment.RIGHTHAND.isRangedWeapon();
    }

    if(this.equipment.LEFTHAND){
      return this.equipment.LEFTHAND.isRangedWeapon();
    }

    if(this.equipment.CLAW1){
      return this.equipment.CLAW1.isRangedWeapon();
    }

    if(this.equipment.CLAW2){
      return this.equipment.CLAW2.isRangedWeapon();
    }

    if(this.equipment.CLAW3){
      return this.equipment.CLAW3.isRangedWeapon();
    }

    return false;
  }

  updateItems(delta = 0){

    if(this.equipment.RIGHTHAND){
      if(this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
        this.equipment.RIGHTHAND.model.update(delta)
      }
    }

    if(this.equipment.LEFTHAND){
      if(this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
        this.equipment.LEFTHAND.model.update(delta)
      }
    }

  }

  playEvent(event: THREE.Event){
    this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    this.footstepEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    let appearance = this.creatureAppearance;

    let rhSounds, lhSounds;

    if(this.equipment.RIGHTHAND)
      rhSounds = GameState.TwoDAManager.datatables.get('weaponsounds').rows[this.equipment.RIGHTHAND.baseItem.poweredItem];

    if(this.equipment.LEFTHAND)
      lhSounds = GameState.TwoDAManager.datatables.get('weaponsounds').rows[this.equipment.LEFTHAND.baseItem.poweredItem];


    let sndIdx = Math.round(Math.random()*2);
    let sndIdx2 = Math.round(Math.random()*1);
    switch(event.event){
      case 'snd_footstep':
        let sndTable = GameState.TwoDAManager.datatables.get('footstepsounds').rows[appearance.footsteptype];
        if(sndTable){
          let sound = '****';
          switch(this.collisionData.surfaceId){
            case 1:
              sound = (sndTable['dirt'+sndIdx]);
            break;
            case 3:
              sound = (sndTable['grass'+sndIdx]);
            break;
            case 4:
              sound = (sndTable['stone'+sndIdx]);
            break;
            case 5:
              sound = (sndTable['wood'+sndIdx]);
            break;
            case 6:
              sound = (sndTable['water'+sndIdx]);
            break;
            case 9:
              sound = (sndTable['carpet'+sndIdx]);
            break;
            case 10:
              sound = (sndTable['metal'+sndIdx]);
            break;
            case 11:
            case 13:
              sound = (sndTable['puddles'+sndIdx]);
            break;
            case 14:
              sound = (sndTable['leaves'+sndIdx]);
            break;
            default:
              sound = (sndTable['dirt'+sndIdx]);
            break;
          }

          if(sound != '****'){
            this.footstepEmitter.stop();
            this.footstepEmitter.playSound(sound);
          }else if(sndTable['rolling'] != '****'){
            if(!this.footstepEmitter.currentSound){
              this.footstepEmitter.stop();
              this.footstepEmitter.playSound(sndTable['rolling']).then((buffer: AudioBufferSourceNode) => {
                buffer.loop = true;
              });
            }else if(this.footstepEmitter.currentSound && (this.footstepEmitter.currentSound as any).name != sndTable['rolling']){
              this.footstepEmitter.stop();
              this.footstepEmitter.playSound(sndTable['rolling']).then((buffer: AudioBufferSourceNode) => {
                buffer.loop = true;
              });
            }
          }
        }
      break;
      case 'Swingshort':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.playSound(rhSounds['swingshort'+sndIdx]);
        }
      break;
      case 'Swinglong':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.playSound(rhSounds['swinglong'+sndIdx]);
        }
      break;
      case 'HitParry':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.playSound(rhSounds['parry'+sndIdx2]);
        }
      break;
      case 'Contact':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.playSound(rhSounds['clash'+sndIdx2]);
        }
      break;
      case 'Clash':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.playSound(rhSounds['clash'+sndIdx2]);
        }
      break;
      case 'Hit':
        //console.log('Attack Hit Event');

        if(this.combatData.combatAction && this.combatData.combatAction.hits && this.combatData.combatAction.damage){
          this.combatData.combatAction.target.damage(this.combatData.combatAction.damage, this);
        }else{
          //console.error('playEvent Hit:', {hit: this.combatAction.hits, damage: this.combatAction.damage});
        }

        if(this.equipment.RIGHTHAND){
          if(this.equipment.RIGHTHAND){
            this.audioEmitter.playSound(rhSounds['leather'+Math.round(Math.random()*1)]);
          }
        }
      break;
    }
  }

  getIdleAnimation(){
    let modeltype = this.creatureAppearance.modeltype;

    switch(modeltype.toLowerCase()){
      case 's':
        if(this.combatData.combatState){

        }else{
          return 'walk';
        }
      break;
      case 'l':

      break;
      default:

      break;
    }

  }

  hasWeapons(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let cWeapon1 = this.equipment.CLAW1;
    let cWeapon2 = this.equipment.CLAW2;
    let cWeapon3 = this.equipment.CLAW3;
    return (lWeapon) || (rWeapon) || (cWeapon1) || (cWeapon2) || (cWeapon3);
  }

  flourish(){
    this.resetExcitedDuration();
    let isSimple = this.isSimpleCreature();
    let weaponType = this.getCombatAnimationWeaponType();
    
    if(!isSimple){
      if(weaponType){
        this.clearAllActions();
        this.setAnimationState(ModuleCreatureAnimState.FLOURISH);
        this.weaponPowered(true);
      }
    }
  }

  weaponPowered(on = false){

    let weaponType = this.getCombatAnimationWeaponType();
    let isSimple = this.isSimpleCreature();
    if(isSimple || !weaponType)
      return;

    //let modeltype = this.creatureAppearance.modeltype;
    //let hasHands = this.model.rhand instanceof THREE.Object3D && this.model.lhand instanceof THREE.Object3D;

    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    //let bothHands = (lWeapon) && (rWeapon);
    
    if(!isSimple){

      if(weaponType){
        
        if(lWeapon && lWeapon.model){
          let currentAnimL = this.equipment.LEFTHAND.model.animationManager.currentAnimation || this.equipment.LEFTHAND.model.getAnimationByName('off');
          if(currentAnimL){
            if(on){
              switch(currentAnimL.name){
                case 'off':
                  this.equipment.LEFTHAND.model.playAnimation('powerup');
                break;
                case 'powerup':
                break;
                default:
                  this.equipment.LEFTHAND.model.playAnimation('powered', true);
                break;
              }
            }else{
              switch(currentAnimL.name){
                case 'powered':
                  this.equipment.LEFTHAND.model.playAnimation('powerdown');
                break;
                case 'powerdown':
                break;
                default:
                  this.equipment.LEFTHAND.model.playAnimation('off', true);
                break;
              }
            }
          }
        }

        if(rWeapon && rWeapon.model){
          let currentAnimR = this.equipment.RIGHTHAND.model.animationManager.currentAnimation || this.equipment.RIGHTHAND.model.getAnimationByName('off');
          if(currentAnimR){
            if(on){
              switch(currentAnimR.name){
                case 'off':
                  this.equipment.RIGHTHAND.model.playAnimation('powerup', false);
                break;
                case 'powerup':
                break;
                default:
                  this.equipment.RIGHTHAND.model.playAnimation('powered', true);
                break;
              }
            }else{
              switch(currentAnimR.name){
                case 'powered':
                  this.equipment.RIGHTHAND.model.playAnimation('powerdown', false);
                break;
                case 'powerdown':
                break;
                default:
                  this.equipment.RIGHTHAND.model.playAnimation('off', true);
                break;
              }
            }
          }
        }

      }

    }

  }

  getWalkAnimation(){
    let modeltype = this.creatureAppearance.modeltype;

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cwalk';
      default:
        if(this.getHP()/this.getMaxHP() > .1){
          return 'walk';
        }else{
          return 'walkinj';
        }
    }

  }

  getRunAnimation(){
    let modeltype = this.creatureAppearance.modeltype;

    switch(modeltype){
      case 'S':
      case 'L':
        return 'crun';
      default:
        if(this.getHP()/this.getMaxHP() > .1){
          return 'run';
        }else{
          return 'runinj';
        }
    }

  }

  setLIP(lip: LIPObject){
    //console.log(lip);
    this.lipObject = lip;
  }

  getClosesetOpenSpot(oObject: ModuleObject){
    let maxDistance = Infinity;
    let radius = this.creatureAppearance.hitdist;
    let closest = undefined;
    let distance = 0;
    let origin = this.position;

    let alreadyClaimedSpot = false;

    //Check to see if oObject already has claimed a targetPosition around this creature
    for(let i = 0, len = this.targetPositions.length; i < len; i++){
      let targetPosition = this.targetPositions[i];
      if(targetPosition.object == oObject){
        closest = targetPosition;
        alreadyClaimedSpot = true;
        break;
      }
    }

    if(!alreadyClaimedSpot){
      for(let i = 0, len = this.targetPositions.length; i < len; i++){
        let targetPosition = this.targetPositions[i];
        if(targetPosition.object == undefined){
          //Generate the target vector for the 
          targetPosition.targetVector.x = origin.x + (targetPosition.cos * radius);
          targetPosition.targetVector.y = origin.y + (targetPosition.sin * radius);
          targetPosition.targetVector.z = origin.z;
          distance = targetPosition.targetVector.distanceTo(oObject.position);

          //is this target position is closer to oObject
          if(distance < maxDistance){
            //Set the current targetPosition as the current closest position
            closest = targetPosition;
            //Update the maxDistance
            maxDistance = distance;
          }
        }
      }
      if(typeof closest != 'undefined'){
        for(let i = 0, len = GameState.module.area.creatures.length; i < len; i++){
          GameState.module.area.creatures[i].removeObjectFromTargetPositions(oObject);
        }

        for(let i = 0, len = GameState.PartyManager.party.length; i < len; i++){
          GameState.PartyManager.party[i].removeObjectFromTargetPositions(oObject);
        }
        closest.object = oObject;
      }
    }
    return closest;
  }

  removeObjectFromTargetPositions(oObject: ModuleObject){
    if(typeof oObject != 'undefined'){
      for(let i = 0, len = this.targetPositions.length; i < len; i++){
        if(this.targetPositions[i].object == oObject){
          this.targetPositions[i].object = undefined;
        }
      }
    }
  }

  setFacingVector( facing = new THREE.Vector3() ){

    this.props['XOrientation'] = facing.x;
    this.props['YOrientation'] = facing.y;

    if(this.model instanceof OdysseyModel3D)
      this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.props['XOrientation'], this.props['YOrientation']));

  }

  getFacingVector(){
    if((this.model instanceof OdysseyModel3D)){
      let facing = new THREE.Vector3(0, 1, 0);
      facing.applyQuaternion(this.model.quaternion);
      return facing;
    }
    return new THREE.Vector3(0, 0, 0);
  }

  getPosition(){
    return this.position;
  }

  getFacing(){
    return this.rotation.z;
  }

  setFacingObject( target: ModuleObject ){
    if(target instanceof ModuleObject){
      this.setFacing(
        Math.atan2(
          this.position.y - target.position.y,
          this.position.x - target.position.x
        ) + Math.PI/2,
        false
      );
    }
  }

  lookAt(oObject: ModuleObject){
    if(oObject instanceof ModuleCreature){
      this.lookAtObject = oObject;
    }
  }

  onClick(callee: ModuleObject){

    //You can't interact with yourself
    if(this === GameState.PartyManager.Player && GameState.getCurrentPlayer() === this){
      return;
    }

    if(this.isHostile(callee) && !this.isDead()){
      GameState.getCurrentPlayer().attackCreature(this, undefined);
    }else if(this.isHostile(callee) && this.isDead()){
      this.clearAllActions();
      GameState.getCurrentPlayer().actionUseObject(this);
    }else if(!this.isDead()){
      this.clearAllActions();
      if(this.getConversation() && this.getConversation().resref){
        GameState.getCurrentPlayer().actionDialogObject(this, this.getConversation().resref, false, undefined, undefined, true);
      }
    }
    
  }

  //---------------//
  // SCRIPT EVENTS
  //---------------//

  onCombatRoundEnd(){
    if(this.combatData.lastAttemptedAttackTarget instanceof ModuleObject && this.combatData.lastAttemptedAttackTarget.isDead())
      this.combatData.lastAttemptedAttackTarget = undefined;

    if(this.isDead() || !this.combatData.combatState)
      return true;

    if(this.scripts.onEndRound instanceof NWScriptInstance){
      let instance = this.scripts.onEndRound.nwscript.newInstance();
      instance.run(this);
    }
  }

  onDeath(){
    this.weaponPowered(false);
    if(this.scripts.onDeath instanceof NWScriptInstance){
      let instance = this.scripts.onDeath.nwscript.newInstance();
      instance.run(this);
    }
  }

  onDialog(oSpeaker: ModuleObject, listenPatternNumber = -1){
    if(this.scripts.onDialog instanceof NWScriptInstance){
      let instance = this.scripts.onDialog.nwscript.newInstance();
      instance.listenPatternNumber = listenPatternNumber;
      instance.listenPatternSpeaker = oSpeaker;
      instance.run(this, 0);
      return true;
    }
  }

  onAttacked(){
    if(this.scripts.onAttacked instanceof NWScriptInstance){
      let instance = this.scripts.onAttacked.nwscript.newInstance();
      let script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2005 : 1005;
      instance.run(this, script_num);
    }
  }

  onDamaged(){
    if(this.isDead())
      return true;

    this.resetExcitedDuration();
    
    if(this.scripts.onDamaged instanceof NWScriptInstance){
      let instance = this.scripts.onDamaged.nwscript.newInstance();
      let script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2006 : 1006;
      instance.run(this, script_num);
    }
  }

  onBlocked(){
    if(this == GameState.getCurrentPlayer())
      return;

    if(this.scripts.onBlocked instanceof NWScriptInstance){
      let instance = this.scripts.onBlocked.nwscript.newInstance();
      let script_num = (GameState.PartyManager.party.indexOf(this) > -1) ? 2009 : 1009;
      instance.run(this, script_num);
    }
  }

  use(object: ModuleObject){
    if(this.hasInventory()){
      GameState.MenuManager.MenuContainer.AttachContainer(this);
      GameState.MenuManager.MenuContainer.open();
    }
  }

  hasInventory(){
    return this.inventory.length;
  }

  retrieveInventory(){
    while(this.inventory.length){
      GameState.InventoryManager.addItem(this.inventory.pop())
    }
  }

  isUseable(){
    return !this.isDead() || this.isDeadSelectable;
  }

  isDead(){
    return this.getHP() <= 0 && !this.min1HP;
  }

  isDiseased(){
    return this.hasEffect(GameEffectType.EffectDisease);
  }

  isPoisoned(){
    return this.hasEffect(GameEffectType.EffectPoison);
  }

  isConfused(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 1) ? true : false;
  }

  isFrightened(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 2) ? true : false;
  }

  isDroidStunned(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 3) ? true : false;
  }

  isStunned(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 4) ? true : false;
  }

  isParalyzed(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 5) ? true : false;
  }

  isSleeping(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 6) ? true : false;
  }

  isChoking(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 7) ? true : false;
  }

  isHorrified(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 8) ? true : false;
  }

  isForcePushed(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 9) ? true : false;
  }

  isWhirlwind(){
    return this.effects.find( e => e.type == GameEffectType.EffectSetState && e.getInt(0) == 10) ? true : false;
  }

  isDebilitated(){
    return this.isConfused() || this.isStunned() || this.isDroidStunned() || this.isParalyzed() || this.isFrightened() || this.isChoking() || this.isForcePushed() || this.isHorrified();
  }

  setCommadable(bCommandable = 0){
    this.isCommandable = bCommandable ? true : false;
  }

  getCommadable(){
    return this.isCommandable;
  }

  getItemInSlot(slot = 0){
    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        return this.equipment.IMPLANT;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        return this.equipment.HEAD;
      break;
      case ModuleCreatureArmorSlot.ARMS:
        return this.equipment.ARMS;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        return this.equipment.LEFTARMBAND;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        return this.equipment.ARMOR;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        return this.equipment.RIGHTARMBAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        return this.equipment.LEFTHAND;
      break;
      case ModuleCreatureArmorSlot.BELT:
        return this.equipment.BELT;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        return this.equipment.RIGHTHAND;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        return this.equipment.CLAW1;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        return this.equipment.CLAW2;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        return this.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }
  }

  hasItemInSlot(sTag='', slot = 0, ){
    switch(slot){
      case ModuleCreatureArmorSlot.ARMOR:
        if(this.equipment.ARMOR){

        }
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        try{
          if(this.creatureAppearance.modeltype != 'S'){
            if(this.equipment.RIGHTHAND && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
              this.model.rhand.add(this.equipment.RIGHTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        try{
          if(this.creatureAppearance.modeltype != 'S' && this.creatureAppearance.modeltype != 'L'){
            if(this.equipment.LEFTHAND && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
              this.model.lhand.add(this.equipment.LEFTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
    }
  }

  getInventory(): ModuleItem[] {
    if(this.isPartyMember()){
      return GameState.InventoryManager.getInventory();
    }else{
      return this.inventory;
    }
    /*if(this.template.RootNode.hasField('ItemList')){
      return this.template.RootNode.getFieldByLabel('ItemList').getChildStructs();
    }
    return [];*/
  }

  getXOrientation(){
    return this.xOrientation;
  }

  getYOrientation(){
    return this.yOrientation;
  }

  getZOrientation(){
    return this.zOrientation;
  }

  getRotation(){
    if(this.model){
      return Math.floor(this.rotation.z * 180) + 180
    }
    return 0;
  }

  getRace(){
    return this.race;
  }

  getSubRace(){
    return this.subrace;
  }

  getGender(){
    return this.gender;
  }

  getXP(){
    return this.experience;
  }

  setXP(value = 0){
    this.experience = value;
  }

  addXP(value = 0){
    this.experience += parseInt(value.toString());
  }

  getGoodEvil(){
    return this.goodEvil;
  }

  getSubraceIndex(){
    return this.subraceIndex;
  }

  setHP(nAmount = 0){
    let bonus = this.maxHitPoints - this.hitPoints;
    this.currentHitPoints = nAmount - bonus;
  }

  addHP(nAmount = 0, ignoreMaxHitPoints = false){
    if(ignoreMaxHitPoints){
      this.currentHitPoints += nAmount;
    }else{
      let currentHP = this.getHP();
      if(currentHP < this.getMaxHP()){
        if(currentHP + nAmount > this.getMaxHP()){
          this.currentHitPoints += nAmount + (this.getMaxHP() - (currentHP + nAmount));
        }else{
          this.currentHitPoints += nAmount;
        }
      }
    }

    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  subtractHP(nAmount = 0){
    this.currentHitPoints -= nAmount;
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  getHP(){
    switch(this.subraceIndex){
      case 0: //NONE
        return (this.maxHitPoints + this.currentHitPoints) - this.hitPoints;
      case 1: //WOOKIE
      case 2: //BEAST
        return this.hitPoints + this.currentHitPoints;
      default:
        return (this.maxHitPoints + this.currentHitPoints) - this.hitPoints;
    }
  }

  getMaxHP(){
    return this.maxHitPoints;
  }

  setMaxHP(nAmount = 0){
    return this.maxHitPoints = nAmount;
  }

  setMinOneHP(bMinOneHP = false){
    this.min1HP = bMinOneHP ? true : false;
  }

  getFP(){
    return this.forcePoints;
  }

  getMaxFP(){
    return this.maxForcePoints;
  }

  setFP(nAmount = 0){
    let bonus = this.maxForcePoints - this.forcePoints;
    this.currentForce = nAmount - bonus;
  }

  addFP(nAmount = 0, ignoreMaxForcePoints = false){
    if(ignoreMaxForcePoints){
      this.currentForce += nAmount;
    }else{
      let currentFP = this.getFP();
      if(currentFP < this.getMaxFP()){
        if(currentFP + nAmount > this.getMaxFP()){
          this.currentForce += nAmount + (this.getMaxFP() - (currentFP + nAmount));
        }else{
          this.currentForce += nAmount;
        }
      }
    }

    if(this.getFP() < 0)
      this.setFP(0);
  }

  subtractFP(nAmount = 0){
    this.currentForce -= nAmount;
    if(this.getFP() < 0)
      this.setFP(0);
  }

  getCameraHeight(){
    if(this.model && this.model.camerahook){
      return this.model.camerahook.position.z;
    }else{
      return 1.5;
    }
  }

  getAC(){
    let baseac = 10;
    let classBonus = 0;

    for(let i = 0; i < this.classes.length; i++){
      classBonus += this.classes[i].getACBonus();
    }

    let armorAC = (this.equipment.ARMOR?.getACBonus() || 0);

    let dexBonus = Math.floor((this.getDEX() - 10) / 2);

    return baseac + classBonus + armorAC + dexBonus;
  }

  getSTR(calculateBonuses = true){
    if(!calculateBonuses){
      return this.str;
    }else{
      return this.str +
      (this.equipment.HEAD?.getSTRBonus() || 0) +
      (this.equipment.ARMOR?.getSTRBonus() || 0) +
      (this.equipment.ARMS?.getSTRBonus() || 0) +
      (this.equipment.RIGHTHAND?.getSTRBonus() || 0) +
      (this.equipment.LEFTHAND?.getSTRBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getSTRBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getSTRBonus() || 0) +
      (this.equipment.IMPLANT?.getSTRBonus() || 0) +
      (this.equipment.BELT?.getSTRBonus() || 0) +
      (this.equipment.CLAW1?.getSTRBonus() || 0) +
      (this.equipment.CLAW2?.getSTRBonus() || 0) +
      (this.equipment.HIDE?.getSTRBonus() || 0);
    }
  }

  getDEX(calculateBonuses = true){
    if(!calculateBonuses){
      return this.dex;
    }else{
      return this.dex +
      (this.equipment.HEAD?.getDEXBonus() || 0) +
      (this.equipment.ARMOR?.getDEXBonus() || 0) +
      (this.equipment.ARMS?.getDEXBonus() || 0) +
      (this.equipment.RIGHTHAND?.getDEXBonus() || 0) +
      (this.equipment.LEFTHAND?.getDEXBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getDEXBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getDEXBonus() || 0) +
      (this.equipment.IMPLANT?.getDEXBonus() || 0) +
      (this.equipment.BELT?.getDEXBonus() || 0) +
      (this.equipment.CLAW1?.getDEXBonus() || 0) +
      (this.equipment.CLAW2?.getDEXBonus() || 0) +
      (this.equipment.HIDE?.getDEXBonus() || 0);
    }
  }

  getCON(calculateBonuses = true){
    if(!calculateBonuses){
      return this.con;
    }else{
      return this.con +
      (this.equipment.HEAD?.getCONBonus() || 0) +
      (this.equipment.ARMOR?.getCONBonus() || 0) +
      (this.equipment.ARMS?.getCONBonus() || 0) +
      (this.equipment.RIGHTHAND?.getCONBonus() || 0) +
      (this.equipment.LEFTHAND?.getCONBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getCONBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getCONBonus() || 0) +
      (this.equipment.IMPLANT?.getCONBonus() || 0) +
      (this.equipment.BELT?.getCONBonus() || 0) +
      (this.equipment.CLAW1?.getCONBonus() || 0) +
      (this.equipment.CLAW2?.getCONBonus() || 0) +
      (this.equipment.HIDE?.getCONBonus() || 0);
    }
  }

  getCHA(calculateBonuses = true){
    if(!calculateBonuses){
      return this.cha;
    }else{
      return this.cha +
      (this.equipment.HEAD?.getCHABonus() || 0) +
      (this.equipment.ARMOR?.getCHABonus() || 0) +
      (this.equipment.ARMS?.getCHABonus() || 0) +
      (this.equipment.RIGHTHAND?.getCHABonus() || 0) +
      (this.equipment.LEFTHAND?.getCHABonus() || 0) +
      (this.equipment.LEFTARMBAND?.getCHABonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getCHABonus() || 0) +
      (this.equipment.IMPLANT?.getCHABonus() || 0) +
      (this.equipment.BELT?.getCHABonus() || 0) +
      (this.equipment.CLAW1?.getCHABonus() || 0) +
      (this.equipment.CLAW2?.getCHABonus() || 0) +
      (this.equipment.HIDE?.getCHABonus() || 0);
    }
  }

  getWIS(calculateBonuses = true){
    if(!calculateBonuses){
      return this.wis;
    }else{
      return this.wis +
      (this.equipment.HEAD?.getWISBonus() || 0) +
      (this.equipment.ARMOR?.getWISBonus() || 0) +
      (this.equipment.ARMS?.getWISBonus() || 0) +
      (this.equipment.RIGHTHAND?.getWISBonus() || 0) +
      (this.equipment.LEFTHAND?.getWISBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getWISBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getWISBonus() || 0) +
      (this.equipment.IMPLANT?.getWISBonus() || 0) +
      (this.equipment.BELT?.getWISBonus() || 0) +
      (this.equipment.CLAW1?.getWISBonus() || 0) +
      (this.equipment.CLAW2?.getWISBonus() || 0) +
      (this.equipment.HIDE?.getWISBonus() || 0);
    }
  }

  getINT(calculateBonuses = true){
    if(!calculateBonuses){
      return this.int;
    }else{
      return this.int +
      (this.equipment.HEAD?.getINTBonus() || 0) +
      (this.equipment.ARMOR?.getINTBonus() || 0) +
      (this.equipment.ARMS?.getINTBonus() || 0) +
      (this.equipment.RIGHTHAND?.getINTBonus() || 0) +
      (this.equipment.LEFTHAND?.getINTBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getINTBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getINTBonus() || 0) +
      (this.equipment.IMPLANT?.getINTBonus() || 0) +
      (this.equipment.BELT?.getINTBonus() || 0) +
      (this.equipment.CLAW1?.getINTBonus() || 0) +
      (this.equipment.CLAW2?.getINTBonus() || 0) +
      (this.equipment.HIDE?.getINTBonus() || 0);
    }
  }

  getSpellSaveDC(){
    return 10 + this.getSpellCasterLevel();
  }

  getSpellCasterLevel(){
    let level = 0;
    for(let i = 0; i < this.classes.length; i++){
      if(this.classes[i].spellcaster){
        level += this.classes[i].level;
      }
    }
    return level;
  }

  getIsPC(){
    return this.isPC;
  }

  getPortraitId(){
    return this.portraidId;
  }

  getPortraitResRef(){
    const _2DA = GameState.TwoDAManager.datatables.get('portraits');
    if(_2DA){
      let portrait = _2DA.rows[this.getPortraitId()];
      if(portrait){

        if(this.getGoodEvil() >= 41){
          return portrait.baseresref;
        }else if(this.getGoodEvil() >= 31 && this.getGoodEvil() <= 40){
          if(portrait.baseresrefe != '****')
            return portrait.baseresrefe;
        }else if(this.getGoodEvil() >= 21 && this.getGoodEvil() <= 30){
          if(portrait.baseresrefve != '****')
            return portrait.baseresrefve;
        }else if(this.getGoodEvil() >= 11 && this.getGoodEvil() <= 20){
          if(portrait.baseresrefvve != '****')
            return portrait.baseresrefvve;
        }else if(this.getGoodEvil() >= 0 && this.getGoodEvil() <= 10){
          if(portrait.baseresrefvvve != '****')
            return portrait.baseresrefvvve;
        }

        return portrait.baseresref;

      }
    }
    return '';
  }

  getWalkRateId(){

    if(GameState.PartyManager.party.indexOf(this) >= 0){
      return 0;
    }

    return this.walkRate;
  }

  getName(){
    return this.firstName;
  }

  getAppearance(): CreatureAppearance {
    return this.creatureAppearance;
    // const appearance2DA = TwoDAManager.datatables.get('appearance');
    // if(appearance2DA){
    //   let eDisguise = this.getEffect(GameEffectType.EffectDisguise);
    //   if(eDisguise){
    //     return appearance2DA.rows[eDisguise.getInt(0)];
    //   }else{
    //     return appearance2DA.rows[this.appearance] || appearance2DA.rows[0];
    //   }
    // }
  }

  isWalking(){
    if(this.action && this.action.type == ActionType.ActionMoveToPoint){
      return !this.action.getParameter(5) ? true : false;
    }
    return this.walk;
  }

  getRunSpeed(){
    if(this.getWalkRateId() == 7){
      return this.creatureAppearance.rundist
    }
    const creaturespeed2DA = GameState.TwoDAManager.datatables.get('creaturespeed');
    if(creaturespeed2DA){
      return parseFloat(creaturespeed2DA.rows[this.getWalkRateId()].runrate);
    }
  }

  getWalkSpeed(){
    if(this.getWalkRateId() == 7){
      return this.creatureAppearance.walkdist
    }
    const creaturespeed2DA = GameState.TwoDAManager.datatables.get('creaturespeed');
    if(creaturespeed2DA){
      return parseFloat(creaturespeed2DA.rows[this.getWalkRateId()].walkrate);
    }
  }

  getMovementSpeed(){
    return (this.isWalking() ? this.getWalkSpeed() : this.getRunSpeed()) * this.movementSpeed;
  }

  getHitDistance(){
    return this.creatureAppearance.hitdist;
  }

  getMainClass(){
    if(!this.classes.length)
      return false;

    return this.classes[this.classes.length - 1];
  }

  getTotalClassLevel(){
    let total = 0;
    for(let i = 0, len = this.classes.length; i < len; i++){
      total += this.classes[i].level;
    }
    return total;
  }

  getClassLevel(nClass = 0){
    for(let i = 0, len = this.classes.length; i < len; i++){
      if(this.classes[i].id == nClass){
        return this.classes[i].level;
      }
    }
    return 0;
  }

  //Does the creature have enough EXP to level up
  canLevelUp(){
    let level = this.getTotalClassLevel();
    const exptable2DA = GameState.TwoDAManager.datatables.get('exptable');
    if(exptable2DA){
      let nextLevelEXP = exptable2DA.rows[level];
      if(this.getXP() >= parseInt(nextLevelEXP.xp)){
        return true;
      }
    }

    return false;
  }

  //Get the effective creature level based on the creatures current amount of EXP
  getEffectiveLevel(){
    let level = 0;

    const exptable2DA = GameState.TwoDAManager.datatables.get('exptable');
    if(exptable2DA){
      let totalLevels = exptable2DA.RowCount;
      let expLevels = exptable2DA.rows;

      for(let i = 0; i < totalLevels; i++){
        if(this.getXP() > parseInt(expLevels[i].level)){
          level = i;
        }
      }
    }

    return level;
  }

  autoLevelUp(){
    if(this.canLevelUp()){
      let mainClass = this.getMainClass();
      if(!mainClass){ return; }

      mainClass.level += 1;

      if(this.getTotalClassLevel() % 4 == 0){
        switch(mainClass.primaryabil.toLowerCase()){
          case 'str':
            this.str += 1;
          break;
          case 'con':
            this.con += 1;
          break;
          case 'dex':
            this.dex += 1;
          break;
          case 'wis':
            this.wis += 1;
          break;
          case 'cha':
            this.cha += 1;
          break;
          case 'int':
            this.int += 1;
          break;
        }
      }

      this.maxHitPoints += mainClass.hitdie + ( (this.getCON() - 10) /2 );
      this.currentHitPoints = 0;

    }
  }

  getBaseAttackBonus(){
    let bab = 0;
    for(let i = 0, len = this.classes.length; i < len; i++){
      bab += this.classes[i].getBaseAttackBonus();
    }

    let strMod = Math.floor(( this.getSTR() - 10) / 2);
    let dexMod = Math.floor(( this.getSTR() - 10) / 2);

    if(strMod > dexMod){
      bab += strMod;
    }else if(dexMod > strMod){
      bab += dexMod;
    }

    return bab;
  }

  getFeats(){
    return this.feats || [];
  }

  getFeat(id = 0){
    let feats = this.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return feats[i];
      }
    }
    return null;
  }

  addFeat(feat: number|TalentFeat = 0){
    if(feat instanceof TalentFeat){
      if(!this.getFeat(feat.id)){
        this.feats.push(feat);
      }
    }else{
      if(!this.getFeat(feat)){
        this.feats.push(new TalentFeat(feat));
      }
    }
  }

  getHasFeat(id: number = 0){
    let feats = this.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return true;
      }
    }
    return false;
  }

  getSkillList(){
    // if(this.template.RootNode.hasField('SkillList')){
    //   return this.template.RootNode.getFieldByLabel('SkillList').getChildStructs();
    // }
    return this.skills;
  }

  getHasSkill(value: number){
    return this.skills[value].rank > 0;
  }

  getSkillLevel(value: number){
    return this.skills[value].rank;
  }

  getHasSpell(id = 0){
    return (this.getSpell(id) instanceof TalentSpell) ? true : false;
  }

  getSpell(id = 0){
    for(let i = 0; i < this.classes.length; i++){
      let cls = this.classes[i];
      let spells = cls.getSpells();
      for(let j = 0, len = spells.length; j < len; j++){
        let spell = spells[j];
        if(spell.id == id)
          return spell;
      }
    }

    if(typeof this.equipment.RIGHTARMBAND != 'undefined'){
      let spells = this.equipment.RIGHTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    if(typeof this.equipment.LEFTARMBAND != 'undefined'){
      let spells = this.equipment.LEFTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    return undefined;
  }

  hasTalent(talent: TalentObject){
    //console.log('hasTalent', talent);
    if(typeof talent != 'undefined'){
      switch(talent.objectType){
        case 0: //Force / Spell
          return this.getHasSpell(talent.id) ? true : false;
        case 1: //Feat
          return this.getHasFeat(talent.id) ? true : false;
        case 2: //Skill
          return this.getHasSkill(talent.id) ? true : false;
      }
    }
    return false;
  }

  getTalents(){

    let talents: TalentObject[] = [];

    //Merge Spell Talents from all classs
    for(let i = 0; i < this.classes.length; i++){
      talents = talents.concat(this.classes[i].getSpells());
    }

    //Merge Feat Talents
    talents = talents.concat(this.feats);
    //Merge Skill Talents
    talents = talents.concat(this.skills);

    return talents;

  }

  getSpells(){
    const spells = [];

    for(let i = 0, len = this.classes.length; i < len; i++){
      spells.push(...this.classes[i].getSpells());
    }

    if(typeof this.equipment.RIGHTARMBAND != 'undefined'){
      spells.push(...this.equipment.RIGHTARMBAND.getSpells());
    }

    if(typeof this.equipment.LEFTARMBAND != 'undefined'){
      spells.push(...this.equipment.LEFTARMBAND.getSpells());
    }

    return spells;
  }

  getClassSpells(){
    const spells = [];

    for(let i = 0, len = this.classes.length; i < len; i++){
      spells.push(...this.classes[i].getSpells());
    }

    return spells;
  }

  getRandomTalent(category = 0, category2 = 0){

    let talents = this.getTalents().filter( (talent: any) => talent.category == category || talent.category == category2 );
    let talent = talents[Math.floor(Math.random()*talents.length)];
    //console.log('getRandomTalent', talent);
    return talent;

  }

  getTalentBest(nCategory = 0, nCRMax = 0, nInclusion = 0, nExcludeType = -1, nExcludeId = -1){
    let talents = this.getTalents().filter( (talent: any) => ( talent.category != '****' && ( (talent.category & nCategory) == nCategory ) && talent.maxcr <= nCRMax ) );
    talents.sort((a: any, b: any) => (a.maxcr > b.maxcr) ? 1 : -1);
    //console.log('getTalentBest', talents);
    if(talents.length){
      return talents[0];
    }
    return undefined;
  }

  getPerceptionRange(){
    const ranges2DA = GameState.TwoDAManager.datatables.get('ranges');
    if(ranges2DA){
      return parseInt(ranges2DA.rows[this.perceptionRange].primaryrange);
    }
  }

  getPerceptionRangeSecondary(){
    const ranges2DA = GameState.TwoDAManager.datatables.get('ranges');
    if(ranges2DA){
      return parseInt(ranges2DA.rows[this.perceptionRange].secondaryrange);
    }
  }


  isSimpleCreature(){
    if(!this.creatureAppearance) return false;
    return this.creatureAppearance.modeltype === 'S' || this.creatureAppearance.modeltype === 'L';
  }

  hasPerceived(creature: ModuleObject){
    if(creature == null)
      return false;
    
  }

  setListening(bVal = false){
    this.isListening = bVal ? true : false;
  }

  setListeningPattern(sString = '', iNum = 0){
    this.listeningPatterns[sString] = iNum;
  }

  getPersonalSpace(){
    return this.creatureAppearance.perspace;
  }

  initEffects(): void {
    const eRacialType = new EffectRacialType();
    eRacialType.setSubType(GameEffectDurationType.INNATE);
    eRacialType.setSkipOnLoad(true);
    eRacialType.setInt(0, this.getRace());
    this.addEffect(eRacialType);
    
    this.initPerceptionList();
    this.updateCollision();
    
    super.initEffects();
  }

  load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        this.loadScripts();
        GameState.FactionManager.AddCreatureToFaction(this);
      }else{
        console.error('Failed to load character template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadScripts();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts();
      GameState.FactionManager.AddCreatureToFaction(this);
    }
    
    if(!this.debugLabel){
      this.debugLabel = new TextSprite3D(`${this.getName()} | ${this.getTag()}`);
      this.debugLabel.setColor(this.helperColor);
      this.debugLabel.container.visible = !!this.context?.GetDebugState(EngineDebugType.OBJECT_LABELS);
      this.container.add(this.debugLabel.container);
    }
  }

  loadScripts (){

    this.scripts.onAttacked = this.template.getFieldByLabel('ScriptAttacked').getValue();
    this.scripts.onDamaged = this.template.getFieldByLabel('ScriptDamaged').getValue();
    this.scripts.onDeath = this.template.getFieldByLabel('ScriptDeath').getValue();
    this.scripts.onDialog = this.template.getFieldByLabel('ScriptDialogue').getValue();
    this.scripts.onDisturbed = this.template.getFieldByLabel('ScriptDisturbed').getValue();
    this.scripts.onEndDialog = this.template.getFieldByLabel('ScriptEndDialogu').getValue();
    this.scripts.onEndRound = this.template.getFieldByLabel('ScriptEndRound').getValue();
    this.scripts.onHeartbeat = this.template.getFieldByLabel('ScriptHeartbeat').getValue();
    this.scripts.onBlocked = this.template.getFieldByLabel('ScriptOnBlocked').getValue();
    this.scripts.onNotice = this.template.getFieldByLabel('ScriptOnNotice').getValue();
    this.scripts.onRested = this.template.getFieldByLabel('ScriptRested').getValue();
    this.scripts.onSpawn = this.template.getFieldByLabel('ScriptSpawn').getValue();
    this.scripts.onSpellAt = this.template.getFieldByLabel('ScriptSpellAt').getValue();
    this.scripts.onUserDefined = this.template.getFieldByLabel('ScriptUserDefine').getValue();

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
        this.scripts[key].caller = this;
      }
    }

  }

  loadModel (): Promise<OdysseyModel3D> {
    this.isReady = false;
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      this.loadEquipmentModels().then(() => {
        this.loadBody().then( () => {
          this.loadHead().then(() => {
            this.isReady = true;
            this.updateCollision(0.0000000000000000000001);
            this.update(0.0000000000000000000001);
            resolve(this.model);
          });
        });
      });
    });

  }

  loadBody(): Promise<OdysseyModel3D> {
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      let appearance = this.creatureAppearance;
      this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
      this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase();
      this.textureVar = 1;
      if(this.equipment.ARMOR){
        this.textureVar = this.equipment.ARMOR.getTextureVariation() || 1;
        //console.log('ModuleCreature', this, this.textureVar);
        if(appearance.modeltype != 'B'){

          let raceTex = appearance.racetex.replace(/\0[\s\S]*$/g,'');
          this.bodyModel = appearance.race.replace(/\0[\s\S]*$/g,'').toLowerCase();
          let match = raceTex.match(/\d+/);

          this.bodyTexture = raceTex;
          
          /*if(match && this.textureVar){

            match = match[0];
            this.bodyTexture = raceTex.replace( new RegExp("[0-9]+", "g"), this.textureVar ? pad( this.textureVar, match.length ) : '' );
            //console.log('ModuleCreature', this, this.bodyTexture, this.textureVar);
          }else{

            this.bodyTexture = raceTex; //(raceTex != '****' ? raceTex : 0) + ((this.textureVar < 10) ? (this.textureVar) : this.textureVar)
            //console.log('ModuleCreature', this, raceTex);
          }*/

          //console.log('ModuleCreature', 'body 1', this, this.bodyTexture, raceTex, this.textureVar, appearance);
          
        }else{
          switch(this.equipment.ARMOR.getBodyVariation().toLowerCase()){
            case 'a':
              this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'b':
              this.bodyModel = appearance.modelb.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texb.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'c':
              this.bodyModel = appearance.modelc.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texc.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'd':
              this.bodyModel = appearance.modeld.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texd.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'e':
              this.bodyModel = appearance.modele.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texe.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'f':
              this.bodyModel = appearance.modelf.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texf.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'g':
              this.bodyModel = appearance.modelg.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texg.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'h':
              this.bodyModel = appearance.modelh.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texh.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            case 'i':
              this.bodyModel = appearance.modeli.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texi.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
            default:
              this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
              this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
            break;
          }

          if(this.bodyTexture != '****'){
            this.bodyTexture += Utility.PadInt( this.textureVar, 2);
          }

          //console.log('ModuleCreature', 'body 1B', this, this.bodyTexture, this.bodyModel, this.textureVar, appearance);
        }
        
      }else{
        if(appearance.modeltype != 'B'){
          let raceTex = appearance.racetex.replace(/\0[\s\S]*$/g,'').toLowerCase();
          this.bodyModel = appearance.race.replace(/\0[\s\S]*$/g,'').toLowerCase();

          let match = raceTex.match(/\d+/);
          if(match && this.textureVar > 1){
            match = match[0] as any;
            this.bodyTexture = raceTex.replace( new RegExp("[0-9]+", "g"), this.textureVar ? Utility.PadInt( this.textureVar, match.length ) : '' );
          }else{
            this.bodyTexture = raceTex; //(raceTex != '****' ? raceTex : 0) + ((this.textureVar < 10) ? (this.textureVar) : this.textureVar)
          }

          //console.log('ModuleCreature', 'body 2', this, this.bodyTexture, raceTex, this.textureVar, appearance);
        }else{
          this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
          this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + Utility.PadInt( this.textureVar, 2);

          //console.log('ModuleCreature', 'body 2B', this, this.bodyTexture, this.bodyModel, this.textureVar, appearance);
        }
      }

      if(this.bodyModel == '****'){
        this.model = new OdysseyModel3D();
        resolve(this.model);
      }else{
        MDLLoader.loader.load(this.bodyModel).then( 
          (mdl: OdysseyModel) => {
            OdysseyModel3D.FromMDL(mdl, {
              castShadow: true,
              receiveShadow: true,
              textureVar: this.bodyTexture,
              isHologram: this.isHologram,
              context: this.context,
            }).then((model: OdysseyModel3D) => {
              if(this.model){
                this.model.removeFromParent();
                try{ this.model.dispose(); }catch(e){}
              }
              
              model.addEventListener('playEvent', this.playEvent.bind(this));

              this.model = model;
              this.model.userData.moduleObject = this;
              this.container.add(this.model);
              this.box.setFromObject(this.container);

              try{
                if(this.model.lhand instanceof OdysseyObject3D){
                  if(this.equipment.LEFTHAND && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
                    this.model.lhand.add(this.equipment.LEFTHAND.model);
                  }
                }
              }catch(e){
                console.error('ModuleCreature.LoadBody', e);
              }

              try{
                if(this.model.rhand instanceof OdysseyObject3D){
                  if(this.equipment.RIGHTHAND && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
                    this.model.rhand.add(this.equipment.RIGHTHAND.model);
                  }
                }
              }catch(e){
                console.error('ModuleCreature.LoadBody', e);
              }

              resolve(this.model)

              this.model.disableMatrixUpdate();

            }).catch(() => {
              resolve(this.model);
            });
          }
        ).catch(() => {
          resolve(this.model);
        });
      }
    });
  }

  loadHead(): Promise<OdysseyModel3D> {
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      let appearance = this.creatureAppearance;
      let headId = appearance.normalhead;//.replace(/\0[\s\S]*$/g,'').toLowerCase();
      this.headModel = undefined;
      if(headId >= 0 && appearance.modeltype == 'B'){
        const heads2DA = GameState.TwoDAManager.datatables.get('heads');
        if(heads2DA){
          let head = heads2DA.rows[headId];
          this.headModel = head.head.replace(/\0[\s\S]*$/g,'').toLowerCase();
          MDLLoader.loader.load(this.headModel).then(
            (mdl: OdysseyModel) => {
              OdysseyModel3D.FromMDL(mdl, {
                context: this.context,
                castShadow: true,
                receiveShadow: true,
                isHologram: this.isHologram,
              }).then((head: OdysseyModel3D) => {
                try{
                  if(this.head instanceof OdysseyModel3D && this.head.parent){
                    this.head.parent.remove(this.head);
                    this.head.dispose();
                  }

                  this.head = head;
                  this.head.userData.moduleObject = this;
                  this.model.attachHead(head);

                  try{
                    if(this.head.gogglehook instanceof THREE.Object3D){
                      if(this.equipment.HEAD && this.equipment.HEAD.model instanceof OdysseyModel3D){
                        this.head.gogglehook.add(this.equipment.HEAD.model);
                      }
                    }
                  }catch(e){
                    console.error('ModuleCreature', e);
                  }
                  
                  resolve(this.head);
                  this.head.disableMatrixUpdate();
                }catch(e){
                  console.error(e);
                  resolve(this.head);
                }
              }).catch(() => {
                resolve(this.head);
              });
            }
          ).catch( () => {
            resolve(this.head);
          });
        }else{
          resolve(this.head);
        }
      }else{
        resolve(this.head);
      }
    });
  }

  /*getEquip_ItemList(){
    if(this.template.RootNode.hasField('Equip_ItemList')){
      return this.template.getFieldByLabel('Equip_ItemList').getChildStructs()
    }
    return [];
  }*/

  equipItem(slot = 0x1, item: ModuleItem, onLoad?: Function){
    if(!item){
      if(typeof onLoad == 'function')
        onLoad();

      return;
    }

    this.unequipSlot(slot);
    item.onEquip(this);
    item.loadModel().then( () => {
      switch(slot){
        case ModuleCreatureArmorSlot.ARMOR:
          this.equipment.ARMOR = item;
          this.loadModel().then(() => {
            if(typeof onLoad == 'function')
              onLoad();
          });
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND:
          this.equipment.RIGHTHAND = item;
          item.loadModel().then(() => {
            if(item.model instanceof OdysseyModel3D)
              this.model.rhand.add(item.model);

            if(typeof onLoad == 'function')
              onLoad();
          });
        break;
        case ModuleCreatureArmorSlot.LEFTHAND:
          this.equipment.LEFTHAND = item;
          item.loadModel().then(() => {
            if(item.model instanceof OdysseyModel3D)
              this.model.lhand.add(item.model);

            if(typeof onLoad == 'function')
              onLoad();
          });
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND2:
          this.equipment.RIGHTHAND2 = item;
        break;
        case ModuleCreatureArmorSlot.LEFTHAND2:
          this.equipment.LEFTHAND2 = item;
        break;
        case ModuleCreatureArmorSlot.CLAW1:
          this.equipment.CLAW1 = item;
        break;
        case ModuleCreatureArmorSlot.CLAW2:
          this.equipment.CLAW2 = item;
        break;
        case ModuleCreatureArmorSlot.CLAW3:
          this.equipment.CLAW3 = item;
        break;
      }
    });
  }

  unequipSlot(slot = 0x1){
    try{
      switch(slot){
        case ModuleCreatureArmorSlot.IMPLANT:
          try{
            if(this.equipment.IMPLANT){
              this.equipment.IMPLANT.onUnEquip(this);
              this.equipment.IMPLANT.destroy();
              this.equipment.IMPLANT = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.HEAD:

          if(this.equipment.HEAD){
            this.equipment.HEAD.onUnEquip(this);
          }

          try{
            this.equipment.HEAD.model.parent.remove(this.equipment.HEAD.model);
          }catch(e){}

          this.equipment.HEAD = undefined;
          this.loadModel();
        break;
        case ModuleCreatureArmorSlot.ARMS:
          try{
            if(this.equipment.ARMS){
              this.equipment.ARMS.onUnEquip(this);
              this.equipment.ARMS.destroy();
              this.equipment.ARMS = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTARMBAND:
          try{
            if(this.equipment.RIGHTARMBAND){
              this.equipment.RIGHTARMBAND.onUnEquip(this);
              this.equipment.RIGHTARMBAND.destroy();
              this.equipment.RIGHTARMBAND = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTARMBAND:
          try{
            if(this.equipment.LEFTARMBAND){
              this.equipment.LEFTARMBAND.onUnEquip(this);
              this.equipment.LEFTARMBAND.destroy();
              this.equipment.LEFTARMBAND = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.ARMOR:

          if(this.equipment.ARMOR){
            this.equipment.ARMOR.onUnEquip(this);
          }

          this.equipment.ARMOR = undefined;
          this.loadModel();
        break;
        case ModuleCreatureArmorSlot.RIGHTARMBAND:
          try{
            if(this.equipment.RIGHTARMBAND){
              this.equipment.RIGHTARMBAND.onUnEquip(this);
              this.model.rhand.remove(this.equipment.RIGHTARMBAND.model);
              this.equipment.RIGHTARMBAND.destroy();
              this.equipment.RIGHTARMBAND = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND:
          try{
            if(this.equipment.RIGHTHAND){
              this.equipment.RIGHTHAND.onUnEquip(this);
              this.model.rhand.remove(this.equipment.RIGHTHAND.model);
              this.equipment.RIGHTHAND.destroy();
              this.equipment.RIGHTHAND = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTHAND2:
          try{
            if(this.equipment.RIGHTHAND2){
              this.equipment.RIGHTHAND2.onUnEquip(this);
              // this.model.rhand.remove(this.equipment.RIGHTHAND2.model);
              this.equipment.RIGHTHAND2.destroy();
              this.equipment.RIGHTHAND2 = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.BELT:
          try{
            if(this.equipment.BELT){
              this.equipment.BELT.onUnEquip(this);
              this.model.rhand.remove(this.equipment.BELT.model);
              this.equipment.BELT.destroy();
              this.equipment.BELT = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTHAND:
          try{
            if(this.equipment.LEFTHAND){
              this.equipment.LEFTHAND.onUnEquip(this);
              this.model.lhand.remove(this.equipment.LEFTHAND.model);
              this.equipment.LEFTHAND.destroy();
              this.equipment.LEFTHAND = null;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTHAND2:
          try{
            if(this.equipment.LEFTHAND2){
              this.equipment.LEFTHAND2.onUnEquip(this);
              // this.model.lhand.remove(this.equipment.LEFTHAND2.model);
              this.equipment.LEFTHAND2.destroy();
              this.equipment.LEFTHAND2 = null;
            }
          }catch(e){
            
          }
        break;
      }
    }catch(e){
      console.error('unequipItem', e);
    }
  }

  UnequipItems(){
    //this.unequipSlot(ModuleCreatureArmorSlot.ARMOR);
    this.unequipSlot(ModuleCreatureArmorSlot.LEFTHAND);
    this.unequipSlot(ModuleCreatureArmorSlot.RIGHTHAND);
  }

  UnequipHeadItem(){
    this.unequipSlot(ModuleCreatureArmorSlot.HEAD);
  }

  GetItemInSlot(slot = 0){

    switch(slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        return this.equipment.IMPLANT;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        return this.equipment.HEAD;
      break;
      case ModuleCreatureArmorSlot.ARMS:
        return this.equipment.ARMS;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        return this.equipment.LEFTARMBAND;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        return this.equipment.ARMOR;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        return this.equipment.RIGHTARMBAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        return this.equipment.LEFTHAND;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND2:
        return this.equipment.LEFTHAND2;
      break;
      case ModuleCreatureArmorSlot.BELT:
        return this.equipment.BELT;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        return this.equipment.RIGHTHAND;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND2:
        return this.equipment.RIGHTHAND2;
      break;
      case ModuleCreatureArmorSlot.HIDE:
        return this.equipment.HIDE;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        return this.equipment.CLAW1;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        return this.equipment.CLAW2;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        return this.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }

  }

  loadEquipmentItem(args: any = {}){

    args = Object.assign({
      item: new GFFObject(),
      Slot: 0x01,
      onLoad: null,
      onError: null
    }, args);
    //console.log('loadEquipmentItem', args);
    let uti: ModuleItem = args.item;

    if(uti instanceof GFFObject)
      uti = new GameState.Module.ModuleArea.ModuleItem(uti);

    switch(args.Slot){
      case ModuleCreatureArmorSlot.IMPLANT:
        this.equipment.IMPLANT = uti;
      break;
      case ModuleCreatureArmorSlot.HEAD:
        this.equipment.HEAD = uti;
      break;
      case ModuleCreatureArmorSlot.ARMS:
        this.equipment.ARMS = uti;
      break;
      case ModuleCreatureArmorSlot.ARMOR:
        this.equipment.ARMOR = uti;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        this.equipment.RIGHTHAND = uti;
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        this.equipment.LEFTHAND = uti;
      break;
      case ModuleCreatureArmorSlot.BELT:
        this.equipment.BELT = uti;
      break;
      case ModuleCreatureArmorSlot.RIGHTARMBAND:
        this.equipment.RIGHTARMBAND = uti;
      break;
      case ModuleCreatureArmorSlot.LEFTARMBAND:
        this.equipment.LEFTARMBAND = uti;
      break;
      case ModuleCreatureArmorSlot.HIDE:
        this.equipment.HIDE = uti;
      break;
      case ModuleCreatureArmorSlot.CLAW1:
        this.equipment.CLAW1 = uti;
      break;
      case ModuleCreatureArmorSlot.CLAW2:
        this.equipment.CLAW2 = uti;
      break;
      case ModuleCreatureArmorSlot.CLAW3:
        this.equipment.CLAW3 = uti;
      break;
    }
    
    if(!uti.load()){
      if(typeof args.onLoad == 'function')
        args.onLoad();

      return;
    }
    uti.loadModel().then( () => {
      if(args.Slot == ModuleCreatureArmorSlot.RIGHTHAND || args.Slot == ModuleCreatureArmorSlot.LEFTHAND){
        uti.model.playAnimation('off', true);
      }
      if(typeof args.onLoad == 'function')
        args.onLoad();
    });

  }

  initProperties(){
    try{
      this.classes = [];
      this.feats = [];
      this.skills = [new TalentSkill(0), new TalentSkill(1), new TalentSkill(2), new TalentSkill(3), new TalentSkill(4), new TalentSkill(5), new TalentSkill(6), new TalentSkill(7)];
      
      if(!this.initialized){
        if(this.template.RootNode.hasField('ObjectId')){
          this.id = this.template.getFieldByLabel('ObjectId').getValue();
        }else if(this.template.RootNode.hasField('ID')){
          this.id = this.template.getFieldByLabel('ID').getValue();
        }
        
        GameState.ModuleObjectManager.AddObjectById(this);
      }

      if(this.template.RootNode.hasField('Appearance_Type')){
        this.appearance = this.template.getFieldByLabel('Appearance_Type').getValue();
        this.creatureAppearance = GameState.AppearanceManager.GetCreatureAppearanceById(this.appearance);
      }

      if(this.template.RootNode.hasField('BodyBag'))
        this.bodyBag = this.template.getFieldByLabel('BodyBag').getValue();

      if(this.template.RootNode.hasField('BodyVariation'))
        this.bodyBag = this.template.getFieldByLabel('BodyVariation').getValue();

      if(this.template.RootNode.hasField('ChallengeRating'))
        this.challengeRating = this.template.getFieldByLabel('ChallengeRating').getValue();

      if(this.template.RootNode.hasField('ClassList')){
        let classes = this.template.RootNode.getFieldByLabel('ClassList').getChildStructs();
        for(let i = 0; i < classes.length; i++){
          this.classes.push(
            CreatureClass.FromCreatureClassStruct(classes[i])
          );
        }
      }

      if(this.template.RootNode.hasField('Conversation')){
        this.conversation = DLGObject.FromResRef(this.template.getFieldByLabel('Conversation').getValue());
      }

      if(this.template.RootNode.hasField('CurrentForce'))
        this.currentForce = this.template.getFieldByLabel('CurrentForce').getValue();

      if(this.template.RootNode.hasField('CurrentHitPoints'))
        this.currentHitPoints = this.template.getFieldByLabel('CurrentHitPoints').getValue();

      if(this.template.RootNode.hasField('HitPoints'))
        this.hitPoints = this.template.getFieldByLabel('HitPoints').getValue();

      if(this.template.RootNode.hasField('Disarmable'))
        this.disarmable = this.template.getFieldByLabel('Disarmable').getValue();
    
      if(this.template.RootNode.hasField('Experience'))
        this.experience = this.template.RootNode.getFieldByLabel('Experience').getValue();

      if(this.template.RootNode.hasField('Listening')){
        this.setListening(this.template.RootNode.getFieldByLabel('Listening').getValue());
      }
      if(this.template.RootNode.hasField('Commandable')){
        this.setCommadable(this.template.RootNode.getFieldByLabel('Commandable').getValue());
      }

      if(this.template.RootNode.hasField('ExpressionList')){
        let expressions = this.template.RootNode.getFieldByLabel('ExpressionList').getChildStructs();
        for(let i = 0; i < expressions.length; i++){
          this.setListeningPattern(
            expressions[i].getFieldByLabel('ExpressionString').getValue(),
            expressions[i].getFieldByLabel('ExpressionId').getValue()
          );
        }
      }
          
      if(this.template.RootNode.hasField('FactionID')){
        this.factionId = this.template.getFieldByLabel('FactionID').getValue();
        if((this.factionId & 0xFFFFFFFF) == -1){
          this.factionId = 0;
        }
      }
      this.faction = GameState.FactionManager.factions.get(this.factionId);

      if(this.template.RootNode.hasField('FeatList')){
        let feats = this.template.RootNode.getFieldByLabel('FeatList').getChildStructs();
        for(let i = 0; i < feats.length; i++){
          this.feats.push(
            new TalentFeat( feats[i].getFieldByLabel('Feat').getValue() )
          );
        }
      }

      if(this.template.RootNode.hasField('FirstName'))
        this.firstName = this.template.RootNode.getFieldByLabel('FirstName').getValue();
      
      if(this.template.RootNode.hasField('ForcePoints'))
        this.forcePoints = this.template.RootNode.getFieldByLabel('ForcePoints').getValue();
          
      if(this.template.RootNode.hasField('Gender'))
        this.gender = this.template.RootNode.getFieldByLabel('Gender').getValue();
    
      if(this.template.RootNode.hasField('GoodEvil'))
        this.goodEvil = this.template.RootNode.getFieldByLabel('GoodEvil').getValue();
        
      if(this.template.RootNode.hasField('Hologram'))
        this.isHologram = this.template.getFieldByLabel('Hologram').getValue();

      if(this.template.RootNode.hasField('Interruptable'))
        this.interruptable = this.template.getFieldByLabel('Interruptable').getValue();

      if(this.template.RootNode.hasField('IsPC'))
        this.isPC = this.template.getFieldByLabel('IsPC').getValue();

      if(this.template.RootNode.hasField('LastName'))
        this.lastName = this.template.getFieldByLabel('LastName').getValue();

      if(this.template.RootNode.hasField('MaxHitPoints')){
        this.maxHitPoints = this.template.getFieldByLabel('MaxHitPoints').getValue();
      }

      if(this.template.RootNode.hasField('MaxForcePoints')){
        this.maxForcePoints = this.template.getFieldByLabel('MaxForcePoints').getValue();
      }

      if(this.template.RootNode.hasField('Min1HP'))
        this.min1HP = this.template.getFieldByLabel('Min1HP').getValue();

      if(this.template.RootNode.hasField('NaturalAC'))
        this.naturalAC = this.template.getFieldByLabel('NaturalAC').getValue();

      if(this.template.RootNode.hasField('NoPermDeath'))
        this.noPermDeath = this.template.getFieldByLabel('NoPermDeath').getValue();

      if(this.template.RootNode.hasField('NotReorienting'))
        this.notReorienting = this.template.getFieldByLabel('NotReorienting').getValue();

      if(this.template.RootNode.hasField('PartyInteract'))
        this.partyInteract = this.template.getFieldByLabel('PartyInteract').getValue();

      if(this.template.RootNode.hasField('PerceptionRange')){
        this.perceptionRange = this.template.getFieldByLabel('PerceptionRange').getValue();
      }else{
        //https://forum.neverwintervault.org/t/perception-range/3191/9
        //It appears that PerceptionRange isn't saved inside the GIT file.
        //The original game appears to use PercepRngDefault when a creature is reloaded from a SaveGame
        this.perceptionRange = 11;
      }

      if(this.template.RootNode.hasField('Phenotype'))
        this.phenotype = this.template.getFieldByLabel('Phenotype').getValue();

      if(this.template.RootNode.hasField('Plot'))
        this.plot = this.template.getFieldByLabel('Plot').getValue();

      if(this.template.RootNode.hasField('PortraitId'))
        this.portraidId = this.template.getFieldByLabel('PortraitId').getValue();
    
      if(this.template.RootNode.hasField('Race'))
        this.race = this.template.RootNode.getFieldByLabel('Race').getValue();

      if(this.template.RootNode.hasField('SkillList')){
        let skills = this.template.RootNode.getFieldByLabel('SkillList').getChildStructs();
        for(let i = 0; i < skills.length; i++){
          this.skills[i] = new TalentSkill(i, skills[i].getFieldByLabel('Rank').getValue());
        }
      }

      if(this.template.RootNode.hasField('SoundSetFile'))
        this.soundSetFile = this.template.RootNode.getFieldByLabel('SoundSetFile').getValue();
    
      if(this.template.RootNode.hasField('SubRace'))
        this.subrace = this.template.RootNode.getFieldByLabel('SubRace').getValue();

      if(this.template.RootNode.hasField('Tag'))
        this.tag = this.template.getFieldByLabel('Tag').getValue();

      if(this.template.RootNode.hasField('TemplateResRef'))
        this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

      if(this.template.RootNode.hasField('TextureVar'))
        this.textureVar = this.template.getFieldByLabel('TextureVar').getValue();

      if(this.template.RootNode.hasField('WalkRate'))
        this.walkRate = this.template.getFieldByLabel('WalkRate').getValue();

      if(this.template.RootNode.hasField('Str'))
        this.str = this.template.getFieldByLabel('Str').getValue();
    
      if(this.template.RootNode.hasField('Dex'))
        this.dex = this.template.getFieldByLabel('Dex').getValue();
    
      if(this.template.RootNode.hasField('Con'))
        this.con = this.template.getFieldByLabel('Con').getValue();
    
      if(this.template.RootNode.hasField('Cha'))
        this.cha = this.template.getFieldByLabel('Cha').getValue();
    
      if(this.template.RootNode.hasField('Wis'))
        this.wis = this.template.getFieldByLabel('Wis').getValue();
    
      if(this.template.RootNode.hasField('Int'))
        this.int = this.template.getFieldByLabel('Int').getValue();

      if(this.template.RootNode.hasField('XPosition'))
        this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

      if(this.template.RootNode.hasField('YPosition'))
        this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

      if(this.template.RootNode.hasField('ZPosition'))
        this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();

      if(this.template.RootNode.hasField('XOrientation'))
        this.xOrientation = this.template.RootNode.getFieldByLabel('XOrientation').getValue();

      if(this.template.RootNode.hasField('YOrientation'))
        this.yOrientation = this.template.RootNode.getFieldByLabel('YOrientation').getValue();

      if(this.template.RootNode.hasField('ZOrientation'))
        this.zOrientation = this.template.RootNode.getFieldByLabel('ZOrientation').getValue();
        
      if(this.template.RootNode.hasField('FortSaveThrow'))
        this.fortitudeSaveThrow = this.template.RootNode.getFieldByLabel('FortSaveThrow').getValue();

      if(this.template.RootNode.hasField('RefSaveThrow'))
        this.reflexSaveThrow = this.template.RootNode.getFieldByLabel('RefSaveThrow').getValue();

      if(this.template.RootNode.hasField('WillSaveThrow'))
        this.willSaveThrow = this.template.RootNode.getFieldByLabel('WillSaveThrow').getValue();

        if(this.template.RootNode.hasField('SubraceIndex'))
          this.subraceIndex = this.template.RootNode.getFieldByLabel('SubraceIndex').getValue();


      if(this.template.RootNode.hasField('SWVarTable')){
        let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
        //console.log(localBools);
        for(let i = 0; i < localBools.length; i++){
          let data = localBools[i].getFieldByLabel('Variable').getValue();
          for(let bit = 0; bit < 32; bit++){
            this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
          }
        }
        let localNumbers = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('ByteArray').getChildStructs();
        //console.log(localNumbers);
        for(let i = 0; i < localNumbers.length; i++){
          let data = localNumbers[i].getFieldByLabel('Variable').getValue();
          this.setLocalNumber(i, data);
        }
      }

      if(this.template.RootNode.hasField('PM_Appearance'))
        this.pm_Appearance = this.template.RootNode.getFieldByLabel('PM_Appearance').getValue();

      if(this.template.RootNode.hasField('PM_IsDisguised'))
        this.pm_IsDisguised = !!this.template.RootNode.getFieldByLabel('PM_IsDisguised').getValue();

      try{
        if(this.template.RootNode.hasField('EffectList')){
          let effects = this.template.RootNode.getFieldByLabel('EffectList').getChildStructs() || [];
          for(let i = 0; i < effects.length; i++){
            let effect = GameEffectFactory.EffectFromStruct(effects[i]);
            if(effect){
              effect.setAttachedObject(this);
              effect.loadModel();
              //console.log('attached');
              this.effects.push(effect);
              //this.addEffect(effect);
            }
          }
        }
      }catch(e: any){
        console.error(e);
      }

      try{
        if(this.template.RootNode.hasField('Equip_ItemList')){
          let equipment = this.template.RootNode.getFieldByLabel('Equip_ItemList').getChildStructs() || [];
          for(let i = 0; i < equipment.length; i++){
            let strt = equipment[i];
            let equipped_item = undefined;
            let slot_type = strt.type;
            if(strt.hasField('EquippedRes')){
              equipped_item = new GameState.Module.ModuleArea.ModuleItem(strt.getFieldByLabel('EquippedRes').getValue());
            }else{
              equipped_item = new GameState.Module.ModuleArea.ModuleItem(GFFObject.FromStruct(strt));
            }
            
            switch(slot_type){
              case ModuleCreatureArmorSlot.HEAD:
                this.equipment.HEAD = equipped_item;
              break;
              case ModuleCreatureArmorSlot.ARMS:
                this.equipment.ARMS = equipped_item;
              break;
              case ModuleCreatureArmorSlot.ARMOR:
                this.equipment.ARMOR = equipped_item;
              break;
              case ModuleCreatureArmorSlot.LEFTHAND:
                this.equipment.LEFTHAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.LEFTHAND2:
                this.equipment.LEFTHAND2 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.RIGHTHAND:
                this.equipment.RIGHTHAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.RIGHTHAND2:
                this.equipment.RIGHTHAND2 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.LEFTARMBAND:
                this.equipment.LEFTARMBAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.RIGHTARMBAND:
                this.equipment.RIGHTARMBAND = equipped_item;
              break;
              case ModuleCreatureArmorSlot.IMPLANT:
              this.equipment.IMPLANT = equipped_item;
              break;
              case ModuleCreatureArmorSlot.BELT:
                this.equipment.BELT = equipped_item;
              break;

              //Simple Creature Slots
              case ModuleCreatureArmorSlot.HIDE:
                this.equipment.HIDE = equipped_item;
              break;
              case ModuleCreatureArmorSlot.CLAW1:
                this.equipment.CLAW1 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.CLAW2:
                this.equipment.CLAW2 = equipped_item;
              break;
              case ModuleCreatureArmorSlot.CLAW3:
                this.equipment.CLAW3 = equipped_item;
              break;
              default:
                console.warn('ModuleCreature.initProperties', 'Unhandled Equipment Slot', equipped_item);
              break;
            }
          }
        }
      }catch(e: any){
        console.error(e);
      }

      this.parseEquipmentSlots();

      if(this.template.RootNode.hasField('ItemList')){
        const inventory = this.template.RootNode.getFieldByLabel('ItemList').getChildStructs();
        for(let i = 0; i < inventory.length; i++){
          this.loadItem(GFFObject.FromStruct(inventory[i]));
        }
      }
      this.loadSoundSet();

      //ActionList
      try{
        if(this.template.RootNode.hasField('ActionList')){
          const actionStructs = this.template.RootNode.getFieldByLabel('ActionList').getChildStructs();
          for(let i = 0, len = actionStructs.length; i < len; i++){
            const action = GameState.ActionFactory.FromStruct(actionStructs[i]);
            if(action){
              this.actionQueue.add(action);
            }
          }
        }
      }catch(e: any){
        console.error(e);
      }

      //PerceptionList
      try{
        if(this.template.RootNode.hasField('PerceptionList')){
          let perceptionList = this.template.RootNode.getFieldByLabel('PerceptionList').getChildStructs();
          if(perceptionList.length){
            this.perceptionList = [];
          }

          for(let i = 0, len = perceptionList.length; i < len; i++){
            const perception = perceptionList[i];

            const objectId = perception.getFieldByLabel('ObjectId').getValue();
            const data = perception.getFieldByLabel('PerceptionData').getValue() as PerceptionType;

            this.perceptionList.push({
              object: undefined,
              objectId: objectId,
              data: data
            });
          }
        }
      }catch(e: any){
        console.error(e);
      }
    }catch(e: any){
      console.error(e);
    }

    if(this.template.RootNode.hasField('Animation')){
      this.setAnimationState(
        this.template.getFieldByLabel('Animation').getValue()
      );
    }

    this.initialized = true;

  }

  loadEquipmentModels(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      let loop = new AsyncLoop({
        array: Object.keys(this.equipment),
        onLoop: (slot_key: string, asyncLoop: AsyncLoop) => {
          let slot: ModuleItem = (this.equipment as any)[slot_key];
          if(slot){
            slot.loadModel().then( () => {
              if(slot_key == 'RIGHTHAND' || slot_key == 'LEFTHAND'){
                slot.model.playAnimation('off', true);
              }
              asyncLoop.next();
            });
          }else{
            asyncLoop.next();
          }
        }
      });
      loop.iterate(() => {
        resolve();
      });
    })
  }

  parseEquipmentSlots(){
    let slots = Object.keys(this.equipment);
    for(let i = 0; i < slots.length; i++){
      const slotKey = slots[i];
      let item: ModuleItem = (this.equipment as any)[slotKey];
      if(item){
        item.setPossessor(this);
        if(!item.load()){
          (this.equipment as any)[slotKey] = undefined;
          item.destroy();
        }
      }
    }
  }

  loadSoundSet(){
    const soundset2DA = GameState.TwoDAManager.datatables.get('soundset');
    if(soundset2DA){
      let ss_row = soundset2DA.rows[this.soundSetFile];
      if(ss_row){
        const buffer = ResourceLoader.loadCachedResource(ResourceTypes.ssf, ss_row.resref.toLowerCase());
        this.ssf = new SSFObject(buffer);
      }
    }
  }

  loadItem( template: GFFObject ){
    let item = new GameState.Module.ModuleArea.ModuleItem(template);
    item.initProperties();
    if(!item.load()){
      return;
    }
    let hasItem = this.getItemByTag(item.getTag());
    if(hasItem){
      hasItem.setStackSize(hasItem.getStackSize() + 1);
      return hasItem;
    }else{
      this.inventory.push(item);
      return item;
    }
  }

  playSoundSet(type = -1){
    if(!(this.ssf instanceof SSFObject)){
      return;
    }
    const resref = this.ssf.GetSoundResRef(type).replace(/\0.*$/g,'');
    if(resref != ''){
      if(this.audioEmitter)
        this.audioEmitter.playSound(resref);
    }
  }

  destroy(): void {
    super.destroy();
    if(this.head instanceof OdysseyModel3D){
      if(this.head.parent instanceof THREE.Object3D){
        this.head.parent.remove(this.model);
      }
      this.head.dispose();
      this.head = undefined;
    }

    if(this.equipment.ARMOR){
      this.equipment.ARMOR.destroy();
      this.equipment.ARMOR = undefined;
    }

    if(this.equipment.ARMS){
      this.equipment.ARMS.destroy();
      this.equipment.ARMS = undefined;
    }

    if(this.equipment.BELT){
      this.equipment.BELT.destroy();
      this.equipment.BELT = undefined;
    }

    if(this.equipment.CLAW1){
      this.equipment.CLAW1.destroy();
      this.equipment.CLAW1 = undefined;
    }

    if(this.equipment.CLAW2){
      this.equipment.CLAW2.destroy();
      this.equipment.CLAW2 = undefined;
    }

    if(this.equipment.CLAW3){
      this.equipment.CLAW3.destroy();
      this.equipment.CLAW3 = undefined;
    }

    if(this.equipment.HEAD){
      this.equipment.HEAD.destroy();
      this.equipment.HEAD = undefined;
    }

    if(this.equipment.HIDE){
      this.equipment.HIDE.destroy();
      this.equipment.HIDE = undefined;
    }

    if(this.equipment.IMPLANT){
      this.equipment.IMPLANT.destroy();
      this.equipment.IMPLANT = undefined;
    }

    if(this.equipment.LEFTARMBAND){
      this.equipment.LEFTARMBAND.destroy();
      this.equipment.LEFTARMBAND = undefined;
    }

    if(this.equipment.LEFTHAND){
      this.equipment.LEFTHAND.destroy();
      this.equipment.LEFTHAND = undefined;
    }

    if(this.equipment.LEFTHAND2){
      this.equipment.LEFTHAND2.destroy();
      this.equipment.LEFTHAND2 = undefined;
    }

    if(this.equipment.RIGHTARMBAND){
      this.equipment.RIGHTARMBAND.destroy();
      this.equipment.RIGHTARMBAND = undefined;
    }

    if(this.equipment.RIGHTHAND){
      this.equipment.RIGHTHAND.destroy();
      this.equipment.RIGHTHAND = undefined;
    }

    if(this.equipment.RIGHTHAND2){
      this.equipment.RIGHTHAND2.destroy();
      this.equipment.RIGHTHAND2 = undefined;
    }

    while(this.inventory.length){
      const item = this.inventory[0];
      if(item){
        item.destroy();
      }
      this.inventory.splice(0, 1);
    }

    if(this.area) this.area.detachObject(this);
    GameState.FactionManager.RemoveCreatureFromFaction(this);

    if(this.debugLabel){
      this.debugLabel.dispose();
    }
  }

  save(){

    let gff = new GFFObject();
    gff.FileType = 'UTC ';
    
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_CommntyName') ).setValue('Bad StrRef');
    if(this.playerCreated){
      gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Mod_IsPrimaryPlr') ).setValue(1);
    }
    
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_FirstName') )
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_LastName') )

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'AIState') ).setValue(0);

    gff.RootNode.addField( this.actionQueueToActionList() );

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Age') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AmbientAnimState') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Animation') ).setValue(this.animationState.index);
    //gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Appearance_Head') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).setValue(this.appearance);
    //gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'AreaId') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ArmorClass') ).setValue(this.getAC());
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).setValue(this.bodyBag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cha') ).setValue(this.cha);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') ).setValue(this.challengeRating);

    //Classes
    let classList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ClassList') );
    for(let i = 0; i < this.classes.length; i++){
      classList.addChildStruct( this.classes[i].save() );
    }
    
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Hair') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Skin') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Tattoo1') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Color_Tattoo2') ).setValue(0);

    let combatInfoStruct = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'CombatInfo') );

    //TODO: CombatInfo

    let combatRoundDataStruct = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'CombatRoundData') );

    //TODO: CombatRoundData

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.getCommadable() ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Con') ).setValue(this.str);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') ).setValue(this.conversation ? this.conversation.resref : '');
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CreatnScrptFird') ).setValue( this.spawned ? 1 : 0 );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CreatureSize') ).setValue(3);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentForce') ).setValue(this.currentForce);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHitPoints') ).setValue(this.currentHitPoints);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DeadSelectable') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Deity') ).setValue('');
    //gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue();
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DetectMode') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Dex') ).setValue(this.dex);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Disarmable') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DuplicatingHead') ).setValue(255);
    
    //Effects
    let effectList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.addChildStruct( this.effects[i].save() );
    }

    //Equipment
    let equipItemList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );

    if(this.equipment.ARMOR){
      let equipItem = this.equipment.ARMOR.save();
      equipItem.setType(ModuleCreatureArmorSlot.ARMOR);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.ARMS){
      let equipItem = this.equipment.ARMS.save();
      equipItem.setType(ModuleCreatureArmorSlot.ARMS);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.BELT){
      let equipItem = this.equipment.BELT.save();
      equipItem.setType(ModuleCreatureArmorSlot.BELT);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.CLAW1){
      let equipItem = this.equipment.CLAW1.save();
      equipItem.setType(ModuleCreatureArmorSlot.CLAW1);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.CLAW2){
      let equipItem = this.equipment.CLAW2.save();
      equipItem.setType(ModuleCreatureArmorSlot.CLAW2);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.CLAW3){
      let equipItem = this.equipment.CLAW3.save();
      equipItem.setType(ModuleCreatureArmorSlot.CLAW3);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.HEAD){
      let equipItem = this.equipment.HEAD.save();
      equipItem.setType(ModuleCreatureArmorSlot.HEAD);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.HIDE){
      let equipItem = this.equipment.HIDE.save();
      equipItem.setType(ModuleCreatureArmorSlot.HIDE);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.IMPLANT){
      let equipItem = this.equipment.IMPLANT.save();
      equipItem.setType(ModuleCreatureArmorSlot.IMPLANT);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.LEFTARMBAND){
      let equipItem = this.equipment.LEFTARMBAND.save();
      equipItem.setType(ModuleCreatureArmorSlot.LEFTARMBAND);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.LEFTHAND){
      let equipItem = this.equipment.LEFTHAND.save();
      equipItem.setType(ModuleCreatureArmorSlot.LEFTHAND);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.RIGHTARMBAND){
      let equipItem = this.equipment.RIGHTARMBAND.save();
      equipItem.setType(ModuleCreatureArmorSlot.RIGHTARMBAND);
      equipItemList.addChildStruct(equipItem)
    }

    if(this.equipment.RIGHTHAND){
      let equipItem = this.equipment.RIGHTHAND.save();
      equipItem.setType(ModuleCreatureArmorSlot.RIGHTHAND);
      equipItemList.addChildStruct(equipItem)
    }

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Experience') ).setValue(this.experience);
    
    let expressionList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ExpressionList') );
    let expressions = Object.keys(this.listeningPatterns);
    for(let i = 0; i < expressions.length; i++){
      let expressionString = expressions[i];
      let expressionId = this.listeningPatterns[expressionString];

      let expressionStruct = new GFFStruct();
      expressionStruct.addField( new GFFField(GFFDataType.INT, 'ExpressionId') ).setValue( expressionId );
      expressionStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'ExpressionString') ).setValue( expressionString );
      expressionList.addChildStruct(expressionStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'FactionID') ).setValue(this.faction ? this.faction.id : this.factionId);

    //Feats
    let featList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'FeatList') );
    for(let i = 0; i < this.feats.length; i++){
      featList.addChildStruct( this.feats[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') ).setValue( this.template.RootNode.getFieldByLabel('FirstName')?.getCExoLocString() );
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ForcePoints') ).setValue(this.forcePoints);
    gff.RootNode.addField( new GFFField(GFFDataType.CHAR, 'FortSaveThrow') ).setValue(this.fortitudeSaveThrow);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Gender') ).setValue(this.gender);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Gold') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GoodEvil') ).setValue(this.goodEvil);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HitPoints') ).setValue(this.hitPoints);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Int') ).setValue(this.int);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Interruptable') ).setValue(this.interruptable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsDestroyable') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsPC') ).setValue( this.playerCreated ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsRaiseable') ).setValue(1);
    if(this.playerCreated){
      gff.RootNode.addField( new GFFField(GFFDataType.INT, 'PlayerCreated') ).setValue(1);
    }

    //Creature Inventory
    let itemList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ItemList') );
    for(let i = 0; i < this.inventory.length; i++){
      let itemStruct = this.inventory[i].save();
      itemList.addChildStruct(itemStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'JoiningXP') ).setValue( this.joiningXP ? this.joiningXP : 0 );
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName') ).setValue( this.template.RootNode.getFieldByLabel('LastName')?.getCExoLocString() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Listening') ).setValue( this.isListening );

    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'MaxForcePoints') ).setValue(this.maxForcePoints);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'MaxHitPoints') ).setValue(this.maxHitPoints);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') ).setValue(this.min1HP);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'MovementRate') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NaturalAC') ).setValue(this.naturalAC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NotReorienting') ).setValue(this.notReorienting);

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PM_IsDisguised') ).setValue( this.hasEffect(GameEffectType.EffectDisguise) ? 1 : 0 );
    if( this.hasEffect(GameEffectType.EffectDisguise) ){
      gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PM_Appearance') ).setValue( this.appearance );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PartyInteract') ).setValue(this.partyInteract);

    //Save PerceptionLists
    let perceptionList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'PerceptionList') );
    for(let i = 0; i < this.perceptionList.length; i++){
      let percept = this.perceptionList[i];

      let perceptionStruct = new GFFStruct();
      perceptionStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( percept.objectId );
      perceptionStruct.addField( new GFFField(GFFDataType.BYTE, 'PerceptionData') ).setValue( (percept.data & 0xFF) );
      perceptionList.addChildStruct(perceptionStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') ).setValue(this.perceptionRange);

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Phenotype') ).setValue(this.phenotype);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(this.portraidId);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'PregameCurrent') ).setValue(28);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Race') ).setValue(this.race);
    gff.RootNode.addField( new GFFField(GFFDataType.CHAR, 'RefSaveThrow') ).setValue(this.reflexSaveThrow);

    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') ).setValue(this.scripts.onAttacked ? this.scripts.onAttacked.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') ).setValue(this.scripts.onDamaged ? this.scripts.onDamaged.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') ).setValue(this.scripts.onDeath ? this.scripts.onDeath.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') ).setValue(this.scripts.onDialog ? this.scripts.onDialog.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') ).setValue(this.scripts.onDisturbed ? this.scripts.onDisturbed.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') ).setValue(this.scripts.onEndDialog ? this.scripts.onEndDialog.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') ).setValue(this.scripts.onEndRound ? this.scripts.onEndRound.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).setValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') ).setValue(this.scripts.onBlocked ? this.scripts.onBlocked.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') ).setValue(this.scripts.onNotice ? this.scripts.onNotice.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptRested') ).setValue(this.scripts.onRested ? this.scripts.onRested.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') ).setValue(this.scripts.onSpawn ? this.scripts.onSpawn.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') ).setValue(this.scripts.onSpellAt ? this.scripts.onSpellAt.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).setValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');

    //Skills
    let skillList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'SkillList') );
    for(let i = 0; i < 8; i++){
      skillList.addChildStruct( this.skills[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'SkillPoints') ).setValue( this.skillPoints ? this.skillPoints : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'SoundSetFile') ).setValue(this.soundSetFile);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'StartingPackage') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'StealthMode') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Str') ).setValue(this.str);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Subrace') ).setValue('');
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'SubraceIndex') ).setValue(this.subrace);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Tail') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'UseBackupHead') ).setValue(0);
    let varTable = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.addField( new GFFField(GFFDataType.CHAR, 'WillSaveThrow') ).setValue(this.willSaveThrow);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wings') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wis') ).setValue(this.wis);

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue( this.position.x );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue( this.position.y );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue( this.position.z );

    let theta = this.rotation.z * Math.PI;

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue( 1 * Math.cos(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue( 1 * Math.sin(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue( 0 );

    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'fortbonus') ).setValue(this.fortbonus);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'refbonus') ).setValue(this.refbonus);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'refbonus') ).setValue(this.refbonus);

    this.template = gff;

    if(this.npcId >= 0){
      GameState.PartyManager.NPCS[this.npcId].template = this.template;
    }

    return gff;

  }

  toToolsetInstance(){

    let instance = new GFFStruct(4);
    
    instance.addField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', Math.cos(this.rotation.z + (Math.PI/2)))
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', Math.sin(this.rotation.z + (Math.PI/2)))
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTC ';

    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'Appearance_Type') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyVariation') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cha') );
    template.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'ClassList') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Comment') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Con') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentForce') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHitPoints') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Deity') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Dex') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Disarmable') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'FactionID') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'FeatList') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ForcePoints') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Gender') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GoodEvil') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HitPoints') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Int') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Interruptable') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsPC') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'LawfulChaotic') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'MaxHitPoints') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NaturalAC') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NoPermDeath') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NotReorienting') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PalletID') ).setValue(4);
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PartyInteract') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') );
    template.RootNode.addField( new GFFField(GFFDataType.INT, 'Phenotype') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Race') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptRested') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') );
    let skillList = template.RootNode.addField( new GFFField(GFFDataType.LIST, 'SkillList') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'SoundSetFile') )
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'SpecAbilityList') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Str') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Subrace') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'SubraceIndex') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') );
    template.RootNode.addField( new GFFField(GFFDataType.LIST, 'TemplateList') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TextureVar') );
    template.RootNode.addField( new GFFField(GFFDataType.INT, 'WalkRate') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wis') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'fortbonus') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'refbonus') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'willbonus') );

    for(let i = 0; i < 8; i++){
      let _skill = new GFFStruct();
      _skill.addField( new GFFField(GFFDataType.RESREF, 'Rank') ).setValue(0);
      skillList.addChildStruct(_skill);
    }

    return template;
  }

}
