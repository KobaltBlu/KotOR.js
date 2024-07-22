import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel } from "../../../gui";
import * as THREE from "three";
import { ModuleCreature, ModuleObject } from "../../../module";
import { DLGObject } from "../../../resource/DLGObject";
import { DLGConversationType } from "../../../enums/dialog/DLGConversationType";
import { OdysseyModel3D } from "../../../three/odyssey";
import { AudioLoader } from "../../../audio/AudioLoader";
import { DLGNode } from "../../../resource/DLGNode";
import { ModuleCreatureAnimState } from "../../../enums/module/ModuleCreatureAnimState";
import { DLGCameraAngle } from "../../../enums/dialog/DLGCameraAngle";
import { OdysseyModelAnimation } from "../../../odyssey";
import { AudioEngine } from "../../../audio/AudioEngine";

/**
 * InGameDialog class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameDialog extends GameMenu {

  engineMode: EngineMode = EngineMode.DIALOG;
  LBL_MESSAGE: GUILabel;
  LB_REPLIES: GUIListBox;
  dialog: DLGObject;
  currentEntry: DLGNode;

  listener: ModuleObject;
  owner: ModuleObject;

  ended: boolean;
  state: number;
  unequipHeadItem: boolean;
  unequipItems: boolean;
  isListening: boolean;

  //letterbox
  canLetterbox: boolean;
  letterBoxed: boolean;
  topBar: THREE.Mesh;
  bottomBar: THREE.Mesh;

  startingEntry: DLGNode;
  conversation_name: string;
  barHeight: any;

  currentCameraAnimation: OdysseyModelAnimation;
  currentCameraAnimationElapsed: number = 0;

  constructor(){
    super();
    this.gui_resref = 'dialog';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LBL_MESSAGE.setText('');

      this.LB_REPLIES.extent.left = -(GameState.ResolutionManager.getViewportWidth()/2) + this.LB_REPLIES.extent.width/2 + 16;
      this.LB_REPLIES.extent.top = (GameState.ResolutionManager.getViewportHeight()/2) - this.LB_REPLIES.extent.height/2;
      this.LB_REPLIES.calculatePosition();
      this.LB_REPLIES.calculateBox();
      this.LB_REPLIES.padding = 5;

      this.barHeight = 100;

      const geometry = new THREE.PlaneGeometry( 1, 1, 1 );
      const material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
      this.topBar = new THREE.Mesh( geometry, material );
      this.bottomBar = new THREE.Mesh( geometry, material );

      this.resetLetterBox();

      this.tGuiPanel.widget.add(this.topBar);
      this.tGuiPanel.widget.add(this.bottomBar);
      resolve();
    });
  }

  getCurrentListener(): ModuleObject {
    if (this.currentEntry) {
      return this.currentEntry.listener;
    }
    return this.listener;
  }

  getCurrentOwner(): ModuleObject {
    if (this.currentEntry) {
      return this.currentEntry.owner;
    }
    return this.owner;
  }

  StartConversation(dialog: DLGObject, owner: ModuleObject, listener: ModuleObject = GameState.PartyManager.party[0]) {
    this.currentCameraAnimation = undefined;
    this.LBL_MESSAGE.setText(' ');
    this.LB_REPLIES.clearItems();
    this.open();
    this.owner = owner;
    this.listener = listener;
    GameState.ConversationPaused = false;
    this.ended = false;
    this.currentEntry = null;
    this.state = -1;
    if (this.owner == GameState.PartyManager.party[0]) {
      let old_listener = this.listener;
      this.listener = this.owner;
      this.owner = old_listener;
    }
    this.unequipHeadItem = false;
    this.unequipItems = false;
    GameState.Mode = EngineMode.DIALOG
    this.isListening = true;
    this.canLetterbox = false;
    this.letterBoxed = false;
    this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 + 100 / 2;
    this.bottomBar.position.y = -this.topBar.position.y;
    this.resetLetterBox();
    this.LB_REPLIES.hide();
    
    if (!dialog) {
      dialog = this.owner.getConversation();
    }

    if (!(dialog instanceof DLGObject)) {
      this.endConversation();
    }

    let result = this.loadDialog(dialog);
    if(!result) return;
    this.updateCamera();
    this.isListening = true;
    this.updateTextPosition();
    this.startingEntry = null;
    this.getNextEntry(this.dialog.startingList, (entry: DLGNode) => {
      this.startingEntry = entry;
      let isBarkDialog = entry.replies.length == 1 && !entry.cameraAngle && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
      if (isBarkDialog) {
        this.endConversation();
        this.manager.InGameBark.bark(entry);
        entry.runScripts();
        let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
        if (reply) {
          reply.runScripts();
        }
      } else {
        if(this.listener.isPM){
          GameState.PartyManager.MakePlayerLeader();
          this.listener = this.dialog.listener = GameState.PartyManager.party[0];
        }
        if (this.startingEntry.cameraAngle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA) {
          this.setPlaceableCamera(this.startingEntry.cameraAnimation > -1 ? this.startingEntry.cameraAnimation : this.startingEntry.cameraID);//, this.startingEntry.cameraAngle);
        } else {
          GameState.currentCamera = GameState.camera_dialog;
          this.updateCamera();
        }
        this.canLetterbox = true;
        if (this.dialog.isAnimatedCutscene) {
          GameState.holdWorldFadeInForDialog = true;
          this.dialog.loadStuntCamera().then(() => {
            this.dialog.loadStuntActors().then(() => {
              this.beginDialog();
            });
          });
        } else {
          GameState.holdWorldFadeInForDialog = false;
          this.dialog.loadStuntCamera().then(() => {
            this.dialog.loadStuntActors().then(() => {
              this.beginDialog();
            });
          });
        }
      }
    });
  }

  loadDialog(dialog: DLGObject) {
    this.conversation_name = ``;
    if(dialog){
      this.conversation_name = dialog.resref;
      this.dialog = dialog;
      this.dialog.owner = this.owner;
      this.dialog.listener = this.listener;
      switch (this.dialog.getConversationType()) {
        case DLGConversationType.COMPUTER:
          this.close();
          this.manager.InGameComputer.StartConversation(this.dialog, this.owner, this.listener);
          return false;
        default:
          return true;
        break;
      }
    }
    return false;
  }

  beginDialog() {
    if (this.dialog.ambientTrack != '') {
      AudioLoader.LoadMusic(this.dialog.ambientTrack).then((data: ArrayBuffer) => {
        AudioEngine.GetAudioEngine().stopBackgroundMusic();
        AudioEngine.GetAudioEngine().setDialogBackgroundMusic(data);
        this.showEntry(this.startingEntry);
      }, () => {
        this.showEntry(this.startingEntry);
      });
    } else {
      this.showEntry(this.startingEntry);
    }
  }

  getNextEntry(entryLinks: any[] = [], callback?: Function) {
    if (!entryLinks.length) {
      this.endConversation();
      return;
    }
    this.isListening = true;
    this.updateTextPosition();
    let entryIndex = this.dialog.getNextEntryIndex(entryLinks);
    let entry = this.dialog.getEntryByIndex(entryIndex);
    if (entry) {
      if (typeof callback === 'function') {
        callback(entry);
      } else {
        this.showEntry(entry);
      }
    } else {
      this.endConversation();
      return;
    }
  }

  isContinueDialog(node: DLGNode) {
    let returnValue = null;
    let parsedText = node.getCompiledString();
    if (typeof node.entries !== 'undefined') {
      returnValue = parsedText == '' && node.entries.length;
    } else if (typeof node.replies !== 'undefined') {
      returnValue = parsedText == '' && node.replies.length;
    } else {
      returnValue = parsedText == '';
    }
    return returnValue;
  }

  isEndDialog(node: DLGNode) {
    let returnValue = null;
    let parsedText = node.getCompiledString();
    if (typeof node.entries !== 'undefined') {
      returnValue = parsedText == '' && !node.entries.length;
    } else if (typeof node.replies !== 'undefined') {
      returnValue = parsedText == '' && !node.replies.length;
    } else {
      returnValue = parsedText == '';
    }
    return returnValue;
  }

  playerSkipEntry(currentEntry: DLGNode) {
    if (this.currentEntry != null) {
      if(!this.currentEntry.skippable) return;
      this.currentEntry.checkList.isSkipped = true;
      this.updateCamera();
      this.audioEmitter.stop();
      this.showReplies(this.currentEntry);
    }
  }

  showEntry(entry: DLGNode) {
    this.state = 0;
    entry.initProperties();
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    GameState.VideoEffectManager.SetVideoEffect(entry.getVideoEffect());
    this.LBL_MESSAGE.setText(entry.getCompiledString());
    this.LB_REPLIES.hide();
    this.LB_REPLIES.clearItems();
    this.updateTextPosition();
    this.currentEntry = entry;

    entry.updateJournal();

    //participant animations
    this.updateEntryAnimations(entry);

    //participant facing
    if (!this.dialog.isAnimatedCutscene) {
      if (this.currentEntry.listener instanceof ModuleObject && this.currentEntry.speaker instanceof ModuleObject) {
        if (!this.currentEntry.listener.lockDialogOrientation && this.currentEntry.listener instanceof ModuleCreature) {
          this.currentEntry.listener.FacePoint(this.currentEntry.speaker.position);
        }
        if (!this.currentEntry.speaker.lockDialogOrientation && this.currentEntry.speaker instanceof ModuleCreature) {
          this.currentEntry.speaker.FacePoint(this.currentEntry.listener.position);
        }
      }
    }

    //Node Delay
    let nodeDelay = 3000;
    if (!this.dialog.isAnimatedCutscene && entry.delay > -1) {
      nodeDelay = entry.delay * 1000;
    }
    entry.setNodeDelay(nodeDelay);

    //Node camera
    this.setNodeCamera(entry);

    //scripts
    entry.runScripts();

    //replies
    const replies = this.dialog.getAvailableReplies(entry);
    for (let i = 0; i < replies.length; i++) {
      let reply = replies[i];
      this.LB_REPLIES.addItem(
        this.LB_REPLIES.children.length + 1 + '. ' + reply.getCompiledString(), 
        { 
          onClick: (e: any) => {
            this.onReplySelect(reply);
          } 
        }
      );
    }
    this.LB_REPLIES.updateList();

    //vo
    entry.playVoiceOver(this.audioEmitter);
  }

  setNodeCamera(entry: DLGNode){
    if (entry.camFieldOfView != -1) {
      GameState.camera_animated.fov = entry.camFieldOfView;
    }
    if (!entry.cameraID) {
      GameState.currentCamera = GameState.camera_dialog;
      this.updateCamera();
    } else {
      GameState.currentCamera = GameState.getCameraById(entry.cameraID);
    }
    if (
      entry.cameraAngle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA || 
      this.dialog.animatedCamera && 
      entry.cameraAnimation > -1
    ) {
      if (entry.cameraAnimation > -1) {
        entry.checkList.cameraAnimationComplete = false;
        this.setAnimatedCamera(entry.cameraAnimation);
        const animationName = this.getCUTAnimationName(entry.cameraAnimation);
        this.currentCameraAnimation = this.dialog.animatedCamera.getAnimationByName(animationName);
        this.dialog.animatedCamera.animationManager.currentAnimation = this.currentCameraAnimation;
        this.dialog.animatedCamera.animationManager.currentAnimationState = {elapsed: 0, loop: false};
      }else{
        entry.checkList.cameraAnimationComplete = true;
      }
    } else if (entry.cameraAngle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA) {
      this.setPlaceableCamera(entry.cameraAnimation > -1 ? entry.cameraAnimation : entry.cameraID);
    } else {
      GameState.currentCamera = GameState.camera_dialog;
      this.updateCamera();
    }
  }

  onReplySelect(reply: DLGNode) {
    if (reply) {
      this.LB_REPLIES.hide();
      this.LB_REPLIES.clearItems();
      reply.updateJournal();
      reply.runScripts();
      this.getNextEntry(reply.entries);
    } else {
      this.endConversation();
    }
  }

  showReplies(entry: DLGNode) {
    this.state = 1;
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    this.currentEntry = null;
    let isContinueDialog = entry.replies.length == 1 && this.isContinueDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
    let isEndDialog = entry.replies.length == 1 && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
    if (isContinueDialog) {
      let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
      if (reply) {
        reply.runScripts();
        this.getNextEntry(reply.entries);
      } else {
        this.endConversation();
      }
      return;
    } else if (isEndDialog) {
      let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
      if (reply) {
        reply.runScripts();
      }
      this.endConversation();
      return;
    } else if (!entry.replies.length) {
      this.endConversation();
      return;
    }
    try {
      if(this.getCurrentOwner() instanceof ModuleCreature){
        const anim = this.getCurrentOwner().animationConstantToAnimation( ModuleCreatureAnimState.LISTEN )
        if(anim){
          this.getCurrentOwner().dialogPlayAnimation(anim);
        }
      }
    } catch (e: any) {
    }
    try {
      if(this.getCurrentListener() instanceof ModuleCreature){
        const anim = this.getCurrentListener().animationConstantToAnimation( ModuleCreatureAnimState.LISTEN )
        if(anim){
          this.getCurrentListener().dialogPlayAnimation(anim);
        }
      }
    } catch (e: any) {
    }
    this.isListening = false;
    this.updateTextPosition();
    this.LB_REPLIES.show();
    this.LB_REPLIES.updateList();
    this.updateCamera();
    this.state = 1;
  }

  endConversation(aborted = false) {
    if (GameState.ConversationPaused) {
      this.ended = true;
    }
    this.audioEmitter.stop();
    this.close();
    GameState.currentCamera = GameState.camera;
    this.state = -1;
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
      if(this.dialog.isAnimatedCutscene){
        GameState.FadeOverlayManager.FadeInFromCutscene();
      }
    }
    GameState.VideoEffectManager.SetVideoEffect(-1);
  }

  updateEntryAnimations(entry: DLGNode) {
    if (this.dialog.isAnimatedCutscene) {
      console.log('animcut')
      for (let i = 0; i < entry.animations.length; i++) {
        let participant = entry.animations[i];
        console.log('participant', participant)
        if (this.dialog.stuntActors.has(participant.participant)) {
          try {
            const actor = this.dialog.stuntActors.get(participant.participant);
            if(actor.moduleObject instanceof ModuleCreature){
              const animationName = this.getCUTAnimationName(participant.animation);
              const odysseyAnimation = actor.animations ? actor.animations.find( a => a.name.toLocaleLowerCase() == animationName.toLocaleLowerCase()) : undefined;
              if(odysseyAnimation){
                actor.moduleObject.dialogPlayOdysseyAnimation(odysseyAnimation);
              }
            }
          } catch (e: any) {
            console.error(e);
          }
        } else {
          let actor = GameState.ModuleObjectManager.GetObjectByTag(participant.participant);
          console.log('actor', actor)
          if (actor && participant.animation >= 10000) {
            let anim = actor.animationConstantToAnimation(participant.animation);
            console.log('anim', anim)
            if (anim) {
              actor.dialogPlayAnimation(anim);
            } else {
              console.error('Anim', participant.animation);
            }
          }else{
            let anim = this.getDialogAnimation(participant.animation);
            console.log('anim', anim)
            if (anim) {
              actor.dialogPlayAnimation(anim);
            } else {
              console.error('Anim', participant.animation);
            }  
          }
        }
      }
    } else {

      if (this.currentEntry.speaker instanceof ModuleCreature) {
        const anim = this.currentEntry.speaker.animationConstantToAnimation( ModuleCreatureAnimState.TALK_NORMAL )
        if(anim){
          this.currentEntry.speaker.dialogPlayAnimation(anim);
        }
      }

      if (this.currentEntry.listener instanceof ModuleCreature) {
        const anim = this.currentEntry.listener.animationConstantToAnimation( ModuleCreatureAnimState.LISTEN )
        if(anim){
          this.currentEntry.listener.dialogPlayAnimation(anim);
        }
      }

      for (let i = 0; i < entry.animations.length; i++) {
        let participant = entry.animations[i];
        let actor = GameState.ModuleObjectManager.GetObjectByTag(participant.participant);
        if (actor && participant.animation >= 10000) {
          let anim = actor.animationConstantToAnimation(participant.animation);
          if (anim) {
            actor.dialogPlayAnimation(anim);
          } else {
            console.error('Anim', participant.animation);
          }
        }
      }
    }
  }

  getCUTAnimationName(index = 0) {
    return 'CUT' + ('000' + (index - 1200 + 1)).slice(-3) + 'W';
  }

  getDialogAnimation(index = 0): any{
    return undefined;
  }

  setPlaceableCamera(nCamera: number) {
    let cam = GameState.getCameraById(nCamera);
    if (cam) {
      GameState.currentCamera = cam;
    }
  }

  setAnimatedCamera(nCamera: number) {
    if (this.dialog.animatedCamera instanceof OdysseyModel3D) {
      this.currentCameraAnimation = this.dialog.animatedCamera.getAnimationByName(this.getCUTAnimationName(nCamera));
      if(this.currentCameraAnimation){
        this.currentEntry.checkList.cameraAnimationComplete = false;
      }
    }
  }

  updateCamera() {
    if (!this.dialog) return;

    if (this.dialog.isAnimatedCutscene && this.dialog.animatedCamera instanceof OdysseyModel3D) {
      GameState.currentCamera = GameState.camera_animated;
      return;
    }

    if (this.isListening) {
      if (this.currentEntry) {
        if (
          this.currentEntry.cameraAngle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA
        ) {
          this.setPlaceableCamera(this.currentEntry.cameraAnimation > -1 ? this.currentEntry.cameraAnimation : this.currentEntry.cameraID);//, this.startingEntry.cameraAngle);
        }else if (
          this.currentEntry.cameraAngle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA && 
          this.dialog.animatedCamera instanceof OdysseyModel3D
        ) {
          this.setAnimatedCamera(this.currentEntry.cameraAnimation);
          GameState.currentCamera = GameState.camera_animated;
        } else {
          GameState.currentCamera = GameState.camera_dialog;
          if (
            this.currentEntry.cameraAngle == DLGCameraAngle.ANGLE_SPEAKER && 
            this.currentEntry.listener instanceof ModuleObject
          ) {
            this.setCameraAngleSpeaker();
          } else if (
            this.currentEntry.cameraAngle == DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER && 
            this.currentEntry.listener instanceof ModuleObject
          ) {
            this.setCameraAngleSpeakerBehindPlayer();
          } else {
            let position = this.currentEntry.speaker.position.clone().sub(new THREE.Vector3(1 * Math.cos(this.currentEntry.speaker.rotation.z - Math.PI / 1.5), 1 * Math.sin(this.currentEntry.speaker.rotation.z - Math.PI / 1.5), -1.75));
            GameState.camera_dialog.position.set(position.x, position.y, position.z);
            GameState.camera_dialog.lookAt(this.currentEntry.speaker.position.clone().add({
              x: 0,
              y: 0,
              z: this.currentEntry.speaker.getCameraHeight()
            } as THREE.Vector3));
          }
        }
      } else {
        GameState.currentCamera = GameState.camera_dialog;
        let position = this.getCurrentListener().position.clone().sub(new THREE.Vector3(-1.5 * Math.cos(this.getCurrentListener().rotation.z - Math.PI / 4), -1.5 * Math.sin(this.getCurrentListener().rotation.z - Math.PI / 4), -1.75));
        GameState.camera_dialog.position.set(position.x, position.y, position.z);
        GameState.camera_dialog.lookAt(
          this.getCurrentOwner().position.clone().add(
            new THREE.Vector3(
              0, 0, this.getCurrentOwner().getCameraHeight()
            )
          )
        );
      }
    } else {
      GameState.currentCamera = GameState.camera_dialog;
      let position = this.getCurrentListener().position.clone().sub(new THREE.Vector3(0.5 * Math.cos(this.getCurrentListener().rotation.z - Math.PI / 4 * 2), 0.5 * Math.sin(this.getCurrentListener().rotation.z - Math.PI / 4 * 2), -1.75));
      GameState.camera_dialog.position.set(position.x, position.y, position.z);
      GameState.camera_dialog.lookAt(
        this.getCurrentListener().position.clone().add(
          new THREE.Vector3(0, 0, this.getCurrentListener().getCameraHeight())
        )
      );
    }
  }

  setCameraAngleSpeaker(){
    let position = this.currentEntry.speaker.position.clone();
    let lposition = this.currentEntry.listener.position.clone();
    let lookAt = this.currentEntry.speaker.position.clone();
    if (this.currentEntry.speaker.model instanceof OdysseyModel3D) {
      if (this.currentEntry.speaker.model.camerahook instanceof THREE.Object3D) {
        lookAt = this.currentEntry.speaker.model.camerahook.getWorldPosition(new THREE.Vector3());
        position = this.currentEntry.speaker.model.camerahook.getWorldPosition(new THREE.Vector3());
      } else {
        position.add({
          x: 0,
          y: 0,
          z: this.currentEntry.speaker.getCameraHeight()
        } as THREE.Vector3);
      }
    }
    if (this.currentEntry.listener.model instanceof OdysseyModel3D) {
      if (this.currentEntry.listener.model.camerahook instanceof THREE.Object3D) {
        lposition = this.currentEntry.listener.model.camerahook.getWorldPosition(new THREE.Vector3());
      } else {
        lposition.add(
          new THREE.Vector3(
            0, 0, this.currentEntry.listener.getCameraHeight()
          )
        );
      }
    }
    position.add({
      x: -0.5,
      y: 0.25,
      z: 0
    } as THREE.Vector3);
    let AxisFront = new THREE.Vector3();
    let tangent = lookAt.clone().sub(lposition.clone());
    let atan = Math.atan2(-tangent.y, -tangent.x);
    AxisFront.x = Math.cos(atan);
    AxisFront.y = Math.sin(atan);
    AxisFront.normalize();
    position.add(AxisFront);
    GameState.camera_dialog.position.copy(position);
    GameState.camera_dialog.lookAt(lookAt);
  }

  setCameraAngleSpeakerBehindPlayer(){
    let position = this.currentEntry.listener.position.clone();
    let lookAt = this.currentEntry.speaker.position.clone();
    if (this.currentEntry.speaker.model instanceof OdysseyModel3D) {
      if (this.currentEntry.speaker.model.camerahook instanceof THREE.Object3D) {
        lookAt = this.currentEntry.speaker.model.camerahook.getWorldPosition(new THREE.Vector3());
        lookAt.add({
          x: 0,
          y: 0,
          z: 0.5
        } as THREE.Vector3);
      } else {
        position.add(new THREE.Vector3(0, 0, 1.5));
      }
    }
    if (this.currentEntry.listener.model instanceof OdysseyModel3D) {
      if (this.currentEntry.listener.model.camerahook instanceof THREE.Object3D) {
        position = this.currentEntry.listener.model.camerahook.getWorldPosition(new THREE.Vector3());
      } else {
        position.add(new THREE.Vector3(0, 0, 1.5));
      }
    }
    position.add(new THREE.Vector3(-1, 1, 0));
    let AxisFront = new THREE.Vector3();
    let tangent = lookAt.clone().sub(position.clone());
    let atan = Math.atan2(-tangent.y, -tangent.x);
    AxisFront.x = Math.cos(atan);
    AxisFront.y = Math.sin(atan);
    AxisFront.normalize();
    position.add(AxisFront);
    GameState.camera_dialog.position.copy(position);
    GameState.camera_dialog.lookAt(lookAt);
  }

  getCameraMidPoint(pointA: THREE.Vector3, pointB: THREE.Vector3, percentage = 0.5) {
    let dir = pointB.clone().sub(pointA);
    let len = dir.length();
    dir = dir.normalize().multiplyScalar(len * percentage);
    return pointA.clone().add(dir);
  }

  update(delta: number = 0) {
    super.update(delta);
    if (!this.dialog)
      return;

    this.updateLetterBox(delta);

    this.dialog.stuntActors.forEach( async (actor) => {
      const moduleObject = actor.moduleObject;
      if(moduleObject){
        moduleObject.box.setFromObject(moduleObject.container);
      }
    });

    if (this.dialog.isAnimatedCutscene) {
      if (this.dialog.animatedCamera instanceof OdysseyModel3D) {
        this.dialog.animatedCamera.animationManager.update(delta);
        this.dialog.animatedCamera.camerahook.updateMatrixWorld();
        // let pos = new THREE.Vector3(this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).x, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).y, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).z);
        this.dialog.animatedCamera.camerahook.getWorldPosition(GameState.camera_animated.position);//.copy(pos);
        GameState.camera_animated.quaternion.copy(this.dialog.animatedCamera.camerahook.quaternion);
        GameState.camera_animated.updateProjectionMatrix();
        GameState.currentCamera = GameState.camera_animated;
        if(this.dialog.animatedCamera.animationManager.currentAnimation != this.currentCameraAnimation){
          if(this.currentEntry) this.currentEntry.checkList.cameraAnimationComplete = true;
        }
      }
    } else {
      if (this.dialog.animatedCamera instanceof OdysseyModel3D) {
        this.dialog.animatedCamera.animationManager.update(delta);
        this.dialog.animatedCamera.camerahook.updateMatrixWorld();
        // let pos = new THREE.Vector3(this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).x, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).y, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).z);
        this.dialog.animatedCamera.camerahook.getWorldPosition(GameState.camera_animated.position);//.copy(pos);
        GameState.camera_animated.quaternion.copy(this.dialog.animatedCamera.camerahook.quaternion);
        GameState.camera_animated.updateProjectionMatrix();
        if(this.dialog.animatedCamera.animationManager.currentAnimation != this.currentCameraAnimation){
          if(this.currentEntry) this.currentEntry.checkList.cameraAnimationComplete = true;
        }
      } else {
        this.updateCamera();
      }
    }

    if(GameState.ConversationPaused) return;

    if(this.currentEntry){
      if(this.currentEntry.update(delta)){
        this.showReplies(this.currentEntry);
      }
    }

  }

  updateTextPosition() {
    if (typeof this.LBL_MESSAGE.text.geometry !== 'undefined') {
      this.LBL_MESSAGE.text.geometry.computeBoundingBox();
      let bb = this.LBL_MESSAGE.text.geometry.boundingBox;
      let height = Math.abs(bb.min.y) + Math.abs(bb.max.y);
      let width = Math.abs(bb.min.x) + Math.abs(bb.max.x);
      let padding = 10;
      if (this.isListening) {
        this.LBL_MESSAGE.widget.position.y = -GameState.ResolutionManager.getViewportHeight() / 2 + 50;
      } else {
        this.LBL_MESSAGE.widget.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - 50;
      }
      this.LBL_MESSAGE.box = new THREE.Box2(new THREE.Vector2(this.LBL_MESSAGE.widget.position.x - width / 2, this.LBL_MESSAGE.widget.position.y - height / 2), new THREE.Vector2(this.LBL_MESSAGE.widget.position.x + width / 2, this.LBL_MESSAGE.widget.position.y + height / 2));
    }
  }

  resize() {
    this.resetLetterBox();
    this.recalculatePosition();
    this.updateTextPosition();
  }

  recalculatePosition() {
    this.LB_REPLIES.extent.left = -(GameState.ResolutionManager.getViewportWidth() / 2) + this.LB_REPLIES.extent.width / 2 + 16;
    this.LB_REPLIES.extent.top = GameState.ResolutionManager.getViewportHeight() / 2 - this.LB_REPLIES.extent.height / 2;
    this.LB_REPLIES.calculatePosition();
    this.LB_REPLIES.calculateBox();
    this.resetLetterBox();
  }

  updateLetterBox(delta: number = 0){
    if (this.dialog.isAnimatedCutscene) {
      if (this.canLetterbox) {
        this.bottomBar.position.y = -(GameState.ResolutionManager.getViewportHeight() / 2) + 100 / 2;
        this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - 100 / 2;
        this.letterBoxed = true;
        this.LBL_MESSAGE.show();
      }
    }else{
      if (this.canLetterbox) {
        if (this.bottomBar.position.y < -(GameState.ResolutionManager.getViewportHeight() / 2) + 100 / 2) {
          this.bottomBar.position.y += 5;
          this.topBar.position.y -= 5;
          this.LBL_MESSAGE.hide();
        } else {
          this.bottomBar.position.y = -(GameState.ResolutionManager.getViewportHeight() / 2) + 100 / 2;
          this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - 100 / 2;
          this.letterBoxed = true;
          this.LBL_MESSAGE.show();
        }
      }
    }
  }

  resetLetterBox() {
    this.topBar.scale.x = this.bottomBar.scale.x = GameState.ResolutionManager.getViewportWidth();
    this.topBar.scale.y = this.bottomBar.scale.y = this.barHeight;
    if (!this.letterBoxed) {
      this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 + 100 / 2;
      this.bottomBar.position.y = -this.topBar.position.y;
    } else {
      this.bottomBar.position.y = -(GameState.ResolutionManager.getViewportHeight() / 2) + 100 / 2;
      this.topBar.position.y = GameState.ResolutionManager.getViewportHeight() / 2 - 100 / 2;
    }
  }

  triggerControllerAPress() {
    if (this.LB_REPLIES.selectedItem) {
      this.LB_REPLIES.selectedItem.click();
    }
  }

  triggerControllerDUpPress() {
    this.LB_REPLIES.directionalNavigate('up');
  }

  triggerControllerDDownPress() {
    this.LB_REPLIES.directionalNavigate('down');
  }
  
}
