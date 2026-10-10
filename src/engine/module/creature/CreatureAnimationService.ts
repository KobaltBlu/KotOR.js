import * as THREE from 'three';
import { ActionType } from '@core/enums/actions/ActionType';
import { AnimationPlaybackMode } from '@core/enums/animation/AnimationPlaybackMode';
import { CombatMode } from '@core/enums/combat/CombatMode';
import { GameEngineType } from '@core/enums/engine/GameEngineType';
import { GameEffectSetStateType } from '@core/enums/effects/GameEffectSetStateType';
import { ModuleCreatureAmbientState } from '@core/enums/module/ModuleCreatureAmbientState';
import { ModuleCreatureAnimState, isTransientCombatAnimIndex } from '@core/enums/module/ModuleCreatureAnimState';
import { LIPObject } from '@core/resource/LIPObject';
import { Utility } from '@core/utility/Utility';
import { LipSyncPlayer } from '@engine/audio/LipSyncPlayer';
import { spawnWorldImpactVfx } from '@engine/combat/ranged-impact-vfx';
import { animForSetState, getActiveSetStateType } from '@engine/effects/set-state';
import {
  isAnimation2DAFlagSet,
  isStationaryAnimation,
  isPauseAnimation,
  isWalkingAnimation,
  isRunningAnimation,
  isHideEquippedItemsAnimation,
  isParryAnimation,
  isDialogAnimation,
  isPlayOutOfPlaceServerId,
} from '@engine/module/animation/animation2daFlag';
import {
  combatAnimationAttackKey,
  combatAnimationWeaponDigit,
  combatReactionClipDigit,
} from '@engine/module/animation/combat-wield-digit';
import type { CreatureAnimationContext } from '@engine/module/animation/CreatureAnimationContext';
import { resolveCreatureAnimation } from '@engine/module/animation/resolveCreatureAnimation';
import { resolveDebilitatedCreatureAnimation } from '@engine/module/animation/resolveDebilitatedCreatureAnimation';
import {
  resolvePlaybackMode,
  resolveOverlayStopFlags,
  resolveOverlayStartFlags,
} from '@engine/module/animation/resolvePlaybackMode';
import { applyHeadTrackingToHturn, stripHeadTrackingFromHturn } from '@engine/module/creature/applyHeadTrackingToHturn';
import type { Item } from '@engine/module/Item';
import { OdysseyModelAnimation } from '@engine/odyssey';
import { coalesceDriveAnimRun, coalesceDriveAnimWalk } from '@engine/pathfinding/movement-rate';
import { isForcePushLocoActive } from '@engine/pathfinding/force-push-loco';
import { OdysseyModel3D } from '@engine/render/three/odyssey';
import type { SWAnimation } from '@engine/rules/SWAnimation';
import { EngineMode } from '@engine/enums/engine/EngineMode';
import { GameState } from '@engine/runtime/GameState';
import type { Creature } from '@engine/module/Creature';
import { GameObject } from '@engine/module/GameObject';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class CreatureAnimationService {
  constructor(
    private readonly host: Creature,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  updateAnimationState(){

    if(!(this.host.model instanceof OdysseyModel3D))
      return;

    let currentAnimation = this.host.model.getAnimationName();

    // Overlay runs concurrently with drive — never early-return past locomotion.
    if(this.host.overlayAnimationState.animationName && !this.host.isDead()){
      const overlayOk = this.host.overlayAnimationState.animation
        && isAnimation2DAFlagSet(this.host.overlayAnimationState.animation.overlay);
      if(overlayOk){
        const overlayPlaying = this.host.model.animationManager?.overlayAnimation?.name?.toLowerCase()
          === this.host.overlayAnimationState.animationName.toLowerCase();
        if(!this.host.overlayAnimationState.started){
          this.host.overlayAnimationState.started = true;
          this.host.applyOverlayToBodyAndHead(
            this.host.overlayAnimationState.animationName,
            this.host.overlayAnimationState.animation
          );
        }else if(!overlayPlaying && !isAnimation2DAFlagSet(this.host.overlayAnimationState.animation.looping)){
          this.host.stopOverlayAnimation();
        }
      }else if(this.host.overlayAnimationState.started){
        this.host.stopOverlayAnimation();
      }
    }

    // Dialog listen/talk owns the pose while stationary (AnimationDialog drive block).
    if(
      !this.host.isDead() &&
      !this.host.speed &&
      (
        ((getDefaultRuntimeContext().getMode() == EngineMode.DIALOG) && this.host.dialogAnimation) ||
        isDialogAnimation(this.host.animationState.animation)
      )
    ){
      return;
    }

    if(this.host.animationState.animation){
      const desiredName = this.host.animationState.animation.name?.toLowerCase();
      // During base crossfade, oldest run may still be on the stack; treat desired
      // as playing if any active base run has that name (not only getAnimationName).
      const playingOnStack =
        !!desiredName &&
        !!this.host.model.animationManager?.hasActiveBaseNamed?.(desiredName);
      const nameMatches =
        !!desiredName &&
        currentAnimation?.toLowerCase() === desiredName;

      if(!nameMatches && !playingOnStack){
        if(!this.host.animationState.started){
          this.host.animationState.started = true;
          // Drive loco must loop — animations.2da often leaves walk/run as fireforget=0
          // looping≠1 (e.g. walkSS/runSS), which would end the clip and freeze/slide.
          const isDriveLoco =
            this.host.animationState.index == ModuleCreatureAnimState.RUNNING ||
            this.host.animationState.index == ModuleCreatureAnimState.WALKING ||
            this.host.animationState.index == ModuleCreatureAnimState.WALKING_BACK;
          // Living NPCs holding ActionPlayAnimation(DEAD) need a looping corpse pose.
          const scriptedDeadPose =
            !this.host.isDead() &&
            (
              this.host.animationState.index == ModuleCreatureAnimState.DEAD ||
              this.host.animationState.index == ModuleCreatureAnimState.DEAD1
            );
          let aLooping =
            isDriveLoco ||
            scriptedDeadPose ||
            (
              !this.host.animationState.animation.fireforget &&
              this.host.animationState.animation.looping
            );
          this.host.model.playAnimation(this.host.animationState.animation.name?.toLowerCase(), aLooping);
          if(this.host.model.animationManager?.currentAnimationState){
            this.host.model.animationManager.currentAnimationState.speed =
              this.host.animationState.speed < 0 ? this.host.animationState.speed : (this.host.animationState.speed || 1);
          }
          this.host.syncAnimationFlagSideEffects(this.host.animationState.animation, this.host.animationState.index);
        }else if(
          this.host.animationState.index == ModuleCreatureAnimState.DIE ||
          this.host.animationState.index == ModuleCreatureAnimState.DIE1
        ){
          // DIE fireforget finished → DEAD (corpses and living Min1HP scripted defeat).
          // SetAnimation keeps looping DEAD while DIE FAF plays; we promote here.
          const deadPose =
            this.host.animationState.index == ModuleCreatureAnimState.DIE1
              ? ModuleCreatureAnimState.DEAD1
              : ModuleCreatureAnimState.DEAD;
          this.host.setAnimationState(deadPose);
          if(this.host.isDead() || this.host.willDestroy){
            this.host.deathAnimationPlayed = true;
          }
        }else if(
          this.host.animationState.index == ModuleCreatureAnimState.DEAD ||
          this.host.animationState.index == ModuleCreatureAnimState.DEAD1
        ){
          // Scripted living dead pose — re-loop; never fall through to READY/PAUSE.
          this.host.animationState.started = false;
        }else if(this.host.combatData.combatState){
          // GetPauseReadyAnimation while engaged — don't drop to out-of-combat pause.
          if(this.host.animationState.index == ModuleCreatureAnimState.READY){
            this.host.animationState.started = false;
          }else{
            this.host.setAnimationState(ModuleCreatureAnimState.READY);
          }
        }else if(getDefaultRuntimeContext().getMode() == EngineMode.DIALOG && this.host.animationState.index != ModuleCreatureAnimState.PAUSE){
          // SetDialogAnimations owns the pose until the next entry — re-apply
          // looping talk/listen/READY instead of falling through to idle pause.
          this.host.animationState.started = false;
        }else if(
          (
            this.host.animationState.index == ModuleCreatureAnimState.RUNNING ||
            this.host.animationState.index == ModuleCreatureAnimState.WALKING ||
            this.host.animationState.index == ModuleCreatureAnimState.WALKING_BACK
          ) &&
          (
            (this.host.playerControl?.lastAnimMoveSpeed ?? 0) > 0 ||
            this.host.speed > 0
          )
        ){
          // Still driving locomotion — re-play clip; never demote to PAUSE (freeze/slide).
          this.host.animationState.started = false;
        }else if(!isStationaryAnimation(this.host.animationState.animation)){
          // Non-stationary clip finished while standing — re-assert pause/ready.
          this.host.setAnimationState(
            this.host.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE
          );
        }else if(
          isPauseAnimation(this.host.animationState.animation) &&
          (
            this.host.animationState.index == ModuleCreatureAnimState.PAUSE ||
            this.host.animationState.index == ModuleCreatureAnimState.PAUSE_INJ ||
            this.host.animationState.index == ModuleCreatureAnimState.READY
          )
        ){
          // Already on a pause-class pose — re-loop instead of redundant set.
          this.host.animationState.started = false;
        }else{
          this.host.setAnimationState(ModuleCreatureAnimState.PAUSE);
        }
      }else if(playingOnStack && !this.host.animationState.started){
        // Clip already on stack (e.g. crossfade) — mark started without re-play
        this.host.animationState.started = true;
      }
    }else if(this.host.isDead() || this.host.willDestroy){
      if(
        this.host.animationState.index != ModuleCreatureAnimState.DEAD &&
        this.host.animationState.index != ModuleCreatureAnimState.DEAD1
      ){
        this.host.setAnimationState(ModuleCreatureAnimState.DEAD);
        this.host.deathAnimationPlayed = true;
      }
    }else{
      if(!this.host.animationMissingLogged){
        this.host.animationMissingLogged = true;
        // console.error('Animation Missing', this.host.getTag, this.host.getName, this.host.animationState);
      }
      this.host.setAnimationState(
        this.host.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE
      );
    }

  }

  primeAnimationPose(){
    if(!(this.host.model instanceof OdysseyModel3D)){
      return;
    }
    if(!this.host.animationState.animation){
      this.host.setAnimationState(
        this.host.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE
      );
    }
    this.host.updateAnimationState();
    // updateAnimationState may only setAnimationState (started=false) when the
    // clip was missing — drive play + pose on a second pass.
    if(this.host.animationState.animation && !this.host.animationState.started){
      this.host.updateAnimationState();
    }
    if(this.host.model.bonesInitialized){
      this.host.model.animateFrame = true;
      this.host.model.update(0.0000000000000000000001);
    }
  }

  /**
   * Dialog listen/talk clip ownership while living and not mid-locomotion.
   * Caller must skip when dead (death transition owns that branch).
   */
  updateDialogAnimation(){
    if(this.host.dialogAnimation && (getDefaultRuntimeContext().getMode() == EngineMode.DIALOG) && (!this.host.action || this.host.action.type != ActionType.ActionPlayAnimation)){
      if(this.host.model){

        if(!this.host.speed){

          let _animIsValid = (this.host.dialogAnimation.animation instanceof OdysseyModelAnimation);
          if(_animIsValid){
            let _animIsPlaying = (this.host.model.animationManager.currentAnimation == this.host.dialogAnimation.animation);
            if(!_animIsPlaying && !this.host.dialogAnimation.started){
              let _newAnim = this.host.dialogAnimation.animation;
              if(_newAnim instanceof OdysseyModelAnimation){
                this.host.model.playAnimation( _newAnim, this.host.dialogAnimation.data.looping );
                this.host.dialogAnimation.started = true;
              }else{
                //Kill the dialogAnimation if the animation isn't valid
                this.host.dialogAnimation = null;
              }
            }else if(!_animIsPlaying && this.host.dialogAnimation.started){
              //Kill the dialogAnimation if it has already played
              this.host.dialogAnimation = null;
            }
          }else{
            //Kill the dialogAnimation if the animation isn't valid
            this.host.dialogAnimation = null;
          }

        }

      }else{
        //Kill the dialogAnimation if there is no model to animate?
        this.host.dialogAnimation = null;
      }
    }else{
      this.host.dialogAnimation = null;
    }
  }

  updateDebilitatedPose(){
    if(!this.host.isDebilitated()) return;
    this.host.force = 0;
    this.host.speed = 0;
    if(!this.host.combatData.combatState){
      const state = getActiveSetStateType(this.host);
      this.host.setAnimationState(
        state > 0 ? animForSetState(state) : ModuleCreatureAnimState.PAUSE
      );
    }
  }

  /**
   * IDLE == PAUSE (10000); promote out-of-combat idle to combat ready while engaged.
   * Also honor animations.2da pause flag on the current clip.
   */
  promoteIdleCombatAnimation(){
    if(this.host.combatMode === CombatMode.COUNTERSPELL){
      if(
        this.host.animationState.index == ModuleCreatureAnimState.PAUSE ||
        this.host.animationState.index == ModuleCreatureAnimState.READY ||
        isPauseAnimation(this.host.animationState.animation)
      ){
        this.host.setAnimationState(ModuleCreatureAnimState.CASTOUT1_LP);
      }
    }else if(
      this.host.combatData.combatState &&
      (
        this.host.animationState.index == ModuleCreatureAnimState.PAUSE ||
        isPauseAnimation(this.host.animationState.animation)
      )
    ){
      this.host.setAnimationState(ModuleCreatureAnimState.READY);
    }else if(
      !this.host.combatData.combatState &&
      isPauseAnimation(this.host.animationState.animation) &&
      this.host.isInjured() &&
      this.host.animationState.index != ModuleCreatureAnimState.PAUSE_INJ
    ){
      this.host.setAnimationState(ModuleCreatureAnimState.PAUSE_INJ);
    }
  }

  /**
   * Distance/fog animate-frame cull, body playback, lip sync, and head tracking.
   * Caller must only invoke when model bones are initialized.
   */
  updateModelPlayback(delta = 0){
    if(!(this.host.model instanceof OdysseyModel3D) || !this.host.model.bonesInitialized){
      return;
    }

    //BEGIN: Animation Optimization
    this.host.model.animateFrame = true;
    const runtime = getDefaultRuntimeContext();
    const inParty = (runtime.getParty?.() ?? []).indexOf(this.host) != -1;
    // Last-frame cull (visibility sync runs after creature ticks). Party,
    // dialog, cutscene, and TSL forceAlwaysUpdate keep posing.
    if(
      !this.host.forceAlwaysUpdate &&
      !this.host.model.visible &&
      !inParty &&
      !this.host.cutsceneMode &&
      runtime.getMode() != EngineMode.DIALOG
    ){
      this.host.model.animateFrame = false;
    }
    //If the object is further than 50 meters, animate every other frame
    if(this.host.model.animateFrame && this.host.distanceToCamera > 50){
      this.host.model.animateFrame = this.host.model.oddFrame;
    }

    if(this.host.model.animateFrame){
      //If we can animate and there is fog, make sure the distance isn't greater than the far point of the fog effect
      if(!inParty && this.host.context.scene.fog){
        if(this.host.distanceToCamera >= this.host.context.scene.fog.far){
          this.host.model.animateFrame = false;
          //If the object is past the near point, and the near point is greater than zero, animate every other frame
        }else if(this.host.context.scene.fog.near && this.host.distanceToCamera >= this.host.context.scene.fog.near){
          this.host.model.animateFrame = this.host.model.oddFrame;
        }
      }
    }
    //END: Animation Optimization

    // Strip look before anim so blend does not start from a looked pose.
    if(this.host.model.hturn_g){
      stripHeadTrackingFromHturn(this.host.model.hturn_g);
    }

    if(runtime.getMode() != EngineMode.DIALOG){
      const locomoting =
        this.host.animationState.index == ModuleCreatureAnimState.RUNNING ||
        this.host.animationState.index == ModuleCreatureAnimState.WALKING ||
        this.host.animationState.index == ModuleCreatureAnimState.WALKING_BACK;
      // Walk-back reuses walk rows with reverse playback.
      const playback =
        (locomoting ? this.host.animSpeed : this.host.movementSpeed) *
        (this.host.animationState.index == ModuleCreatureAnimState.WALKING_BACK ? -1 : 1);
      this.host.model.update(playback * delta);
      if(this.host.lipObject instanceof LIPObject){
        LipSyncPlayer.update(this.host.lipObject, delta, this.host.model);
      }
    }else{
      this.host.model.update( delta );
      if(this.host.lipObject instanceof LIPObject){
        LipSyncPlayer.update(this.host.lipObject, delta, this.host.model);
      }
      if(this.host.cutsceneMode && this.host.model){
        for(let i = 0, len = this.host.model.skins.length; i < len; i++){
          this.host.model.skins[i].frustumCulled = false;
        }
      }
    }

    this.host.updateHeadTracking(delta);
  }

  /**
   * Stationary turn animations (body turn when idle/pause/ready; not head look).
   * Only while the current clip is stationary-classified.
   */
  updateStationaryTurnAnimation(){
    const stationaryTurnStates = [
      ModuleCreatureAnimState.IDLE,
      ModuleCreatureAnimState.PAUSE,
      ModuleCreatureAnimState.READY,
      ModuleCreatureAnimState.TURN_LEFT,
      ModuleCreatureAnimState.TURN_RIGHT
    ];
    const currentStationary = isStationaryAnimation(this.host.animationState.animation);
    if(
      this.host.turning !== 0 &&
      currentStationary &&
      stationaryTurnStates.includes(this.host.animationState.index)
    ){
      const wantTurnLeft = this.host.turning < 0;
      if(wantTurnLeft && this.host.animationState.index !== ModuleCreatureAnimState.TURN_LEFT){
        this.host.setAnimationState(ModuleCreatureAnimState.TURN_LEFT);
      }else if(!wantTurnLeft && this.host.animationState.index !== ModuleCreatureAnimState.TURN_RIGHT){
        this.host.setAnimationState(ModuleCreatureAnimState.TURN_RIGHT);
      }
    }else if(this.host.turning === 0 && (this.host.animationState.index === ModuleCreatureAnimState.TURN_LEFT || this.host.animationState.index === ModuleCreatureAnimState.TURN_RIGHT)){
      this.host.setAnimationState(this.host.combatData.combatState ? ModuleCreatureAnimState.READY : ModuleCreatureAnimState.PAUSE);
    }
  }

  private getAnimationResolveContext(): CreatureAnimationContext {
    return {
      simple: this.host.isSimpleCreature(),
      injured: this.host.isInjured(),
      poisoned: this.host.isPoisoned(),
      diseased: this.host.isDiseased(),
      weaponType: this.host.getCombatAnimationWeaponType(),
      gameKey: getDefaultRuntimeContext().getGameKey() === 'k2'
        ? GameEngineType.TSL
        : GameEngineType.KOTOR,
    };
  }

  animationConstantToAnimation( animation_constant = 10000 ): SWAnimation | undefined {
    const animations = getDefaultRuntimeContext().getSWRuleSet?.()?.animations;

    const debilitated = resolveDebilitatedCreatureAnimation(
      this.host.getDebilitatedState(),
      {
        simple: this.host.isSimpleCreature(),
        fp_push_played: this.host.fp_push_played,
        fp_land_played: this.host.fp_land_played,
        fp_getup_played: this.host.fp_getup_played,
      },
      animations,
    );
    if(debilitated !== undefined){
      return debilitated;
    }

    return resolveCreatureAnimation(
      animation_constant,
      this.getAnimationResolveContext(),
      animations,
    );
  }

  setAnimationState(animState: ModuleCreatureAnimState){
    if(!animState){ return; }

    // SetAnimation — insert DIE/DIE1 before looping DEAD.
    animState = (this.host.constructor as typeof import("@engine/module/Creature").Creature).resolveEnterDeadTransition(animState, this.host.animationState?.index);

    const previousAnim = this.host.animationState?.animation;
    this.host.animationState.index = animState;
    this.host.animationState.animation = this.host.animationConstantToAnimation(animState);
    this.host.animationState.started = false;
    if(this.host.animationState.animation){
      this.host.animationMissingLogged = false;
    }
    this.host.syncAnimationFlagSideEffects(this.host.animationState.animation, animState, previousAnim);
  }

  resetAnimationState(){
    this.host.animationState = {
      index: ModuleCreatureAnimState.PAUSE,
      animation: undefined,
      started: false,
      speed: 1,
    }
  }

  playTwoDAAnimation(animation: SWAnimation){
    if(animation){
      // combat/cutscene swings use SetAnimation — clear dialog slot so
      // updateAnimationState is not blocked by a lingering dialog READY pose.
      this.host.dialogAnimation = null;
      const previousAnim = this.host.animationState?.animation;
      this.host.resetAnimationState();
      this.host.animationState = {
        index: ModuleCreatureAnimState.PAUSE,
        animation: animation,
        started: false,
        speed: 1,
      }
      this.host.syncAnimationFlagSideEffects(animation, ModuleCreatureAnimState.PAUSE, previousAnim);
    }
  }

  playOverlayAnimation(NWScriptAnimId = -1){
    this.host.resetOverlayAnimationState();
    let animationName = '';
    switch(NWScriptAnimId){
      case 123:
        animationName = 'diveroll';
      break;
      default:
        if(NWScriptAnimId >= 10000){
          const row = this.host.animationConstantToAnimation(NWScriptAnimId);
          if(row?.name){
            animationName = row.name.toLowerCase();
          }
        }
      break;
    }

    if(!animationName){ return; }

    const anim = OdysseyModelAnimation.GetAnimation2DA(animationName);
    const mode = resolvePlaybackMode(NWScriptAnimId, anim);
    if(mode === AnimationPlaybackMode.OVERLAY || (anim && isAnimation2DAFlagSet(anim.overlay))){
      this.host.overlayAnimationState.animationIndex = NWScriptAnimId;
      this.host.overlayAnimationState.animationName = animationName;
      this.host.overlayAnimationState.animation = anim;
      this.host.overlayAnimationState.stopFlag = resolveOverlayStopFlags(NWScriptAnimId);
      this.host.overlayAnimationState.started = false;
    }else if(anim){
      // Non-overlay NWScript overlay opcode still falls through to base play.
      this.host.playTwoDAAnimation(anim);
    }
  }

  applyOverlayToBodyAndHead(name: string, data: SWAnimation){
    const flags = resolveOverlayStartFlags(this.host.overlayAnimationState?.animationIndex || 0);
    if(this.host.model instanceof OdysseyModel3D){
      this.host.model.playOverlayAnimation(name, data, flags);
    }
    if(this.host.head instanceof OdysseyModel3D){
      this.host.head.playOverlayAnimation(name, data, flags);
    }
  }

  stopOverlayAnimation(){
    const stopFlag = this.host.overlayAnimationState.stopFlag || 0x80;
    if(this.host.model instanceof OdysseyModel3D){
      this.host.model.animationManager?.stopOverlayAnimation(stopFlag);
    }
    if(this.host.head instanceof OdysseyModel3D){
      this.host.head.animationManager?.stopOverlayAnimation(stopFlag);
    }
    this.host.resetOverlayAnimationState();
  }

  applyAnimationByMode(serverId: number, speed: number = 1){
    if(!serverId){ return; }
    const twoDA = this.host.animationConstantToAnimation(serverId);
    const mode = resolvePlaybackMode(serverId, twoDA);
    if(mode === AnimationPlaybackMode.OVERLAY){
      if(twoDA?.name){
        this.host.overlayAnimationState = {
          animationIndex: serverId,
          animationName: twoDA.name.toLowerCase(),
          animation: twoDA,
          started: false,
          speed: speed || 1,
          stopFlag: resolveOverlayStopFlags(serverId),
        };
      }
      return;
    }
    if(mode === AnimationPlaybackMode.REVERSE){
      this.host.setAnimationState(serverId as ModuleCreatureAnimState);
      this.host.animationState.speed = speed >= 0 ? -Math.abs(speed || 1) : speed;
      return;
    }
    // Mode 2 — weapon-primary clips prefer item Gob when equipped.
    if(twoDA?.name && String((twoDA as any).weapon) === '1'){
      this.host.startWeaponGesture(twoDA.name.toLowerCase(), this.host.getAnimationLength(serverId) || 1.5);
    }
    this.host.setAnimationState(serverId as ModuleCreatureAnimState);
    this.host.animationState.speed = speed || 1;
    this.host.setPlayOutOfPlaceActive(isPlayOutOfPlaceServerId(serverId));
  }

  resetOverlayAnimationState(){
    this.host.overlayAnimationState = {
      animationIndex: -1,
      animationName: '',
      animation: undefined,
      started: false,
      speed: 1,
      stopFlag: 0x80,
    }
  }

  resetGestureState(){
    this.host.gestureState = {
      serverId: -1,
      animation: undefined,
      started: false,
      remaining: 0,
      active: false,
    };
  }

  resetWeaponGestureState(){
    this.host.weaponGestureState = {
      animationName: '',
      remaining: 0,
      active: false,
    };
  }

  startWeaponGesture(clipName: string, durationSec: number){
    if(!clipName){ return; }
    let played = false;
    if(this.host.equipment.RIGHTHAND?.playWeaponGesture(clipName)){ played = true; }
    if(this.host.equipment.LEFTHAND?.playWeaponGesture(clipName)){ played = true; }
    // Only arm the timer when a clip actually played on an item Gob.
    if(!played){ return; }
    this.host.weaponGestureState = {
      animationName: clipName,
      remaining: Math.max(durationSec, 0.1),
      active: true,
    };
  }

  dialogPlayOdysseyAnimation(anim: OdysseyModelAnimation, animationId: number = -1){
    console.log('dialogPlayOdysseyAnimation', anim)
    if(!this.host.model){ 
      console.warn('dialogPlayOdysseyAnimation failed');
      console.log(this.host, anim);
      return; 
    }
    // IsLoopingDialogStuntAnimation — l/wl CUT ids loop.
    const looping = animationId > 0x577 && animationId < 0x6c0;
    this.host.dialogAnimation = {
      animation: anim,
      data: {
        fireforget: looping ? 0 : 1,
        looping: looping ? 1 : 0
      } as any,
      started: false,
    };
  }

  dialogPlayAnimation(data: SWAnimation = {} as SWAnimation){
    console.log('dialogPlayAnimation', data)
    if(!this.host.model){ 
      console.warn('dialogPlayAnimation failed');
      console.log(this.host, data);
      return; 
    }
    this.host.dialogAnimation = { 
      animation: this.host.model.odysseyAnimationMap.get(data.name.toLowerCase().trim()),
      data: data,
      started: false,
    };
  }

  getModelAnimationByName( name: string ): OdysseyModelAnimation {
    return this.host.model.odysseyAnimationMap.get(name.toLowerCase().trim());
  }

  getDamageAnimation( attackAnimName: string ): SWAnimation {

    const attackAnimNamel = attackAnimName.toLowerCase().trim();
    
    let attackAnimIndex = -1;

    let modeltype = this.host.creatureAppearance.modeltype;
    let weaponWield = this.host.getCombatAnimationWeaponType();
    // Heavy (9) shares g7* clips / combatanimations *7 columns with rifle.
    const clipDigit = combatReactionClipDigit(weaponWield);
    
    const attackAnim = this.runtime.getSWRuleSet?.().animationNameMap.get(attackAnimNamel);

    const combatAnimation = attackAnim?.combatAnimation;
    if(combatAnimation){
      const damageAnimID = combatAnimation.getDamageAnimation(weaponWield);
      const damageAnim = this.runtime.getSWRuleSet?.().animationIdMap.get(damageAnimID);
      if(damageAnim && this.host.getModelAnimationByName(damageAnim.name)){
        return OdysseyModelAnimation.GetAnimation2DA(damageAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdamages')
          || this.host.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
    }
    //console.log(attackAnim);
    
    switch((attackAnimName || '').toLowerCase()){
      case 'c2a1':
        return OdysseyModelAnimation.GetAnimation2DA('c2d1')
          || this.host.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a2':
        return OdysseyModelAnimation.GetAnimation2DA('c2d2')
          || this.host.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a3':
        return OdysseyModelAnimation.GetAnimation2DA('c2d3')
          || this.host.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a4':
        return OdysseyModelAnimation.GetAnimation2DA('c2d4')
          || this.host.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
      case 'c2a5':
        return OdysseyModelAnimation.GetAnimation2DA('c2d5')
          || this.host.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);
    }

    return OdysseyModelAnimation.GetAnimation2DA('g'+clipDigit+'d1')
      || this.host.animationConstantToAnimation(ModuleCreatureAnimState.DAMAGE);

  }

  getDodgeAnimation( attackAnimName: string ): SWAnimation {

    const attackAnimNamel = attackAnimName.toLowerCase().trim();

    const modeltype = this.host.creatureAppearance.modeltype;
    const attackKey = this.host.getCombatAnimationAttackType();
    const weaponWield = this.host.getCombatAnimationWeaponType();
    const clipDigit = combatReactionClipDigit(weaponWield);
    
    const attackAnim = this.runtime.getSWRuleSet?.().animationNameMap.get(attackAnimNamel);

    const combatAnimation = attackAnim?.combatAnimation;
    if(combatAnimation){
      if(combatAnimation.hits == 1 && [4, 2, 3].indexOf(weaponWield) >= 0){
        const dodgeAnimID = combatAnimation.getDodgeAnimation(weaponWield);
        const dodgeAnim = this.runtime.getSWRuleSet?.().animationIdMap.get(dodgeAnimID);
        if(dodgeAnim && this.host.getModelAnimationByName(dodgeAnim.name)){
          //console.log('dodge/parry anim', this.host.getName, damageAnim.name)
          return OdysseyModelAnimation.GetAnimation2DA(dodgeAnim.name);
        }
      }
      
      const dodgeAnimID = combatAnimation.getDodgeAnimation(weaponWield);
      const dodgeAnim = this.runtime.getSWRuleSet?.().animationIdMap.get(dodgeAnimID);
      if(dodgeAnim && this.host.getModelAnimationByName(dodgeAnim.name)){
        //console.log('dodge anim', this.host.getName, dodgeAnim.name)
        return OdysseyModelAnimation.GetAnimation2DA(dodgeAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdodgeg');
    }
    
    switch(attackAnimNamel){
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

    return OdysseyModelAnimation.GetAnimation2DA('g'+clipDigit+'g1');

  }

  getParryAnimation( attackAnimName: string ): SWAnimation {

    const attackAnimNamel = attackAnimName.toLowerCase();

    const modeltype = this.host.creatureAppearance.modeltype;
    const attackKey = this.host.getCombatAnimationAttackType();
    const weaponWield = this.host.getCombatAnimationWeaponType();
    const clipDigit = combatReactionClipDigit(weaponWield);
    
    const attackAnim = this.runtime.getSWRuleSet?.().animationNameMap.get(attackAnimNamel);

    /** Get the combat animation from the attack animation. */
    const combatAnimation = attackAnim?.combatAnimation;
    if(combatAnimation){
      const parryAnimID = combatAnimation.getParryAnimation(weaponWield);
      const parryAnim = this.runtime.getSWRuleSet?.().animationIdMap.get(parryAnimID);
      if(parryAnim && this.host.getModelAnimationByName(parryAnim.name)){
        return OdysseyModelAnimation.GetAnimation2DA(parryAnim.name);
      }
    }

    switch(modeltype){
      case 'S':
      case 'L':
        return OdysseyModelAnimation.GetAnimation2DA('cdodgeg');
    }
    //console.log(attackAnim);
    switch(attackAnimNamel){
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

    return OdysseyModelAnimation.GetAnimation2DA('g'+clipDigit+'g1');
    
  }

  getCombatAnimationAttackType(): string {
    return combatAnimationAttackKey(this.host.equipment);
  }

  getCombatAnimationWeaponType(){
    return combatAnimationWeaponDigit(this.host.equipment, this.host.isSimpleCreature());
  }

  lookAt(oObject: GameObject | undefined){
    this.host.lookAtObject = oObject;
  }

  private unwindHeadTrackingLook(){
    if(!(this.host.model instanceof OdysseyModel3D) || !this.host.model.hturn_g) return;
    this.host.headTrackingAngle = 0;
    this.host.headTrackingPitch = 0;
    applyHeadTrackingToHturn(this.host.model.hturn_g, 0, 0);
  }

  updateHeadTracking(delta: number){
    if(!this.host.lookAtObject){
      this.unwindHeadTrackingLook();
      return;
    }
    if(this.host.lookAtObject === this.host || this.host.lookAtObject.isDead()){
      this.host.lookAtObject = undefined;
      this.unwindHeadTrackingLook();
      return;
    }
    if(!(this.host.model instanceof OdysseyModel3D) || !this.host.model.hturn_g){
      return;
    }
    if(!this.host.headTrackingEnabled){
      this.unwindHeadTrackingLook();
      return;
    }

    let targetYaw = 0;
    let targetPitch = 0;

    const reticle = this.host.lookAtObject.getReticleNode();
    if(reticle){
      this.host.lookAtPosition.copy(reticle.getWorldPosition(this.host.lookAtPosition));
    }else if(this.host.lookAtObject.position){
      this.host.lookAtPosition.copy(this.host.lookAtObject.position);
    }else{
      this.host.lookAtObject = undefined;
      this.unwindHeadTrackingLook();
      return;
    }
    const dx = this.host.lookAtPosition.x - this.host.position.x;
    const dy = this.host.lookAtPosition.y - this.host.position.y;
    const dz = this.host.lookAtPosition.z - (this.host.position.z + this.host.getCameraHeight());
    const horizontalDist = Math.sqrt(dx * dx + dy * dy);

    const worldAngleToTarget = Math.atan2(dy, dx);
    const bodyFacing = this.host.rotation.z + Math.PI / 2;
    const relativeYaw = Utility.NormalizeRadian(worldAngleToTarget - bodyFacing);
    const relativePitch = Math.atan2(dz, horizontalDist);

    if(Math.abs(relativeYaw) <= this.host.headMaxHorizontalAngle){
      targetYaw = relativeYaw;
      targetPitch = THREE.MathUtils.clamp(relativePitch, -this.host.headMaxVerticalAngle, this.host.headMaxVerticalAngle);
    }

    const CreatureClass = this.host.constructor as any;
    const stepH = CreatureClass.HEAD_TRACKING_H_SPEED * delta;
    const stepV = CreatureClass.HEAD_TRACKING_V_SPEED * delta;

    const yawDiff = Utility.NormalizeRadian(targetYaw - this.host.headTrackingAngle);
    if(Math.abs(yawDiff) <= stepH){
      this.host.headTrackingAngle = targetYaw;
    }else{
      this.host.headTrackingAngle += Math.sign(yawDiff) * stepH;
    }

    const pitchDiff = targetPitch - this.host.headTrackingPitch;
    if(Math.abs(pitchDiff) <= stepV){
      this.host.headTrackingPitch = targetPitch;
    }else{
      this.host.headTrackingPitch += Math.sign(pitchDiff) * stepV;
    }

    // Do not force idle axes to 0 - that wipes female neck/hturn bind cancel
    // (+/-0.1745) after anim and makes Model B heads look down (p_bastilah).
    applyHeadTrackingToHturn(
      this.host.model.hturn_g,
      this.host.headTrackingAngle,
      this.host.headTrackingPitch,
    );
  }

  clearLocomotionAnimation(){
    const idx = this.host.animationState?.index;
    if(
      idx === ModuleCreatureAnimState.RUNNING ||
      idx === ModuleCreatureAnimState.WALKING ||
      idx === ModuleCreatureAnimState.WALKING_BACK
    ){
      this.host.setAnimationState(ModuleCreatureAnimState.PAUSE);
    }
  }

  isDriveAnimationBlocked(): boolean {
    if(this.host.dialogAnimation){
      return true;
    }
    return isDialogAnimation(this.host.animationState?.animation);
  }

  syncAnimationFlagSideEffects(
    next: SWAnimation | undefined,
    serverId: number = 0,
    previous?: SWAnimation | undefined
  ){
    const hideNext = isHideEquippedItemsAnimation(next);
    if(hideNext){
      this.host.hideEquippedItemsForAnimation();
    }else if(this.host.animationHideEquippedItemsActive && !this.host.dialogEquipmentStash){
      this.host.showEquippedItemsAfterAnimation();
    }

    this.host.setPlayOutOfPlaceActive(
      isPlayOutOfPlaceServerId(serverId) || isPlayOutOfPlaceServerId(next?.animationId ?? 0)
    );

    void previous;
  }

  setPlayOutOfPlaceActive(active: boolean){
    if(this.host.model instanceof OdysseyModel3D){
      this.host.model.playOutOfPlaceActive = !!active;
    }
  }

  hideEquippedItemsForAnimation(){
    if(this.host.animationHideEquippedItemsActive) return;
    this.host.animationHideEquippedItemsActive = true;
    const hide = (item: Item | undefined) => {
      if(item?.model instanceof OdysseyModel3D){
        item.model.visible = false;
      }
    };
    hide(this.host.equipment.RIGHTHAND);
    hide(this.host.equipment.LEFTHAND);
  }

  showEquippedItemsAfterAnimation(){
    if(!this.host.animationHideEquippedItemsActive) return;
    this.host.animationHideEquippedItemsActive = false;
    const show = (item: Item | undefined) => {
      if(item?.model instanceof OdysseyModel3D){
        item.model.visible = true;
      }
    };
    show(this.host.equipment.RIGHTHAND);
    show(this.host.equipment.LEFTHAND);
  }

  isCurrentAnimationParry(): boolean {
    return isParryAnimation(this.host.animationState?.animation);
  }

  isFlourishMoving(): boolean {
    const pc = this.host.playerControl;
    if(pc && (this.host.isPlayer || this.host.isPM || this.host.isPC)){
      return Math.abs(pc.axisForward) > 1e-4 || Math.abs(pc.axisRight) > 1e-4;
    }
    return this.host.speed > 0.01 || this.host.force > 0.01;
  }

  showLightSaberContactVisual(): void {
    const position = new THREE.Vector3();
    const hook = this.host.model?.lightsaberhook;
    if(hook){
      hook.getWorldPosition(position);
    }else{
      position.copy(this.host.position);
    }
    spawnWorldImpactVfx(0xfab, position, this.host.context);
  }
}
