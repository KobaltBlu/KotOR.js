/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { AudioLoader } from "../../../audio/AudioLoader";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, MenuManager } from "../../../gui";
import { ModuleObjectManager } from "../../../managers/ModuleObjectManager";
import { ModuleCreature, ModuleObject } from "../../../module";
import { NWScript } from "../../../nwscript/NWScript";
import { NWScriptInstance } from "../../../nwscript/NWScriptInstance";
import { GFFObject } from "../../../resource/GFFObject";
import { LIPObject } from "../../../resource/LIPObject";
import { AsyncLoop } from "../../../utility/AsyncLoop";
import { InGameComputer as K1_InGameComputer } from "../../kotor/KOTOR";

/* @file
* The InGameComputer menu class.
*/

export class InGameComputer extends K1_InGameComputer {

  declare LBL_REP_UNITS: GUILabel;
  declare LBL_REP_SKILL: GUILabel;
  declare LBL_COMP_SPIKES: GUILabel;
  declare LBL_COMP_SKILL: GUILabel;
  declare LBL_COMP_SKILL_VAL: GUILabel;
  declare LBL_REP_SKILL_VAL: GUILabel;
  declare LBL_REP_UNITS_VAL: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LB_MESSAGE: GUIListBox;
  declare LBL_BAR2: GUILabel;
  declare LBL_COMP_SPIKES_VAL: GUILabel;
  declare LB_REPLIES: GUIListBox;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_BAR6: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'computer_p';
    this.background = 'black';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_MESSAGE.clearItems();
      resolve();
    });
  }

  Show() {
    super.Show();
  }

  StartConversation(gff: GFFObject, owner: ModuleObject, listener: ModuleObject = GameState.player) {
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
      this.audioEmitter = MenuManager.InGameDialog.audioEmitter;
    }
    GameState.Mode = EngineMode.DIALOG
    this.entryList = [];
    this.replyList = [];
    this.startingList = [];
    this.vo_id = '';
    this.isListening = true;
    this.LB_REPLIES.hide();
    if (gff instanceof GFFObject) {
      GameState.Mode = EngineMode.DIALOG
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
          isActiveParams: {
            Not: _node.Not.value,
            Param1: _node.Param1.value,
            Param2: _node.Param2.value,
            Param3: _node.Param3.value,
            Param4: _node.Param4.value,
            Param5: _node.Param5.value,
            String: _node.ParamStrA.value
          },
          isActive2Params: {
            Not: _node.Not2.value,
            Param1: _node.Param1b.value,
            Param2: _node.Param2b.value,
            Param3: _node.Param3b.value,
            Param4: _node.Param4b.value,
            Param5: _node.Param5b.value,
            String: _node.ParamStrB.value
          },
          Logic: _node.Logic.value,
          isActive: _node.Active.value,
          isActive2: _node.Active2.value,
          index: _node.Index.value
        };
        this.startingList.push(node);
      }
      this.updateTextPosition();
      let begin = () => {
        if (this.ambientTrack != '') {
          AudioLoader.LoadMusic(this.ambientTrack, (data: any) => {
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
        if (entry.isActive == '' && entry.isActive2 == '') {
          if (typeof callback === 'function') {
            callback(this.entryList[entry.index]);
          } else {
            this.showEntry(this.entryList[entry.index]);
          }
        } else if (entry.isActive != '') {
          let script = NWScript.Load(entry.isActive);
          if (script instanceof NWScriptInstance) {
            script.setScriptParam(1, entry.isActiveParams.Param1);
            script.setScriptParam(2, entry.isActiveParams.Param2);
            script.setScriptParam(3, entry.isActiveParams.Param3);
            script.setScriptParam(4, entry.isActiveParams.Param4);
            script.setScriptParam(5, entry.isActiveParams.Param5);
            script.setScriptStringParam(entry.isActiveParams.String);
            script.name = entry.isActive;
            script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
              console.log('dialog cond1', {
                entry: entry,
                script: entry.isActive,
                returnValue: bSuccess,
                params: entry.isActiveParams,
                shouldPass: entry.isActiveParams.Not == 1 && !bSuccess || entry.isActiveParams.Not == 0 && bSuccess
              });
              this.listener = GameState.player;
              if (entry.isActiveParams.Not == 1 && !bSuccess || entry.isActiveParams.Not == 0 && bSuccess) {
                if (entry.isActive2 == '') {
                  if (typeof callback === 'function') {
                    callback(this.entryList[entry.index]);
                  } else {
                    this.showEntry(this.entryList[entry.index]);
                  }
                } else {
                  let script = NWScript.Load(entry.isActive2);
                  if (script instanceof NWScriptInstance) {
                    script.setScriptParam(1, entry.isActive2Params.Param1);
                    script.setScriptParam(2, entry.isActive2Params.Param2);
                    script.setScriptParam(3, entry.isActive2Params.Param3);
                    script.setScriptParam(4, entry.isActive2Params.Param4);
                    script.setScriptParam(5, entry.isActive2Params.Param5);
                    script.setScriptStringParam(entry.isActive2Params.String);
                    script.name = entry.isActive2;
                    script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
                      console.log('dialog cond2', {
                        entry: entry,
                        script: entry.isActive2,
                        returnValue: bSuccess,
                        params: entry.isActive2Params,
                        shouldPass: entry.isActive2Params.Not == 1 && !bSuccess || entry.isActive2Params.Not == 0 && bSuccess
                      });
                      this.listener = GameState.player;
                      if (entry.isActive2Params.Not == 1 && !bSuccess) {
                        if (typeof callback === 'function') {
                          callback(this.entryList[entry.index]);
                        } else {
                          this.showEntry(this.entryList[entry.index]);
                        }
                      } else if (entry.isActive2Params.Not == 0 && bSuccess) {
                        if (typeof callback === 'function') {
                          callback(this.entryList[entry.index]);
                        } else {
                          this.showEntry(this.entryList[entry.index]);
                        }
                      } else {
                        entryLoop(++idx);
                      }
                    });
                  }
                }
              } else {
                entryLoop(++idx);
              }
            });
          }
        } else if (entry.isActive2 != '') {
          let script = NWScript.Load(entry.isActive2);
          if (script instanceof NWScriptInstance) {
            script.setScriptParam(1, entry.isActive2Params.Param1);
            script.setScriptParam(2, entry.isActive2Params.Param2);
            script.setScriptParam(3, entry.isActive2Params.Param3);
            script.setScriptParam(4, entry.isActive2Params.Param4);
            script.setScriptParam(5, entry.isActive2Params.Param5);
            script.setScriptStringParam(entry.isActive2Params.String);
            script.name = entry.isActive;
            script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
              console.log('dialog cond2', {
                entry: entry,
                script: entry.isActive2,
                returnValue: bSuccess,
                params: entry.isActive2Params,
                shouldPass: entry.isActive2Params.Not == 1 && !bSuccess || entry.isActive2Params.Not == 0 && bSuccess
              });
              this.listener = GameState.player;
              if (entry.isActive2Params.Not == 1 && !bSuccess || entry.isActive2Params.Not == 0 && bSuccess) {
                if (typeof callback === 'function') {
                  callback(this.entryList[entry.index]);
                } else {
                  this.showEntry(this.entryList[entry.index]);
                }
              } else {
                entryLoop(++idx);
              }
            });
          }
        }
      } else {
        this.EndConversation();
      }
    };
    entryLoop();
  }

  isEndDialog(node: any) {
    let returnValue: any = null;
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
    if (GameState.Mode != EngineMode.DIALOG)
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
    if (entry.cameraAngle == 6) {
      MenuManager.InGameComputerCam.Open(entry.cameraID);
    }
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
        script.setScriptParam(1, entry.scriptParams.Param1);
        script.setScriptParam(2, entry.scriptParams.Param2);
        script.setScriptParam(3, entry.scriptParams.Param3);
        script.setScriptParam(4, entry.scriptParams.Param4);
        script.setScriptParam(5, entry.scriptParams.Param5);
        script.setScriptStringParam(entry.scriptParams.String);
        script.name = entry.script;
        script.runAsync(this.owner, 0).then( () => {
          if (entry.script2 != '') {
            let script = NWScript.Load(entry.script2);
            if (script instanceof NWScriptInstance) {
              script.setScriptParam(1, entry.script2Params.Param1);
              script.setScriptParam(2, entry.script2Params.Param2);
              script.setScriptParam(3, entry.script2Params.Param3);
              script.setScriptParam(4, entry.script2Params.Param4);
              script.setScriptParam(5, entry.script2Params.Param5);
              script.setScriptStringParam(entry.script2Params.String);
              script.name = entry.script2;
              script.runAsync(this.owner, 0).then( () => {
                checkList.scriptComplete = true;
              });
            }
          } else {
            checkList.scriptComplete = true;
          }
        });
      }
    } else if (entry.script2 != '') {
      checkList.scriptComplete = false;
      let script = NWScript.Load(entry.script2);
      if (script instanceof NWScriptInstance) {
        script.setScriptParam(1, entry.script2Params.Param1);
        script.setScriptParam(2, entry.script2Params.Param2);
        script.setScriptParam(3, entry.script2Params.Param3);
        script.setScriptParam(4, entry.script2Params.Param4);
        script.setScriptParam(5, entry.script2Params.Param5);
        script.setScriptStringParam(entry.script2Params.String);
        script.name = entry.script2;
        script.runAsync(this.owner, 0).then( () => {
          checkList.scriptComplete = true;
        });
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
      })
      this.audioEmitter.PlayStreamWave(entry.sound, undefined, (error = false) => {
        checkList.voiceOverComplete = true;
      });
    } else if (entry.vo_resref != '') {
      console.log('lip', entry.vo_resref);
      LIPObject.Load(entry.vo_resref).then( (lip: LIPObject) => {
        if (entry.speaker instanceof ModuleCreature) {
          entry.speaker.setLIP(lip);
        }
      })
      this.audioEmitter.PlayStreamWave(entry.vo_resref, undefined, (error = false) => {
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
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    if (!entry.replies.length) {
      this.EndConversation();
    } else {
      if (entry.replies.length == 1 && this.isContinueDialog(entry.replies[0])) {
        let reply = this.replyList[entry.replies[0].index];
        if (reply.script != '') {
          let script = NWScript.Load(reply.script);
          if (script instanceof NWScriptInstance) {
            script.setScriptParam(1, reply.scriptParams.Param1);
            script.setScriptParam(2, reply.scriptParams.Param2);
            script.setScriptParam(3, reply.scriptParams.Param3);
            script.setScriptParam(4, reply.scriptParams.Param4);
            script.setScriptParam(5, reply.scriptParams.Param5);
            script.setScriptStringParam(reply.scriptParams.String);
            script.name = reply.script;
            script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
              if (reply.script2 != '') {
                let script = NWScript.Load(reply.script2);
                if (script instanceof NWScriptInstance) {
                  script.setScriptParam(1, reply.script2Params.Param1);
                  script.setScriptParam(2, reply.script2Params.Param2);
                  script.setScriptParam(3, reply.script2Params.Param3);
                  script.setScriptParam(4, reply.script2Params.Param4);
                  script.setScriptParam(5, reply.script2Params.Param5);
                  script.setScriptStringParam(reply.script2Params.String);
                  script.name = reply.script2;
                  script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
                  });
                  this.getNextEntry(reply.entries);
                } else {
                  this.getNextEntry(reply.entries);
                }
              } else {
                this.getNextEntry(reply.entries);
              }
            });
          } else {
            this.getNextEntry(reply.entries);
          }
        } else {
          this.getNextEntry(reply.entries);
        }
        return;
      }
    }
    this.isListening = false;
    this.updateTextPosition();
    this.LB_REPLIES.show();
    this.LB_REPLIES.updateList();
    console.log('DEBUG: Dialog Reply Options');
    for (let i = 0; i < this.LB_REPLIES.children.length; i++) {
      try {
        console.log(this.LB_REPLIES.children[i].text.text);
      } catch (e: any) {
      }
    }
    this.state = 1;
  }

  CheckReplyScripts(reply: any, onComplete?: Function) {
    let scripts: any[] = [];
    let shouldPass = false;
    if (reply.isActive != '') {
      scripts.push({
        resref: reply.isActive,
        params: reply.isActiveParams
      });
    }
    if (reply.isActive2 != '') {
      scripts.push({
        resref: reply.isActive2,
        params: reply.isActive2Params
      });
    }
    if (!scripts.length) {
      shouldPass = true;
      if (typeof onComplete === 'function')
        onComplete(shouldPass);
      return;
    }
    let loop = new AsyncLoop({
      array: scripts,
      onLoop: async (scriptObj: any, asyncLoop: AsyncLoop) => {
        let script = NWScript.Load(scriptObj.resref);
        if (script instanceof NWScriptInstance) {
          script.name = scriptObj.resref;
          script.setScriptParam(1, scriptObj.params.Param1);
          script.setScriptParam(2, scriptObj.params.Param2);
          script.setScriptParam(3, scriptObj.params.Param3);
          script.setScriptParam(4, scriptObj.params.Param4);
          script.setScriptParam(5, scriptObj.params.Param5);
          script.setScriptStringParam(scriptObj.params.String);
          script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
            if (scriptObj.params.Not == 1 && !bSuccess || scriptObj.params.Not == 0 && bSuccess) {
              shouldPass = true;
              asyncLoop.next();
            } else {
              shouldPass = false;
              if (typeof onComplete === 'function')
                onComplete(shouldPass);
            }
          });
        } else {
          shouldPass = true;
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      if (typeof onComplete === 'function')
        onComplete(shouldPass);
    });
  }

  GetAvailableReplies(entry: any) {
    let totalReplies = entry.replies.length;
    let replyLoop = async (idx = 0) => {
      if (idx < totalReplies) {
        let reply = entry.replies[idx];
        if (reply.isActive == '') {
          let _reply = this.replyList[reply.index];
          this.LB_REPLIES.addItem(this.LB_REPLIES.children.length + 1 + '. ' + _reply.text.split('##')[0], () => {
            this.onReplySelect(_reply);
          });
          replyLoop(++idx);
        } else {
          let script = NWScript.Load(reply.isActive);
          if (script instanceof NWScriptInstance) {
            script.name = reply.isActive;
            script.runAsync(this.listener, 0).then( (bSuccess: boolean) => {
              if (bSuccess) {
                let _reply = this.replyList[reply.index];
                this.LB_REPLIES.addItem(this.LB_REPLIES.children.length + 1 + '. ' + _reply.text.split('##')[0], () => {
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

  async onReplySelect(reply: any) {
    if (reply.script != '') {
      let script = NWScript.Load(reply.script);
      if (script instanceof NWScriptInstance) {
        script.setScriptParam(1, reply.scriptParams.Param1);
        script.setScriptParam(2, reply.scriptParams.Param2);
        script.setScriptParam(3, reply.scriptParams.Param3);
        script.setScriptParam(4, reply.scriptParams.Param4);
        script.setScriptParam(5, reply.scriptParams.Param5);
        script.setScriptStringParam(reply.scriptParams.String);
        script.name = reply.script;
        script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
          if (reply.script2 != '') {
            let script = NWScript.Load(reply.script2);
            if (script instanceof NWScriptInstance) {
              script.setScriptParam(1, reply.script2Params.Param1);
              script.setScriptParam(2, reply.script2Params.Param2);
              script.setScriptParam(3, reply.script2Params.Param3);
              script.setScriptParam(4, reply.script2Params.Param4);
              script.setScriptParam(5, reply.script2Params.Param5);
              script.setScriptStringParam(reply.script2Params.String);
              script.name = reply.script2;
              script.runAsync(this.owner, 0).then( (bSuccess: boolean) => {
              });
              this.getNextEntry(reply.entries);
            } else {
              this.getNextEntry(reply.entries);
            }
          } else {
            this.getNextEntry(reply.entries);
          }
        });
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
        script.name = this.currentEntry.isActive;
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
  }

  EndConversation(aborted = false) {
    this.audioEmitter.Stop();
    this.Close();
    GameState.currentCamera = GameState.camera;
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
      script2: '',
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
    if (typeof struct.Script2 !== 'undefined') {
      node.script2 = struct.Script2.value;
      node.scriptParams = {
        Param1: struct.ActionParam1.value,
        Param2: struct.ActionParam2.value,
        Param3: struct.ActionParam3.value,
        Param4: struct.ActionParam4.value,
        Param5: struct.ActionParam5.value,
        String: struct.ActionParamStrA.value
      };
      node.script2Params = {
        Param1: struct.ActionParam1b.value,
        Param2: struct.ActionParam2b.value,
        Param3: struct.ActionParam3b.value,
        Param4: struct.ActionParam4b.value,
        Param5: struct.ActionParam5b.value,
        String: struct.ActionParamStrB.value
      };
    }
    if (typeof struct.CamFieldOfView !== 'undefined')
      node.camFieldOfView = struct.CamFieldOfView.value;
    if (typeof struct.RepliesList !== 'undefined') {
      for (let i = 0; i < struct.RepliesList.structs.length; i++) {
        let _node = struct.RepliesList.structs[i].fields;
        node.replies.push({
          isActive: _node.Active.value,
          isActive2: _node.Active2.value,
          isActiveParams: {
            Not: _node.Not.value,
            Param1: _node.Param1.value,
            Param2: _node.Param2.value,
            Param3: _node.Param3.value,
            Param4: _node.Param4.value,
            Param5: _node.Param5.value,
            String: _node.ParamStrA.value
          },
          isActive2Params: {
            Not: _node.Not2.value,
            Param1: _node.Param1b.value,
            Param2: _node.Param2b.value,
            Param3: _node.Param3b.value,
            Param4: _node.Param4b.value,
            Param5: _node.Param5b.value,
            String: _node.ParamStrB.value
          },
          Logic: _node.Logic.value,
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
    if (typeof struct.Script2 !== 'undefined') {
      node.script2 = struct.Script2.value;
      node.scriptParams = {
        Param1: struct.ActionParam1.value,
        Param2: struct.ActionParam2.value,
        Param3: struct.ActionParam3.value,
        Param4: struct.ActionParam4.value,
        Param5: struct.ActionParam5.value,
        String: struct.ActionParamStrA.value
      };
      node.script2Params = {
        Param1: struct.ActionParam1b.value,
        Param2: struct.ActionParam2b.value,
        Param3: struct.ActionParam3b.value,
        Param4: struct.ActionParam4b.value,
        Param5: struct.ActionParam5b.value,
        String: struct.ActionParamStrB.value
      };
    }
    if (typeof struct.EntriesList !== 'undefined') {
      for (let i = 0; i < struct.EntriesList.structs.length; i++) {
        let _node = struct.EntriesList.structs[i].fields;
        node.entries.push({
          isActive: _node.Active.value,
          isActive2: _node.Active2.value,
          isActiveParams: {
            Not: _node.Not.value,
            Param1: _node.Param1.value,
            Param2: _node.Param2.value,
            Param3: _node.Param3.value,
            Param4: _node.Param4.value,
            Param5: _node.Param5.value,
            String: _node.ParamStrA.value
          },
          isActive2Params: {
            Not: _node.Not2.value,
            Param1: _node.Param1b.value,
            Param2: _node.Param2b.value,
            Param3: _node.Param3b.value,
            Param4: _node.Param4b.value,
            Param5: _node.Param5b.value,
            String: _node.ParamStrB.value
          },
          Logic: _node.Logic.value,
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
