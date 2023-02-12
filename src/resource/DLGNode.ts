import type { AudioEmitter } from "../audio";
import { DLGNodeType } from "../enums/dialog/DLGNodeType";
import { DLGNodeEngineType } from "../enums/dialog/DLGNodeEngineType";
import { GameState } from "../GameState";
import { MenuManager } from "../gui";
import { DLGNodeScriptParams } from "../interface/dialog/DLGNodeScriptParams";
import { DialogMessageEntry, DialogMessageManager } from "../managers/DialogMessageManager";
import { FadeOverlayManager } from "../managers/FadeOverlayManager";
import { JournalManager } from "../managers/JournalManager";
import { ModuleObjectManager } from "../managers/ModuleObjectManager";
import { ModuleCreature, ModuleObject } from "../module";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { LIPObject } from "./LIPObject";

export class DLGNode {
  nodeType: DLGNodeType;
  nodeEngineType: DLGNodeEngineType;
  animations: any[];
  cameraAngle: number;
  cameraID: number;
  cameraAnimation: number;
  camFieldOfView: number;
  camVidEffect: number;
  comment: string;
  delay: number;
  fadeType: number;
  listenerTag: string;
  plotIndex: number;
  plotXPPercentage: number;
  quest: string;
  questEntry: number;
  replies: any[];
  entries: any[];
  script: string;
  scriptParams: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  script2: string;
  script2Params: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  isActive: string;
  isActiveParams: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  isActive2: string;
  isActive2Params: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  Logic: number;
  index: number;
  isChild: number;
  sound: string;
  soundExists: number;
  speakerTag: string;
  text: string;
  vo_resref: string;
  waitFlags: number;
  elapsed: number = 0;
  fade: { type: number; length: number; delay: number; color: { r: number; g: number; b: number; };  started: boolean };
  speaker: ModuleObject;
  dialog: any;
  videoEffect: number;

  listener: ModuleObject;
  owner: ModuleObject;

  checkList: any = {};
  timeout: any;

  constructor(args = {}){
    this.nodeEngineType = DLGNodeEngineType.K1;

    this.animations = [];
    this.cameraAngle = 0;
    this.cameraID = 0;
    this.cameraAnimation = -1;
    this.camFieldOfView = -1;
    this.camVidEffect = -1;
    this.comment = '';
    this.delay = 0;
    this.fadeType = 0;
    this.listenerTag = '';
    this.plotIndex = -1;
    this.plotXPPercentage = 1;
    this.quest = '';
    this.questEntry = 0;
    this.replies = [];
    this.entries = [];

    //Script Properties
    this.script = '';
    this.scriptParams = {} as DLGNodeScriptParams;
    this.script2 = '';
    this.script2Params = {} as DLGNodeScriptParams;

    //Conditional Active Node Properties
    this.isActive = '';
    this.isActive2 = '';
    this.isActiveParams = {} as DLGNodeScriptParams;
    this.isActive2Params = {} as DLGNodeScriptParams;
    this.Logic = 0;
    this.index = -1;
    this.isChild = 0;

    this.sound = '';
    this.soundExists = 0;
    this.speakerTag = '';
    this.text = '';
    this.vo_resref = '';
    this.waitFlags = 0;
    this.fade = {
      type: 0,
      length: 0,
      delay: 0,
      color: {r:0, g:0, b:0},
      started: false,
    };
  }

  initProperties(){
    if(this.speakerTag != ''){
      this.speaker = ModuleObjectManager.GetObjectByTag(this.speakerTag);
    }else{
      this.speaker = this.dialog.owner;
    }

    if(typeof this.speaker == 'undefined'){
      this.speaker = this.dialog.owner;
    }

    if(this.listenerTag != ''){
      if(this.listenerTag == 'PLAYER'){
        this.listener = GameState.player;
      }else{
        this.listener = ModuleObjectManager.GetObjectByTag(this.listenerTag);
      }
    }else{
      this.listener = GameState.player;
    }

    if(typeof this.listener == 'undefined'){
      this.listener = this.dialog.listener;
    }

    //Checklist
    this.resetChecklist();
  }

  async runScript1(){
    return new Promise<void>( async (resolve, reject) => {
      if(this.script != ''){
        let script = NWScript.Load(this.script);
        if(script instanceof NWScriptInstance){
          script.setScriptParam(1, this.scriptParams.Param1);
          script.setScriptParam(2, this.scriptParams.Param2);
          script.setScriptParam(3, this.scriptParams.Param3);
          script.setScriptParam(4, this.scriptParams.Param4);
          script.setScriptParam(5, this.scriptParams.Param5);
          script.setScriptStringParam(this.scriptParams.String);
          script.name = this.script;
          script.runAsync(this.speaker || this.dialog?.owner || MenuManager.InGameDialog.dialog?.owner, 0).then( () => {
          });
          resolve();
        }else{
          resolve();
        }
      }
    });
  }

  async runScript2(){
    return new Promise<void>( async (resolve, reject) => {
      if(this.script2 != ''){
        let script = NWScript.Load(this.script2);
        if(script instanceof NWScriptInstance){
          script.setScriptParam(1, this.script2Params.Param1);
          script.setScriptParam(2, this.script2Params.Param2);
          script.setScriptParam(3, this.script2Params.Param3);
          script.setScriptParam(4, this.script2Params.Param4);
          script.setScriptParam(5, this.script2Params.Param5);
          script.setScriptStringParam(this.script2Params.String);
          script.name = this.script2;
          script.runAsync(this.speaker || this.dialog?.owner || MenuManager.InGameDialog.dialog?.owner, 0).then( () => {
            
          });
          resolve();
        }else{
          resolve();
        }
      }else{
        resolve();
      }
    });
  }

  async runScripts(){
    console.log('DLGNode.runScripts', this);
    await this.runScript1();
    await this.runScript2();
  }

  async runActiveScript1( ){
    return new Promise<boolean>( async (resolve, reject) => {
      if(this.isActive != ''){
        let script = NWScript.Load(this.isActive);
        if(script instanceof NWScriptInstance){
          script.setScriptParam(1, this.isActiveParams.Param1);
          script.setScriptParam(2, this.isActiveParams.Param2);
          script.setScriptParam(3, this.isActiveParams.Param3);
          script.setScriptParam(4, this.isActiveParams.Param4);
          script.setScriptParam(5, this.isActiveParams.Param5);
          script.setScriptStringParam(this.isActiveParams.String);
          script.name = this.isActive;
          script.runAsync(this.speaker || this.dialog?.owner || MenuManager.InGameDialog.dialog?.owner, 0).then( (bSuccess: boolean) => {
            if(this.isActiveParams.Not){
              resolve(bSuccess ? false : true);
            }else{
              resolve(bSuccess ? true : false);
            }
          });
        }else{
          resolve(true);
        }
      }else{
        resolve(true);
      }
    });
  }

  async runActiveScript2(){
    return new Promise<boolean>( async (resolve, reject) => {
      if(this.isActive2 != ''){
        let script = NWScript.Load(this.isActive2);
        if(script instanceof NWScriptInstance){
          script.setScriptParam(1, this.isActive2Params.Param1);
          script.setScriptParam(2, this.isActive2Params.Param2);
          script.setScriptParam(3, this.isActive2Params.Param3);
          script.setScriptParam(4, this.isActive2Params.Param4);
          script.setScriptParam(5, this.isActive2Params.Param5);
          script.setScriptStringParam(this.isActive2Params.String);
          script.name = this.isActive2;
          script.runAsync(this.speaker || this.dialog?.owner || MenuManager.InGameDialog.dialog?.owner, 0).then( (bSuccess: boolean) => {
            if(this.isActive2Params.Not){
              resolve(bSuccess ? false : true);
            }else{
              resolve(bSuccess ? true : false);
            }
          });
        }else{
          resolve(true);
        }
      }else{
        resolve(true);
      }
    });
  }

  async runActiveScripts(){
    let active1 = await this.runActiveScript1();
    let active2 = await this.runActiveScript2();
    return active1 && active2;
  }

  async getActiveReplies(){
    let totalReplies = this.replies.length;
    let replyIds: any[] = [];
    for(let i = 0; i < totalReplies; i++){
      let replyLink = this.replies[i];
      let isActive = await replyLink.runActiveScripts();
      if(isActive){
        replyIds.push(replyLink.index);
      }
    }
    return replyIds;
  }

  updateJournal(){
    if(this.quest){
      const allowOverrideHigher = false;
      JournalManager.AddJournalQuestEntry(this.quest, this.questEntry, allowOverrideHigher);
    }
    try{
      console.log('saving', this.speaker.getName(), this.text);
      if(this.nodeType == DLGNodeType.ENTRY){
        DialogMessageManager.AddEntry(
          new DialogMessageEntry(
            this.speaker.getName(), this.text
          )
        )
      }else{
        if(this.text.length){

        }
      }
    }catch(e){
      console.error(e);
    }
  }

  update(delta: number = 0): boolean {
    this.elapsed += delta * 1000;
    this.processFadeOverlay();
    if(!!this.checkList.voiceOverError){
      if(this.elapsed >= this.delay){
        this.checkList.voiceOverComplete = true;
      }
    }
    return this.checkList.isComplete();
  }

  setNodeDelay(delay: number = 0){
    this.delay = delay;
  }

  processFadeOverlay(){
    if(this.checkList.fadeComplete) return;
    if(!this.fade.length){
      this.checkList.fadeComplete = true;
      return;
    }
    if(this.elapsed > this.fade.delay && !this.fade.started){
      this.fade.started = true;
      switch(this.fade.type){
        case 3:
          FadeOverlayManager.FadeIn(this.fade.length, 0, 0, 0);
        break;
        case 4:
          FadeOverlayManager.FadeOut(this.fade.length, 0, 0, 0);
        break;
      }
    }
    if(this.elapsed >= (this.fade.delay + this.fade.length)){
      this.checkList.fadeComplete = true;
    }
  }

  loadResources(): Promise<void> {
    return new Promise( (resolve, reject) => {

    });
  }

  loadLIP(): Promise<boolean> {
    return new Promise( (resolve, reject) => {
      const resref = this.getVoiceResRef();
      if(resref){
        LIPObject.Load(resref).then( (lip: LIPObject) => {
          if (this.speaker instanceof ModuleCreature) {
            this.speaker.setLIP(lip);
          }
          resolve(true);
        });
      }else{
        resolve(false);
      }
    });
  }

  playVoiceOver(audioEmitter: AudioEmitter): Promise<boolean> {
    return new Promise( (resolve, reject) => {
      const resref = this.getVoiceResRef();
      if(resref){
        this.loadLIP();
        audioEmitter.PlayStreamWave(resref, null, (error: boolean = false) => {
          if(!error){
            this.checkList.voiceOverComplete = true;
          }else{
            this.checkList.voiceOverError = true;
          }
          resolve(error);
        });
      }else{
        this.checkList.voiceOverError = true;
        resolve(false);
      }
    });
  }

  getVoiceResRef(): string {
    if (this.sound != '') {
      return this.sound;
    }else if (this.vo_resref != '') {
      return this.vo_resref;
    }else{
      return '';
    }
  }

  getVideoEffect(): any {
    return this.videoEffect == -1 ? null : this.videoEffect
  }

  resetChecklist(){
    this.checkList = {
      isSkipped: false,
      cameraAnimationComplete: MenuManager.InGameDialog.dialog.isAnimatedCutscene ? false : true,
      voiceOverComplete: false,
      alreadyAllowed: false,
      fadeComplete: false,
      voiceOverError: false,
      isComplete: function(): boolean {
        if (this.alreadyAllowed || this.isSkipped) {
          return false;
        }
        if (MenuManager.InGameDialog.dialog.isAnimatedCutscene) {
          if (this.cameraAnimationComplete) {
            this.alreadyAllowed = true;
            if (MenuManager.InGameDialog.paused) {
              return false;
            } else {
              return true;
            }
          }
        } else {
          if (this.voiceOverComplete && this.fadeComplete) {
            this.alreadyAllowed = true;
            if (MenuManager.InGameDialog.paused) {
              return false;
            } else {
              return true;
            }
          }
        }
        return false;
      }
    };
  }

  static FromDialogStruct( struct: any ){
    let node = new DLGNode();

    if(typeof struct.Quest !== 'undefined')
      node.quest = struct.Quest.value;

    if(typeof struct.QuestEntry !== 'undefined')
      node.questEntry = struct.QuestEntry.value;

    if(typeof struct.PlotXPPercentage !== 'undefined')
      node.plotXPPercentage = struct.PlotXPPercentage.value;

    if(typeof struct.PlotIndex !== 'undefined')
      node.plotIndex = struct.PlotIndex.value;

    if(typeof struct.Listener !== 'undefined')
      node.listenerTag = struct.Listener.value;

    if(typeof struct.Speaker !== 'undefined')
      node.speakerTag = struct.Speaker.value;

    if(typeof struct.VO_ResRef !== 'undefined')
      node.vo_resref = struct.VO_ResRef.value;

    if(typeof struct.Sound !== 'undefined')
      node.sound = struct.Sound.value;

    if(typeof struct.CameraID !== 'undefined')
      node.cameraID = struct.CameraID.value;

    if(typeof struct.CameraAnimation !== 'undefined')
      node.cameraAnimation = struct.CameraAnimation.value;

    if(typeof struct.CameraAngle !== 'undefined')
      node.cameraAngle = struct.CameraAngle.value;
      
    if(typeof struct.CamVidEffect !== 'undefined')
      node.camVidEffect = struct.CamVidEffect.value;

    if(typeof struct.Script !== 'undefined')
      node.script = struct.Script.value;

    if(typeof struct.Script2 !== 'undefined'){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.script2 = struct.Script2.value;

      //k2 MODE
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

    if(typeof struct.CamFieldOfView !== 'undefined')
      node.camFieldOfView = struct.CamFieldOfView.value;

    if(typeof struct.RepliesList !== 'undefined'){
      node.entries = [];
      for(let i = 0; i < struct.RepliesList.structs.length; i++){
        let _node = struct.RepliesList.structs[i].fields;
        let linkNode = new DLGNode();
        // linkNode.dialog = this.dialog;

        if(typeof _node.Not !== 'undefined'){
          linkNode.isActiveParams.Not = _node.Not.value;
        }
  
        if(typeof _node.Param1 !== 'undefined'){
          linkNode.isActiveParams.Param1 = _node.Param1.value;
        }
  
        if(typeof _node.Param2 !== 'undefined'){
          linkNode.isActiveParams.Param2 = _node.Param2.value;
        }
  
        if(typeof _node.Param3 !== 'undefined'){
          linkNode.isActiveParams.Param3 = _node.Param3.value;
        }
  
        if(typeof _node.Param4 !== 'undefined'){
          linkNode.isActiveParams.Param4 = _node.Param4.value;
        }
  
        if(typeof _node.Param5 !== 'undefined'){
          linkNode.isActiveParams.Param5 = _node.Param5.value;
        }
  
        if(typeof _node.ParamStrA !== 'undefined'){
          linkNode.isActiveParams.String = _node.ParamStrA.value;
        }
  
        if(typeof _node.Not !== 'undefined'){
          linkNode.isActive2Params.Not = _node.Not.value;
        }
  
        if(typeof _node.Param1b !== 'undefined'){
          linkNode.isActive2Params.Param1 = _node.Param1b.value;
        }
  
        if(typeof _node.Param2b !== 'undefined'){
          linkNode.isActive2Params.Param2 = _node.Param2b.value;
        }
  
        if(typeof _node.Param3b !== 'undefined'){
          linkNode.isActive2Params.Param3 = _node.Param3b.value;
        }
  
        if(typeof _node.Param4b !== 'undefined'){
          linkNode.isActive2Params.Param4 = _node.Param4b.value;
        }
  
        if(typeof _node.Param5b !== 'undefined'){
          linkNode.isActive2Params.Param5 = _node.Param5b.value;
        }
  
        if(typeof _node.ParamStrB !== 'undefined'){
          linkNode.isActive2Params.String = _node.ParamStrB.value;
        }
  
        if(typeof _node.Logic !== 'undefined'){
          linkNode.Logic = _node.Logic.value;
        }
  
        if(typeof _node.Active !== 'undefined'){
          linkNode.isActive = _node.Active.value;
        }
  
        if(typeof _node.Active2 !== 'undefined'){
          linkNode.isActive2 = _node.Active2.value;
        }
  
        if(typeof _node.Index !== 'undefined'){
          linkNode.index = _node.Index.value;
        }

        node.replies.push(linkNode);

      }
    }

    if(typeof struct.EntriesList !== 'undefined'){
      node.replies = [];
      for(let i = 0; i < struct.EntriesList.structs.length; i++){
        let _node = struct.EntriesList.structs[i].fields;
        let linkNode = new DLGNode();
        // linkNode.dialog = this.dialog;
        
        if(typeof _node.Not !== 'undefined'){
          linkNode.isActiveParams.Not = _node.Not.value;
        }
  
        if(typeof _node.Param1 !== 'undefined'){
          linkNode.isActiveParams.Param1 = _node.Param1.value;
        }
  
        if(typeof _node.Param2 !== 'undefined'){
          linkNode.isActiveParams.Param2 = _node.Param2.value;
        }
  
        if(typeof _node.Param3 !== 'undefined'){
          linkNode.isActiveParams.Param3 = _node.Param3.value;
        }
  
        if(typeof _node.Param4 !== 'undefined'){
          linkNode.isActiveParams.Param4 = _node.Param4.value;
        }
  
        if(typeof _node.Param5 !== 'undefined'){
          linkNode.isActiveParams.Param5 = _node.Param5.value;
        }
  
        if(typeof _node.ParamStrA !== 'undefined'){
          linkNode.isActiveParams.String = _node.ParamStrA.value;
        }
  
        if(typeof _node.Not !== 'undefined'){
          linkNode.isActive2Params.Not = _node.Not.value;
        }
  
        if(typeof _node.Param1b !== 'undefined'){
          linkNode.isActive2Params.Param1 = _node.Param1b.value;
        }
  
        if(typeof _node.Param2b !== 'undefined'){
          linkNode.isActive2Params.Param2 = _node.Param2b.value;
        }
  
        if(typeof _node.Param3b !== 'undefined'){
          linkNode.isActive2Params.Param3 = _node.Param3b.value;
        }
  
        if(typeof _node.Param4b !== 'undefined'){
          linkNode.isActive2Params.Param4 = _node.Param4b.value;
        }
  
        if(typeof _node.Param5b !== 'undefined'){
          linkNode.isActive2Params.Param5 = _node.Param5b.value;
        }
  
        if(typeof _node.ParamStrB !== 'undefined'){
          linkNode.isActive2Params.String = _node.ParamStrB.value;
        }
  
        if(typeof _node.Logic !== 'undefined'){
          linkNode.Logic = _node.Logic.value;
        }
  
        if(typeof _node.Active !== 'undefined'){
          linkNode.isActive = _node.Active.value;
        }
  
        if(typeof _node.Active2 !== 'undefined'){
          linkNode.isActive2 = _node.Active2.value;
        }
  
        if(typeof _node.Index !== 'undefined'){
          linkNode.index = _node.Index.value;
        }

        node.entries.push(linkNode);

      }
    }

    if(typeof struct.AnimList !== 'undefined'){
      for(let i = 0; i < struct.AnimList.structs.length; i++){
        let _node = struct.AnimList.structs[i].fields;
        node.animations.push({
          animation: _node.Animation.value,
          participant: _node.Participant.value.toLowerCase()
        });
      }
    }

    if(typeof struct.Text !== 'undefined')
      node.text = struct.Text.value.GetValue();

    if(typeof struct.Delay !== 'undefined')
      node.delay = (struct.Delay.value == 4294967295 ? -1 : struct.Delay.value);

    if(typeof struct.FadeType !== 'undefined')
      node.fade.type = struct.FadeType.value;

    if(typeof struct.FadeLength !== 'undefined')
      node.fade.length = struct.FadeLength.value;

    if(typeof struct.FadeDelay !== 'undefined')
      node.fade.delay = struct.FadeDelay.value;

    return node;
  }

  getCompiledString( ){
    let text = this.text;
    text = text.split('##')[0];
    //if(this.speaker instanceof ModuleCreature){
      text = text.replace(/<FullName>/gm, GameState.player.firstName);
      text = text.replace(/<LastName>/gm, GameState.player.lastName);
      text = text.replace(/<CUSTOM(\d+)>/gm, function(match, p1, offset, string){
        return GameState.module.getCustomToken(parseInt(p1));
      });
    //}

    return text;
  }

}

