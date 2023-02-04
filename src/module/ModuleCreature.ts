/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { Action, ActionCastSpell, ActionFollowLeader, ActionItemCastSpell, ActionJumpToObject, ActionJumpToPoint, ActionMoveToPoint, ActionPhysicalAttacks, ActionUnlockObject } from "../actions";
import { AudioEmitter } from "../audio/AudioEmitter";
import { CombatEngine } from "../combat/CombatEngine";
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
import { TalentFeat } from "../talents/TalentFeat";
import { TalentObject } from "../talents/TalentObject";
import { TalentSkill } from "../talents/TalentSkill";
import { TalentSpell } from "../talents/TalentSpell";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { ModuleObject, ModuleItem, ModuleRoom } from "./";
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

/* @file
 * The ModuleCreature class.
 */

export class ModuleCreature extends ModuleObject {
  pm_IsDisguised: any;
  pm_Appearance: any;
  anim: any;
  head: any;
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
  conversation: string;
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
  heardStrings: any[];
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

  
  equipment: { 
    HEAD: ModuleItem; 
    ARMOR: ModuleItem; 
    ARMS: ModuleItem; 
    RIGHTHAND: ModuleItem; 
    LEFTHAND: ModuleItem; 
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
  overlayAnimation: string;
  turning: number;
  deathAnimationPlayed: boolean;
  openSpot: any;
  deathStarted: boolean;
  getUpAnimationPlayed: boolean;
  animSpeed: number;
  portrait: number;
  selectedNPC: number;

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
    this.pm_IsDisguised = 0;
    this.bodyBag = 0;
    this.bodyVariation = 0;
    this.cha = 0;
    this.challengeRating = 0;
    this.classes = [];
    this.comment = '';
    this.con = 0;
    this.conversation = '';
    this.currentForce = 0;
    this.currentHitPoints = 0; //The Creature's current hit points, not counting any bonuses. This value may be higher or lower than the creature's maximum hit points.
    this.regenTimer = 0;
    this.regenTimerMax = 6;
    this.deity = '';
    this.description = '';
    this.dec = 0;
    this.disarmable = 0;
    this.isHologram = false;
    this.overlayAnimation = undefined;

    this.equipment = {
      HEAD: undefined,
      ARMOR: undefined,
      ARMS: undefined,
      RIGHTHAND: undefined,
      LEFTHAND: undefined,
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
    this.faction = 0;
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

    this.animState = ModuleCreatureAnimState.IDLE;
    this.combatData.combatActionTimer = 3; 
    this.combatData.combatAction = undefined;
    this.combatData.combatState = false;
    this.combatData.combatQueue = [];
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

    if(GameState.Mode == EngineMode.INGAME || GameState.Mode == EngineMode.MINIGAME){

      if(this.animState == ModuleCreatureAnimState.IDLE){
        this.footstepEmitter.Stop();
      }

      if(!this.isReady){
        //this.getModel().visible = true;
        return;
      }else{
        //this.getModel().visible = true;
        this.getModel().rotation.copy(this.rotation);
        //this.getModel().quaternion = this.quaternion;
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

      if(!this.isDead() && this.animState == ModuleCreatureAnimState.DEAD){
        this.animState = ModuleCreatureAnimState.IDLE;
        this.deathAnimationPlayed = false;
        this.animState = ModuleCreatureAnimState.GET_UP_DEAD;
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
        
        if(this.animState != ModuleCreatureAnimState.DEAD){
          this.updateActionQueue(delta);
        }

        if(this.dialogAnimation && GameState.inDialog && (!this.action || this.action.type != ActionType.ActionPlayAnimation)){
          if(this.model){

            if(!this.speed){
                
              let _animShouldChange = false;
    
              if(this.model.animationManager.currentAnimation instanceof OdysseyModelAnimation){
                if(this.model.animationManager.currentAnimation.name.toLowerCase() != this.dialogAnimation.animation.toLowerCase()){
                  _animShouldChange = true;
                }
              }else{
                _animShouldChange = true;
              }
    
              if(_animShouldChange){
                let _newAnim = this.model.getAnimationByName(this.dialogAnimation.animation);
                if(_newAnim instanceof OdysseyModelAnimation){
                  if(this.dialogAnimation.time == -1){
                    this.model.playAnimation(_newAnim, true);
                  }else{
                    this.model.playAnimation(_newAnim, false, () => {
                      //Kill the dialogAnimation after the animation ends
                      this.dialogAnimation = null;
                    })
                  }
                }else{
                  //Kill the dialogAnimation if the animation isn't found
                  //console.log('dialogAnimation missing!', this.dialogAnimation.animation, this);
                  this.dialogAnimation = null;
                }
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
        if(this.animState != ModuleCreatureAnimState.DEAD || this.animState != ModuleCreatureAnimState.DIE){
          this.animState = ModuleCreatureAnimState.DEAD;
        }
        if(!this.deathStarted){
          this.deathStarted = true;
          this.clearAllActions();
          this.onDeath();
          this.PlaySoundSet(SSFObjectType.DEAD);
          this.overlayAnimation = undefined;
        }
      }

      if(this.isDebilitated()){
        this.force = 0;
        this.speed = 0;
        this.animState = ModuleCreatureAnimState.IDLE;
      }

      //-------------------------//
      // BEGIN: Move Speed Logic //
      //-------------------------//

      if(this.isDead()){
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
            this.animState = ModuleCreatureAnimState.RUNNING;
          }else{
            this.animState = ModuleCreatureAnimState.WALKING;
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

      if(!this.AxisFront.length() && ( this.animState == ModuleCreatureAnimState.RUNNING || this.animState == ModuleCreatureAnimState.WALKING )){
        this.animState = ModuleCreatureAnimState.IDLE;
        this.speed = 0;
        this.force = 0;
      }

      //-----------------------//
      // END: Move Speed Logic //
      //-----------------------//

      if(this.combatData.combatState && this.animState == ModuleCreatureAnimState.PAUSE){
        this.animState = ModuleCreatureAnimState.READY;
      }

      this.updateExcitedDuration(delta);
      this.updateCombat(delta);
      this.updateCasting(delta);
      this.updateAnimationState();
      this.updateItems(delta);
      
      if(this.model instanceof OdysseyModel3D && this.model.bonesInitialized){
        if(!GameState.inDialog){
          this.model.update( this.movementSpeed * delta );
          if(this.lipObject instanceof LIPObject){
            this.lipObject.update(delta, this.head ? this.head : this.model);
          }
        }else{
          this.model.update( delta );
          if(this.lipObject instanceof LIPObject){
            this.lipObject.update(delta, this.head ? this.head : this.model);
          }
        }
      }

      //if(this.model instanceof OdysseyModel3D)
      //  this.model.box.setFromObject(this.model);

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
      //this.force = 0;
      //this.animState = ModuleCreatureAnimState.IDLE;
      /*if(typeof this.model.animationManager.currentAnimation == 'undefined'){
        let randomPauseIdx = Math.round(Math.random()*2) + 1;
        this.model.playAnimation('pause'+randomPauseIdx, false);
      }*/

      if(!this.combatData.combatState && this.isPartyMember() && this != GameState.getCurrentPlayer()){
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

    if(this.combatData.lastAttackTarget instanceof ModuleObject && this.combatData.lastAttackTarget.isDead()){
      this.combatData.lastAttackTarget = undefined;
      this.clearTarget();
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
      if(CombatEngine.combatants.indexOf(this) >= 0){
        CombatEngine.RemoveCombatant(this);
      }
    }

    if(this.combatData.combatState){
      //If creature is being controller by the player, keep at least one basic action in the attack queue while attack target is still alive 
      if(((GameState.getCurrentPlayer() as any) == this) && this.combatData.lastAttackTarget && !this.combatData.lastAttackTarget.isDead() && !this.combatData.combatAction && !this.combatData.combatQueue.length){
        this.attackCreature(this.combatData.lastAttackTarget, undefined);
      }
      CombatEngine.AddCombatant(this);
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
    //console.log('clearTarget');
    this.combatData.combatQueue = [];
    this.combatData.combatAction = undefined;
    this.combatData.lastAttackTarget = undefined;
    this.combatData.lastDamager = undefined;
    //this.combatActionTimer = 0;
    //CombatEngine.RemoveCombatant(this);
  }

  actionInRange(action: Action){
    if(action){
      if(action.type == ActionType.ActionCastSpell){
        return (action as ActionCastSpell|ActionItemCastSpell).spell.inRange(action.target, this);
      }else{
        let distance = this.position.distanceTo(action.target.position);
        //console.log('actionInRange', distance, action.target.position);
        return distance < ( (this.combatData.getEquippedWeaponType() == 1 || this.combatData.getEquippedWeaponType() == 3) ? 2.0 : 15.0 );
      }
    }
    return false;
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

    if(this.overlayAnimation && !this.isDead()){
      let overlayAnimationData = OdysseyModelAnimation.GetAnimation2DA(this.overlayAnimation);
      if(overlayAnimationData){
        if( (this.animState != ModuleCreatureAnimState.WALKING && this.animState != ModuleCreatureAnimState.RUNNING) || overlayAnimationData.overlay == 1){
          if(currentAnimation != this.overlayAnimation){
            this.dialogAnimation = undefined;
            this.model.playAnimation(this.overlayAnimation, false, () => {
              //console.log('Overlay animation completed');
              this.overlayAnimation = undefined;
            });
          }
          return;
        }else{
          this.overlayAnimation = undefined;
        }
      }else{
        this.overlayAnimation = undefined;
      }
    }else{
      this.overlayAnimation = undefined;
    }

    //if(this.action && this.action.type == ActionType.ActionPlayAnimation)
    //  return;

    if(GameState.inDialog && this.dialogAnimation && !this.speed && !this.isDead())
      return;

    let animation = this.animationConstantToAnimation(this.animState);
    if(animation){
      if(currentAnimation != animation.name.toLowerCase()){
        let aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
        this.getModel().playAnimation(animation.name.toLowerCase(), aLooping, () => {
          if(!aLooping)
            this.animState = ModuleCreatureAnimState.PAUSE;
        });
      }
    }else{
      console.error('Animation Missing', this.getTag(), this.getName(), this.animState);
      this.animState = ModuleCreatureAnimState.PAUSE;
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
    return !this.isParalyzed() && !this.isStunned() && (this.animState != ModuleCreatureAnimState.DEAD || this.animState != ModuleCreatureAnimState.DIE) && !this.casting.length;
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
      let target_position = target.position.clone();
      action.setParameter(0, ActionParameterType.FLOAT, target_position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target_position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target_position.z);
      action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      action.setParameter(4, ActionParameterType.DWORD, target.id);
      action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
      action.setParameter(6, ActionParameterType.FLOAT, Math.max(1.5, distance));
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.actionQueue.add(action);
    }

  }

  moveToLocation(target: ModuleObject, bRun = true){

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
      let target_position = target.position.clone();
      action.setParameter(0, ActionParameterType.FLOAT, target_position.x);
      action.setParameter(1, ActionParameterType.FLOAT, target_position.y);
      action.setParameter(2, ActionParameterType.FLOAT, target_position.z);
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

  jumpToLocation(target: ModuleObject){
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

  isDueling(){
    return (this.combatData.lastAttackTarget?.combatData.lastAttackTarget == this && this.combatData.lastAttackTarget?.combatData.getEquippedWeaponType() == 1 && this.combatData.getEquippedWeaponType() == 1);
  }

  isDuelingObject( oObject: ModuleObject ){
    return (oObject instanceof ModuleObject && this.combatData.lastAttackTarget == oObject && oObject.combatData.lastAttackTarget == this && oObject.combatData.getEquippedWeaponType() == 1 && this.combatData.getEquippedWeaponType() == 1);
  }

  attackCreature(target: ModuleObject, feat?: any, isCutsceneAttack = false, attackDamage = 0, attackAnimation?: any, attackResult?: any){

    //console.log('attackCreature', this, target, feat);

    if(target == undefined)
      return;

    if(target == this)
      target = GameState.player;

    if(target.isDead())
      return;

    this.resetExcitedDuration();

    CombatEngine.AddCombatant(this);

    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    let attackType = 1;
    let icon = 'i_attack';
    let isMelee = true;
    let isRanged = false;

    if(attackKey == 'b'){
      isMelee = false;
      isRanged = true;
    }

    if(typeof feat != 'undefined'){
      icon = feat.icon;
      //console.log('Attacking with feat', feat);
      if(attackKey == 'm'){
        attackKey = 'f';
        switch(feat.id){
          case 81:
          case 19:
          case 8:
            attackType = 1;
          break;
          case 83:
          case 17:
          case 28:
            attackType = 3;
          break;
          case 53:
          case 91:
          case 11:
            attackType = 2;
          break;
        }
      }else if(attackKey == 'b'){
        switch(feat.id){
          case 77:
          case 20:
          case 31:
            attackType = 3;
          break;
          case 82:
          case 18:
          case 29:
            attackType = 4;
          break;
          case 26:
          case 92:
          case 30:
            attackType = 2;
          break;
        }
      }
    }

    this.weaponPowered(true);

    this.combatData.lastAttackAction = ActionType.ActionPhysicalAttacks;
    this.combatData.lastAttackTarget = target;
    this.combatData.lastAttemptedAttackTarget = target;

    //Get random basic melee attack in combat with another melee creature that is targeting you
    if(attackKey == 'm'){
      if(this.combatData.lastAttackTarget?.combatData.lastAttackTarget == this && this.combatData.lastAttackTarget?.combatData.getEquippedWeaponType() == 1 && this.combatData.getEquippedWeaponType() == 1){
        attackKey = 'c';
        attackType = Math.round(Math.random()*4)+1;
      }
    }
    
    let animation = attackKey+weaponWield+'a'+attackType;
    if(isCutsceneAttack){
      animation = attackAnimation;
    }

    //console.log('Combat Animation', animation);

    let combatAction = {
      target: target,
      type: ActionType.ActionPhysicalAttacks,
      icon: icon,
      animation: animation,
      feat: feat,
      isMelee: isMelee,
      isRanged: isRanged,
      ready: false,
      isCutsceneAttack: isCutsceneAttack,
      attackResult: attackResult,
      damage: attackDamage
    };

    if(this.combatData.combatAction == undefined){
      this.combatData.combatAction = combatAction;
    }else{
      this.combatData.combatQueue.push(combatAction);
    }

    if(!isCutsceneAttack){
      this.actionQueue.clear();
      let action = new ActionPhysicalAttacks();
      action.setParameter(0, ActionParameterType.INT, 0);
      action.setParameter(1, ActionParameterType.DWORD, target.id);
      action.setParameter(2, ActionParameterType.INT, 1);
      action.setParameter(3, ActionParameterType.INT, 25);
      action.setParameter(4, ActionParameterType.INT, -36);
      action.setParameter(5, ActionParameterType.INT, 1);
      action.setParameter(6, ActionParameterType.INT, feat instanceof TalentFeat ? feat.id : 0);
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.INT, 4);
      action.setParameter(9, ActionParameterType.INT, 0);
      this.actionQueue.add(action);
    }

  }

  useTalentOnObject(talent: any, oTarget: ModuleObject){
    if(talent instanceof TalentObject){

      /*this.actionQueue.addFront({
        object: oTarget,
        spell: talent,
        type: ActionType.ActionCastSpell
      });*/
    let action;
    switch(talent.type){
      case 1: //FEAT
        action = new ActionPhysicalAttacks();
        action.setParameter(0, ActionParameterType.INT, 0);
        action.setParameter(1, ActionParameterType.DWORD, oTarget.id || ModuleObject.OBJECT_INVALID);
        action.setParameter(2, ActionParameterType.INT, 1);
        action.setParameter(3, ActionParameterType.INT, 25);
        action.setParameter(4, ActionParameterType.INT, -36);
        action.setParameter(5, ActionParameterType.INT, 1);
        action.setParameter(6, ActionParameterType.INT, talent.id);
        action.setParameter(7, ActionParameterType.INT, 0);
        action.setParameter(8, ActionParameterType.INT, 4);
        action.setParameter(9, ActionParameterType.INT, 0);
        this.actionQueue.add(action);
      break;
      case 2: //SKILL
        if(talent.id == 6){ //Security
          action = new ActionUnlockObject();
          action.setParameter(0, ActionParameterType.DWORD, oTarget.id || ModuleObject.OBJECT_INVALID);
          this.actionQueue.add(action);
        }
      break;
      case 0: //SPELL
        action = new ActionCastSpell();
        action.setParameter(0, ActionParameterType.INT, talent.id); //Spell Id
        action.setParameter(1, ActionParameterType.INT, -1); //
        action.setParameter(2, ActionParameterType.INT, 0); //DomainLevel
        action.setParameter(3, ActionParameterType.INT, 0);
        action.setParameter(4, ActionParameterType.INT, 0);
        action.setParameter(5, ActionParameterType.DWORD, oTarget.id || ModuleObject.OBJECT_INVALID); //Target Object
        action.setParameter(6, ActionParameterType.FLOAT, oTarget.position.x); //Target X
        action.setParameter(7, ActionParameterType.FLOAT, oTarget.position.y); //Target Y
        action.setParameter(8, ActionParameterType.FLOAT, oTarget.position.z); //Target Z
        action.setParameter(9, ActionParameterType.INT, 0); //ProjectilePath
        action.setParameter(10, ActionParameterType.INT, -1);
        action.setParameter(11, ActionParameterType.INT, -1);
        this.actionQueue.add(action);
      break;
    }

      //talent.useTalentOnObject(oTarget, this);
    }
  }

  playOverlayAnimation(NWScriptAnimId = -1){

    switch(NWScriptAnimId){
      case 123:
        this.overlayAnimation = 'diveroll';
      break;
    }

  }

  dialogPlayAnimation(anim = '', loop = false, speed = 1){
    this.dialogAnimation = { 
      //type: ActionType.ActionPlayAnimation,
      animation: anim,
      speed: speed || 1,
      time: loop ? -1 : 0
    };
    /*let currentAction = this.actionQueue[0];
    if(currentAction && currentAction.type == ActionType.ActionPlayAnimation){
      this.actionQueue[0] = { 
        type: ActionType.ActionPlayAnimation,
        animation: anim,
        speed: 1,
        time: loop ? -1 : 0
      };
    }else{
      this.actionQueue.addFront({ 
        type: ActionType.ActionPlayAnimation,
        animation: anim,
        speed: 1,
        time: loop ? -1 : 0
      });
    }*/
  }

  cancelCombat(){
    this.clearTarget();
    this.combatData.combatState = false;
    this.cancelExcitedDuration();
    this.overlayAnimation = undefined;
  }

  getDamageAnimation( attackAnim: any ){
    
    let attackAnimIndex = -1;

    let modeltype = this.getAppearance().modeltype;
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
        return damageAnim.name;
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cdamages';
    }
    //console.log(attackAnim);
    
    switch(attackAnim){
      case 'c2a1':
        return 'c2d1'
      case 'c2a2':
        return 'c2d2'
      case 'c2a3':
        return 'c2d3'
      case 'c2a4':
        return 'c2d4'
      case 'c2a5':
        return 'c2d5'
    }

    return 'g'+weaponWield+'d1';

  }

  getDodgeAnimation( attackAnim: any ){

    let attackAnimIndex = -1;

    let modeltype = this.getAppearance().modeltype;
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
          return damageAnim.name;
        }
      }
      
      let damageAnimIndex = combatAnimation['dodge'+weaponWield];
      let damageAnim = anims.getByID(damageAnimIndex);
      if(damageAnim && this.model.getAnimationByName(damageAnim.name)){
        //console.log('dodge anim', this.getName(), damageAnim.name)
        return damageAnim.name;
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cdodgeg';
    }
    //console.log(attackAnim);
    
    switch(attackAnim){
      case 'c2a1':
        return 'c2d1'
      case 'c2a2':
        return 'c2d2'
      case 'c2a3':
        return 'c2d3'
      case 'c2a4':
        return 'c2d4'
      case 'c2a5':
        return 'c2d5'
    }

    return 'g'+weaponWield+'g1';

  }

  getParryAnimation( attackAnim: any ){

    let attackAnimIndex = -1;

    let modeltype = this.getAppearance().modeltype;
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
        return damageAnim.name;
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return 'cdodgeg';
    }
    //console.log(attackAnim);
    switch(attackAnim){
      case 'c2a1':
        return 'c2p1'
      case 'c2a2':
        return 'c2p2'
      case 'c2a3':
        return 'c2p3'
      case 'c2a4':
        return 'c2p4'
      case 'c2a5':
        return 'c2p5'
    }

    return 'g'+weaponWield+'g1';
    
  }

  getDeflectAnimation(){
    let attackKey = this.getCombatAnimationAttackType();
    let weaponWield = this.getCombatAnimationWeaponType();
    //console.log('getDamageAnimation', 'g'+weaponWield+'d1');
    return 'g'+weaponWield+'n1';
  }

  getCombatAnimationAttackType(){
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
    let bothHands = (lWeapon instanceof ModuleItem) && (rWeapon instanceof ModuleItem);

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
    let appearance = this.getAppearance();

    let rhSounds, lhSounds;

    if(this.equipment.RIGHTHAND)
      rhSounds = TwoDAManager.datatables.get('weaponsounds').rows[this.equipment.RIGHTHAND.getBaseItem().powereditem];

    if(this.equipment.LEFTHAND)
      lhSounds = TwoDAManager.datatables.get('weaponsounds').rows[this.equipment.LEFTHAND.getBaseItem().powereditem];


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
        //console.log('Attack Hit Event');

        if(this.combatData.combatAction && this.combatData.combatAction.hits && this.combatData.combatAction.damage){
          this.combatData.combatAction.target.damage(this.combatData.combatAction.damage, this);
        }else{
          //console.error('playEvent Hit:', {hit: this.combatAction.hits, damage: this.combatAction.damage});
        }

        if(this.equipment.RIGHTHAND){
          if(this.equipment.RIGHTHAND){
            this.audioEmitter.PlaySound(rhSounds['leather'+Math.round(Math.random()*1)]);
          }
        }
      break;
    }
  }

  getIdleAnimation(){
    let modeltype = this.getAppearance().modeltype;

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
        this.animState = ModuleCreatureAnimState.FLOURISH;
        this.weaponPowered(true);
      }
    }
  }

  weaponPowered(on = false){

    let weaponType = this.getCombatAnimationWeaponType();
    let isSimple = this.isSimpleCreature();
    if(isSimple || !weaponType)
      return;

    //let modeltype = this.getAppearance().modeltype;
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
    let modeltype = this.getAppearance().modeltype;

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
    let modeltype = this.getAppearance().modeltype;

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
    let radius = parseInt(this.getAppearance().hitdist);
    let closest = undefined;
    let distance = 0;
    let origin = this.position.clone();

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
    return this.position.clone();
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
      GameState.getCurrentPlayer().actionDialogObject(this, this.GetConversation(), false, undefined, undefined, true);
    }
    
  }

  //---------------//
  // SCRIPT EVENTS
  //---------------//

  onCombatRoundEnd(){
    //Check to see if the current combatAction is running a TalentObject
    if(this.combatData.combatAction && (this.combatData.combatAction.spell instanceof TalentObject)){
      //this.combatAction.spell.talentCombatRoundEnd(this.combatAction.target, this);
    }
    
    this.combatData.combatAction = undefined;

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
    CombatEngine.AddCombatant(this);
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
    CombatEngine.AddCombatant(this);
    
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

  resistForce(oCaster: ModuleObject){
    if(oCaster instanceof ModuleCreature){
      //https://gamefaqs.gamespot.com/boards/516675-star-wars-knights-of-the-old-republic/62811657
      //1d20 + their level vs. a DC of your level plus 10
      let roll = CombatEngine.DiceRoll(1, 'd20', this.getTotalClassLevel());
      return (roll > 10 + oCaster.getTotalClassLevel());
    }
    return 0;
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
          if(this.getAppearance().modeltype != 'S'){
            if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
              this.model.rhand.add(this.equipment.RIGHTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
      case ModuleCreatureArmorSlot.LEFTHAND:
        try{
          if(this.getAppearance().modeltype != 'S' && this.getAppearance().modeltype != 'L'){
            if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
              this.model.lhand.add(this.equipment.LEFTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
    }
  }

  getInventory(){
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

  getAppearance(){
    const appearance2DA = TwoDAManager.datatables.get('appearance');
    if(appearance2DA){
      let eDisguise = this.getEffect(GameEffectType.EffectDisguise);
      if(eDisguise){
        return appearance2DA.rows[eDisguise.getInt(0)];
      }else{
        return appearance2DA.rows[this.appearance] || appearance2DA.rows[0];
      }
    }
  }

  getRunSpeed(){
    if(this.getWalkRateId() == 7){
      return parseFloat(this.getAppearance().rundist)
    }
    const creaturespeed2DA = TwoDAManager.datatables.get('creaturespeed');
    if(creaturespeed2DA){
      return parseFloat(creaturespeed2DA.rows[this.getWalkRateId()].runrate);
    }
  }

  getWalkSpeed(){
    if(this.getWalkRateId() == 7){
      return parseFloat(this.getAppearance().walkdist)
    }
    const creaturespeed2DA = TwoDAManager.datatables.get('creaturespeed');
    if(creaturespeed2DA){
      return parseFloat(creaturespeed2DA.rows[this.getWalkRateId()].walkrate);
    }
  }

  getMovementSpeed(){
    return (this.walk ? this.getWalkSpeed() : this.getRunSpeed()) * this.movementSpeed;
  }

  getHitDistance(){
    return parseFloat(this.getAppearance().hitdist);
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
    return this.getAppearance().modeltype === 'S' || this.getAppearance().modeltype === 'L';
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
    return parseFloat(this.getAppearance()['perspace']);
  }

  Load( onLoad: Function ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: ResourceTypes.utc,
        onLoad: (gff: GFFObject) => {
          this.template.Merge(gff);
          this.InitProperties( () => {
            FactionManager.AddCreatureToFaction(this);
            //this.LoadEquipment( () => {
              if(onLoad != null)
                onLoad(this.template);
            //});
          });
        },
        onFail: () => {
          console.error('Failed to load character template');
          if(onLoad != null)
            onLoad(undefined);
        }
      });
    }else{
      this.InitProperties( () => {
        FactionManager.AddCreatureToFaction(this);
        //this.LoadEquipment( () => {
          //We already have the template (From SAVEGAME)
          if(onLoad != null)
            onLoad(this.template);
        //});
      });
    }
  }

  LoadScripts (onLoad: Function){

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
    let loop = new AsyncLoop({
      array: keys,
      onLoop: async (key: string, asyncLoop: AsyncLoop) => {
        let _script = this.scripts[key];
        if(_script != '' && !(_script instanceof NWScriptInstance)){
          //let script = await NWScript.Load(_script);
          this.scripts[key] = await NWScript.Load(_script);
          //this.scripts[key].name = _script;
          asyncLoop.next();
        }else{
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  LoadModel ( onLoad?: Function ){

    this.isReady = false;

    //this.LoadEquipment( () => {
      this.LoadBody( () => {
        this.LoadHead( () => {
          //TextureLoader.LoadQueue(() => {
            this.isReady = true;
            this.updateCollision(0.0000000000000000000001);
            this.update(0.0000000000000000000001);
            if(onLoad != null)
              onLoad(this.model);
          //});
        });
      });
    //});

  }

  LoadBody( onLoad: Function ){
    let appearance = this.getAppearance();
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
          match = match[0];
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
      if(typeof onLoad === 'function')
        onLoad();
    }else{
      GameState.ModelLoader.load({
        file: this.bodyModel,
        onLoad: (mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            castShadow: true,
            receiveShadow: true,
            textureVar: this.bodyTexture,
            isHologram: this.isHologram,
            context: this.context,
            onComplete: (model: OdysseyModel3D) => {
              let scene = null, position = null, rotation = null;

              if(this.model instanceof OdysseyModel3D && this.model.parent){
                scene = this.model.parent;
                //position = this.model.position;
                //rotation = this.model.rotation;

                if(this.head && this.head.parent){
                  this.head.parent.remove(this.head);
                  this.head.dispose();
                }

                //Remove weapons from model before dispose
                try{
                  if(this.model.lhand instanceof OdysseyObject3D){
                    if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
                      this.model.lhand.remove(this.equipment.LEFTHAND.model);
                    }
                  }
                }catch(e){}
                
                //Remove weapons from model before dispose
                try{
                  if(this.model.rhand instanceof OdysseyObject3D){
                    if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
                      this.model.rhand.remove(this.equipment.RIGHTHAND.model);
                    }
                  }
                }catch(e){}

                try{
                  this.model.dispose();
                }catch(e){}

                try{
                  if(scene)
                    scene.remove(this.model);
                }catch(e){}
              }

              this.model = model;
              this.model.userData.moduleObject = this;

              try{
                if(this.model.lhand instanceof OdysseyObject3D){
                  if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof OdysseyModel3D){
                    this.model.lhand.add(this.equipment.LEFTHAND.model);
                  }
                }
              }catch(e){
                console.error('ModuleCreature', e);
              }

              try{
                if(this.model.rhand instanceof OdysseyObject3D){
                  if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
                    this.model.rhand.add(this.equipment.RIGHTHAND.model);
                  }
                }
              }catch(e){
                console.error('ModuleCreature', e);
              }

              if(scene){
                scene.add( this.model );
                //this.model.position.copy(position);
                //this.model.rotation.set(rotation.x, rotation.y, rotation.z);
              }

              this.position = this.model.position.copy(this.position);
              this.model.rotation.copy(this.rotation);
              this.model.quaternion.copy(this.quaternion);

              if(typeof onLoad === 'function')
                onLoad();

              this.model.disableMatrixUpdate();

            }
          });
        }
      });
    }
  }

  LoadHead( onLoad: Function ){
    let appearance = this.getAppearance();
    let headId = appearance.normalhead.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.headModel = undefined;
    if(headId != '****' && appearance.modeltype == 'B'){
      const heads2DA = TwoDAManager.datatables.get('heads');
      if(heads2DA){
        let head = heads2DA.rows[headId];
        this.headModel = head.head.replace(/\0[\s\S]*$/g,'').toLowerCase();
        GameState.ModelLoader.load({
          file: this.headModel,
          onLoad: (mdl: OdysseyModel) => {
            OdysseyModel3D.FromMDL(mdl, {
              context: this.context,
              castShadow: true,
              receiveShadow: true,
              isHologram: this.isHologram,
              onComplete: (head: OdysseyModel3D) => {
                try{

                  if(this.head instanceof OdysseyModel3D && this.head.parent){
                    this.head.parent.remove(this.head);
                    this.head.dispose();
                  }

                  this.head = head;
                  this.head.moduleObject = this;
                  this.model.headhook.head = head;
                  this.model.headhook.add(head);

                  try{
                    if(this.head.gogglehook instanceof THREE.Object3D){
                      if(this.equipment.HEAD instanceof ModuleItem && this.equipment.HEAD.model instanceof OdysseyModel3D){
                        this.head.gogglehook.add(this.equipment.HEAD.model);
                      }
                    }
                  }catch(e){
                    console.error('ModuleCreature', e);
                  }
                  
                  //this.model.nodes = new Map(this.model.nodes, head.nodes);

                  if(typeof onLoad === 'function')
                    onLoad();

                  this.head.disableMatrixUpdate();
                }catch(e){
                  console.error(e);
                  if(typeof onLoad === 'function')
                    onLoad();
                }
              }
            });
          }
        });
      }else{
        if(typeof onLoad === 'function')
          onLoad();
      }
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
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
      item.LoadModel( () => {
        switch(slot){
          case ModuleCreatureArmorSlot.ARMOR:
            this.equipment.ARMOR = item;
            this.LoadModel( () => {
              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case ModuleCreatureArmorSlot.RIGHTHAND:
            this.equipment.RIGHTHAND = item;
            item.LoadModel( () => {

              if(item.model instanceof OdysseyModel3D)
                this.model.rhand.add(item.model);

              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case ModuleCreatureArmorSlot.LEFTHAND:
            this.equipment.LEFTHAND = item;
            item.LoadModel( () => {
              if(item.model instanceof OdysseyModel3D)
                this.model.lhand.add(item.model);

              if(typeof onLoad == 'function')
                onLoad();
            });
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
      }
    }catch(e){
      console.error('unequipItem', e);
    }
  }

  LoadEquipment( onLoad: Function){
    if(typeof onLoad === 'function')
      onLoad();
    /*this.ParseEquipmentSlots( () => {
      if(typeof onLoad === 'function')
        onLoad();
    });*/
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
      case ModuleCreatureArmorSlot.BELT:
        return this.equipment.BELT;
      break;
      case ModuleCreatureArmorSlot.RIGHTHAND:
        return this.equipment.RIGHTHAND;
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


  //Deprecated
  /*GetEquippedSlot(slot = 0){
    let equipment = this.getEquip_ItemList();
    for(let i = 0; i < equipment.length; i++){
      let equip = equipment[i];
      let type = equip.GetType();
      this.LoadEquipmentItem({
        item: new ModuleItem(GFFObject.FromStruct(equip, equip.GetType())),
        Slot: type,
        onLoad: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        },
        onError: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        }
      });
    }
  }*/

  LoadEquipmentItem(args: any = {}){

    args = Object.assign({
      item: new GFFObject(),
      Slot: 0x01,
      onLoad: null,
      onError: null
    }, args);
    //console.log('LoadEquipmentItem', args);
    let uti = args.item;

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
    
    uti.Load( () => {
      uti.LoadModel( () => {
        if(args.Slot == ModuleCreatureArmorSlot.RIGHTHAND || args.Slot == ModuleCreatureArmorSlot.LEFTHAND){
          uti.model.playAnimation('off', true);
        }
        if(typeof args.onLoad == 'function')
          args.onLoad();
      });
    });

  }

  InitProperties( onLoad?: Function ){

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

    if(this.template.RootNode.HasField('Appearance_Type'))
      this.appearance = this.template.GetFieldByLabel('Appearance_Type').GetValue();

    if(this.template.RootNode.HasField('Animation'))
      this.animState = this.template.GetFieldByLabel('Animation').GetValue();

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

    if(this.template.RootNode.HasField('Conversation'))
      this.conversation = this.template.GetFieldByLabel('Conversation').GetValue();

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
      this.faction = this.template.GetFieldByLabel('FactionID').GetValue();
      if((this.faction & 0xFFFFFFFF) == -1){
        this.faction = 0;
      }
    }

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
      this.pm_IsDisguised = this.template.RootNode.GetFieldByLabel('PM_IsDisguised').GetValue();

    if(this.template.RootNode.HasField('EffectList')){
      let effects = this.template.RootNode.GetFieldByLabel('EffectList').GetChildStructs() || [];
      for(let i = 0; i < effects.length; i++){
        let effect = GameEffect.EffectFromStruct(effects[i]);
        if(effect instanceof GameEffect){
          effect.setAttachedObject(this);
          //console.log('attached');
          this.effects.push(effect);
          //this.addEffect(effect);
        }
      }
    }

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
          case ModuleCreatureArmorSlot.RIGHTHAND:
            this.equipment.RIGHTHAND = equipped_item;
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
        }
      }
    }

    this.ParseEquipmentSlots( () => {

      if(this.template.RootNode.HasField('ItemList')){

        let inventory = this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs();
        let loop = new AsyncLoop({
          array: inventory,
          onLoop: (item: GFFStruct, asyncLoop: AsyncLoop) => {
            this.LoadItem(GFFObject.FromStruct(item), () => {
              asyncLoop.next();
            });
          }
        });
        loop.iterate(() => {
          this.LoadSoundSet(onLoad);
        });
  
      }else{
        this.LoadSoundSet(onLoad);
      }

    });

    //ActionList
    if(this.template.RootNode.HasField('ActionList')){
      let actionStructs = this.template.RootNode.GetFieldByLabel('ActionList').GetChildStructs();
      for(let i = 0, len = actionStructs.length; i < len; i++){
        let action = Action.FromStruct(actionStructs[i]);
        if(action instanceof Action){
          this.actionQueue.add(action);
        }
      }
    }

    //PerceptionList
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

    this.initialized = true;

  }

  ParseEquipmentSlots( onLoad: Function ){

    let loop = new AsyncLoop({
      array: Object.keys(this.equipment),
      onLoop: (slot_key: string, asyncLoop: AsyncLoop) => {
        let slot = (this.equipment as any)[slot_key];
        if(slot instanceof ModuleItem){
          slot.setPossessor(this);
          slot.Load( () => {
            slot.LoadModel( () => {
              if(slot_key == 'RIGHTHAND' || slot_key == 'LEFTHAND'){
                slot.model.playAnimation('off', true);
              }
              asyncLoop.next();
            });
          });
        }else{
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  LoadSoundSet( onLoad: Function ){

    const soundset2DA = TwoDAManager.datatables.get('soundset');
    if(soundset2DA){
      let ss_row = soundset2DA.rows[this.soundSetFile];
      if(ss_row){
        ResourceLoader.loadResource(ResourceTypes.ssf, ss_row.resref.toLowerCase(), (data: Buffer) => {
          this.ssf = new SSFObject(data);
          //SSF found
          if(typeof onLoad === 'function')
            onLoad();
        }, () => {
          //SSF not found
          if(typeof onLoad === 'function')
            onLoad();
        });
      }else{
        //SSF entry not found
        if(typeof onLoad === 'function')
          onLoad();
      }
    }else{
      //SSF entry not found
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  LoadItem( template: GFFObject, onLoad: Function ){

    let item = new ModuleItem(template);
    item.InitProperties();
    item.Load( () => {
      let hasItem = this.getItem(item.getTag());
      if(hasItem){
        hasItem.setStackSize(hasItem.getStackSize() + 1);
        if(typeof onLoad === 'function')
          onLoad(hasItem);
      }else{
        this.inventory.push(item);
        if(typeof onLoad === 'function')
          onLoad(item);
      }
    });

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

    
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Mod_CommntyName') ).SetValue('Bad StrRef');
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Mod_IsPrimaryPlr') ).SetValue( this == GameState.player ? 1 : 0);
    
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_FirstName') )
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Mod_LastName') )

    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'AIState') ).SetValue(0);
    let actionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Age') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AmbientAnimState') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Animation') ).SetValue(this.animState);
    //gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Appearance_Head') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).SetValue(this.getAppearance().__index);
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
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Conversation') ).SetValue(this.conversation);
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

    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'FactionID') ).SetValue(this.faction);

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
