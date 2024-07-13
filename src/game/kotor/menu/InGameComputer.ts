import { AudioLoader } from "../../../audio/AudioLoader";
import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel } from "../../../gui";
import { ModuleObject } from "../../../module";
import { DLGObject } from "../../../resource/DLGObject";
import { DLGNode } from "../../../resource/DLGNode";
import { DLGConversationType } from "../../../enums/dialog/DLGConversationType";
import { DLGCameraAngle } from "../../../enums/dialog/DLGCameraAngle";
import { AudioEngine } from "../../../audio/AudioEngine";

/**
 * InGameComputer class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameComputer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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
  listener: ModuleObject;
  
  ended: boolean = false;

  dialog: DLGObject;
  currentEntry: DLGNode;
  startingEntry: DLGNode;

  isListening: boolean;
  state: number = 0;

  conversation_name: string = '';

  constructor(){
    super();
    this.gui_resref = 'computer';
    this.background = '1600x1200comp0';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  StartConversation(dialog: DLGObject, owner: ModuleObject, listener: ModuleObject = GameState.PartyManager.party[0]) {
    if(listener.isPM){
      GameState.PartyManager.MakePlayerLeader();
      listener =  GameState.PartyManager.party[0];
    }
    this.LB_MESSAGE.clearItems();
    this.LB_REPLIES.clearItems();
    this.open();
    this.owner = owner;
    this.listener = listener;
    this.ended = false;
    this.currentEntry = null;
    if (this.owner == GameState.PartyManager.party[0]) {
      let old_listener = this.listener;
      this.listener = this.owner;
      this.owner = old_listener;
    }
    GameState.Mode = EngineMode.DIALOG;
    this.isListening = true;
    this.LB_REPLIES.show();
    if (dialog instanceof DLGObject) {
      let result = this.loadDialog(dialog);
      if(!result) return;
      this.isListening = true;
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
          this.close();
          this.manager.InGameDialog.StartConversation(dialog, this.owner, this.listener);
          return false;
        break;
      }
    }
    return false;
  }

  update(delta: number = 0) {
    super.update(delta);
    if (!this.dialog)
      return;

    if(GameState.ConversationPaused) return;

    this.manager.InGameComputerCam.hide();
    this.manager.InGameComputer.show();
    GameState.currentCamera = GameState.camera_dialog;

    if(this.currentEntry){
      if(this.currentEntry.cameraAngle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA){
        this.manager.InGameComputer.hide();
        this.manager.InGameComputerCam.show();
        this.manager.InGameComputerCam.update(delta);
        GameState.currentCamera = GameState.getCameraById(this.currentEntry.cameraID);
      }
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
      this.audioEmitter.stop();
      this.showReplies(this.currentEntry);
    }
  }

  showEntry(entry: DLGNode) {
    this.state = 0;
    entry.initProperties();
    entry.resetChecklist();
    if (GameState.Mode != EngineMode.DIALOG)
      return;

    //Computer Screen Message
    this.LB_MESSAGE.show();
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(entry.getCompiledString());
    this.LB_MESSAGE.updateList();

    //User Reply Options
    this.LB_REPLIES.show();
    this.LB_REPLIES.clearItems();

    this.currentEntry = entry;
    GameState.VideoEffectManager.SetVideoEffect(entry.getVideoEffect());

    entry.updateJournal();

    if(entry.cameraAngle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA){
      this.manager.InGameComputer.hide();
      this.manager.InGameComputerCam.show();
      GameState.currentCamera = GameState.getCameraById(this.currentEntry.cameraID);
    }

    //Node Delay
    let nodeDelay = 3000;
    if (!this.dialog.isAnimatedCutscene && entry.delay > -1) {
      nodeDelay = entry.delay * 1000;
    }
    entry.setNodeDelay(nodeDelay);

    //scripts
    entry.runScripts();
    
    //replies
    const replies = this.dialog.getAvailableReplies(entry);
    for (let i = 0; i < replies.length; i++) {
      let reply = replies[i];
      if(!this.isContinueDialog(reply)){
        this.LB_REPLIES.addItem(
          this.LB_REPLIES.children.length + 1 + '. ' + reply.getCompiledString(), 
          {
            onClick: (e) => {
              this.onReplySelect(reply);
            }
          }
        );
      }
    }
    this.LB_REPLIES.updateList();
  
    //vo
    entry.playVoiceOver(this.audioEmitter);
    entry.checkList.voiceOverError = true;
    this.state = 0;
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
    
    this.isListening = false;
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
    this.audioEmitter.stop();
    this.close();
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
    GameState.VideoEffectManager.SetVideoEffect(-1);
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
