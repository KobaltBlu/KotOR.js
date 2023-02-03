/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIProtoItem, MenuManager } from "../../../gui";

import * as THREE from "three";
import { ModuleCreature, ModuleObject } from "../../../module";
import { ResourceLoader } from "../../../resource/ResourceLoader";
import { ResourceTypes } from "../../../resource/ResourceTypes";
import { LIPObject } from "../../../resource/LIPObject";
import { DLGObject } from "../../../resource/DLGObject";
import { DLGConversationType } from "../../../enums/dialog/DLGConversationType";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { OdysseyModel3D } from "../../../three/odyssey";
import { GFFObject } from "../../../resource/GFFObject";
import { AudioLoader } from "../../../audio/AudioLoader";
import { FadeOverlayManager } from "../../../managers/FadeOverlayManager";
import { ModuleObjectManager } from "../../../managers/ModuleObjectManager";
import { DLGNode } from "../../../resource/DLGNode";

/* @file
* The InGameDialog menu class.
*/

export class InGameDialog extends GameMenu {

  LBL_MESSAGE: GUILabel;
  LB_REPLIES: GUIListBox;
  dialog: any;
  currentEntry: DLGNode;
  listener: any;
  owner: any;
  nodeIndex: number;
  paused: boolean;
  ended: boolean;
  state: number;
  unequipHeadItem: boolean;
  unequipItems: boolean;
  isListening: boolean;
  canLetterbox: boolean;
  letterBoxed: boolean;
  topBar: any;
  bottomBar: any;
  startingEntry: DLGNode;
  conversation_name: string;
  barHeight: any;

  constructor(){
    super();
    this.gui_resref = 'dialog';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
  return new Promise<void>((resolve, reject) => {
    this.LBL_MESSAGE.setText('');

    this.LB_REPLIES.extent.left = -(window.innerWidth/2) + this.LB_REPLIES.extent.width/2 + 16;
    this.LB_REPLIES.extent.top = (window.innerHeight/2) - this.LB_REPLIES.extent.height/2;
    this.LB_REPLIES.calculatePosition();
    this.LB_REPLIES.calculateBox();
    this.LB_REPLIES.padding = 5;

    this.barHeight = 100;

    let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
    let material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
    this.topBar = new THREE.Mesh( geometry, material );
    this.bottomBar = new THREE.Mesh( geometry, material );

    this._resetLetterBox();

    this.tGuiPanel.widget.add(this.topBar);
    this.tGuiPanel.widget.add(this.bottomBar);
    resolve();
  });
}

Hide() {
  super.Hide();
  GameState.currentCamera = GameState.camera;
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

StartConversation(dlg: string, owner: ModuleObject, listener = GameState.player, options: any = {}) {
  options = Object.assign({ onLoad: null }, options);
  this.LBL_MESSAGE.setText(' ');
  this.LB_REPLIES.clearItems();
  this.Open();
  this.nodeIndex = 0;
  this.owner = owner;
  this.listener = listener;
  this.paused = false;
  this.ended = false;
  this.currentEntry = null;
  this.state = -1;
  if (this.owner == GameState.player) {
    let old_listener = this.listener;
    this.listener = this.owner;
    this.owner = old_listener;
  }
  this.unequipHeadItem = false;
  this.unequipItems = false;
  GameState.inDialog = true;
  this.isListening = true;
  this.canLetterbox = false;
  this.letterBoxed = false;
  this.topBar.position.y = window.innerHeight / 2 + 100 / 2;
  this.bottomBar.position.y = -this.topBar.position.y;
  this._resetLetterBox();
  this.LB_REPLIES.hide();
  if (typeof dlg != 'string' || dlg == '') {
    dlg = this.owner.GetConversation();
  }
  if (typeof dlg === 'string' && dlg != '') {
    this.LoadDialog(dlg, (gff: GFFObject) => {
      this.UpdateCamera();
      this.isListening = true;
      this.updateTextPosition();
      this.startingEntry = null;
      this.getNextEntry(this.dialog.startingList, async (entry: any) => {
        this.startingEntry = entry;
        let isBarkDialog = entry.replies.length == 1 && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
        if (isBarkDialog) {
          this.EndConversation();
          MenuManager.InGameBark.bark(entry);
          entry.runScripts();
          let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
          if (reply) {
            reply.runScripts();
          }
        } else {
          if (this.startingEntry.cameraAngle == 6) {
            this.SetPlaceableCamera(this.startingEntry.cameraAnimation > -1 ? this.startingEntry.cameraAnimation : this.startingEntry.cameraID);//, this.startingEntry.cameraAngle);
          } else {
            GameState.currentCamera = GameState.camera_dialog;
            this.UpdateCamera();
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
      if (typeof options.onLoad === 'function')
        options.onLoad();
    });
  } else {
    if (typeof options.onLoad === 'function')
      options.onLoad();
    this.EndConversation();
  }
}

beginDialog() {
  if (this.dialog.ambientTrack != '') {
    AudioLoader.LoadMusic(this.dialog.ambientTrack, (data: Buffer) => {
      GameState.audioEngine.stopBackgroundMusic();
      GameState.audioEngine.SetDialogBackgroundMusic(data);
      this.showEntry(this.startingEntry);
    }, () => {
      this.showEntry(this.startingEntry);
    });
  } else {
    this.showEntry(this.startingEntry);
  }
}

async getNextEntry(entryLinks: any[] = [], callback?: Function) {
  console.log('getNextEntry', entryLinks);
  if (!entryLinks.length) {
    this.EndConversation();
    return;
  }
  this.isListening = true;
  this.updateTextPosition();
  let entryIndex = await this.dialog.getNextEntryIndex(entryLinks);
  let entry = this.dialog.getEntryByIndex(entryIndex);
  if (entry) {
    if (typeof callback === 'function') {
      callback(entry);
    } else {
      this.showEntry(entry);
    }
  } else {
    this.EndConversation();
    return;
  }
}

isContinueDialog(node: any) {
  let returnValue = null;
  if (typeof node.entries !== 'undefined') {
    returnValue = node.text == '' && node.entries.length;
  } else if (typeof node.replies !== 'undefined') {
    returnValue = node.text == '' && node.replies.length;
  } else {
    returnValue = node.text == '';
  }
  return returnValue;
}

isEndDialog(node: any) {
  let returnValue = null;
  if (typeof node.entries !== 'undefined') {
    returnValue = node.text == '' && !node.entries.length;
  } else if (typeof node.replies !== 'undefined') {
    returnValue = node.text == '' && !node.replies.length;
  } else {
    returnValue = node.text == '';
  }
  console.log('isEndDialog', node, returnValue);
  return returnValue;
}

PlayerSkipEntry(currentEntry: DLGNode) {
  if (this.currentEntry != null) {
    this.currentEntry.checkList.isSkipped = true;
    clearTimeout(this.currentEntry.timeout);
    this.UpdateCamera();
    this.audioEmitter.Stop();
    this.showReplies(this.currentEntry);
  }
}

async showEntry(entry: DLGNode) {
  this.state = 0;
  entry.initProperties();
  if (!GameState.inDialog)
    return;
  GameState.VideoEffect = entry.getVideoEffect();
  this.LBL_MESSAGE.setText(entry.getCompiledString());
  this.LB_REPLIES.hide();
  this.LB_REPLIES.clearItems();
  this.updateTextPosition();
  this.currentEntry = entry;

  entry.updateJournal();

  //participant animations
  this.UpdateEntryAnimations(entry);

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
  if (entry.camFieldOfView != -1) {
    GameState.camera_animated.fov = entry.camFieldOfView;
  }
  if (!entry.cameraID) {
    GameState.currentCamera = GameState.camera_dialog;
    this.UpdateCamera();
  } else {
    GameState.currentCamera = GameState.getCameraById(entry.cameraID);
  }
  this.GetAvailableReplies(entry);
  if (this.dialog.isAnimatedCutscene && (entry.cameraAngle == 4 || this.dialog.cameraModel)) {
    if (entry.cameraAnimation > -1) {
      entry.checkList.cameraAnimationComplete = false;
      this.SetAnimatedCamera(entry.cameraAnimation, () => {
        entry.checkList.cameraAnimationComplete = true;
        if (entry.checkList.isComplete()) {
          this.showReplies(entry);
        }
      });
    }
  } else if (entry.cameraAngle == 6) {
    this.SetPlaceableCamera(entry.cameraAnimation > -1 ? entry.cameraAnimation : entry.cameraID);//, entry.cameraAngle);
  } else {
    GameState.currentCamera = GameState.camera_dialog;
    this.UpdateCamera();
  }

  //scripts
  entry.runScripts();

  //vo
  entry.playVoiceOver(this.audioEmitter);
}

async GetAvailableReplies(entry: any) {
  let replyLinks = await entry.getActiveReplies();
  for (let i = 0; i < replyLinks.length; i++) {
    let reply = this.dialog.getReplyByIndex(replyLinks[i]);
    if (reply) {
      this.LB_REPLIES.addItem(this.LB_REPLIES.children.length + 1 + '. ' + reply.getCompiledString(), (e: any) => {
        this.onReplySelect(reply);
      });
    } else {
      console.warn('GetAvailableReplies() Failed to find reply at index: ' + replyLinks[i]);
    }
  }
  this.LB_REPLIES.updateList();
}

async onReplySelect(reply: DLGNode) {
  if (reply) {
    reply.updateJournal();
    reply.runScripts();
    this.getNextEntry(reply.entries);
  } else {
    this.EndConversation();
  }
}

async showReplies(entry: any) {
  this.state = 1;
  if (!GameState.inDialog)
    return;
  this.currentEntry = null;
  let isContinueDialog = entry.replies.length == 1 && this.isContinueDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
  let isEndDialog = entry.replies.length == 1 && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
  console.log('showReplies', entry, isContinueDialog, isEndDialog);
  if (isContinueDialog) {
    let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
    if (reply) {
      reply.runScripts();
      this.getNextEntry(reply.entries);
    } else {
      this.EndConversation();
    }
    return;
  } else if (isEndDialog) {
    let reply = this.dialog.getReplyByIndex(entry.replies[0].index);
    if (reply) {
      reply.runScripts();
    }
    this.EndConversation();
    return;
  } else if (!entry.replies.length) {
    this.EndConversation();
    return;
  }
  try {
    if(this.getCurrentOwner() instanceof ModuleCreature){
      (this.getCurrentOwner() as ModuleCreature).dialogPlayAnimation('listen', true);
    }
  } catch (e: any) {
  }
  try {
    if(this.getCurrentListener() instanceof ModuleCreature){
      (this.getCurrentListener() as ModuleCreature).dialogPlayAnimation('listen', true);
    }
  } catch (e: any) {
  }
  this.isListening = false;
  this.updateTextPosition();
  this.LB_REPLIES.show();
  this.LB_REPLIES.updateList();
  this.UpdateCamera();
  this.state = 1;
}

LoadDialog(resref = '', onLoad?: Function) {
  this.conversation_name = resref;
  this.dialog = new DLGObject(resref);
  this.dialog.owner = this.owner;
  this.dialog.listener = this.listener;
  this.dialog.load().then(() => {
    switch (this.dialog.getConversationType()) {
    case DLGConversationType.COMPUTER:
      this.Close();
      MenuManager.InGameComputer.StartConversation(this.dialog.gff, this.owner, this.listener);
      break;
    case DLGConversationType.CONVERSATION:
    default:
      if (typeof onLoad === 'function')
        onLoad(this.dialog.gff);
      break;
    }
  }).catch(() => {
    this.EndConversation();
    console.error('InGameDialog.LoadDialog() Failed to load conversation resref: ' + resref);
  });
}

async OnBeforeConversationEnd(onEnd?: Function) {
  if (this.dialog.onEndConversation != '') {
    let script = await NWScript.Load(this.dialog.onEndConversation);
    if (script instanceof NWScriptInstance) {
      script.name = this.dialog.onEndConversation;
      script.run(this.getCurrentOwner(), 0, (bSuccess: boolean) => {
        if (typeof onEnd === 'function')
          onEnd();
      });
    } else {
      if (typeof onEnd === 'function')
        onEnd();
    }
  }
}

EndConversation(aborted = false) {
  if (this.paused) {
    this.ended = true;
  }
  this.audioEmitter.Stop();
  this.Close();
  GameState.currentCamera = GameState.camera;
  GameState.inDialog = false;
  this.state = -1;
  if (this.dialog.animatedCamera instanceof OdysseyModel3D)
    this.dialog.animatedCamera.animationManager.currentAnimation = undefined;
  window.setTimeout(async () => {
    if (!aborted) {
      if (this.dialog.onEndConversation != '') {
        let script = await NWScript.Load(this.dialog.onEndConversation);
        if (script instanceof NWScriptInstance) {
          script.name = this.dialog.onEndConversation;
          script.run(this.getCurrentOwner(), 0, (bSuccess: boolean) => {
          });
        }
      }
    } else {
      if (this.dialog.onEndConversationAbort != '') {
        let script = await NWScript.Load(this.dialog.onEndConversationAbort);
        if (script instanceof NWScriptInstance) {
          script.name = this.dialog.onEndConversationAbort;
          script.run(this.getCurrentOwner(), 0, (bSuccess: boolean) => {
          });
        }
      }
    }
  });
  while (GameState.group.stunt.children.length) {
    GameState.group.stunt.remove(GameState.group.stunt.children[0]);
  }
  for (let actor in this.dialog.stunt) {
    try {
      if (this.dialog.stunt[actor].model.skins) {
        for (let i = 0; i < this.dialog.stunt[actor].model.skins.length; i++) {
          this.dialog.stunt[actor].model.skins[i].frustumCulled = true;
        }
      }
      this.dialog.stunt[actor].clearAllActions();
    } catch (e: any) {
    }
  }
  this.dialog.stunt = {};
}

PauseConversation() {
  this.paused = true;
}

ResumeConversation() {
  this.paused = false;
  if (this.ended) {
    this.EndConversation();
  } else {
    if (this.currentEntry && this.currentEntry.checkList.alreadyAllowed) {
      this.showReplies(this.currentEntry);
    } else {
    }
  }
}

UpdateEntryAnimations(entry: any) {
  if (this.dialog.isAnimatedCutscene) {
    for (let i = 0; i < entry.animations.length; i++) {
      let participant = entry.animations[i];
      if (this.dialog.stunt[participant.participant]) {
        try {
          this.dialog.stunt[participant.participant].dialogPlayAnimation(this.GetActorAnimation(participant.animation), true);
        } catch (e: any) {
        }
      } else {
        let actor = ModuleObjectManager.GetObjectByTag(participant.participant);
        if (actor && participant.animation >= 10000) {
          let anim = actor.animationConstantToAnimation(participant.animation);
          if (anim) {
            actor.dialogPlayAnimation(anim.name, anim.looping == '1');
          } else {
            console.error('Anim', participant.animation);
          }
        }
      }
    }
  } else {
    if (this.currentEntry.speaker instanceof ModuleCreature) {
      this.currentEntry.speaker.dialogPlayAnimation('tlknorm', true);
    }
    if (this.currentEntry.listener instanceof ModuleCreature) {
      this.currentEntry.listener.dialogPlayAnimation('listen', true);
    }
    for (let i = 0; i < entry.animations.length; i++) {
      let participant = entry.animations[i];
      let actor = ModuleObjectManager.GetObjectByTag(participant.participant);
      if (actor && participant.animation >= 10000) {
        let anim = actor.animationConstantToAnimation(participant.animation);
        if (anim) {
          actor.dialogPlayAnimation(anim.name, anim.looping == '1');
        } else {
          console.error('Anim', participant.animation);
        }
      }
    }
  }
}

GetActorAnimation(index = 0) {
  return 'CUT' + ('000' + (index - 1200 + 1)).slice(-3) + 'W';
}

SetPlaceableCamera(nCamera: number) {
  let cam = GameState.getCameraById(nCamera);
  if (cam) {
    GameState.currentCamera = cam;
  }
}

SetAnimatedCamera(nCamera: number, onComplete?: Function) {
  if (this.dialog.animatedCamera instanceof OdysseyModel3D) {
    this.dialog.animatedCamera.playAnimation(this.GetActorAnimation(nCamera), false, () => {
      window.setTimeout(() => {
        if (typeof onComplete === 'function')
          onComplete();
      });
    });
    return;
  }
}

UpdateCamera() {
  if (!this.dialog)
    return;
  if (this.dialog.isAnimatedCutscene && this.dialog.animatedCamera instanceof OdysseyModel3D) {
    GameState.currentCamera = GameState.camera_animated;
    return;
  }
  if (this.isListening) {
    if (this.currentEntry) {
      if (this.currentEntry.cameraAngle == 4 && this.dialog.animatedCamera instanceof OdysseyModel3D) {
        this.SetAnimatedCamera(this.currentEntry.cameraAnimation);
        GameState.currentCamera = GameState.camera_animated;
      } else {
        if (this.currentEntry.cameraAngle == 1 && this.currentEntry.listener instanceof ModuleObject) {
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
        } else if (this.currentEntry.cameraAngle == 2 && this.currentEntry.listener instanceof ModuleObject) {
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

GetCameraMidPoint(pointA: THREE.Vector3, pointB: THREE.Vector3, percentage = 0.5) {
  let dir = pointB.clone().sub(pointA);
  let len = dir.length();
  dir = dir.normalize().multiplyScalar(len * percentage);
  return pointA.clone().add(dir);
}

Update(delta: number = 0) {
  super.Update(delta);
  if (!this.dialog)
    return;
  if (this.dialog.isAnimatedCutscene) {
    if (this.dialog.animatedCamera instanceof OdysseyModel3D) {
      this.dialog.animatedCamera.update(delta);
      this.dialog.animatedCamera.camerahook.updateMatrixWorld();
      let pos = new THREE.Vector3(this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).x, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).y, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).z);
      GameState.camera_animated.position.copy(pos);
      GameState.camera_animated.quaternion.copy(this.dialog.animatedCamera.camerahook.quaternion);
      GameState.camera_animated.updateProjectionMatrix();
      GameState.currentCamera = GameState.camera_animated;
    }
    for (let actor in this.dialog.stunt) {
    }
    if (this.canLetterbox) {
      this.bottomBar.position.y = -(window.innerHeight / 2) + 100 / 2;
      this.topBar.position.y = window.innerHeight / 2 - 100 / 2;
      this.letterBoxed = true;
      this.LBL_MESSAGE.show();
    }
  } else {
    if (this.dialog.animatedCamera instanceof OdysseyModel3D) {
      this.dialog.animatedCamera.update(delta);
      this.dialog.animatedCamera.camerahook.updateMatrixWorld();
      let pos = new THREE.Vector3(this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).x, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).y, this.dialog.animatedCamera.camerahook.getWorldPosition(new THREE.Vector3()).z);
      GameState.camera_animated.position.copy(pos);
      GameState.camera_animated.quaternion.copy(this.dialog.animatedCamera.camerahook.quaternion);
      GameState.camera_animated.updateProjectionMatrix();
    } else {
      this.UpdateCamera();
    }
    if (this.canLetterbox) {
      if (this.bottomBar.position.y < -(window.innerHeight / 2) + 100 / 2) {
        this.bottomBar.position.y += 5;
        this.topBar.position.y -= 5;
        this.LBL_MESSAGE.hide();
      } else {
        this.bottomBar.position.y = -(window.innerHeight / 2) + 100 / 2;
        this.topBar.position.y = window.innerHeight / 2 - 100 / 2;
        this.letterBoxed = true;
        this.LBL_MESSAGE.show();
      }
    }
  }

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
      this.LBL_MESSAGE.widget.position.y = -window.innerHeight / 2 + 50;
    } else {
      this.LBL_MESSAGE.widget.position.y = window.innerHeight / 2 - 50;
    }
    this.LBL_MESSAGE.box = new THREE.Box2(new THREE.Vector2(this.LBL_MESSAGE.widget.position.x - width / 2, this.LBL_MESSAGE.widget.position.y - height / 2), new THREE.Vector2(this.LBL_MESSAGE.widget.position.x + width / 2, this.LBL_MESSAGE.widget.position.y + height / 2));
  }
}

Resize() {
  this._resetLetterBox();
  this.RecalculatePosition();
  this.updateTextPosition();
}

RecalculatePosition() {
  this.LB_REPLIES.extent.left = -(window.innerWidth / 2) + this.LB_REPLIES.extent.width / 2 + 16;
  this.LB_REPLIES.extent.top = window.innerHeight / 2 - this.LB_REPLIES.extent.height / 2;
  this.LB_REPLIES.calculatePosition();
  this.LB_REPLIES.calculateBox();
  this._resetLetterBox();
}

_resetLetterBox() {
  this.topBar.scale.x = this.bottomBar.scale.x = window.innerWidth;
  this.topBar.scale.y = this.bottomBar.scale.y = this.barHeight;
  if (!this.letterBoxed) {
    this.topBar.position.y = window.innerHeight / 2 + 100 / 2;
    this.bottomBar.position.y = -this.topBar.position.y;
  } else {
    this.bottomBar.position.y = -(window.innerHeight / 2) + 100 / 2;
    this.topBar.position.y = window.innerHeight / 2 - 100 / 2;
  }
}

triggerControllerAPress() {
  if (this.LB_REPLIES.selectedItem instanceof GUIProtoItem) {
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
