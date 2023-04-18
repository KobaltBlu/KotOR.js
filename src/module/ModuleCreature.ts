/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { Action, ActionCastSpell, ActionCombat, ActionFollowLeader, ActionItemCastSpell, ActionJumpToObject, ActionJumpToPoint, ActionMoveToPoint, ActionPhysicalAttacks, ActionUnlockObject } from "../actions";
import { AudioEmitter } from "../audio/AudioEmitter";
import { CreatureClass } from "../combat/CreatureClass";
import { GameEffect } from "../effects";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { TemplateLoader } from "../loaders/TemplateLoader";
import { InventoryManager } from "../managers/InventoryManager";
import { PartyManager } from "../managers/PartyManager";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { SSFObject } from "../resource/SSFObject";
import { TalentObject, TalentFeat, TalentSkill, TalentSpell } from "../talents";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { ModuleObject, ModuleItem, ModuleRoom, Module } from "./";
import { OdysseyModel, OdysseyModelAnimation } from "../odyssey";
import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";
import { TwoDAManager } from "../managers/TwoDAManager";
import { LIPObject } from "../resource/LIPObject";
import { Utility } from "../utility/Utility";
import { FactionManager } from "../FactionManager";
import { EngineMode } from "../enums/engine/EngineMode";
import { SSFObjectType } from "../interface/resource/SSFType";
import { ActionType } from "../enums/actions/ActionType";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import EngineLocation from "../engine/EngineLocation";
import { MenuManager } from "../gui";
import { AttackResult } from "../enums/combat/AttackResult";
import { CombatAction } from "../interface/combat/CombatAction";
import { EngineState } from "../enums/engine/EngineState";
import { DLGObject } from "../resource/DLGObject";
import { TwoDAAnimation } from "../interface/twoDA/TwoDAAnimation";
import { CreatureAppearance } from "../engine/CreatureAppearance";
import { AppearanceManager } from "../managers/AppearanceManager";
import { CreatureAnimationState } from "../interface/animation/CreatureAnimationState";
import { OverlayAnimationState } from "../interface/animation/OverlayAnimationState";
import { DialogAnimationState } from "../interface/animation/DialogAnimationState";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { CombatRoundAction } from "../combat";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { WeaponType } from "../enums/combat/WeaponType";
import { CombatFeatType } from "../enums/combat/CombatFeatType";

/* @file
 * The ModuleCreature class.
 */

export class ModuleCreature extends ModuleObject {
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
  classes: any[];
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
  skills: any[];
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
  partyID: number;
  // appearance: any;

  animationState: CreatureAnimationState;
  overlayAnimationState: OverlayAnimationState;
  // dialogAnimationState: DialogAnimationState;
  
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
  openSpot: any;
  deathStarted: boolean;
  getUpAnimationPlayed: boolean;
  animSpeed: number;
  portrait: number;
  selectedNPC: number;
  creatureAppearance: CreatureAppearance;

  constructor ( gff = new GFFObject() ) {
    super(gff);
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

    this.skills = [0, 0, 0, 0, 0, 0, 0, 0];

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

      this.audioEmitter = new AudioEmitter({
        engine: GameState.audioEngine,
        props: this,
        template: {
          sounds: [],
          isActive: true,
          isLooping: false,
          isRandom: false,
          isRandomPosition: false,
          interval: 0,
          intervalVariation: 0,
          maxDistance: 50,
          volume: 127,
          positional: 1
        },
        onLoad: () => {
        },
        onError: () => {
        }
      });

      this.footstepEmitter = new AudioEmitter({
        engine: GameState.audioEngine,
        props: this,
        template: {
          sounds: [],
          isActive: true,
          isLooping: false,
          isRandom: false,
          isRandomPosition: false,
          interval: 0,
          intervalVariation: 0,
          maxDistance: 50,
          volume: 127,
          positional: 1
        },
        onLoad: () => {
        },
        onError: () => {
        }
      });

      GameState.audioEngine.AddEmitter(this.audioEmitter);
      GameState.audioEngine.AddEmitter(this.footstepEmitter);
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  update( delta = 0 ){
    
    super.update(delta);

    if(this.audioEmitter){
      this.audioEmitter.SetPosition(this.position.x, this.position.y, this.position.z + 1.0);
    }

    this.AxisFront.set(0, 0, 0);
    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

    if(GameState.Mode == EngineMode.INGAME || GameState.Mode == EngineMode.MINIGAME || GameState.Mode == EngineMode.DIALOG){

      if(this.animationState.index == ModuleCreatureAnimState.IDLE){
        this.footstepEmitter.Stop();
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
                this.PlaySoundSet(SSFObjectType.PAIN_2);
              break;
              default:
                this.PlaySoundSet(SSFObjectType.PAIN_1);
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
          this.PlaySoundSet(SSFObjectType.DEAD);
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
        this.AxisFront.set(0, 0, 0);
      }

      this.AxisFront.z = 0;

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
        
      if(!this.AxisFront.length()){
        this.AxisFront.x = ( Math.cos(this.rotation.z + Math.PI/2) * forceDelta );
        this.AxisFront.y = ( Math.sin(this.rotation.z + Math.PI/2) * forceDelta );
        if(this.AxisFront.length()){
          if(this.animSpeed > 0.75){
            this.setAnimationState(ModuleCreatureAnimState.RUNNING);
          }else{
            this.setAnimationState(ModuleCreatureAnimState.WALKING);
          }
        }
        //this.AxisFront.z = gravityDelta;
      }else{
        this.AxisFront.multiplyScalar(forceDelta);
      }

      if(this.force < 1){
        this.speed -= (this.getMovementSpeed() * 2.5) * delta;
      }

      if(this.speed < 0){
        this.speed = 0;
      }

      if(!this.AxisFront.length() && ( this.animationState.index == ModuleCreatureAnimState.RUNNING || this.animationState.index == ModuleCreatureAnimState.WALKING )){
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

      if(this.AxisFront.length())
        this.collisionData.updateCollision(delta);

      this.updatePerceptionList(delta);
      this.updateListeningPatterns();


      //If a non controlled party member is stuck, warp them to their follow position
      if(this.partyID != undefined && this != (GameState.getCurrentPlayer() as any) && this.collisionTimer >= 1){
        this.setPosition(PartyManager.GetFollowPosition(this));
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
      if(this.equipment.HEAD instanceof ModuleItem){
        this.equipment.HEAD.update(delta);
      }
      if(this.equipment.ARMS instanceof ModuleItem){
        this.equipment.ARMS.update(delta);
      }

      if(this.equipment.RIGHTARMBAND instanceof ModuleItem){
        this.equipment.RIGHTARMBAND.update(delta);
      }

      if(this.equipment.LEFTARMBAND instanceof ModuleItem){
        this.equipment.LEFTARMBAND.update(delta);
      }

      if(this.equipment.RIGHTHAND instanceof ModuleItem){
        this.equipment.RIGHTHAND.update(delta);
      }

      if(this.equipment.LEFTHAND instanceof ModuleItem){
        this.equipment.LEFTHAND.update(delta);
      }

      if(this.equipment.ARMOR instanceof ModuleItem){
        this.equipment.ARMOR.update(delta);
      }
      
      if(this.equipment.BELT instanceof ModuleItem){
        this.equipment.BELT.update(delta);
      }

      if(this.equipment.CLAW1 instanceof ModuleItem){
        this.equipment.CLAW1.update(delta);
      }

      if(this.equipment.CLAW2 instanceof ModuleItem){
        this.equipment.CLAW2.update(delta);
      }

      if(this.equipment.CLAW3 instanceof ModuleItem){
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

      const regen2DA = TwoDAManager.datatables.get('regeneration').rows[this.combatData.combatState ? 0 : 1];
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
    if(!(this.action instanceof Action)){
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
        let pattern = this.listeningPatterns[str.string];

        if(this == GameState.player){
          //console.log('heardString', str, pattern);
        }

        if(typeof pattern != 'undefined'){
          if(this == GameState.player){
            //console.log('updateListeningPatterns', pattern, str);
          }

          this.heardStrings.shift();
          this.onDialog(str.speaker, pattern);
        }
      }
    }
  }

  updatePerceptionList(delta = 0){

    if(this.isDead())
      return true;

    if(this.room instanceof ModuleRoom){
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
            if(PartyManager.party.indexOf(this) == -1){
              if(this.isHostile(creature)){
                this.resetExcitedDuration();
                if(this == GameState.getCurrentPlayer() && !this.combatData.combatState){
                  GameState.State = EngineState.PAUSED
                }
                // CombatEngine.AddCombatant(this);
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
    let partyLen = PartyManager.party.length;
    for(let i = 0; i < partyLen; i++ ){
      let creature = PartyManager.party[i];
      if(this != creature){
        if(!creature.isDead()){
          let distance = this.position.distanceTo(creature.position);
          if(distance < this.getPerceptionRangePrimary() && this.hasLineOfSight(creature)){
            if(PartyManager.party.indexOf(this) == -1){

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
      // CombatEngine.AddCombatant(this);
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
            if(this.openSpot){
              distance = this.position.distanceTo(this.openSpot.targetVector);
            }else{
              distance = this.position.distanceTo(target.position);
            }
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
    if(targeter instanceof ModuleCreature){
      
    }
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
      if(!this.animationState?.animation?.name){
        console.log(this.animationState);
        console.log(this.animationState.animation);
      }
      if(currentAnimation != this.animationState.animation.name.toLowerCase()){
        if(!this.animationState.started){
          this.animationState.started = true;
          let aLooping = (!parseInt(this.animationState.animation.fireforget) && parseInt(this.animationState.animation.looping) == 1);
          this.model.playAnimation(this.animationState.animation.name.toLowerCase(), aLooping);
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

  moveToObject(target: ModuleObject, bRun = true, distance = 1.0){

    if(target instanceof ModuleObject){
        
      this.openSpot = undefined;
      let action = new ActionMoveToPoint();
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

  randomWalk(){

    if(this.room && this.room.collisionData.walkmesh){
      let run = false;
      let maxDistance = 1.5
      let position = new THREE.Vector3();

      const faces = this.room.collisionData.walkmesh.walkableFaces;
      const face = faces[Math.floor(Math.random()*faces.length)];
      if(face){
        position.copy(face.centroid);
        let action = new ActionMoveToPoint();
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
      for(let i = 0; i < PartyManager.party.length; i++){
        let creature = PartyManager.party[i];
        if(this == creature)
          continue;

        let d = target.position.distanceTo(creature.position);
        if(d < 1.0){
          distance = 2.0;
        }
      }

        
      this.openSpot = undefined;
      let action = new ActionMoveToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, target.position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target.position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target.position.z);
      action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      action.setParameter(4, ActionParameterType.DWORD, target instanceof EngineLocation ? ModuleObject.OBJECT_INVALID : target.id );
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

      let action = new ActionJumpToObject();
      action.setParameter(0, ActionParameterType.DWORD, target.id );
      action.setParameter(1, ActionParameterType.INT, 0);
      this.actionQueue.add(action);

    }

  }

  jumpToLocation(target: EngineLocation){
    console.log('jumpToLocation', target, this);
    if(target instanceof EngineLocation){
      let action = new ActionJumpToPoint();
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
    const target = this.combatData.lastAttackTarget;
    if(!(target instanceof ModuleCreature)) return false;
    if(target.combatData.lastAttackTarget != this) return false;
    return (target.isDuelingWeaponEquipped() && this.isDuelingWeaponEquipped());
  }

  isDuelingWeaponEquipped(){
    if(!this.equipment.RIGHTHAND) return false;
    return (
      this.equipment.RIGHTHAND.getWeaponWield() == WeaponWield.ONE_HANDED_SWORD ||
      this.equipment.RIGHTHAND.getWeaponWield() == WeaponWield.TWO_HANDED_SWORD
    );
  }

  isDuelingObject( oObject: ModuleObject ){
    return (oObject instanceof ModuleCreature && this.combatData.lastAttackTarget == oObject && oObject.combatData.lastAttackTarget == this && oObject.isDuelingWeaponEquipped() && this.isDuelingWeaponEquipped());
  }

  attackCreature(
    target: ModuleObject, feat?: TalentFeat, isCutsceneAttack = false, 
    attackDamage = 0, attackAnimation?: string, attackResult?: AttackResult
  ){

    if(target == undefined)
      return;

    if(target == this)
      target = GameState.player;

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
      const action = new ActionCombat(0xFFFF);
      this.actionQueue.add(action);
    }

  }

  useTalent(talent: TalentObject, oTarget: ModuleObject): Action {
    let action: Action;
    if(talent instanceof TalentObject){
      const combatAction = new CombatRoundAction();
      switch(talent.type){
        case 1: //FEAT
          combatAction.actionType = CombatActionType.ATTACK_USE_FEAT;
          combatAction.target = oTarget;
          combatAction.setFeat(talent as TalentFeat);
          this.combatRound.addAction(combatAction);
        break;
        case 2: //SKILL
          if(talent.id == 6){ //Security
            action = new ActionUnlockObject();
            action.setParameter(0, ActionParameterType.DWORD, oTarget.id || ModuleObject.OBJECT_INVALID);
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
    if(animState){
      this.animationState.index = animState;
      this.animationState.animation = this.animationConstantToAnimation(animState);
      this.animationState.started = false;
    }
  }
  
  resetAnimationState(){
    this.animationState = {
      index: ModuleCreatureAnimState.PAUSE,
      animation: undefined,
      started: false,
      speed: 1,
    }
  }

  playTwoDAAnimation(animation: TwoDAAnimation){
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
    this.dialogAnimation = {
      animation: anim,
      data: {
        fireforget: 1,
        looping: 0
      } as any,
      started: false,
    };
  }

  dialogPlayAnimation(data: TwoDAAnimation = {} as TwoDAAnimation){
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

  getDamageAnimation( attackAnim: string ): TwoDAAnimation {
    
    let attackAnimIndex = -1;

    let modeltype = this.creatureAppearance.modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = TwoDAManager.datatables.get('animations');
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    let combatAnimation = TwoDAManager.datatables.get('combatanimations').getByID(attackAnimIndex);
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

  getDodgeAnimation( attackAnim: string ): TwoDAAnimation {

    let attackAnimIndex = -1;

    let modeltype = this.creatureAppearance.modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = TwoDAManager.datatables.get('animations');
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    //console.log('getDodgeAnimation', this.getName(), attackAnim, attackAnimIndex);

    let combatAnimation = TwoDAManager.datatables.get('combatanimations').getByID(attackAnimIndex);
    if(combatAnimation){
      if(combatAnimation.hits == 1 && [4, 2, 3].indexOf(weaponWield) >= 0){
        let damageAnimIndex = combatAnimation['parry'+weaponWield];
        let damageAnim = anims.getByID(damageAnimIndex);
        if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
          //console.log('dodge/parry anim', this.getName(), damageAnim.name)
          return OdysseyModelAnimation.GetAnimation2DA(damageAnim.name);
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

  getParryAnimation( attackAnim: string ): TwoDAAnimation {

    let attackAnimIndex = -1;

    let modeltype = this.creatureAppearance.modeltype;
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    
    let anims = TwoDAManager.datatables.get('animations');
    for(let i = 0; i < anims.RowCount; i++){
      if(anims.rows[i].name == attackAnim){
        attackAnimIndex = i;
        break;
      }
    }

    //console.log('getParryAnimation', this.getName(), attackAnim, attackAnimIndex);
    let combatAnimation = TwoDAManager.datatables.get('combatanimations').getByID(attackAnimIndex);
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

  getDeflectAnimation(): TwoDAAnimation {
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    //console.log('getDamageAnimation', 'g'+weaponWield+'d1');
    return OdysseyModelAnimation.GetAnimation2DA('g'+weaponWield+'n1');
  }

  getCombatAnimationAttackType(): string {
    if(this.equipment.RIGHTHAND){
      return this.equipment.RIGHTHAND.isRangedWeapon() ? 'b' : 'm';
    }else if(this.equipment.CLAW1){
      return 'm';
    }else if(this.equipment.CLAW2){
      return 'm';
    }else if(this.equipment.CLAW3){
      return 'm';
    }else{
      return 'g';
    }
  }

  //Return the WeaponType ID for the current equipped items
  // g*r1 in this case * is the value we are trying to determine

  getCombatAnimationWeaponType(){
    let lWeapon = this.equipment.LEFTHAND;
    let rWeapon = this.equipment.RIGHTHAND;
    let cWeapon1 = this.equipment.CLAW1;
    let cWeapon2 = this.equipment.CLAW2;
    let cWeapon3 = this.equipment.CLAW3;
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);

    if(cWeapon1 || cWeapon2 || cWeapon3 || this.isSimpleCreature()){
      return 0;
    }

    let weapon = rWeapon || lWeapon;

    if(!weapon) return 8;

    if(bothHands){
      switch((weapon.getWeaponWield())){
        case WeaponWield.STUN_BATON: //Stun Baton
        case WeaponWield.ONE_HANDED_SWORD: //Single Blade Melee
          return 4;
        case WeaponWield.BLASTER_PISTOL: //Blaster
          return 6;
      }
    }else{
      switch((weapon.getWeaponWield())){
        case WeaponWield.STUN_BATON: //Stun Baton
          return 1;
        case WeaponWield.ONE_HANDED_SWORD: //Single Blade Melee
          return 2;
        case WeaponWield.TWO_HANDED_SWORD: //Double Blade Melee
          return 3;
        case WeaponWield.BLASTER_PISTOL: //Blaster
          return 5;
        case WeaponWield.BLASTER_RIFLE: //Blaster Rifle
          return 7;
        case WeaponWield.BLASTER_HEAVY: //Heavy Carbine
          return 9;
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

    if(this.equipment.RIGHTHAND instanceof ModuleItem){
      if(this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
        this.equipment.RIGHTHAND.model.update(delta)
      }
    }

    if(this.equipment.LEFTHAND instanceof ModuleItem){
      if(this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
        this.equipment.LEFTHAND.model.update(delta)
      }
    }

  }

  playEvent(event: any){
    this.audioEmitter.SetPosition(this.position.x, this.position.y, this.position.z);
    this.footstepEmitter.SetPosition(this.position.x, this.position.y, this.position.z);
    let appearance = this.creatureAppearance;

    let rhSounds, lhSounds;

    if(this.equipment.RIGHTHAND)
      rhSounds = TwoDAManager.datatables.get('weaponsounds').rows[this.equipment.RIGHTHAND._baseItem.poweredItem];

    if(this.equipment.LEFTHAND)
      lhSounds = TwoDAManager.datatables.get('weaponsounds').rows[this.equipment.LEFTHAND._baseItem.poweredItem];


    let sndIdx = Math.round(Math.random()*2);
    let sndIdx2 = Math.round(Math.random()*1);
    switch(event){
      case 'snd_footstep':
        let sndTable = TwoDAManager.datatables.get('footstepsounds').rows[appearance.footsteptype];
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
            this.footstepEmitter.Stop();
            this.footstepEmitter.PlaySound(sound);
          }else if(sndTable['rolling'] != '****'){
            if(!this.footstepEmitter.currentSound){
              this.footstepEmitter.Stop();
              this.footstepEmitter.PlaySound(sndTable['rolling'], (buffer: AudioBufferSourceNode) => {
                buffer.loop = true;
              });
            }else if(this.footstepEmitter.currentSound && this.footstepEmitter.currentSound.name != sndTable['rolling']){
              this.footstepEmitter.Stop();
              this.footstepEmitter.PlaySound(sndTable['rolling'], (buffer: AudioBufferSourceNode) => {
                buffer.loop = true;
              });
            }
          }
        }
      break;
      case 'Swingshort':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['swingshort'+sndIdx]);
        }
      break;
      case 'Swinglong':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['swinglong'+sndIdx]);
        }
      break;
      case 'HitParry':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['parry'+sndIdx2]);
        }
      break;
      case 'Contact':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['clash'+sndIdx2]);
        }
      break;
      case 'Clash':
        if(this.equipment.RIGHTHAND){
          this.audioEmitter.PlaySound(rhSounds['clash'+sndIdx2]);
        }
      break;
      case 'Hit':
        if(this.equipment.RIGHTHAND){
          if(this.equipment.RIGHTHAND){
            this.audioEmitter.PlaySound(rhSounds['leather'+Math.round(Math.random()*1)]);
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
    return (lWeapon instanceof ModuleItem) || (rWeapon instanceof ModuleItem) || (cWeapon1 instanceof ModuleItem) || (cWeapon2 instanceof ModuleItem) || (cWeapon3 instanceof ModuleItem);
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
    //let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);
    
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

        for(let i = 0, len = PartyManager.party.length; i < len; i++){
          PartyManager.party[i].removeObjectFromTargetPositions(oObject);
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

  SetFacingVector( facing = new THREE.Vector3() ){

    this.props['XOrientation'] = facing.x;
    this.props['YOrientation'] = facing.y;

    if(this.model instanceof OdysseyModel3D)
      this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.props['XOrientation'], this.props['YOrientation']));

  }

  GetFacingVector(){
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

  GetFacing(){
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
    if(this === GameState.player && GameState.getCurrentPlayer() === this){
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
    // CombatEngine.AddCombatant(this);
    if(this.scripts.onAttacked instanceof NWScriptInstance){
      let instance = this.scripts.onAttacked.nwscript.newInstance();
      let script_num = (PartyManager.party.indexOf(this) > -1) ? 2005 : 1005;
      instance.run(this, script_num);
    }
  }

  onDamaged(){
    if(this.isDead())
      return true;

    this.resetExcitedDuration();
    // CombatEngine.AddCombatant(this);
    
    if(this.scripts.onDamaged instanceof NWScriptInstance){
      let instance = this.scripts.onDamaged.nwscript.newInstance();
      let script_num = (PartyManager.party.indexOf(this) > -1) ? 2006 : 1006;
      instance.run(this, script_num);
    }
  }

  onBlocked(){
    if(this == GameState.getCurrentPlayer())
      return;

    if(this.scripts.onBlocked instanceof NWScriptInstance){
      let instance = this.scripts.onBlocked.nwscript.newInstance();
      let script_num = (PartyManager.party.indexOf(this) > -1) ? 2009 : 1009;
      instance.run(this, script_num);
    }
  }

  

  use(object: ModuleObject){
    if(this.hasInventory()){
      MenuManager.MenuContainer.AttachContainer(this);
      MenuManager.MenuContainer.Open();
    }
  }

  hasInventory(){
    return this.inventory.length;
  }

  retrieveInventory(){
    while(this.inventory.length){
      InventoryManager.addItem(this.inventory.pop())
    }
  }

  isUseable(){
    return true;
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
            if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
              this.model.rhand.add(this.equipment.RIGHTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        try{
          if(this.creatureAppearance.modeltype != 'S' && this.creatureAppearance.modeltype != 'L'){
            if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
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
      return InventoryManager.getInventory();
    }else{
      return this.inventory;
    }
    /*if(this.template.RootNode.HasField('ItemList')){
      return this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs();
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

  GetRotation(){
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

    if(
      this.getHasFeat(CombatFeatType.MASTER_SCOUNDRELS_LUCK) || 
      this.getHasFeat(CombatFeatType.LOGIC_UPGRADE_BATTLE_DROID) || 
      this.getHasFeat(CombatFeatType.MASTER_SENSE)
    ){
      baseac += 6;
    }else if(
      this.getHasFeat(CombatFeatType.IMPROVED_SCOUNDRELS_LUCK) || 
      this.getHasFeat(CombatFeatType.LOGIC_UPGRADE_TACTICIAN) || 
      this.getHasFeat(CombatFeatType.KNIGHT_SENSE)
    ){
      baseac += 4;
    }else if(
      this.getHasFeat(CombatFeatType.SCOUNDRELS_LUCK) || 
      this.getHasFeat(CombatFeatType.LOGIC_UPGRADE_COMBAT) || 
      this.getHasFeat(CombatFeatType.JEDI_SENSE)
    ){
      baseac += 2;
    }

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
      if(this.classes[i].spellcaster == 1){
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
    const _2DA = TwoDAManager.datatables.get('portraits');
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

    if(PartyManager.party.indexOf(this) >= 0){
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
    const creaturespeed2DA = TwoDAManager.datatables.get('creaturespeed');
    if(creaturespeed2DA){
      return parseFloat(creaturespeed2DA.rows[this.getWalkRateId()].runrate);
    }
  }

  getWalkSpeed(){
    if(this.getWalkRateId() == 7){
      return this.creatureAppearance.walkdist
    }
    const creaturespeed2DA = TwoDAManager.datatables.get('creaturespeed');
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
      total += parseInt(this.classes[i].level);
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
    const exptable2DA = TwoDAManager.datatables.get('exptable');
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

    const exptable2DA = TwoDAManager.datatables.get('exptable');
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

      this.maxHitPoints += parseInt(mainClass.hitdie) + ( (this.getCON() - 10) /2 );
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

    if(!this.isSimpleCreature()){
      if(
        this.equipment.RIGHTHAND && 
        this.equipment.RIGHTHAND._baseItem.weaponWield != WeaponWield.STUN_BATON && 
        !this.equipment.LEFTHAND 
      ){
        if(this.getHasFeat(CombatFeatType.MASTER_DUELING)){
          bab += 3;
        }else if(this.getHasFeat(CombatFeatType.ADVANCED_DUELING)){
          bab += 2;
        }else if(this.getHasFeat(CombatFeatType.DUELING)){
          bab += 1;
        }
      }
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
    // if(this.template.RootNode.HasField('SkillList')){
    //   return this.template.RootNode.GetFieldByLabel('SkillList').GetChildStructs();
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
      switch(talent.type){
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
    const ranges2DA = TwoDAManager.datatables.get('ranges');
    if(ranges2DA){
      return parseInt(ranges2DA.rows[this.perceptionRange].primaryrange);
    }
  }

  getPerceptionRangeSecondary(){
    const ranges2DA = TwoDAManager.datatables.get('ranges');
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

  Load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        this.InitProperties();
        this.LoadScripts();
        FactionManager.AddCreatureToFaction(this);
      }else{
        console.error('Failed to load character template');
        if(this.template instanceof GFFObject){
          this.InitProperties();
          this.LoadScripts();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      this.LoadScripts();
      FactionManager.AddCreatureToFaction(this);
    }
  }

  LoadScripts (){

    this.scripts.onAttacked = this.template.GetFieldByLabel('ScriptAttacked').GetValue();
    this.scripts.onDamaged = this.template.GetFieldByLabel('ScriptDamaged').GetValue();
    this.scripts.onDeath = this.template.GetFieldByLabel('ScriptDeath').GetValue();
    this.scripts.onDialog = this.template.GetFieldByLabel('ScriptDialogue').GetValue();
    this.scripts.onDisturbed = this.template.GetFieldByLabel('ScriptDisturbed').GetValue();
    this.scripts.onEndDialog = this.template.GetFieldByLabel('ScriptEndDialogu').GetValue();
    this.scripts.onEndRound = this.template.GetFieldByLabel('ScriptEndRound').GetValue();
    this.scripts.onHeartbeat = this.template.GetFieldByLabel('ScriptHeartbeat').GetValue();
    this.scripts.onBlocked = this.template.GetFieldByLabel('ScriptOnBlocked').GetValue();
    this.scripts.onNotice = this.template.GetFieldByLabel('ScriptOnNotice').GetValue();
    this.scripts.onRested = this.template.GetFieldByLabel('ScriptRested').GetValue();
    this.scripts.onSpawn = this.template.GetFieldByLabel('ScriptSpawn').GetValue();
    this.scripts.onSpellAt = this.template.GetFieldByLabel('ScriptSpellAt').GetValue();
    this.scripts.onUserDefined = this.template.GetFieldByLabel('ScriptUserDefine').GetValue();

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
      }
    }

  }

  LoadModel (): Promise<OdysseyModel3D> {
    this.isReady = false;
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      this.LoadEquipmentModels().then(() => {
        this.LoadBody().then( () => {
          this.LoadHead().then(() => {
            this.isReady = true;
            this.updateCollision(0.0000000000000000000001);
            this.update(0.0000000000000000000001);
            resolve(this.model);
          });
        });
      });
    });

  }

  LoadBody(): Promise<OdysseyModel3D> {
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      let appearance = this.creatureAppearance;
      this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
      this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase();
      this.textureVar = 1;
      if(this.equipment.ARMOR instanceof ModuleItem){
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
        GameState.ModelLoader.load(this.bodyModel).then( 
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

              this.model = model;
              this.model.userData.moduleObject = this;
              this.container.add(this.model);
              this.box.setFromObject(this.container);

              try{
                if(this.model.lhand instanceof OdysseyObject3D){
                  if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
                    this.model.lhand.add(this.equipment.LEFTHAND.model);
                  }
                }
              }catch(e){
                console.error('ModuleCreature.LoadBody', e);
              }

              try{
                if(this.model.rhand instanceof OdysseyObject3D){
                  if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
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

  LoadHead(): Promise<OdysseyModel3D> {
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      let appearance = this.creatureAppearance;
      let headId = appearance.normalhead;//.replace(/\0[\s\S]*$/g,'').toLowerCase();
      this.headModel = undefined;
      if(headId >= 0 && appearance.modeltype == 'B'){
        const heads2DA = TwoDAManager.datatables.get('heads');
        if(heads2DA){
          let head = heads2DA.rows[headId];
          this.headModel = head.head.replace(/\0[\s\S]*$/g,'').toLowerCase();
          GameState.ModelLoader.load(this.headModel).then(
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
                      if(this.equipment.HEAD instanceof ModuleItem && this.equipment.HEAD.model instanceof OdysseyModel3D){
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
    if(this.template.RootNode.HasField('Equip_ItemList')){
      return this.template.GetFieldByLabel('Equip_ItemList').GetChildStructs()
    }
    return [];
  }*/

  equipItem(slot = 0x1, item: string|ModuleItem = '', onLoad?: Function){

    this.unequipSlot(slot);

    if(item instanceof ModuleItem){
      item.onEquip(this);
      item.LoadModel().then( () => {
        switch(slot){
          case ModuleCreatureArmorSlot.ARMOR:
            this.equipment.ARMOR = item;
            this.LoadModel().then(() => {
              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case ModuleCreatureArmorSlot.RIGHTHAND:
            this.equipment.RIGHTHAND = item;
            item.LoadModel().then(() => {
              if(item.model instanceof OdysseyModel3D)
                this.model.rhand.add(item.model);

              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case ModuleCreatureArmorSlot.LEFTHAND:
            this.equipment.LEFTHAND = item;
            item.LoadModel().then(() => {
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
    }else{

      TemplateLoader.Load({
        ResRef: item,
        ResType: ResourceTypes.uti,
        onLoad: (gff: GFFObject) => {
          this.LoadEquipmentItem({
            item: new ModuleItem(gff),
            Slot: slot,
            onLoad: () => {
              if(typeof onLoad == 'function')
                onLoad();
            }
          });
        },
        onFail: () => {
          console.error('Failed to load item template');
        }
      });

    }
  }

  unequipSlot(slot = 0x1){
    try{
      switch(slot){
        case ModuleCreatureArmorSlot.IMPLANT:
          try{
            if(this.equipment.IMPLANT instanceof ModuleItem){
              this.equipment.IMPLANT.onUnEquip(this);
              this.equipment.IMPLANT.destroy();
              this.equipment.IMPLANT = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.HEAD:

          if(this.equipment.HEAD instanceof ModuleItem){
            this.equipment.HEAD.onUnEquip(this);
          }

          try{
            this.equipment.HEAD.model.parent.remove(this.equipment.HEAD.model);
          }catch(e){}

          this.equipment.HEAD = undefined;
          this.LoadModel();
        break;
        case ModuleCreatureArmorSlot.ARMS:
          try{
            if(this.equipment.ARMS instanceof ModuleItem){
              this.equipment.ARMS.onUnEquip(this);
              this.equipment.ARMS.destroy();
              this.equipment.ARMS = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.RIGHTARMBAND:
          try{
            if(this.equipment.RIGHTARMBAND instanceof ModuleItem){
              this.equipment.RIGHTARMBAND.onUnEquip(this);
              this.equipment.RIGHTARMBAND.destroy();
              this.equipment.RIGHTARMBAND = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.LEFTARMBAND:
          try{
            if(this.equipment.LEFTARMBAND instanceof ModuleItem){
              this.equipment.LEFTARMBAND.onUnEquip(this);
              this.equipment.LEFTARMBAND.destroy();
              this.equipment.LEFTARMBAND = undefined;
            }
          }catch(e){
            
          }
        break;
        case ModuleCreatureArmorSlot.ARMOR:

          if(this.equipment.ARMOR instanceof ModuleItem){
            this.equipment.ARMOR.onUnEquip(this);
          }

          this.equipment.ARMOR = undefined;
          this.LoadModel();
        break;
        case ModuleCreatureArmorSlot.RIGHTARMBAND:
          try{
            if(this.equipment.RIGHTARMBAND instanceof ModuleItem){
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
            if(this.equipment.RIGHTHAND instanceof ModuleItem){
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
            if(this.equipment.RIGHTHAND2 instanceof ModuleItem){
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
            if(this.equipment.BELT instanceof ModuleItem){
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
            if(this.equipment.LEFTHAND instanceof ModuleItem){
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
            if(this.equipment.LEFTHAND2 instanceof ModuleItem){
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

  LoadEquipmentItem(args: any = {}){

    args = Object.assign({
      item: new GFFObject(),
      Slot: 0x01,
      onLoad: null,
      onError: null
    }, args);
    //console.log('LoadEquipmentItem', args);
    let uti: ModuleItem = args.item;

    if(uti instanceof GFFObject)
      uti = new ModuleItem(uti);

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
    
    uti.Load();
    uti.LoadModel().then( () => {
      if(args.Slot == ModuleCreatureArmorSlot.RIGHTHAND || args.Slot == ModuleCreatureArmorSlot.LEFTHAND){
        uti.model.playAnimation('off', true);
      }
      if(typeof args.onLoad == 'function')
        args.onLoad();
    });

  }

  InitProperties(){
    try{
      this.classes = [];
      this.feats = [];
      this.skills = [0, 0, 0, 0, 0, 0, 0, 0];
      
      if(!this.initialized){
        if(this.template.RootNode.HasField('ObjectId')){
          this.id = this.template.GetFieldByLabel('ObjectId').GetValue();
        }else if(this.template.RootNode.HasField('ID')){
          this.id = this.template.GetFieldByLabel('ID').GetValue();
        }else{
          this.id = ModuleObject.COUNT++;
          while(ModuleObject.List.has(this.id)){
            this.id = ModuleObject.COUNT++;
          }
        }
        
        ModuleObject.List.set(this.id, this);
      }

      if(this.template.RootNode.HasField('Appearance_Type')){
        this.appearance = this.template.GetFieldByLabel('Appearance_Type').GetValue();
        this.creatureAppearance = AppearanceManager.GetCreatureAppearanceById(this.appearance);
      }

      if(this.template.RootNode.HasField('Animation')){
        this.setAnimationState(
          this.template.GetFieldByLabel('Animation').GetValue()
        );
      }

      if(this.template.RootNode.HasField('BodyBag'))
        this.bodyBag = this.template.GetFieldByLabel('BodyBag').GetValue();

      if(this.template.RootNode.HasField('BodyVariation'))
        this.bodyBag = this.template.GetFieldByLabel('BodyVariation').GetValue();

      if(this.template.RootNode.HasField('ChallengeRating'))
        this.challengeRating = this.template.GetFieldByLabel('ChallengeRating').GetValue();

      if(this.template.RootNode.HasField('ClassList')){
        let classes = this.template.RootNode.GetFieldByLabel('ClassList').GetChildStructs();
        for(let i = 0; i < classes.length; i++){
          this.classes.push(
            CreatureClass.FromCreatureClassStruct(classes[i])
          );
        }
      }

      if(this.template.RootNode.HasField('Conversation')){
        this.conversation = DLGObject.FromResRef(this.template.GetFieldByLabel('Conversation').GetValue());
      }

      if(this.template.RootNode.HasField('CurrentForce'))
        this.currentForce = this.template.GetFieldByLabel('CurrentForce').GetValue();

      if(this.template.RootNode.HasField('CurrentHitPoints'))
        this.currentHitPoints = this.template.GetFieldByLabel('CurrentHitPoints').GetValue();

      if(this.template.RootNode.HasField('HitPoints'))
        this.hitPoints = this.template.GetFieldByLabel('HitPoints').GetValue();

      if(this.template.RootNode.HasField('Disarmable'))
        this.disarmable = this.template.GetFieldByLabel('Disarmable').GetValue();
    
      if(this.template.RootNode.HasField('Experience'))
        this.experience = this.template.RootNode.GetFieldByLabel('Experience').GetValue();

      if(this.template.RootNode.HasField('Listening')){
        this.setListening(this.template.RootNode.GetFieldByLabel('Listening').GetValue());
      }
      if(this.template.RootNode.HasField('Commandable')){
        this.setCommadable(this.template.RootNode.GetFieldByLabel('Commandable').GetValue());
      }

      if(this.template.RootNode.HasField('ExpressionList')){
        let expressions = this.template.RootNode.GetFieldByLabel('ExpressionList').GetChildStructs();
        for(let i = 0; i < expressions.length; i++){
          this.setListeningPattern(
            expressions[i].GetFieldByLabel('ExpressionString').GetValue(),
            expressions[i].GetFieldByLabel('ExpressionId').GetValue()
          );
        }
      }
          
      if(this.template.RootNode.HasField('FactionID')){
        this.factionId = this.template.GetFieldByLabel('FactionID').GetValue();
        if((this.factionId & 0xFFFFFFFF) == -1){
          this.factionId = 0;
        }
      }
      this.faction = FactionManager.factions.get(this.factionId);

      if(this.template.RootNode.HasField('FeatList')){
        let feats = this.template.RootNode.GetFieldByLabel('FeatList').GetChildStructs();
        for(let i = 0; i < feats.length; i++){
          this.feats.push(
            new TalentFeat( feats[i].GetFieldByLabel('Feat').GetValue() )
          );
        }
      }

      if(this.template.RootNode.HasField('FirstName'))
        this.firstName = this.template.RootNode.GetFieldByLabel('FirstName').GetValue();
      
      if(this.template.RootNode.HasField('ForcePoints'))
        this.forcePoints = this.template.RootNode.GetFieldByLabel('ForcePoints').GetValue();
          
      if(this.template.RootNode.HasField('Gender'))
        this.gender = this.template.RootNode.GetFieldByLabel('Gender').GetValue();
    
      if(this.template.RootNode.HasField('GoodEvil'))
        this.goodEvil = this.template.RootNode.GetFieldByLabel('GoodEvil').GetValue();
        
      if(this.template.RootNode.HasField('Hologram'))
        this.isHologram = this.template.GetFieldByLabel('Hologram').GetValue();

      if(this.template.RootNode.HasField('Interruptable'))
        this.interruptable = this.template.GetFieldByLabel('Interruptable').GetValue();

      if(this.template.RootNode.HasField('IsPC'))
        this.isPC = this.template.GetFieldByLabel('IsPC').GetValue();

      if(this.template.RootNode.HasField('LastName'))
        this.lastName = this.template.GetFieldByLabel('LastName').GetValue();

      if(this.template.RootNode.HasField('MaxHitPoints')){
        this.maxHitPoints = this.template.GetFieldByLabel('MaxHitPoints').GetValue();
      }

      if(this.template.RootNode.HasField('MaxForcePoints')){
        this.maxForcePoints = this.template.GetFieldByLabel('MaxForcePoints').GetValue();
      }

      if(this.template.RootNode.HasField('Min1HP'))
        this.min1HP = this.template.GetFieldByLabel('Min1HP').GetValue();

      if(this.template.RootNode.HasField('NaturalAC'))
        this.naturalAC = this.template.GetFieldByLabel('NaturalAC').GetValue();

      if(this.template.RootNode.HasField('NoPermDeath'))
        this.noPermDeath = this.template.GetFieldByLabel('NoPermDeath').GetValue();

      if(this.template.RootNode.HasField('NotReorienting'))
        this.notReorienting = this.template.GetFieldByLabel('NotReorienting').GetValue();

      if(this.template.RootNode.HasField('PartyInteract'))
        this.partyInteract = this.template.GetFieldByLabel('PartyInteract').GetValue();

      if(this.template.RootNode.HasField('PerceptionRange')){
        this.perceptionRange = this.template.GetFieldByLabel('PerceptionRange').GetValue();
      }else{
        //https://forum.neverwintervault.org/t/perception-range/3191/9
        //It appears that PerceptionRange isn't saved inside the GIT file.
        //The original game appears to use PercepRngDefault when a creature is reloaded from a SaveGame
        this.perceptionRange = 11;
      }

      if(this.template.RootNode.HasField('Phenotype'))
        this.phenotype = this.template.GetFieldByLabel('Phenotype').GetValue();

      if(this.template.RootNode.HasField('Plot'))
        this.plot = this.template.GetFieldByLabel('Plot').GetValue();

      if(this.template.RootNode.HasField('PortraitId'))
        this.portraidId = this.template.GetFieldByLabel('PortraitId').GetValue();
    
      if(this.template.RootNode.HasField('Race'))
        this.race = this.template.RootNode.GetFieldByLabel('Race').GetValue();

      if(this.template.RootNode.HasField('SkillList')){
        let skills = this.template.RootNode.GetFieldByLabel('SkillList').GetChildStructs();
        for(let i = 0; i < skills.length; i++){
          this.skills[i] = new TalentSkill(i, skills[i].GetFieldByLabel('Rank').GetValue());
        }
      }

      if(this.template.RootNode.HasField('SoundSetFile'))
        this.soundSetFile = this.template.RootNode.GetFieldByLabel('SoundSetFile').GetValue();
    
      if(this.template.RootNode.HasField('SubRace'))
        this.subrace = this.template.RootNode.GetFieldByLabel('SubRace').GetValue();

      if(this.template.RootNode.HasField('Tag'))
        this.tag = this.template.GetFieldByLabel('Tag').GetValue();

      if(this.template.RootNode.HasField('TemplateResRef'))
        this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

      if(this.template.RootNode.HasField('TextureVar'))
        this.textureVar = this.template.GetFieldByLabel('TextureVar').GetValue();

      if(this.template.RootNode.HasField('WalkRate'))
        this.walkRate = this.template.GetFieldByLabel('WalkRate').GetValue();

      if(this.template.RootNode.HasField('Str'))
        this.str = this.template.GetFieldByLabel('Str').GetValue();
    
      if(this.template.RootNode.HasField('Dex'))
        this.dex = this.template.GetFieldByLabel('Dex').GetValue();
    
      if(this.template.RootNode.HasField('Con'))
        this.con = this.template.GetFieldByLabel('Con').GetValue();
    
      if(this.template.RootNode.HasField('Cha'))
        this.cha = this.template.GetFieldByLabel('Cha').GetValue();
    
      if(this.template.RootNode.HasField('Wis'))
        this.wis = this.template.GetFieldByLabel('Wis').GetValue();
    
      if(this.template.RootNode.HasField('Int'))
        this.int = this.template.GetFieldByLabel('Int').GetValue();

      if(this.template.RootNode.HasField('XPosition'))
        this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

      if(this.template.RootNode.HasField('YPosition'))
        this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

      if(this.template.RootNode.HasField('ZPosition'))
        this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

      if(this.template.RootNode.HasField('XOrientation'))
        this.xOrientation = this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();

      if(this.template.RootNode.HasField('YOrientation'))
        this.yOrientation = this.template.RootNode.GetFieldByLabel('YOrientation').GetValue();

      if(this.template.RootNode.HasField('ZOrientation'))
        this.zOrientation = this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();
        
      if(this.template.RootNode.HasField('FortSaveThrow'))
        this.fortitudeSaveThrow = this.template.RootNode.GetFieldByLabel('FortSaveThrow').GetValue();

      if(this.template.RootNode.HasField('RefSaveThrow'))
        this.reflexSaveThrow = this.template.RootNode.GetFieldByLabel('RefSaveThrow').GetValue();

      if(this.template.RootNode.HasField('WillSaveThrow'))
        this.willSaveThrow = this.template.RootNode.GetFieldByLabel('WillSaveThrow').GetValue();

        if(this.template.RootNode.HasField('SubraceIndex'))
          this.subraceIndex = this.template.RootNode.GetFieldByLabel('SubraceIndex').GetValue();


      if(this.template.RootNode.HasField('SWVarTable')){
        let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
        //console.log(localBools);
        for(let i = 0; i < localBools.length; i++){
          let data = localBools[i].GetFieldByLabel('Variable').GetValue();
          for(let bit = 0; bit < 32; bit++){
            this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
          }
        }
        let localNumbers = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('ByteArray').GetChildStructs();
        //console.log(localNumbers);
        for(let i = 0; i < localNumbers.length; i++){
          let data = localNumbers[i].GetFieldByLabel('Variable').GetValue();
          this.setLocalNumber(i, data);
        }
      }

      if(this.template.RootNode.HasField('PM_Appearance'))
        this.pm_Appearance = this.template.RootNode.GetFieldByLabel('PM_Appearance').GetValue();

      if(this.template.RootNode.HasField('PM_IsDisguised'))
        this.pm_IsDisguised = !!this.template.RootNode.GetFieldByLabel('PM_IsDisguised').GetValue();

      try{
        if(this.template.RootNode.HasField('EffectList')){
          let effects = this.template.RootNode.GetFieldByLabel('EffectList').GetChildStructs() || [];
          for(let i = 0; i < effects.length; i++){
            let effect = GameEffect.EffectFromStruct(effects[i]);
            if(effect instanceof GameEffect){
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
        if(this.template.RootNode.HasField('Equip_ItemList')){
          let equipment = this.template.RootNode.GetFieldByLabel('Equip_ItemList').GetChildStructs() || [];
          for(let i = 0; i < equipment.length; i++){
            let strt = equipment[i];
            let equipped_item = undefined;
            let slot_type = strt.Type;
            if(strt.HasField('EquippedRes')){
              equipped_item = new ModuleItem(strt.GetFieldByLabel('EquippedRes').GetValue());
            }else{
              equipped_item = new ModuleItem(GFFObject.FromStruct(strt));
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
                console.warn('ModuleCreature.InitProperties', 'Unhandled Equipment Slot', equipped_item);
              break;
            }
          }
        }
      }catch(e: any){
        console.error(e);
      }

      this.ParseEquipmentSlots();

      if(this.template.RootNode.HasField('ItemList')){
        let inventory = this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs();
        for(let i = 0; i < inventory.length; i++){
          this.LoadItem(GFFObject.FromStruct(inventory[i]));
        }
      }
      this.LoadSoundSet();

      //ActionList
      try{
        if(this.template.RootNode.HasField('ActionList')){
          let actionStructs = this.template.RootNode.GetFieldByLabel('ActionList').GetChildStructs();
          for(let i = 0, len = actionStructs.length; i < len; i++){
            let action = Action.FromStruct(actionStructs[i]);
            if(action instanceof Action){
              this.actionQueue.add(action);
            }
          }
        }
      }catch(e: any){
        console.error(e);
      }

      //PerceptionList
      try{
        if(this.template.RootNode.HasField('PerceptionList')){
          let perceptionList = this.template.RootNode.GetFieldByLabel('PerceptionList').GetChildStructs();
          for(let i = 0, len = perceptionList.length; i < len; i++){
            let perception = perceptionList[i];

            let objectId = perception.GetFieldByLabel('ObjectId').GetValue();
            let data = perception.GetFieldByLabel('PerceptionData').GetValue();

            let seen = false;
            let heard = false;
            let hasSeen = false;
            let hasHeard = false;
            //https://nwnlexicon.com/index.php?title=Perception
            switch(data){
              case 0:// PERCEPTION_SEEN_AND_HEARD	0	Both seen and heard (Spot beats Hide, Listen beats Move Silently).
                seen = true; heard = true;
              break;
              case 1:// PERCEPTION_NOT_SEEN_AND_NOT_HEARD	1	Neither seen nor heard (Hide beats Spot, Move Silently beats Listen).
                seen = false; heard = false;
              break;
              case 2:// PERCEPTION_HEARD_AND_NOT_SEEN	2	 Heard only (Hide beats Spot, Listen beats Move Silently). Usually arouses suspicion for a creature to take a closer look.
                seen = false; heard = true;
              break;
              case 3:// PERCEPTION_SEEN_AND_NOT_HEARD	3	Seen only (Spot beats Hide, Move Silently beats Listen). Usually causes a creature to take instant notice.
                seen = true; heard = false;
              break;
              case 4:// PERCEPTION_NOT_HEARD 4 Not heard (Move Silently beats Listen), no line of sight.
                seen = false; heard = false;
              break;
              case 5:// PERCEPTION_HEARD 5 Heard (Listen beats Move Silently), no line of sight.
                seen = false; heard = true;
              break;
              case 6:// PERCEPTION_NOT_SEEN	6	Not seen (Hide beats Spot), too far away to heard or magically silenced.
                seen = false; heard = false;
              break;
              case 7:// PERCEPTION_SEEN	7	Seen (Spot beats Hide), too far away to heard or magically silenced.
                seen = true; heard = false;
              break;
            }

            this.perceptionList.push({
              objectId: objectId,
              data: data,
              seen: seen,
              heard: heard,
              hasSeen: seen,
              hasHeard: heard
            });

          }
        }
      }catch(e: any){
        console.error(e);
      }
    }catch(e: any){
      console.error(e);
    }

    this.initialized = true;

  }

  LoadEquipmentModels(): Promise<void> {
    return new Promise<void>( (resolve, reject) => {
      let loop = new AsyncLoop({
        array: Object.keys(this.equipment),
        onLoop: (slot_key: string, asyncLoop: AsyncLoop) => {
          let slot: ModuleItem = (this.equipment as any)[slot_key];
          if(slot instanceof ModuleItem){
            slot.LoadModel().then( () => {
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

  ParseEquipmentSlots(){
    let slots = Object.keys(this.equipment);
    for(let i = 0; i < slots.length; i++){
      let slot: ModuleItem = (this.equipment as any)[slots[i]];
      if(slot instanceof ModuleItem){
        slot.setPossessor(this);
        slot.Load();
      }
    }
  }

  LoadSoundSet(){
    const soundset2DA = TwoDAManager.datatables.get('soundset');
    if(soundset2DA){
      let ss_row = soundset2DA.rows[this.soundSetFile];
      if(ss_row){
        const buffer = ResourceLoader.loadCachedResource(ResourceTypes.ssf, ss_row.resref.toLowerCase());
        this.ssf = new SSFObject(buffer);
      }
    }
  }

  LoadItem( template: GFFObject ){

    let item = new ModuleItem(template);
    item.InitProperties();
    item.Load();
    let hasItem = this.getItem(item.getTag());
    if(hasItem){
      hasItem.setStackSize(hasItem.getStackSize() + 1);
      return hasItem;
    }else{
      this.inventory.push(item);
      return item;
    }

  }

  PlaySoundSet(type = -1){
    if(this.ssf instanceof SSFObject){
      let resref = this.ssf.GetSoundResRef(type).replace(/\0.*$/g,'');
      if(resref != ''){
        if(this.audioEmitter)
          this.audioEmitter.PlaySound(resref);
      }
    }
  }

  actionFollowLeader(){
    this.actionQueue.add( new ActionFollowLeader() );
  }

  save(){

    let gff = new GFFObject();
    gff.FileType = 'UTC ';
    
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_CommntyName') ).SetValue('Bad StrRef');
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_IsPrimaryPlr') ).SetValue( this == GameState.player ? 1 : 0);
    
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_FirstName') )
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_LastName') )

    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'AIState') ).SetValue(0);
    let actionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Age') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AmbientAnimState') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Animation') ).SetValue(this.animationState.index);
    //gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Appearance_Head') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).SetValue(this.appearance);
    //gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'AreaId') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'ArmorClass') ).SetValue(this.getAC());
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).SetValue(this.bodyBag);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Cha') ).SetValue(this.cha);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') ).SetValue(this.challengeRating);

    //Classes
    let classList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ClassList') );
    for(let i = 0; i < this.classes.length; i++){
      classList.AddChildStruct( this.classes[i].save() );
    }
    
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Color_Hair') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Color_Skin') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Color_Tattoo1') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Color_Tattoo2') ).SetValue(0);

    let combatInfoStruct = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'CombatInfo') );

    //TODO: CombatInfo

    let combatRoundDataStruct = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'CombatRoundData') );

    //TODO: CombatRoundData

    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Commandable') ).SetValue(this.getCommadable() ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Con') ).SetValue(this.str);
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Conversation') ).SetValue(this.conversation ? this.conversation.resref : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'CreatnScrptFird') ).SetValue( this.spawned ? 1 : 0 );
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'CreatureSize') ).SetValue(3);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentForce') ).SetValue(this.currentForce);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentHitPoints') ).SetValue(this.currentHitPoints);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DeadSelectable') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Deity') ).SetValue('');
    //gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).SetValue();
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DetectMode') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Dex') ).SetValue(this.dex);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Disarmable') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DuplicatingHead') ).SetValue(255);
    
    //Effects
    let effectList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.AddChildStruct( this.effects[i].save() );
    }

    //Equipment
    let equipItemList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );

    if(this.equipment.ARMOR instanceof ModuleItem){
      let equipItem = this.equipment.ARMOR.save();
      equipItem.SetType(ModuleCreatureArmorSlot.ARMOR);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.ARMS instanceof ModuleItem){
      let equipItem = this.equipment.ARMS.save();
      equipItem.SetType(ModuleCreatureArmorSlot.ARMS);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.BELT instanceof ModuleItem){
      let equipItem = this.equipment.BELT.save();
      equipItem.SetType(ModuleCreatureArmorSlot.BELT);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.CLAW1 instanceof ModuleItem){
      let equipItem = this.equipment.CLAW1.save();
      equipItem.SetType(ModuleCreatureArmorSlot.CLAW1);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.CLAW2 instanceof ModuleItem){
      let equipItem = this.equipment.CLAW2.save();
      equipItem.SetType(ModuleCreatureArmorSlot.CLAW2);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.CLAW3 instanceof ModuleItem){
      let equipItem = this.equipment.CLAW3.save();
      equipItem.SetType(ModuleCreatureArmorSlot.CLAW3);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.HEAD instanceof ModuleItem){
      let equipItem = this.equipment.HEAD.save();
      equipItem.SetType(ModuleCreatureArmorSlot.HEAD);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.HIDE instanceof ModuleItem){
      let equipItem = this.equipment.HIDE.save();
      equipItem.SetType(ModuleCreatureArmorSlot.HIDE);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.IMPLANT instanceof ModuleItem){
      let equipItem = this.equipment.IMPLANT.save();
      equipItem.SetType(ModuleCreatureArmorSlot.IMPLANT);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.LEFTARMBAND instanceof ModuleItem){
      let equipItem = this.equipment.LEFTARMBAND.save();
      equipItem.SetType(ModuleCreatureArmorSlot.LEFTARMBAND);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.LEFTHAND instanceof ModuleItem){
      let equipItem = this.equipment.LEFTHAND.save();
      equipItem.SetType(ModuleCreatureArmorSlot.LEFTHAND);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.RIGHTARMBAND instanceof ModuleItem){
      let equipItem = this.equipment.RIGHTARMBAND.save();
      equipItem.SetType(ModuleCreatureArmorSlot.RIGHTARMBAND);
      equipItemList.AddChildStruct(equipItem)
    }

    if(this.equipment.RIGHTHAND instanceof ModuleItem){
      let equipItem = this.equipment.RIGHTHAND.save();
      equipItem.SetType(ModuleCreatureArmorSlot.RIGHTHAND);
      equipItemList.AddChildStruct(equipItem)
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Experience') ).SetValue(this.experience);
    
    let expressionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ExpressionList') );
    let expressions = Object.keys(this.listeningPatterns);
    for(let i = 0; i < expressions.length; i++){
      let expressionString = expressions[i];
      let expressionId = this.listeningPatterns[expressionString];

      let expressionStruct = new GFFStruct();
      expressionStruct.AddField( new GFFField(GFFDataType.INT, 'ExpressionId') ).SetValue( expressionId );
      expressionStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'ExpressionString') ).SetValue( expressionString );
      expressionList.AddChildStruct(expressionStruct);
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'FactionID') ).SetValue(this.faction ? this.faction.id : this.factionId);

    //Feats
    let featList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'FeatList') );
    for(let i = 0; i < this.feats.length; i++){
      featList.AddChildStruct( this.feats[i].save() );
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') ).SetValue( this.template.RootNode.GetFieldByLabel('FirstName')?.GetCExoLocString() );
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'ForcePoints') ).SetValue(this.forcePoints);
    gff.RootNode.AddField( new GFFField(GFFDataType.CHAR, 'FortSaveThrow') ).SetValue(this.fortitudeSaveThrow);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Gender') ).SetValue(this.gender);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Gold') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'GoodEvil') ).SetValue(this.goodEvil);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'HitPoints') ).SetValue(this.hitPoints);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Int') ).SetValue(this.int);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Interruptable') ).SetValue(this.interruptable ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'IsDestroyable') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'IsPC') ).SetValue( this == GameState.player ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'IsRaiseable') ).SetValue(1);

    //Creature Inventory
    let itemList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ItemList') );
    for(let i = 0; i < this.inventory.length; i++){
      let itemStruct = this.inventory[i].save();
      itemList.AddChildStruct(itemStruct);
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'JoiningXP') ).SetValue( this.joiningXP ? this.joiningXP : 0 );
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName') ).SetValue( this.template.RootNode.GetFieldByLabel('LastName')?.GetCExoLocString() );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Listening') ).SetValue( this.isListening );

    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'MaxForcePoints') ).SetValue(this.maxForcePoints);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'MaxHitPoints') ).SetValue(this.maxHitPoints);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Min1HP') ).SetValue(this.min1HP);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'MovementRate') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'NaturalAC') ).SetValue(this.naturalAC);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'NotReorienting') ).SetValue(this.notReorienting);

    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PM_IsDisguised') ).SetValue( this.hasEffect(GameEffectType.EffectDisguise) ? 1 : 0 );
    if( this.hasEffect(GameEffectType.EffectDisguise) ){
      gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PM_Appearance') ).SetValue( this.appearance );
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PartyInteract') ).SetValue(this.partyInteract);

    let perceptionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'PerceptionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') ).SetValue(this.perceptionRange);

    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Phenotype') ).SetValue(this.phenotype);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Plot') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraitId') ).SetValue(this.portraidId);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'PregameCurrent') ).SetValue(28);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Race') ).SetValue(this.race);
    gff.RootNode.AddField( new GFFField(GFFDataType.CHAR, 'RefSaveThrow') ).SetValue(this.reflexSaveThrow);

    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') ).SetValue(this.scripts.onAttacked ? this.scripts.onAttacked.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') ).SetValue(this.scripts.onDamaged ? this.scripts.onDamaged.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') ).SetValue(this.scripts.onDeath ? this.scripts.onDeath.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') ).SetValue(this.scripts.onDialog ? this.scripts.onDialog.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') ).SetValue(this.scripts.onDisturbed ? this.scripts.onDisturbed.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') ).SetValue(this.scripts.onEndDialog ? this.scripts.onEndDialog.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') ).SetValue(this.scripts.onEndRound ? this.scripts.onEndRound.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') ).SetValue(this.scripts.onBlocked ? this.scripts.onBlocked.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') ).SetValue(this.scripts.onNotice ? this.scripts.onNotice.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptRested') ).SetValue(this.scripts.onRested ? this.scripts.onRested.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') ).SetValue(this.scripts.onSpawn ? this.scripts.onSpawn.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') ).SetValue(this.scripts.onSpellAt ? this.scripts.onSpellAt.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).SetValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');

    //Skills
    let skillList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SkillList') );
    for(let i = 0; i < 8; i++){
      skillList.AddChildStruct( this.skills[i].save() );
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'SkillPoints') ).SetValue( this.skillPoints ? this.skillPoints : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'SoundSetFile') ).SetValue(this.soundSetFile);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'StartingPackage') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'StealthMode') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Str') ).SetValue(this.str);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Subrace') ).SetValue('');
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'SubraceIndex') ).SetValue(this.subrace);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Tail') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'UseBackupHead') ).SetValue(0);
    let varTable = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.AddField( new GFFField(GFFDataType.CHAR, 'WillSaveThrow') ).SetValue(this.willSaveThrow);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Wings') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Wis') ).SetValue(this.wis);

    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue( this.position.x );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue( this.position.y );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue( this.position.z );

    let theta = this.rotation.z * Math.PI;

    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue( 1 * Math.cos(theta) );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue( 1 * Math.sin(theta) );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).SetValue( 0 );

    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'fortbonus') ).SetValue(this.fortbonus);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'refbonus') ).SetValue(this.refbonus);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'refbonus') ).SetValue(this.refbonus);

    this.template = gff;

    if(this.partyID >= 0){
      PartyManager.NPCS[this.partyID].template = this.template;
    }

    return gff;

  }

  toToolsetInstance(){

    let instance = new GFFStruct(4);
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', Math.cos(this.rotation.z + (Math.PI/2)))
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', Math.sin(this.rotation.z + (Math.PI/2)))
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTC ';

    template.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Appearance_Type') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyBag') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyVariation') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Cha') );
    template.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') );
    template.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ClassList') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Comment') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Con') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Conversation') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentForce') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentHitPoints') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Deity') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Dex') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Disarmable') );
    template.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
    template.RootNode.AddField( new GFFField(GFFDataType.WORD, 'FactionID') );
    template.RootNode.AddField( new GFFField(GFFDataType.LIST, 'FeatList') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'ForcePoints') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Gender') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'GoodEvil') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'HitPoints') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Int') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Interruptable') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'IsPC') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LastName') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'LawfulChaotic') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'MaxHitPoints') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Min1HP') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'NaturalAC') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'NoPermDeath') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'NotReorienting') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PalletID') ).SetValue(4);
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PartyInteract') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') );
    template.RootNode.AddField( new GFFField(GFFDataType.INT, 'Phenotype') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Plot') );
    template.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraitId') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Race') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptRested') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') );
    let skillList = template.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SkillList') );
    template.RootNode.AddField( new GFFField(GFFDataType.WORD, 'SoundSetFile') )
    template.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SpecAbilityList') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Str') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Subrace') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'SubraceIndex') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') );
    template.RootNode.AddField( new GFFField(GFFDataType.LIST, 'TemplateList') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TextureVar') );
    template.RootNode.AddField( new GFFField(GFFDataType.INT, 'WalkRate') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Wis') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'fortbonus') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'refbonus') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'willbonus') );

    for(let i = 0; i < 8; i++){
      let _skill = new GFFStruct();
      _skill.AddField( new GFFField(GFFDataType.RESREF, 'Rank') ).SetValue(0);
      skillList.AddChildStruct(_skill);
    }

    return template;
  }

}
