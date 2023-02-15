/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { AudioLoader } from "../../../audio/AudioLoader";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIListBox, MenuManager } from "../../../gui";
import { ModuleCreature, ModuleObject } from "../../../module";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { GFFObject } from "../../../resource/GFFObject";
import { GFFStruct } from "../../../resource/GFFStruct";
import { LIPObject } from "../../../resource/LIPObject";
import * as THREE from "three";
import { ModuleObjectManager } from "../../../managers/ModuleObjectManager";
import { DLGObject } from "../../../resource/DLGObject";
import { DLGNode } from "../../../resource/DLGNode";
import { DLGConversationType } from "../../../enums/dialog/DLGConversationType";

/* @file
* The InGameComputer menu class.
*/

export class InGameComputer extends GameMenu {

  engineMode: EngineMode = EngineMode.DIALOG;
  LBL_STATIC1: GUILabel;
  LBL_STATIC3: GUILabel;
  LBL_STATIC4: GUILabel;
  LBL_STATIC2: GUILabel;
  LBL_REP_UNITS_ICON: GUILabel;
  LBL_COMP_SPIKES_ICON: GUILabel;
  LBL_REP_SKILL_ICON: GUILabel;
  LBL_COMP_SKILL_ICON: GUILabel;
  LBL_REP_UNITS: GUILabel;
  LBL_REP_SKILL: GUILabel;
  LBL_COMP_SPIKES: GUILabel;
  LB_REPLIES: GUIListBox;
  LBL_COMP_SKILL: GUILabel;
  LBL_COMP_SKILL_VAL: GUILabel;
  LBL_COMP_SPIKES_VAL: GUILabel;
  LBL_REP_SKILL_VAL: GUILabel;
  LBL_REP_UNITS_VAL: GUILabel;
  LB_MESSAGE: GUIListBox;
  LBL_OBSCURE: GUILabel;
  owner: ModuleObject;
  listener: any;
  paused: boolean;
  ended: boolean;
  dialog: DLGObject;
  currentEntry: DLGNode;
  vo_id: string;
  isListening: boolean;
  onEndConversationAbort: any;
  onEndConversation: any;
  isAnimatedCutscene: boolean;
  ambientTrack: any;
  state: number;
  startingEntry: any;

  conversation_name: string = '';

  constructor(){
    super();
    this.gui_resref = 'computer';
    this.background = '1600x1200comp0';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  Hide() {
    super.Hide();
    GameState.currentCamera = GameState.camera;
  }

  Show() {
    super.Show();
  }

  StartConversation(dialog: DLGObject, owner: ModuleObject, listener: ModuleObject = GameState.player) {
    this.LB_MESSAGE.clearItems();
    this.LB_REPLIES.clearItems();
    this.Open();
    this.owner = owner;
    this.listener = listener;
    this.paused = false;
    this.ended = false;
    this.currentEntry = null;
    if (this.owner == GameState.player) {
      let old_listener = this.listener;
      this.listener = this.owner;
      this.owner = old_listener;
    }
    GameState.Mode = EngineMode.DIALOG;
    this.vo_id = '';
    this.isListening = true;
    this.LB_REPLIES.hide();
    if (dialog instanceof DLGObject) {
      let result = this.loadDialog(dialog);
      if(!result) return;
      this.isListening = true;
      this.updateTextPosition();
      this.startingEntry = null;
      this.getNextEntry(this.dialog.startingList, async (entry: any) => {
        this.startingEntry = entry;
        this.beginDialog();
      });
    } else {
      this.endConversation();
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

  loadDialog(dialog: DLGObject) {
    this.conversation_name = ``;
    if(dialog){
      this.conversation_name = dialog.resref;
      this.dialog = dialog;
      this.dialog.owner = this.owner;
      this.dialog.listener = this.listener;
      switch (this.dialog.getConversationType()) {
        case DLGConversationType.COMPUTER:
          return true;
        break;
        case DLGConversationType.CONVERSATION:
        default:
          this.Close();
          MenuManager.InGameDialog.StartConversation(dialog, this.owner, this.listener);
          return false;
        break;
      }
    }
    return false;
  }

  Update(delta: number = 0) {
    super.Update(delta);
    if (!this.dialog)
      return;

    if(this.paused) return;

    if(this.currentEntry){
      if(this.currentEntry.update(delta)){
        this.showReplies(this.currentEntry);
      }
    }

  }

  getNextEntry(entryLinks: DLGNode[] = [], callback?: Function) {
    console.log('getNextEntry', entryLinks);
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
    if (typeof node.entries !== 'undefined') {
      returnValue = node.text == '' && node.entries.length;
    } else if (typeof node.replies !== 'undefined') {
      returnValue = node.text == '' && node.replies.length;
    } else {
      returnValue = node.text == '';
    }
    return returnValue;
  }

  isEndDialog(node: DLGNode) {
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

  playerSkipEntry(entry: DLGNode) {
    if (this.currentEntry instanceof DLGNode) {
      this.audioEmitter.Stop();
      this.showReplies(this.currentEntry);
    }
  }

  showEntry(entry: DLGNode) {
    this.state = 0;
    entry.initProperties();
    if (GameState.Mode != EngineMode.DIALOG)
      return;

    //Computer Screen Message
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(entry.getCompiledString());

    //User Reply Options
    this.LB_REPLIES.hide();
    this.LB_REPLIES.clearItems();

    this.updateTextPosition();
    this.currentEntry = entry;

    entry.updateJournal();

    //Node Delay
    let nodeDelay = 3000;
    if (!this.dialog.isAnimatedCutscene && entry.delay > -1) {
      nodeDelay = entry.delay * 1000;
    }
    entry.setNodeDelay(nodeDelay);

    this.getAvailableReplies(entry);
    
    // if (entry.speakerTag != '') {
    //   entry.speaker = ModuleObjectManager.GetObjectByTag(entry.speakerTag);
    // } else {
    //   entry.speaker = this.owner;
    // }
    // if (entry.listenerTag != '') {
    //   if (entry.listenerTag == 'PLAYER') {
    //     this.listener = GameState.player;
    //   } else {
    //     this.listener = ModuleObjectManager.GetObjectByTag(entry.listenerTag);
    //   }
    // } else {
    //   entry.listener = GameState.player;
    // }

    //scripts
    entry.runScripts();
  
    //vo
    entry.playVoiceOver(this.audioEmitter);
    this.state = 0;
  }
  
  getAvailableReplies(entry: DLGNode) {
    let replyLinks = entry.getActiveReplies();
    for (let i = 0; i < replyLinks.length; i++) {
      let reply = this.dialog.getReplyByIndex(replyLinks[i]);
      if (reply) {
        this.LB_REPLIES.addItem(
          this.LB_REPLIES.children.length + 1 + '. ' + reply.getCompiledString(), 
          (e: any) => {
            this.onReplySelect(reply);
          }
        );
      } else {
        console.warn('getAvailableReplies() Failed to find reply at index: ' + replyLinks[i]);
      }
    }
    this.LB_REPLIES.updateList();
  }

   showReplies(entry: DLGNode) {
    this.state = 1;
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    this.currentEntry = undefined;
    let isContinueDialog = entry.replies.length == 1 && this.isContinueDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
    let isEndDialog = entry.replies.length == 1 && this.isEndDialog(this.dialog.getReplyByIndex(entry.replies[0].index));
    console.log('showReplies', entry, isContinueDialog, isEndDialog);
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
    // try {
    //   if(this.getCurrentOwner() instanceof ModuleCreature){
    //     (this.getCurrentOwner() as ModuleCreature).dialogPlayAnimation('listen', true);
    //   }
    // } catch (e: any) {
    // }
    // try {
    //   if(this.getCurrentListener() instanceof ModuleCreature){
    //     (this.getCurrentListener() as ModuleCreature).dialogPlayAnimation('listen', true);
    //   }
    // } catch (e: any) {
    // }
    this.isListening = false;
    this.updateTextPosition();
    this.LB_REPLIES.show();
    this.LB_REPLIES.updateList();
    // this.UpdateCamera();
    this.state = 1;
  }

  onReplySelect(reply: DLGNode) {
    if(reply){
      reply.updateJournal();
      reply.runScripts();
      this.getNextEntry(reply.entries);
    } else {
      console.error(`InGameComputer.onReplySelect: Aborting conversation because an invalid node was supplied`);
      this.endConversation();
    }
  }

  endConversation(aborted: boolean = false) {
    if (GameState.ConversationPaused) {
      this.ended = true;
    }
    this.audioEmitter.Stop();
    this.Close();
    GameState.currentCamera = GameState.camera;
    this.state = -1;
    if(this.dialog){
      if (!aborted) {
        if(this.dialog.scripts.onEndConversation){
          this.dialog.scripts.onEndConversation.run(this.owner, 0);
        }
      }else{
        if(this.dialog.scripts.onEndConversationAbort){
          this.dialog.scripts.onEndConversationAbort.run(this.owner, 0);
        }
      }
    }
  }

  updateTextPosition() {
    if (typeof this.LB_MESSAGE.text.geometry !== 'undefined') {
      this.LB_MESSAGE.text.geometry.computeBoundingBox();
      let bb = this.LB_MESSAGE.text.geometry.boundingBox;
      let height = Math.abs(bb.min.y) + Math.abs(bb.max.y);
      let width = Math.abs(bb.min.x) + Math.abs(bb.max.x);
      let padding = 10;
      if (this.isListening) {
        this.LB_MESSAGE.widget.position.y = -window.innerHeight / 2 + (100 - height);
      } else {
        this.LB_MESSAGE.widget.position.y = window.innerHeight / 2 - (100 - height / 2);
      }
      this.LB_MESSAGE.box = new THREE.Box2(new THREE.Vector2(this.LB_MESSAGE.widget.position.x - width / 2, this.LB_MESSAGE.widget.position.y - height / 2), new THREE.Vector2(this.LB_MESSAGE.widget.position.x + width / 2, this.LB_MESSAGE.widget.position.y + height / 2));
    }
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
  
}
