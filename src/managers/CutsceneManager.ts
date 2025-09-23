import { EngineMode } from "../enums/engine/EngineMode";
import { DLGObject } from "../resource/DLGObject";
import { DLGNode } from "../resource/DLGNode";
import type { ModuleCreature, ModuleObject } from "../module";
import { ConversationState } from "../enums/dialog/ConversationState";
import { GameState } from "../GameState";
import { DLGConversationType } from "../enums/dialog/DLGConversationType";
import { DLGCameraAngle } from "../enums/dialog/DLGCameraAngle";
import { OdysseyModel3D } from "../three/odyssey/OdysseyModel3D";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { AudioLoader } from "../audio/AudioLoader";
import { AudioEngine } from "../audio/AudioEngine";
import { CutsceneMode } from "../enums/dialog/CutsceneMode";
import * as THREE from "three";
import { CameraMode } from "../enums/dialog/CameraMode";
import { ICameraState } from "../interface/dialog/ICameraState";
import { AudioEmitter } from "../audio/AudioEmitter";
import { ICameraParticipant } from "../interface/dialog/ICameraParticipant";

const ENTRY_DELAY = 3000;
const HALF_PI = Math.PI / 2;
const QUARTER_PI = Math.PI / 4;

const SINGLE_SHOT_ANGLE_OFFSET = 0.5;

export class CutsceneManager {

  static active: boolean = false;
  static cutsceneMode: CutsceneMode = CutsceneMode.DIALOG;

  static conversation_name: string;
  static dialog: DLGObject;
  static startingEntry: DLGNode;
  static currentEntry: DLGNode;
  static currentReplies: DLGNode[] = [];

  static lastSpokenString: string = '';

  static listener: ModuleObject;
  static owner: ModuleObject;

  static ended: boolean;
  static state: ConversationState;
  static unequipHeadItem: boolean;
  static unequipItems: boolean;
  static isListening: boolean;

  static audioEmitter: AudioEmitter;

  static cameraState: ICameraState = {
    mode: CameraMode.DIALOG,
    cameraAngle: DLGCameraAngle.ANGLE_SPEAKER,
    cameraID: -1,
    cameraAnimation: -1,
    currentCameraAnimation: undefined,
    currentCameraAnimationElapsed: 0,
    listener: {} as ICameraParticipant,
    speaker: {} as ICameraParticipant,
  }

  static getCurrentListener(): ModuleObject {
    if (this.currentEntry) {
      return this.currentEntry.listener;
    }
    return this.listener;
  }

  static getCurrentOwner(): ModuleObject {
    if (this.currentEntry) {
      return this.currentEntry.owner;
    }
    return this.owner;
  }

  static startConversation(dialog: DLGObject, owner: ModuleObject, listener: ModuleObject = GameState.PartyManager.party[0]) {
    this.active = true;
    this.cameraState.currentCameraAnimation = undefined;
    this.owner = owner;
    this.listener = listener;
    GameState.ConversationPaused = false;
    this.ended = false;
    this.currentEntry = null;
    this.state = ConversationState.INVALID;
    if (this.owner == GameState.PartyManager.party[0]) {
      const old_listener = this.listener;
      this.listener = this.owner;
      this.owner = old_listener;
    }
    this.unequipHeadItem = false;
    this.unequipItems = false;
    GameState.Mode = EngineMode.DIALOG;
    this.isListening = true;
    
    if (!dialog) {
      dialog = this.owner.getConversation();
    }

    if (!(dialog instanceof DLGObject)) {
      this.endConversation();
    }

    const loaded = this.loadDialog(dialog);
    if(!loaded) return;
    
    //todo trigger updateTextPosition
    this.isListening = true;
    this.startingEntry = this.getNextEntry(this.dialog.startingList);
    if(!this.startingEntry){
      console.warn('CutsceneManager.startConversation: No starting entry found');
      this.endConversation();
      return;
    }
    
    //bark entry
    const isBarkDialog = this.isBarkDialog(this.startingEntry);
    if (isBarkDialog) {
      this.cutsceneMode = CutsceneMode.BARK;
      this.endConversation();
      GameState.MenuManager.InGameBark.bark(this.startingEntry);
      this.startingEntry.runScripts();
      const reply = this.dialog.getReplyByIndex(this.startingEntry.replies[0].index);
      if (reply) {
        reply.runScripts();
      }
      return;
    }
    
    //normal dialog entry
    this.cutsceneMode = (this.dialog.isAnimatedCutscene) ? CutsceneMode.ANIMATED : CutsceneMode.DIALOG;

    if(this.listener.isPM){
      GameState.PartyManager.MakePlayerLeader();
      this.listener = this.dialog.listener = GameState.PartyManager.party[0];
    }

    if(this.dialog.getConversationType() == DLGConversationType.CONVERSATION){
      GameState.MenuManager.InGameDialog.canLetterbox = true;
    }

    GameState.holdWorldFadeInForDialog = (this.cutsceneMode == CutsceneMode.ANIMATED);
    this.dialog.loadStuntCamera().then(() => {
      this.dialog.loadStuntActors().then(() => {
        this.dialog.loadBackgroundMusic().then(() => {
          this.showEntry(this.startingEntry);
        });
      });
    });
  }

  static loadDialog(dialog: DLGObject) {
    this.conversation_name = ``;
    if(!dialog){ return false; }
    this.conversation_name = dialog.resref;
    this.dialog = dialog;
    this.dialog.owner = this.owner;
    this.dialog.listener = this.listener;
    switch (this.dialog.getConversationType()) {
      case DLGConversationType.COMPUTER:
        GameState.MenuManager.InGameComputer.open();
      default:
        GameState.MenuManager.InGameDialog.open();
    }
    return true;
  }

  /**
   * Get the next entry
   * @param entryLinks - The entry links
   * @returns The next entry
   */
  static getNextEntry(entryLinks: DLGNode[] = []/*, callback?: Function*/): DLGNode {
    if (!entryLinks.length) { return; }
    this.isListening = true;
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      // GameState.MenuManager.InGameComputer.updateTextPosition();
    }else{
      GameState.MenuManager.InGameDialog.updateTextPosition();
    }
    const entryIndex = this.dialog.getNextEntryIndex(entryLinks);
    return this.dialog.getEntryByIndex(entryIndex);
  }

  /**
   * Check if a dialog entry is a bark node
   * @param entry - The entry to check
   */
  static isBarkDialog(entry: DLGNode) {
    return entry.replies.length == 1 /*&& !entry.cameraAngle*/ && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
  }

  /**
   * Check if a dialog entry is a continue node
   * @param node - The entry to check
   */
  static isContinueDialog(node: DLGNode) {
    const parsedText = node.getCompiledString();
    if (typeof node.entries !== 'undefined') {
      return parsedText == '' && node.entries.length;
    } else if (typeof node.replies !== 'undefined') {
      return parsedText == '' && node.replies.length;
    }
    return parsedText == '';
  }

  /**
   * Check if a dialog entry is an end node
   * @param node - The entry to check
   */
  static isEndDialog(node: DLGNode) {
    const parsedText = node.getCompiledString();
    if (typeof node.entries !== 'undefined') {
      return parsedText == '' && !node.entries.length;
    } else if (typeof node.replies !== 'undefined') {
      return parsedText == '' && !node.replies.length;
    }
    return parsedText == '';
  }

  /**
   * Handle the player skipping a dialog entry
   * @param currentEntry - The entry to skip
   */
  static playerSkipEntry(currentEntry: DLGNode) {
    if(!this.currentEntry) { return; }
    if(!this.currentEntry.skippable) { return; }
    if(this.currentEntry.checkList.isSkipped){ return; }
    if(this.currentEntry.repliesShown){ return; }
    this.currentEntry.checkList.isSkipped = true;
    this.audioEmitter.stop();
    this.currentEntry.resetLIP();
    this.showReplies(this.currentEntry);
  }

  /**
   * Show a dialog entry
   * @param entry - The entry to show
   */
  static showEntry(entry: DLGNode) {
    this.currentEntry = entry;
    entry.initProperties();
    this.state = ConversationState.LISTENING_TO_SPEAKER;
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    GameState.VideoEffectManager.SetVideoEffect(entry.getVideoEffect());
    this.lastSpokenString = entry.getCompiledString();
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }else{
      GameState.MenuManager.InGameDialog.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }

    entry.updateJournal();

    //participant animations
    if (this.cutsceneMode == CutsceneMode.ANIMATED) {
      this.setAnimatedEntryAnimations(entry);
    } else {
      this.setEntryAnimations(entry);
    }

    //participant facing
    if (this.cutsceneMode == CutsceneMode.DIALOG) {
      if (BitWise.InstanceOfObject(this.currentEntry.listener, ModuleObjectType.ModuleObject) && BitWise.InstanceOfObject(this.currentEntry.speaker, ModuleObjectType.ModuleObject)) {
        if (!this.currentEntry.listener.lockDialogOrientation && BitWise.InstanceOfObject(this.currentEntry.listener, ModuleObjectType.ModuleCreature)) {
          this.currentEntry.listener.FacePoint(this.currentEntry.speaker.position);
        }
        if (!this.currentEntry.speaker.lockDialogOrientation && BitWise.InstanceOfObject(this.currentEntry.speaker, ModuleObjectType.ModuleCreature)) {
          this.currentEntry.speaker.FacePoint(this.currentEntry.listener.position);
        }
      }
    }

    //Node Delay
    const nodeDelay = (this.cutsceneMode != CutsceneMode.ANIMATED && entry.delay > -1) ? entry.delay * 1000 : ENTRY_DELAY;
    entry.setNodeDelay(nodeDelay);

    //Node camera
    this.setEntryCamera(entry);

    //scripts
    entry.runScripts();

    //replies
    const replies = this.dialog.getAvailableReplies(entry);
    this.currentReplies = replies;
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.setReplies(replies);
    }else{
      GameState.MenuManager.InGameDialog.setReplies(replies);
    }

    //vo
    entry.playVoiceOver(this.audioEmitter);
  }

  /**
   * Select a reply at an index
   * @param index - The index of the reply to select
   */
  static selectReplyAtIndex(index: number) {
    const reply = this.currentReplies[index];
    if(!reply){
      console.warn('CutsceneManager.selectReplyAtIndex: No reply found');
      return;
    }

    if(this.state != ConversationState.WAITING_FOR_PC_CHOICE){
      console.warn('CutsceneManager.selectReplyAtIndex: Not in waiting for pc choice state');
      return;
    }
    this.onReplySelect(reply);
  }

  /**
   * Handle the selection of a reply
   * @param reply - The reply to handle
   */
  static onReplySelect(reply: DLGNode) {
    if (!reply) {
      this.endConversation();
      return;
    }
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }else{
      GameState.MenuManager.InGameDialog.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }
    reply.updateJournal();
    reply.runScripts();
    const entry = this.getNextEntry(reply.entries);
    if(entry){
      this.showEntry(entry);
    }else{
      this.endConversation();
    }
  }

  /**
   * Show the replies for a dialog entry
   * @param entry - The entry to show the replies for
   */
  static showReplies(entry: DLGNode) {
    this.state = ConversationState.WAITING_FOR_PC_CHOICE;
    this.currentEntry = undefined;
    this.isListening = false;
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    
    const isContinueDialog = entry.replies.length == 1 && this.isContinueDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
    const isEndDialog = entry.replies.length == 1 && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
    
    //Get First Reply
    const reply = this.dialog.getReplyByIndex(entry.replies[0].index);
    if(!reply){
      console.warn('CutsceneManager.showReplies: No reply found');
      this.endConversation();
      return;
    }

    //End Dialog
    if (isEndDialog || !entry.replies.length) {
      if(!entry.replies.length){
        console.warn('CutsceneManager.showReplies: No replies found');
      }

      reply?.runScripts();
      this.endConversation();
      return;
    }

    //Continue Dialog
    if (isContinueDialog) {
      reply?.runScripts();
      const nextEntry = this.getNextEntry(reply.entries);
      if(nextEntry){
        this.showEntry(nextEntry);
      }else{
        this.endConversation();
      }
      return;
    }

    //Update Speaker Animation State
    try {
      if(BitWise.InstanceOfObject(this.getCurrentOwner(), ModuleObjectType.ModuleCreature)){
        const anim = this.getCurrentOwner().animationConstantToAnimation( ModuleCreatureAnimState.LISTEN )
        if(anim){
          this.getCurrentOwner().dialogPlayAnimation(anim);
        }
      }
    } catch (e: any) {
      console.error(e);
    }

    //Update Listener Animation State
    try {
      if(BitWise.InstanceOfObject(this.getCurrentListener(), ModuleObjectType.ModuleCreature)){
        const anim = this.getCurrentListener().animationConstantToAnimation( ModuleCreatureAnimState.LISTEN )
        if(anim){
          this.getCurrentListener().dialogPlayAnimation(anim);
        }
      }
    } catch (e: any) {
      console.error(e);
    }

    this.setListenerCamera();
    
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.setDialogMode(ConversationState.WAITING_FOR_PC_CHOICE);
    }else{
      GameState.MenuManager.InGameDialog.setDialogMode(ConversationState.WAITING_FOR_PC_CHOICE);
    }
  }

  /**
   * End the conversation
   * @param aborted - Whether the conversation was aborted
   */
  static endConversation(aborted = false) {
    this.active = false;
    if (GameState.ConversationPaused) {
      this.ended = true;
    }
    this.audioEmitter.stop();
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.close();
      GameState.MenuManager.InGameComputerCam.close();
    }else{
      GameState.MenuManager.InGameDialog.close();
    }
    GameState.currentCamera = GameState.camera;
    this.state = ConversationState.INVALID;
    if(this.dialog){
      if (this.dialog.animatedCamera instanceof OdysseyModel3D)
        this.dialog.animatedCamera.animationManager.currentAnimation = undefined;
      
      if (!aborted) {
        if(this.dialog.scripts.onEndConversation){
          this.dialog.scripts.onEndConversation.run(this.owner, 0);
        }
      }else{
        if(this.dialog.scripts.onEndConversationAbort){
          this.dialog.scripts.onEndConversationAbort.run(this.owner, 0);
        }
      }
      this.dialog.releaseStuntActors();
      if(this.cutsceneMode == CutsceneMode.ANIMATED){
        GameState.FadeOverlayManager.FadeInFromCutscene();
      }
    }
    GameState.VideoEffectManager.SetVideoEffect(-1);
    AudioEngine.GetAudioEngine().dialogMusicAudioEmitter.stop();
  }

  /**
   * Set the participant animations for an animated cutscene dialog entry
   * @param entry - The entry to set the participant animations for
   */
  static setAnimatedEntryAnimations(entry: DLGNode) {
    for (let i = 0; i < entry.animations.length; i++) {
      const participant = entry.animations[i];
      console.log('participant', participant)
      if (this.dialog.stuntActors.has(participant.participant)) {
        try {
          const actor = this.dialog.stuntActors.get(participant.participant);
          if(!actor){ continue; }
          if(BitWise.InstanceOfObject(actor.moduleObject, ModuleObjectType.ModuleCreature)){
            const creature = actor.moduleObject as ModuleCreature;
            const animationName = this.getCUTAnimationName(participant.animation);
            const odysseyAnimation = actor.animations ? actor.animations.find( a => a.name.toLocaleLowerCase() == animationName.toLocaleLowerCase()) : undefined;
            if(odysseyAnimation){
              creature.dialogPlayOdysseyAnimation(odysseyAnimation);
            }
          }
        } catch (e: any) {
          console.error(e);
        }
      } else {
        const actor = GameState.ModuleObjectManager.GetObjectByTag(participant.participant);
        if(!actor){ continue; }
        console.log('actor', actor);
        if (participant.animation >= 10000) {
          const anim = actor.animationConstantToAnimation(participant.animation);
          console.log('anim', anim)
          if (anim) {
            actor.dialogPlayAnimation(anim);
          } else {
            console.error('Anim', participant.animation);
          }
        }else{
          const anim = this.getDialogAnimation(participant.animation);
          console.log('anim', anim)
          if (anim) {
            actor.dialogPlayAnimation(anim);
          } else {
            console.error('Anim', participant.animation);
          }  
        }
      }
    }
  }

  /**
   * Set the participant animations for a normal dialog entry
   * @param entry - The entry to set the participant animations for
   */
  static setEntryAnimations(entry: DLGNode) {
    //Speaker Animation
    if (BitWise.InstanceOfObject(this.currentEntry.speaker, ModuleObjectType.ModuleCreature)) {
      const anim = this.currentEntry.speaker.animationConstantToAnimation( ModuleCreatureAnimState.TALK_NORMAL )
      if(anim){
        this.currentEntry.speaker.dialogPlayAnimation(anim);
      }
    }

    //Listener Animation
    if (BitWise.InstanceOfObject(this.currentEntry.listener, ModuleObjectType.ModuleCreature)) {
      const anim = this.currentEntry.listener.animationConstantToAnimation( ModuleCreatureAnimState.LISTEN )
      if(anim){
        this.currentEntry.listener.dialogPlayAnimation(anim);
      }
    }

    for (let i = 0; i < entry.animations.length; i++) {
      const participant = entry.animations[i];
      if(!participant.participant){ continue; }
      const actor = GameState.ModuleObjectManager.GetObjectByTag(participant.participant);
      if(!actor){ continue; }
      if (participant.animation >= 10000) {
        const anim = actor.animationConstantToAnimation(participant.animation);
        if (anim) {
          actor.dialogPlayAnimation(anim);
        } else {
          console.error('Anim', participant.animation);
        }
      }
    }
  }

  /**
   * Get the CUT animation name
   * @param index - The index of the animation
   * @returns The CUT animation name
   */
  static getCUTAnimationName(index = 0) {
    return 'CUT' + ('000' + (index - 1200 + 1)).slice(-3) + 'W';
  }

  /**
   * Get the dialog animation
   * @param index - The index of the animation
   * @returns The dialog animation
   */
  static getDialogAnimation(index = 0): any {
    console.log('GetDialogAnimation', index);
    if (index >= 1000 && index < 1400) {
      const id = (index - 999);
      return {
        name: 'cut' + ('000' + id).slice(-3),
        looping: '1'
      };
    } else if (index >= 1400 && index < 1500) {
      const id = (index - 1399);
      return {
        name: 'cut' + ('000' + id).slice(-3) + 'L',
        looping: '1'
      };
    } else if (index >= 10000) {
      const animations2DA = GameState.TwoDAManager.datatables.get('animations');
      if(!animations2DA){ return; }

      switch (index - 10000) {
        case 30:
          return animations2DA.rows[18];
        case 35:
          return animations2DA.rows[24];
        case 38:
          return animations2DA.rows[25];
        case 39:
          return animations2DA.rows[27];
        case 40:
          return animations2DA.rows[26];
        case 41:
          return animations2DA.rows[29];
        case 42:
          return animations2DA.rows[28];
        case 121:
          return animations2DA.rows[44];
        case 127:
          return animations2DA.rows[38];
        case 403:
          return animations2DA.rows[462];
        case 404:
          return animations2DA.rows[463];
        case 405:
          return animations2DA.rows[464];
        case 406:
          return animations2DA.rows[465];
        case 407:
          return animations2DA.rows[466];
        case 408:
          return animations2DA.rows[467];
        case 409:
          return animations2DA.rows[468];
        case 410:
          return animations2DA.rows[469];
        case 411:
          return animations2DA.rows[470];
        case 412:
          return animations2DA.rows[471];
        case 413:
          return animations2DA.rows[472];
        case 424:
          return animations2DA.rows[316];
        case 425:
          return animations2DA.rows[317];
        case 426:
          return animations2DA.rows[318];
        case 427:
          return animations2DA.rows[319];
        case 428:
          return animations2DA.rows[320];
        case 499:
          return animations2DA.rows[557];
        case 500:
          return animations2DA.rows[558];
        case 501:
          return animations2DA.rows[559];
        case 502:
          return animations2DA.rows[560];
        case 503:
          return animations2DA.rows[561];
        case 504:
          return animations2DA.rows[562];
        case 507:
          return animations2DA.rows[565];
        case 508:
          return animations2DA.rows[566];
      }
    }

    return undefined;
  }

  /**
   * Set the camera for an entry
   * @param entry - The entry to set the camera for
   */
  static setEntryCamera(entry: DLGNode){
    const angle = entry.cameraAngle;
    const cameraID = entry.cameraAnimation > -1 ? entry.cameraAnimation : entry.cameraID;
    const fov = entry.camFieldOfView;
    const cameraAnimation = entry.cameraAnimation;

    if ( angle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA || this.dialog.animatedCamera && cameraAnimation > -1 ) {
      this.setAnimatedCamera(cameraAnimation, fov);
    } else if (angle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA) {
      this.setPlaceableCamera(cameraID);
    } else {
      this.setDialogCamera(angle);
    }
  }

  /**
   * Set the camera participants
   * @param listener - The listener
   * @param speaker - The speaker
   */
  static setCameraParticipants(listener: ModuleObject, speaker: ModuleObject){
    this.cameraState.listener.participant = listener;
    this.cameraState.listener.position = undefined;
    this.cameraState.listener.rotation = undefined;
    this.cameraState.speaker.participant = speaker;
    this.cameraState.speaker.position = undefined;
    this.cameraState.speaker.rotation = undefined;
  }

  /**
   * Set the listener camera
   */
  static setListenerCamera(){
    this.setDialogCamera(DLGCameraAngle.ANGLE_FOCUS_PLAYER);
    this.setCameraParticipants(this.owner, this.listener);
  }

  /**
   * Set the dialog camera
   * @param nAngle - The angle to set the camera to
   */
  static setDialogCamera(nAngle: DLGCameraAngle) {
    GameState.currentCamera = GameState.camera_dialog;
    this.cameraState.mode = CameraMode.DIALOG;
    this.cameraState.cameraAngle = 
      (nAngle == DLGCameraAngle.ANGLE_RANDOM) ? Math.floor(Math.random() * 3) + 1 : nAngle;
    if(this.currentEntry){
      this.setCameraParticipants(this.currentEntry.listener, this.currentEntry.speaker);
    }
  }

  /**
   * Set the placeable camera
   * @param nCamera - The camera to set
   */
  static setPlaceableCamera(nCamera: number) {
    let cam = GameState.getCameraById(nCamera);
    if (!cam) {
      console.warn(`No placeable camera found for camera [${nCamera}] falling back to dialog camera`);
      this.setDialogCamera(DLGCameraAngle.ANGLE_RANDOM);
      return;
    }

    GameState.currentCamera = cam;
    this.cameraState.mode = CameraMode.PLACEABLE;
    this.cameraState.cameraID = nCamera;
    if(this.currentEntry){
      this.setCameraParticipants(this.currentEntry.listener, this.currentEntry.speaker);
    }else{
      this.setCameraParticipants(this.owner, this.listener);
    }
  }

  /**
   * Set the animated camera
   * @param nCamera - The camera to set
   * @param nFOV - The field of view to set
   */
  static setAnimatedCamera(nCamera: number, nFOV: number = -1) {
    const animationState = this.dialog.animatedCamera.animationManager.createAnimationState();
    if(nCamera == -1){
      this.currentEntry.checkList.cameraAnimationComplete = true;
      this.dialog.animatedCamera.animationManager.currentAnimationState = animationState;
      console.warn(`No animation found for camera [${nCamera}] falling back to dialog camera`);
      this.setDialogCamera(DLGCameraAngle.ANGLE_RANDOM);
      return;
    }

    if (!(this.dialog.animatedCamera instanceof OdysseyModel3D)) {
      console.warn(`No animated camera model found for camera [${nCamera}] falling back to dialog camera`);
      this.setDialogCamera(DLGCameraAngle.ANGLE_RANDOM);
      return;
    }

    const animationName = this.getCUTAnimationName(nCamera);
    const animation = this.dialog.animatedCamera.getAnimationByName(animationName);
    this.cameraState.currentCameraAnimation = animation;
    this.cameraState.currentCameraAnimationElapsed = 0;
    this.dialog.animatedCamera.animationManager.currentAnimation = animation;
    this.dialog.animatedCamera.animationManager.currentAnimationState = animationState;
    this.currentEntry.checkList.cameraAnimationComplete = !this.cameraState.currentCameraAnimation;
    this.cameraState.mode = CameraMode.ANIMATED;
    GameState.currentCamera = GameState.camera_animated;
    if (nFOV != -1) {
      GameState.camera_animated.fov = nFOV;
    }
    
    if(this.currentEntry){
      this.setCameraParticipants(this.currentEntry.listener, this.currentEntry.speaker);
    }else{
      this.setCameraParticipants(this.owner, this.listener);
    }
  }

  /**
   * Update the cutscene manager
   * @param delta - The delta time
   */
  static update(delta: number = 0) {
    if (!this.dialog)
      return;

    this.dialog.stuntActors.forEach( async (actor) => {
      const moduleObject = actor.moduleObject;
      if(moduleObject){
        moduleObject.box.setFromObject(moduleObject.container);
      }
    });

    this.updateCamera(delta);

    if(GameState.ConversationPaused) return;

    if(this.currentEntry){
      const updateComplete = this.currentEntry.update(delta);
      if(updateComplete && !this.currentEntry.repliesShown){
        this.currentEntry.repliesShown = true;
        this.showReplies(this.currentEntry);
      }
    }
  }

  /**
   * Update the camera
   * @param delta - The delta time
   */
  static updateCamera(delta: number = 0) {
    if (!this.dialog) return;

    if (this.cameraState.mode == CameraMode.ANIMATED) {
      this.updateAnimatedCamera(delta);
      return;
    }

    if (this.cameraState.mode == CameraMode.PLACEABLE) {
      this.setPlaceableCamera(this.currentEntry.cameraAnimation > -1 ? this.currentEntry.cameraAnimation : this.currentEntry.cameraID);
      return;
    }

    if (this.cameraState.mode == CameraMode.DIALOG) {
      const listener = this.cameraState.listener;
      const speaker = this.cameraState.speaker;   

      if(!listener.participant || !speaker.participant){
        return;
      }
      
      const listenerNeedsUpdate = (!listener.position || (listener.position.x != listener.participant.position.x && listener.position.y != listener.participant.position.y && listener.position.z != listener.participant.position.z));
      const speakerNeedsUpdate = (!speaker.position || (speaker.position.x != speaker.participant.position.x && speaker.position.y != speaker.participant.position.y && speaker.position.z != speaker.participant.position.z));
      
      if(!listenerNeedsUpdate && !speakerNeedsUpdate){
        return;
      }

      if(listenerNeedsUpdate){
        if(!listener.position){
          listener.position = new THREE.Vector3();
        }
        if(!listener.rotation){
          listener.rotation = new THREE.Vector3();
        }
        listener.position.x = listener.participant.position.x;
        listener.position.y = listener.participant.position.y;
        listener.position.z = listener.participant.position.z;
        listener.rotation.x = listener.participant.rotation.x;
        listener.rotation.y = listener.participant.rotation.y;
        listener.rotation.z = listener.participant.rotation.z;
      }

      if(speakerNeedsUpdate){
        if(!speaker.position){
          speaker.position = new THREE.Vector3();
        }
        if(!speaker.rotation){
          speaker.rotation = new THREE.Vector3();
        }
        speaker.position.x = speaker.participant.position.x;
        speaker.position.y = speaker.participant.position.y;
        speaker.position.z = speaker.participant.position.z;
        speaker.rotation.x = speaker.participant.rotation.x;
        speaker.rotation.y = speaker.participant.rotation.y;
        speaker.rotation.z = speaker.participant.rotation.z;
      }

      switch (this.cameraState.cameraAngle) {
        case DLGCameraAngle.ANGLE_SPEAKER:
          this.updateCameraAngleSpeaker(delta);
          break;
        case DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER:
          this.updateCameraAngleSpeakerBehindPlayer(delta);
          break;
        case DLGCameraAngle.ANGLE_SPEAKER_AND_PLAYER_SIDE:
          this.updateCameraAngleTwoShot(delta);
          break;
        case DLGCameraAngle.ANGLE_FOCUS_PLAYER:
          this.updateListenerCamera(delta);
          break;
      }
      return;
    }
  }

  /**
   * Validate the camera participants are in the same room
   */
  static validateCameraParticipants(){
    const listener = this.cameraState.listener.participant;
    const speaker = this.cameraState.speaker.participant;
    if(!listener || !speaker){
      return false;
    }
    if(!listener.room || !speaker.room || (listener?.room !== speaker?.room))
      return false;
    return true;
  }

  /**
   * Update the animated camera
   * @param delta - The delta time
   */
  static updateAnimatedCamera(delta: number = 0){
    const cameraModel = this.dialog.animatedCamera;
    if(!cameraModel){
      return;
    }

    const manager = cameraModel.animationManager;
    if(!manager){
      return;
    }

    if(!manager.currentAnimation){
      this.currentEntry.checkList.cameraAnimationComplete = true;
      return;
    }
    GameState.currentCamera = GameState.camera_animated;
    manager.update(delta);
    cameraModel.camerahook.updateMatrixWorld();
    cameraModel.camerahook.getWorldPosition(GameState.camera_animated.position);
    GameState.camera_animated.quaternion.copy(cameraModel.camerahook.quaternion);
    GameState.camera_animated.updateProjectionMatrix();
    if(!manager.currentAnimation){
      this.currentEntry.checkList.cameraAnimationComplete = true;
    }
  }

  /**
   * setCameraAngleSpeaker
   * Speaker front: a standard head-and-shoulders shot of the current speaker.
   */
  static updateCameraAngleSpeaker(delta: number = 0){
    // Get camera positions for both speaker and listener (with camera hooks if available)
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    const speakerCameraPosition = speaker.getCameraHookPosition();
    const listenerCameraPosition = listener.getCameraHookPosition();
    
    // Fixed distance for close-up head-on shot - not dependent on listener distance
    const closeUpDistance = 1.2; // Fixed distance for consistent close-up framing
    const heightOffset = 0; // No height adjustment needed for head-on shot
    
    // Position camera for head-on close-up speaker shot
    // Camera positioned directly in front of the speaker based on their rotation
    const speakerRotation = (speaker.rotation.z + HALF_PI) - SINGLE_SHOT_ANGLE_OFFSET;
    
    // Calculate camera position based on speaker's facing direction
    const cameraX = speakerCameraPosition.x + Math.cos(speakerRotation) * closeUpDistance;
    const cameraY = speakerCameraPosition.y + Math.sin(speakerRotation) * closeUpDistance;
    const cameraZ = speakerCameraPosition.z + heightOffset;
    
    // Calculate final camera position - direct frontal shot based on speaker's rotation
    const cameraPosition = new THREE.Vector3(cameraX, cameraY, cameraZ);
    
    // Calculate lookAt target - at speaker's eye level for proper framing
    const lookAtTarget = speakerCameraPosition.clone().add(new THREE.Vector3(0, 0, 0.1)); // Lower lookAt target
    
    // Set camera position and look at the speaker
    GameState.camera_dialog.position.copy(cameraPosition);
    GameState.camera_dialog.lookAt(lookAtTarget);
  }

  /**
   * setCameraAngleSpeakerBehindPlayer
   * Over-the-shoulder: frames the speaker OTS from the listener's side (classic shot-reverse-shot style)
   * Uses collision detection to prevent camera from clipping through walls
   * Falls back to setCameraAngleSpeaker if camera would collide with walkmesh
   */
  static updateCameraAngleSpeakerBehindPlayer(delta: number = 0){
    // Get camera positions for both speaker and listener (with camera hooks if available)
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    const speakerCameraPosition = speaker.getCameraHookPosition();
    const listenerCameraPosition = listener.getCameraHookPosition();
    
    // Calculate midpoint between speaker and listener for lookAt target
    const midpoint = this.getCameraMidPoint(speakerCameraPosition, listenerCameraPosition, 0.5);
    
    // Calculate distance between participants for adaptive camera positioning
    const participantDistance = speakerCameraPosition.distanceTo(listenerCameraPosition);
    
    // Get listener's rotation to position camera behind and to the left
    const listenerRotation = listener.rotation.z;
    
    // Adaptive distances to ensure both participants are framed equally
    const baseBehindDistance = 1.0; // Base distance behind listener
    const baseLeftDistance = 1.5;   // Base distance to the left of listener
    const distanceMultiplier = Math.max(0.8, Math.min(1.5, participantDistance * 0.4)); // Scale with participant distance
    
    let behindDistance = baseBehindDistance * distanceMultiplier;
    let leftDistance = baseLeftDistance * distanceMultiplier;
    
    // Calculate initial camera position behind and to the left of listener
    let cameraX = listenerCameraPosition.x + Math.cos(listenerRotation + Math.PI) * behindDistance + Math.cos(listenerRotation - HALF_PI) * leftDistance;
    let cameraY = listenerCameraPosition.y + Math.sin(listenerRotation + Math.PI) * behindDistance + Math.sin(listenerRotation - HALF_PI) * leftDistance;
    const cameraZ = midpoint.z + 0.3; // Slightly above the midpoint for better framing
    
    // Calculate initial camera position
    let cameraPosition = new THREE.Vector3(cameraX, cameraY, cameraZ);
    
    // Adjust camera distance based on collision detection (similar to FollowerCamera)
    const adjustedDistance = this.adjustCameraDistanceForCollision(cameraPosition, listenerCameraPosition, behindDistance);
    
    // Recalculate camera position with adjusted distance
    if (adjustedDistance < behindDistance) {
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_SPEAKER;
      this.updateCameraAngleSpeaker();
      return;
      const scaleFactor = adjustedDistance / behindDistance;
      behindDistance = adjustedDistance;
      leftDistance *= scaleFactor;
      
      cameraX = listenerCameraPosition.x + Math.cos(listenerRotation + Math.PI) * behindDistance + Math.cos(listenerRotation - HALF_PI) * leftDistance;
      cameraY = listenerCameraPosition.y + Math.sin(listenerRotation + Math.PI) * behindDistance + Math.sin(listenerRotation - HALF_PI) * leftDistance;
      cameraPosition.set(cameraX, cameraY, cameraZ);
    }
    
    // Set camera position and look at the midpoint between speaker and listener
    GameState.camera_dialog.position.copy(cameraPosition);
    GameState.camera_dialog.lookAt(midpoint);
  }

  /**
   * setCameraAngleTwoShot
   * True two-shot: frames both speaker and listener in a wide conversational view
   * Camera positioned to show both participants with proper framing and distance
   * Falls back to setCameraAngleSpeakerBehindPlayer if camera would collide with walkmesh
   */
  static updateCameraAngleTwoShot(delta: number = 0){
    // Get speaker and listener positions with camera height
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    const speakerPos = speaker.position.clone().add(new THREE.Vector3(0, 0, speaker.getCameraHeight()));
    const listenerPos = listener.position.clone().add(new THREE.Vector3(0, 0, listener.getCameraHeight()));
    
    // Calculate midpoint between speaker and listener
    const midpoint = this.getCameraMidPoint(speakerPos, listenerPos, 0.5);
    
    // Calculate direction from listener to speaker
    const direction = speakerPos.clone().sub(listenerPos).normalize();
    
    // Calculate perpendicular direction for camera positioning
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
    
    // Calculate distance between participants
    const participantDistance = speakerPos.distanceTo(listenerPos);
    
    // Determine camera distance based on participant separation
    // Minimum 2.5 units, maximum 10 units, or 1.2x their distance
    const minDistance = 2.5;
    const maxDistance = 10.0;
    const multiplier = 1.2;
    const cameraDistance = Math.max(minDistance, Math.min(maxDistance, participantDistance * multiplier));
    
    // Position camera to the side of both participants
    const cameraPosition = midpoint.clone()
      .add(perpendicular.multiplyScalar(cameraDistance))
      .add(new THREE.Vector3(0, 0, 0)); // Slightly elevated for better framing
    
    // Check for walkmesh collision before setting camera position
    if (!this.validateCameraParticipants() || this.checkCameraCollision(cameraPosition, speaker.position)) {
      // Fall back to over-the-shoulder shot if collision detected
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER;
      this.updateCameraAngleSpeakerBehindPlayer();
      return;
    }
    
    // Calculate lookAt target - slightly biased toward the speaker
    const speakerBias = 0.5; // 50% bias toward speaker
    const lookAtTarget = this.getCameraMidPoint(listenerPos, speakerPos, speakerBias)
      .add(new THREE.Vector3(0, 0, -0.5)); // Slightly above midpoint
    
    // Set camera position and lookAt
    GameState.camera_dialog.position.copy(cameraPosition);
    GameState.camera_dialog.lookAt(lookAtTarget);
  }

  /**
   * Update the listener camera
   * @param delta - The delta time
   */
  static updateListenerCamera(delta: number = 0){
    // Get camera positions for both speaker and listener (with camera hooks if available)
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    const speakerCameraPosition = speaker.getCameraHookPosition();
    const listenerCameraPosition = listener.getCameraHookPosition();
    
    // Fixed distance for close-up head-on shot - not dependent on listener distance
    const closeUpDistance = 1.2; // Fixed distance for consistent close-up framing
    const heightOffset = 0; // No height adjustment needed for head-on shot
    
    // Position camera for head-on close-up speaker shot
    // Camera positioned directly in front of the speaker based on their rotation
    const speakerRotation = (speaker.rotation.z + HALF_PI) + SINGLE_SHOT_ANGLE_OFFSET;
    
    // Calculate camera position based on speaker's facing direction
    const cameraX = speakerCameraPosition.x + Math.cos(speakerRotation) * closeUpDistance;
    const cameraY = speakerCameraPosition.y + Math.sin(speakerRotation) * closeUpDistance;
    const cameraZ = speakerCameraPosition.z + heightOffset;
    
    // Calculate final camera position - direct frontal shot based on speaker's rotation
    const cameraPosition = new THREE.Vector3(cameraX, cameraY, cameraZ);
    
    // Calculate lookAt target - at speaker's eye level for proper framing
    const lookAtTarget = speakerCameraPosition.clone().add(new THREE.Vector3(0, 0, 0.1)); // Lower lookAt target
    
    // Set camera position and look at the speaker
    GameState.camera_dialog.position.copy(cameraPosition);
    GameState.camera_dialog.lookAt(lookAtTarget);
  }

  static #tmpMPVec3 = new THREE.Vector3();
  /**
   * Get the camera midpoint
   * @param pointA - The first point
   * @param pointB - The second point
   * @param percentage - The percentage to use
   * @returns The camera midpoint
   */
  static getCameraMidPoint(pointA: THREE.Vector3, pointB: THREE.Vector3, percentage = 0.5): THREE.Vector3 {
    // Calculate midpoint without cloning - more efficient
    this.#tmpMPVec3.x = pointA.x + (pointB.x - pointA.x) * percentage;
    this.#tmpMPVec3.y = pointA.y + (pointB.y - pointA.y) * percentage;
    this.#tmpMPVec3.z = pointA.z + (pointB.z - pointA.z) * percentage;
    
    return this.#tmpMPVec3;
  }

  /**
   * checkCameraCollision
   * Checks if a camera position would collide with walkmesh geometry
   * @param cameraPosition - The proposed camera position
   * @param targetPosition - The target position to look at (for ray direction)
   * @returns true if collision detected, false otherwise
   */
  static checkCameraCollision(cameraPosition: THREE.Vector3, targetPosition: THREE.Vector3): boolean {
    if (!GameState.module?.area) {
      return false;
    }

    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;

    if(!speaker.room || !listener.room || (speaker.room !== listener.room)){
      return false;
    }

    const area = GameState.module.area;
    const raycaster = GameState.raycaster;
    
    // Calculate direction from camera to target
    const direction = targetPosition.clone().sub(cameraPosition).normalize();
    
    // Set up raycaster for collision detection
    raycaster.set(cameraPosition, direction);
    raycaster.far = cameraPosition.distanceTo(targetPosition);
    
    // Collect walkmesh faces for collision testing
    const aabbFaces: any[] = [];
    
    // Add room walkmesh faces
    if (speaker.room?.collisionData?.walkmesh?.aabbNodes?.length) {
      aabbFaces.push({
        object: speaker.room,
        faces: speaker.room.collisionData.walkmesh.faces
      });
    }

    if (listener.room !== speaker.room) {
      if (listener.room?.collisionData?.walkmesh?.aabbNodes?.length) {
        aabbFaces.push({
          object: listener.room,
          faces: listener.room.collisionData.walkmesh.faces
        });
      }
    }
    
    // Add door walkmesh faces (closed doors only)
    for (let j = 0, jl = area.doors.length; j < jl; j++) {
      const door = area.doors[j];
      if (door?.collisionData?.walkmesh && !door.isOpen()) {
        aabbFaces.push({
          object: door,
          faces: door.collisionData.walkmesh.faces
        });
      }
    }
    
    // Test for collisions
    for (let k = 0, kl = aabbFaces.length; k < kl; k++) {
      const castableFaces = aabbFaces[k];
      const intersects = castableFaces.object.collisionData.walkmesh.raycast(raycaster, castableFaces.faces) || [];
      
      if (intersects.length > 0) {
        // Check if any intersection is close to the camera position
        for (let i = 0; i < intersects.length; i++) {
          const intersect = intersects[i];
          // If intersection is very close to camera position, consider it a collision
          if (intersect.distance < 0.5) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * adjustCameraDistanceForCollision
   * Adjusts camera distance based on walkmesh collision detection (similar to FollowerCamera)
   * @param cameraPosition - The proposed camera position
   * @param targetPosition - The target position to look at
   * @param maxDistance - The maximum desired distance
   * @returns The adjusted distance (may be less than maxDistance if collision detected)
   */
  static adjustCameraDistanceForCollision(cameraPosition: THREE.Vector3, targetPosition: THREE.Vector3, maxDistance: number): number {
    if (!GameState.module?.area) {
      return maxDistance;
    }

    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;

    const area = GameState.module.area;
    const raycaster = GameState.raycaster;
    
    // Calculate direction from target to camera
    const direction = cameraPosition.clone().sub(targetPosition).normalize();
    
    // Set up raycaster for collision detection
    raycaster.set(targetPosition, direction);
    raycaster.far = maxDistance;
    
    // Collect walkmesh faces for collision testing
    const aabbFaces: any[] = [];
    
    // Add room walkmesh faces
    if (speaker.room?.collisionData?.walkmesh?.aabbNodes?.length) {
      aabbFaces.push({
        object: speaker.room,
        faces: speaker.room.collisionData.walkmesh.faces
      });
    }

    if (listener.room !== speaker.room) {
      if (listener.room?.collisionData?.walkmesh?.aabbNodes?.length) {
        aabbFaces.push({
          object: listener.room,
          faces: listener.room.collisionData.walkmesh.faces
        });
      }
    }
    
    // Add door walkmesh faces (closed doors only)
    for (let j = 0, jl = area.doors.length; j < jl; j++) {
      const door = area.doors[j];
      if (door?.collisionData?.walkmesh && !door.isOpen()) {
        aabbFaces.push({
          object: door,
          faces: door.collisionData.walkmesh.faces
        });
      }
    }
    
    // Test for collisions and adjust distance (similar to FollowerCamera logic)
    let adjustedDistance = maxDistance;
    
    for (let k = 0, kl = aabbFaces.length; k < kl; k++) {
      const castableFaces = aabbFaces[k];
      const intersects = castableFaces.object.collisionData.walkmesh.raycast(raycaster, castableFaces.faces) || [];
      
      if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
          const intersect = intersects[i];
          // If intersection is closer than current distance, adjust it (with 0.75 multiplier like FollowerCamera)
          if (intersect.distance < adjustedDistance) {
            adjustedDistance = intersect.distance * 0.75;
          }
        }
      }
    }
    
    return adjustedDistance;
  }

  static #eventListeners: Map<string, Function[]> = new Map();
  static addEventListener(type: string, listener: Function){
    let listeners = this.#eventListeners.get(type);
    if(!listeners){
      listeners = [];
      this.#eventListeners.set(type, listeners);
    }
    if(listeners.indexOf(listener) !== -1){
      return;
    }
    listeners.push(listener);
  }

  static removeEventListener(type: string, listener: Function){
    let listeners = this.#eventListeners.get(type);
    if(!listeners || listeners.indexOf(listener) !== -1){
      return;
    }
    if(listeners){
      listeners.splice(listeners.indexOf(listener), 1);
    }
  }

  static dispatchEvent(type: string, ...args: any[]){
    let listeners = this.#eventListeners.get(type);
    if(listeners){
      listeners.forEach(listener => listener(...args));
    }
  }

}
