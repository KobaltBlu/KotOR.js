/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { AudioLoader } from "../../../audio/AudioLoader";
import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox } from "../../../gui";
import { ModuleCreature, ModuleObject } from "../../../module";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { GFFObject } from "../../../resource/GFFObject";
import { GFFStruct } from "../../../resource/GFFStruct";
import { LIPObject } from "../../../resource/LIPObject";
import * as THREE from "three";
import { ModuleObjectManager } from "../../../managers/ModuleObjectManager";

/* @file
* The InGameComputer menu class.
*/

export class InGameComputer extends GameMenu {

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
  nodeIndex: number;
  owner: ModuleObject;
  listener: any;
  paused: boolean;
  ended: boolean;
  currentEntry: any;
  entryList: any[];
  replyList: any[];
  startingList: any[];
  vo_id: string;
  isListening: boolean;
  onEndConversationAbort: any;
  onEndConversation: any;
  isAnimatedCutscene: boolean;
  ambientTrack: any;
  state: number;
  startingEntry: any;

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

  StartConversation(gff: GFFObject, owner: ModuleObject, listener = GameState.player) {
    this.LB_MESSAGE.clearItems();
    this.Open();
    this.LB_REPLIES.clearItems();
    this.nodeIndex = 0;
    this.owner = owner;
    this.listener = listener;
    this.paused = false;
    this.ended = false;
    this.currentEntry = null;
    if (this.audioEmitter === undefined) {
    }
    GameState.inDialog = true;
    this.entryList = [];
    this.replyList = [];
    this.startingList = [];
    this.vo_id = '';
    this.isListening = true;
    this.LB_REPLIES.hide();
    if (gff instanceof GFFObject) {
      GameState.inDialog = true;
      if (gff.json.fields.VO_ID)
        this.vo_id = gff.json.fields.VO_ID.value;
      if (gff.json.fields.EndConverAbort)
        this.onEndConversationAbort = gff.json.fields.EndConverAbort.value;
      if (gff.json.fields.EndConversation)
        this.onEndConversation = gff.json.fields.EndConversation.value;
      if (gff.json.fields.AnimatedCut)
        this.isAnimatedCutscene = gff.json.fields.AnimatedCut.value ? true : false;
      if (gff.json.fields.AmbientTrack)
        this.ambientTrack = gff.json.fields.AmbientTrack.value;
      for (let i = 0; i < gff.json.fields.EntryList.structs.length; i++) {
        this.entryList.push(this._parseEntryStruct(gff.json.fields.EntryList.structs[i].fields));
      }
      for (let i = 0; i < gff.json.fields.ReplyList.structs.length; i++) {
        this.replyList.push(this._parseReplyStruct(gff.json.fields.ReplyList.structs[i].fields));
      }
      for (let i = 0; i < gff.json.fields.StartingList.structs.length; i++) {
        let _node = gff.json.fields.StartingList.structs[i].fields;
        let node = {
          isActive: _node.Active.value,
          index: _node.Index.value
        };
        this.startingList.push(node);
      }
      this.updateTextPosition();
      let begin = () => {
        if (this.ambientTrack != '') {
          AudioLoader.LoadMusic(this.ambientTrack, (data: Buffer) => {
            GameState.audioEngine.stopBackgroundMusic();
            GameState.audioEngine.SetDialogBackgroundMusic(data);
            this.showEntry(this.startingEntry);
          }, () => {
            this.showEntry(this.startingEntry);
          });
        } else {
          this.showEntry(this.startingEntry);
        }
      };
      this.startingEntry = null;
      this.getNextEntry(this.startingList, (entry: any) => {
        this.startingEntry = entry;
        if (entry.replies.length == 1 && this.isEndDialog(this.replyList[entry.replies[0].index])) {
          this.EndConversation();
        } else {
          begin();
        }
      });
    } else {
      this.Close();
      GameState.inDialog = false;
    }
  }

  getNextEntry(entries: any[] = [], callback?: Function) {
    if (!entries.length) {
      this.EndConversation();
    }
    this.isListening = true;
    this.updateTextPosition();
    let totalEntries = entries.length;
    let entryLoop = async (idx = 0) => {
      if (idx < totalEntries) {
        let entry = entries[idx];
        if (entry.isActive == '') {
          if (typeof callback === 'function') {
            callback(this.entryList[entry.index]);
          } else {
            this.showEntry(this.entryList[entry.index]);
          }
        } else {
          let script = NWScript.Load(entry.isActive);
          if (script instanceof NWScriptInstance) {
            console.log('dialog', script);
            script.name = entry.isActive;
            console.log(this.owner);
            script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
              console.log('dialog', script, bSuccess);
              if (bSuccess) {
                if (typeof callback === 'function') {
                  callback(this.entryList[entry.index]);
                } else {
                  this.showEntry(this.entryList[entry.index]);
                }
              } else {
                entryLoop(++idx);
              }
            });
          } else {
            entryLoop(++idx);
          }
        }
      } else {
        this.EndConversation();
      }
    };
    entryLoop();
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

  isContinueDialog(node: any) {
    if (typeof node.entries !== 'undefined') {
      return node.text == '' && node.entries.length;
    } else if (typeof node.replies !== 'undefined') {
      return node.text == '' && node.replies.length;
    } else {
      return true;
    }
  }

  PlayerSkipEntry(entry: any) {
    if (entry) {
      clearTimeout(entry.timeout);
      this.audioEmitter.Stop();
      this.showReplies(entry);
    }
  }

  async showEntry(entry: any) {
    if (!GameState.inDialog)
      return;
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(entry.text.split('##')[0], () => {
    });
    this.LB_REPLIES.hide();
    this.LB_REPLIES.clearItems();
    this.updateTextPosition();
    this.currentEntry = entry;
    entry.timeout = null;
    if (entry.speakerTag != '') {
      entry.speaker = ModuleObjectManager.GetObjectByTag(entry.speakerTag);
    } else {
      entry.speaker = this.owner;
    }
    if (entry.listenerTag != '') {
      if (entry.listenerTag == 'PLAYER') {
        this.listener = GameState.player;
      } else {
        this.listener = ModuleObjectManager.GetObjectByTag(entry.listenerTag);
      }
    } else {
      entry.listener = GameState.player;
    }
    let checkList = {
      voiceOverComplete: false,
      alreadyAllowed: false,
      scriptComplete: true,
      delayComplete: true,
      isComplete: function (entry: any) {
        console.log('checkList', entry);
        if (this.alreadyAllowed) {
          return false;
        }
        if (this.voiceOverComplete && this.delayComplete) {
          this.alreadyAllowed = true;
          return true;
        }
        return false;
      }
    };
    let nodeDelay = 0;
    this.GetAvailableReplies(entry);
    if (entry.delay > -1) {
      nodeDelay = entry.delay * 1000;
    } else {
      checkList.delayComplete = true;
    }
    if (entry.script != '') {
      checkList.scriptComplete = false;
      let script = NWScript.Load(entry.script);
      if (script instanceof NWScriptInstance) {
        script.name = entry.script;
        script.runAsync(this.owner, 0).then( () => {
          checkList.scriptComplete = true;
        });
      } else {
        checkList.scriptComplete = true;
      }
    }
    console.error('entry delay', entry, nodeDelay);
    this.showReplies(entry);
    if (entry.sound != '') {
      console.log('lip', entry.sound);
      LIPObject.Load(entry.sound).then( (lip: LIPObject) => {
        if (entry.speaker instanceof ModuleCreature) {
          entry.speaker.setLIP(lip);
        }
      });
      this.audioEmitter.PlayStreamWave(entry.sound, null, (error = false) => {
        checkList.voiceOverComplete = true;
      });
    } else if (entry.vo_resref != '') {
      console.log('lip', entry.vo_resref);
      LIPObject.Load(entry.vo_resref).then( (lip: LIPObject) => {
        if (entry.speaker instanceof ModuleCreature) {
          entry.speaker.setLIP(lip);
        }
      });
      this.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
        checkList.voiceOverComplete = true;
      });
    } else {
      console.error('VO ERROR', entry, nodeDelay);
    }
    this.state = 0;
  }

  loadReplies(entry: any) {
    if (!entry.replies.length) {
    } else {
      if (entry.replies.length == 1 && this.isContinueDialog(entry.replies[0])) {
        let reply = this.replyList[entry.replies[0].index];
        this.getNextEntry(reply.entries);
      } else {
      }
    }
  }

  async showReplies(entry: any) {
    if (!GameState.inDialog)
      return;
    console.log('showReplies', entry);
    if (entry.replies.length == 1 && this.isContinueDialog(this.replyList[entry.replies[0].index])) {
      let reply = this.replyList[entry.replies[0].index];
      console.log('We seem to have found a dialog continue entry we are going to attempt to auto pick and continue', reply);
      if (reply.script == '') {
        let _reply = this.replyList[reply.index];
        console.log('showEntry.replies', _reply);
        this.getNextEntry(reply.entries);
      } else {
        let script = NWScript.Load(reply.script);
        if (script instanceof NWScriptInstance) {
          console.log('dialog', script);
          script.name = entry.script;
          console.log(this.owner);
          script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
            console.log('dialog', script, bSuccess);
            if (bSuccess) {
              let _reply = this.replyList[reply.index];
              console.log('showEntry.replies', _reply);
            }
            this.getNextEntry(reply.entries);
          });
        } else {
          this.getNextEntry(reply.entries);
        }
      }
      return;
    } else if (entry.replies.length == 1 && this.isEndDialog(this.replyList[entry.replies[0].index])) {
      let reply = this.replyList[entry.replies[0].index];
      console.log('We seem to have found a dialog end entry we are going to attempt to end', reply);
      if (reply.script == '') {
        let _reply = this.replyList[reply.index];
        console.log('showEntry.replies', _reply);
        this.EndConversation();
      } else {
        let script = NWScript.Load(reply.script);
        if (script instanceof NWScriptInstance) {
          console.log('dialog', script);
          script.name = entry.script;
          console.log(this.owner);
          script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
            console.log('dialog', script, bSuccess);
            if (bSuccess) {
              let _reply = this.replyList[reply.index];
              console.log('showEntry.replies', _reply);
            }
            this.EndConversation();
          });
        } else {
          this.EndConversation();
        }
      }
      return;
    } else if (!entry.replies.length) {
      console.log('No more replies and can\'t continue');
      this.EndConversation();
    }
    this.isListening = false;
    this.updateTextPosition();
    this.LB_REPLIES.show();
    console.log('DEBUG: Dialog Reply Options');
    for (let i = 0; i < this.LB_REPLIES.children.length; i++) {
      try {
        console.log(this.LB_REPLIES.children[i].text.text);
      } catch (e: any) {
      }
    }
    this.state = 1;
  }

  GetAvailableReplies(entry: any) {
    let totalReplies = entry.replies.length;
    console.log('GetAvailableReplies', entry);
    let replyLoop = async (idx = 0) => {
      if (idx < totalReplies) {
        console.log('replyLoop', entry.replies[idx], idx, idx < totalReplies);
        let reply = entry.replies[idx];
        if (reply.isActive == '') {
          let _reply = this.replyList[reply.index];
          console.log('showEntry.replies', _reply);
          this.LB_REPLIES.addItem(this.StringTokenParser(this.LB_REPLIES.children.length + 1 + '. ' + _reply.text.split('##')[0]), (e: any) => {
            this.onReplySelect(_reply);
          });
          replyLoop(++idx);
        } else {
          let script = NWScript.Load(reply.isActive);
          if (script instanceof NWScriptInstance) {
            console.log('dialog', script);
            script.name = entry.isActive;
            console.log(this.owner);
            script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
              console.log('dialog', script, bSuccess);
              if (bSuccess) {
                let _reply = this.replyList[reply.index];
                console.log('showEntry.replies', _reply);
                this.LB_REPLIES.addItem(this.StringTokenParser(this.LB_REPLIES.children.length + 1 + '. ' + _reply.text.split('##')[0]), () => {
                  this.onReplySelect(_reply);
                });
              }
              replyLoop(++idx);
            });
          } else {
            replyLoop(++idx);
          }
        }
      } else {
      }
    };
    replyLoop();
  }

  StringTokenParser(text = '', entry?: any) {
    if (this.owner instanceof ModuleCreature) {
      text = text.replace('<FullName>', GameState.player.firstName);
      text = text.replace('<CUSTOM31>', () => {
        return (3).toString();
      });
      text = text.replace('<CUSTOM32>', () => {
        return (5).toString();
      });
      text = text.replace('<CUSTOM33>', () => {
        return (8).toString();
      });
      text = text.replace('<CUSTOM34>', () => {
        return (10).toString();
      });
      text = text.replace('<CUSTOM35>', () => {
        return (2).toString();
      });
      text = text.replace('<CUSTOM41>', () => {
        return (1).toString();
      });
      text = text.replace('<CUSTOM42>', () => {
        return (4).toString();
      });
      text = text.replace('<CUSTOM43>', () => {
        return (4).toString();
      });
      text = text.replace('<CUSTOM44>', () => {
        return (5).toString();
      });
      text = text.replace('<CUSTOM45>', () => {
        return (6).toString();
      });
    }
    return text;
  }

  async onReplySelect(reply: any) {
    if (reply.script != '') {
      let script = NWScript.Load(reply.script);
      if (script instanceof NWScriptInstance) {
        console.log('dialog.reply', script);
        script.name = reply.script;
        console.log(this.owner);
        script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
        });
        this.getNextEntry(reply.entries);
      } else {
        this.getNextEntry(reply.entries);
      }
    } else {
      this.getNextEntry(reply.entries);
    }
  }

  async OnBeforeConversationEnd(onEnd?: Function) {
    if (this.onEndConversation != '') {
      let script = NWScript.Load(this.onEndConversation);
      if (script instanceof NWScriptInstance) {
        script.name = this.onEndConversation;
        script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
          if (typeof onEnd === 'function')
            onEnd();
        });
      } else {
        if (typeof onEnd === 'function')
          onEnd();
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

  EndConversation(aborted = false) {
    this.audioEmitter.Stop();
    this.Close();
    GameState.currentCamera = GameState.camera;
    GameState.inDialog = false;
    this.state = -1;
    window.setTimeout(async () => {
      if (!aborted) {
        if (this.onEndConversation != '') {
          let script = NWScript.Load(this.onEndConversation);
          if (script instanceof NWScriptInstance) {
            script.name = this.onEndConversation;
            script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
            });
          }
        }
      } else {
        if (this.onEndConversationAbort != '') {
          let script = NWScript.Load(this.onEndConversationAbort);
          if (script instanceof NWScriptInstance) {
            script.name = this.onEndConversationAbort;
            script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
            });
          }
        }
      }
    });
  }

  _parseEntryStruct(struct: any) {
    let node: any = {
      animations: [],
      cameraAngle: 0,
      cameraID: 0,
      cameraAnimation: -1,
      camFieldOfView: -1,
      comment: '',
      delay: 0,
      fadeType: 0,
      listenerTag: '',
      plotIndex: -1,
      plotXPPercentage: 1,
      quest: '',
      replies: [],
      script: '',
      sound: '',
      soundExists: 0,
      speakerTag: '',
      text: '',
      vo_resref: '',
      waitFlags: 0,
      fade: {
        type: 0,
        length: 0,
        delay: 0,
        color: {
          r: 0,
          g: 0,
          b: 0
        }
      }
    };
    if (typeof struct.Listener !== 'undefined')
      node.listenerTag = struct.Listener.value;
    if (typeof struct.Speaker !== 'undefined')
      node.speakerTag = struct.Speaker.value;
    if (typeof struct.VO_ResRef !== 'undefined')
      node.vo_resref = struct.VO_ResRef.value;
    if (typeof struct.Sound !== 'undefined')
      node.sound = struct.Sound.value;
    if (typeof struct.CameraID !== 'undefined')
      node.cameraID = struct.CameraID.value;
    if (typeof struct.CameraAnimation !== 'undefined')
      node.cameraAnimation = struct.CameraAnimation.value;
    if (typeof struct.CameraAngle !== 'undefined')
      node.cameraAngle = struct.CameraAngle.value;
    if (typeof struct.Script !== 'undefined')
      node.script = struct.Script.value;
    if (typeof struct.CamFieldOfView !== 'undefined')
      node.camFieldOfView = struct.CamFieldOfView.value;
    if (typeof struct.RepliesList !== 'undefined') {
      for (let i = 0; i < struct.RepliesList.structs.length; i++) {
        let _node = struct.RepliesList.structs[i].fields;
        node.replies.push({
          isActive: _node.Active.value,
          index: _node.Index.value,
          isChild: _node.IsChild.value
        });
      }
    }
    if (typeof struct.AnimList !== 'undefined') {
      for (let i = 0; i < struct.AnimList.structs.length; i++) {
        let _node = struct.AnimList.structs[i].fields;
        node.animations.push({
          animation: _node.Animation.value,
          participant: _node.Participant.value.toLowerCase()
        });
      }
    }
    if (typeof struct.Text !== 'undefined')
      node.text = struct.Text.value.GetValue();
    if (typeof struct.Delay !== 'undefined')
      node.delay = struct.Delay.value == 4294967295 ? -1 : struct.Delay.value;
    if (typeof struct.FadeType !== 'undefined')
      node.fade.type = struct.FadeType.value;
    if (typeof struct.FadeLength !== 'undefined')
      node.fade.length = struct.FadeLength.value;
    if (typeof struct.FadeDelay !== 'undefined')
      node.fade.delay = struct.FadeDelay.value;
    return node;
  }

  _parseReplyStruct(struct: any) {
    let node: any = {
      animations: [],
      cameraAngle: 0,
      cameraID: 0,
      comment: '',
      delay: 0,
      fadeType: 0,
      listenerTag: '',
      plotIndex: -1,
      plotXPPercentage: 1,
      quest: '',
      entries: [],
      script: '',
      sound: '',
      soundExists: 0,
      speakerTag: '',
      text: '',
      vo_resref: '',
      waitFlags: 0,
      fade: {
        type: 0,
        length: 0,
        delay: 0,
        color: {
          r: 0,
          g: 0,
          b: 0
        }
      }
    };
    if (typeof struct.Listener !== 'undefined')
      node.listenerTag = struct.Listener.value;
    if (typeof struct.Speaker !== 'undefined')
      node.speakerTag = struct.Speaker.value;
    if (typeof struct.Script !== 'undefined')
      node.script = struct.Script.value;
    if (typeof struct.EntriesList !== 'undefined') {
      for (let i = 0; i < struct.EntriesList.structs.length; i++) {
        let _node = struct.EntriesList.structs[i].fields;
        node.entries.push({
          isActive: _node.Active.value,
          index: _node.Index.value,
          isChild: _node.IsChild.value
        });
      }
    }
    if (typeof struct.CameraID !== 'undefined')
      node.cameraID = struct.CameraID.value;
    if (typeof struct.CameraAngle !== 'undefined')
      node.cameraAngle = struct.CameraAngle.value;
    if (typeof struct.Text !== 'undefined')
      node.text = struct.Text.value.GetValue();
    if (typeof struct.Delay !== 'undefined')
      node.delay = struct.Delay.value == 4294967295 ? -1 : struct.Delay.value;
    if (typeof struct.FadeType !== 'undefined')
      node.fade.type = struct.FadeType.value;
    if (typeof struct.FadeLength !== 'undefined')
      node.fade.length = struct.FadeLength.value;
    if (typeof struct.FadeDelay !== 'undefined')
      node.fade.delay = struct.FadeDelay.value;
    return node;
  }
  
}
