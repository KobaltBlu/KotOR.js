import { AudioEmitter } from "../audio";
import { DLGNodeType } from "../enums/dialog/DLGNodeType";
import { DLGNodeEngineType } from "../enums/dialog/DLGNodeEngineType";
import { GameState } from "../GameState";
import { DLGNodeScriptParams } from "../interface/dialog/DLGNodeScriptParams";
import { DialogMessageEntry, DialogMessageManager } from "../managers/DialogMessageManager";
import { FadeOverlayManager } from "../managers/FadeOverlayManager";
import { JournalManager } from "../managers/JournalManager";
import { ModuleObjectManager } from "../managers/ModuleObjectManager";
import { ModuleCreature, ModuleObject } from "../module";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { LIPObject } from "./LIPObject";
import { GFFStruct } from "./GFFStruct";

export class DLGNode {
  nodeType: DLGNodeType;
  nodeEngineType: DLGNodeEngineType;
  animations: any[];
  cameraAngle: number;
  cameraID: number;
  cameraAnimation: number;
  camFieldOfView: number;
  camVidEffect: number = -1;
  comment: string;
  delay: number;
  fadeType: number;
  listenerTag: string;
  plotIndex: number;
  plotXPPercentage: number;
  quest: string;
  questEntry: number;
  replies: DLGNode[] = [];
  entries: DLGNode[] = [];
  script: NWScriptInstance;
  scriptParams: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  script2: NWScriptInstance;
  script2Params: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  isActive: NWScriptInstance;
  isActiveParams: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  isActive2: NWScriptInstance;
  isActive2Params: DLGNodeScriptParams = {} as DLGNodeScriptParams;
  Logic: boolean;
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

  listener: ModuleObject;
  owner: ModuleObject;

  checkList: any = {};
  timeout: any;
  skippable: boolean;

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
    this.script = undefined;
    this.scriptParams = {} as DLGNodeScriptParams;
    this.script2 = undefined;
    this.script2Params = {} as DLGNodeScriptParams;

    //Conditional Active Node Properties
    this.isActive = undefined;
    this.isActive2 = undefined;
    this.isActiveParams = {} as DLGNodeScriptParams;
    this.isActive2Params = {} as DLGNodeScriptParams;
    this.Logic = false;
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

  runScript1(){
    if(this.script instanceof NWScriptInstance){
      this.script.setScriptParam(1, this.scriptParams.Param1);
      this.script.setScriptParam(2, this.scriptParams.Param2);
      this.script.setScriptParam(3, this.scriptParams.Param3);
      this.script.setScriptParam(4, this.scriptParams.Param4);
      this.script.setScriptParam(5, this.scriptParams.Param5);
      this.script.setScriptStringParam(this.scriptParams.String);
      this.script.name = this.script;
      this.script.run(this.speaker || this.dialog?.owner || this.dialog?.owner, 0);
    }
  }

  runScript2(){
    if(this.script2 instanceof NWScriptInstance){
      this.script2.setScriptParam(1, this.script2Params.Param1);
      this.script2.setScriptParam(2, this.script2Params.Param2);
      this.script2.setScriptParam(3, this.script2Params.Param3);
      this.script2.setScriptParam(4, this.script2Params.Param4);
      this.script2.setScriptParam(5, this.script2Params.Param5);
      this.script2.setScriptStringParam(this.script2Params.String);
      this.script2.run(this.speaker || this.dialog?.owner || this.dialog?.owner, 0);
    }
  }

  runScripts(){
    this.runScript1();
    this.runScript2();
  }

  runActiveScript1(){
    if(this.isActive instanceof NWScriptInstance){
      this.isActive.setScriptParam(1, this.isActiveParams.Param1);
      this.isActive.setScriptParam(2, this.isActiveParams.Param2);
      this.isActive.setScriptParam(3, this.isActiveParams.Param3);
      this.isActive.setScriptParam(4, this.isActiveParams.Param4);
      this.isActive.setScriptParam(5, this.isActiveParams.Param5);
      this.isActive.setScriptStringParam(this.isActiveParams.String);
      const bSuccess = this.isActive.run(this.speaker || this.dialog?.owner || this.dialog?.owner, 0);
      if(this.isActiveParams.Not){
        return bSuccess ? false : true;
      }else{
        return bSuccess ? true : false;
      }
    }
    
    return true;
  }

  runActiveScript2(){
    if(this.isActive2 instanceof NWScriptInstance){
      this.isActive2.setScriptParam(1, this.isActive2Params.Param1);
      this.isActive2.setScriptParam(2, this.isActive2Params.Param2);
      this.isActive2.setScriptParam(3, this.isActive2Params.Param3);
      this.isActive2.setScriptParam(4, this.isActive2Params.Param4);
      this.isActive2.setScriptParam(5, this.isActive2Params.Param5);
      this.isActive2.setScriptStringParam(this.isActive2Params.String);
      const bSuccess = this.isActive2.run(this.speaker || this.dialog?.owner || this.dialog?.owner, 0);
      if(this.isActive2Params.Not){
        return (bSuccess ? false : true);
      }else{
        return (bSuccess ? true : false);
      }
    }
    
    return true;
  }

  runActiveScripts(){
    return this.runActiveScript1() && this.runActiveScript2();
  }

  getActiveReplies(): number[] {
    let totalReplies = this.replies.length;
    let replyIds: number[] = [];
    for(let i = 0; i < totalReplies; i++){
      let replyLink = this.replies[i];
      if(replyLink.runActiveScripts()){
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

  getVideoEffect(): number {
    return this.camVidEffect == -1 ? -1 : this.camVidEffect;
  }

  resetChecklist(){
    this.checkList = {
      isSkipped: false,
      cameraAnimationComplete: this.dialog.isAnimatedCutscene ? false : true,
      voiceOverComplete: false,
      alreadyAllowed: false,
      fadeComplete: false,
      voiceOverError: false,
      isComplete: (): boolean => {
        if (this.checkList.alreadyAllowed || this.checkList.isSkipped) {
          return false;
        }
        if (this.dialog.isAnimatedCutscene) {
          if (this.checkList.cameraAnimationComplete) {
            this.checkList.alreadyAllowed = true;
            return true;
          }
        } else {
          if (this.checkList.voiceOverComplete && this.checkList.fadeComplete) {
            this.checkList.alreadyAllowed = true;
            return true;
          }
        }
        return false;
      }
    };
  }

  static FromDialogStruct( struct: GFFStruct ){
    let node = new DLGNode();

    if(struct.HasField('Quest')){
      node.quest = struct.GetFieldByLabel('Quest').GetValue();
    }

    if(struct.HasField('QuestEntry')){
      node.questEntry = struct.GetFieldByLabel('QuestEntry').GetValue();
    }

    if(struct.HasField('PlotXPPercentage')){
      node.plotXPPercentage = struct.GetFieldByLabel('PlotXPPercentage').GetValue();
    }

    if(struct.HasField('PlotIndex')){
      node.plotIndex = struct.GetFieldByLabel('PlotIndex').GetValue();
    }

    if(struct.HasField('Listener')){
      node.listenerTag = struct.GetFieldByLabel('Listener').GetValue();
    }

    if(struct.HasField('Speaker')){
      node.speakerTag = struct.GetFieldByLabel('Speaker').GetValue();
    }

    if(struct.HasField('VO_ResRef')){
      node.vo_resref = struct.GetFieldByLabel('VO_ResRef').GetValue();
    }

    if(struct.HasField('Sound')){
      node.sound = struct.GetFieldByLabel('Sound').GetValue();
    }

    if(struct.HasField('CameraID')){
      node.cameraID = struct.GetFieldByLabel('CameraID').GetValue();
    }

    if(struct.HasField('CameraAnimation')){
      node.cameraAnimation = struct.GetFieldByLabel('CameraAnimation').GetValue();
    }

    if(struct.HasField('CameraAngle')){
      node.cameraAngle = struct.GetFieldByLabel('CameraAngle').GetValue();
    }

    if(struct.HasField('CamVidEffect')){
      node.camVidEffect = struct.GetFieldByLabel('CamVidEffect').GetValue();
    }

    if(struct.HasField('Script')){
      const resref = struct.GetFieldByLabel('Script').GetValue();
      if(resref){
        const instance = NWScript.Load(resref);
        if(instance instanceof NWScriptInstance){
          node.script = instance;
          node.script.name = resref;
        }
      }
    }

    if(struct.HasField('Script2')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      const resref = struct.GetFieldByLabel('Script2').GetValue();
      if(resref){
        const instance = NWScript.Load(resref);
        if(instance instanceof NWScriptInstance){
          node.script2 = instance;
          node.script2.name = resref;
        }
      }

      //k2 MODE
      if(struct.HasField('ActionParam1')){
        node.scriptParams.Param1 = struct.GetFieldByLabel('ActionParam1').GetValue();
      }

      if(struct.HasField('ActionParam2')){
        node.scriptParams.Param2 = struct.GetFieldByLabel('ActionParam2').GetValue();
      }

      if(struct.HasField('ActionParam3')){
        node.scriptParams.Param3 = struct.GetFieldByLabel('ActionParam3').GetValue();
      }

      if(struct.HasField('ActionParam4')){
        node.scriptParams.Param4 = struct.GetFieldByLabel('ActionParam4').GetValue();
      }

      if(struct.HasField('ActionParam5')){
        node.scriptParams.Param5 = struct.GetFieldByLabel('ActionParam5').GetValue();
      }

      if(struct.HasField('ActionParamStrA')){
        node.scriptParams.String = struct.GetFieldByLabel('ActionParamStrA').GetValue();
      }

      //k2 MODE
      if(struct.HasField('ActionParam1b')){
        node.script2Params.Param1 = struct.GetFieldByLabel('ActionParam1b').GetValue();
      }

      if(struct.HasField('ActionParam2b')){
        node.script2Params.Param2 = struct.GetFieldByLabel('ActionParam2b').GetValue();
      }

      if(struct.HasField('ActionParam3b')){
        node.script2Params.Param3 = struct.GetFieldByLabel('ActionParam3b').GetValue();
      }

      if(struct.HasField('ActionParam4b')){
        node.script2Params.Param4 = struct.GetFieldByLabel('ActionParam4b').GetValue();
      }

      if(struct.HasField('ActionParam5b')){
        node.script2Params.Param5 = struct.GetFieldByLabel('ActionParam5b').GetValue();
      }

      if(struct.HasField('ActionParamStrB')){
        node.script2Params.String = struct.GetFieldByLabel('ActionParamStrB').GetValue();
      }

    }

    if(struct.HasField('CamFieldOfView')){
      node.camFieldOfView = struct.GetFieldByLabel('CamFieldOfView').GetValue();
    }

    if(struct.HasField('RepliesList')){
      const structs = struct.GetFieldByLabel('RepliesList').GetChildStructs();
      node.entries = [];
      for(let i = 0; i < structs.length; i++){
        let replyStruct = structs[i];
        let linkNode = new DLGNode();
        // linkNode.dialog = this.dialog;

        if(replyStruct.HasField('Not')){
          linkNode.isActiveParams.Not = replyStruct.GetFieldByLabel('Not').GetValue();
        }

        if(replyStruct.HasField('Param1')){
          linkNode.isActiveParams.Param1 = replyStruct.GetFieldByLabel('Param1').GetValue();
        }

        if(replyStruct.HasField('Param2')){
          linkNode.isActiveParams.Param2 = replyStruct.GetFieldByLabel('Param2').GetValue();
        }

        if(replyStruct.HasField('Param3')){
          linkNode.isActiveParams.Param3 = replyStruct.GetFieldByLabel('Param3').GetValue();
        }

        if(replyStruct.HasField('Param4')){
          linkNode.isActiveParams.Param4 = replyStruct.GetFieldByLabel('Param4').GetValue();
        }

        if(replyStruct.HasField('Param5')){
          linkNode.isActiveParams.Param5 = replyStruct.GetFieldByLabel('Param5').GetValue();
        }

        if(replyStruct.HasField('ParamStrA')){
          linkNode.isActiveParams.String = replyStruct.GetFieldByLabel('ParamStrA').GetValue();
        }

        if(replyStruct.HasField('Not2')){
          linkNode.isActive2Params.Not = replyStruct.GetFieldByLabel('Not2').GetValue();
        }

        if(replyStruct.HasField('Param1b')){
          linkNode.isActive2Params.Param1 = replyStruct.GetFieldByLabel('Param1b').GetValue();
        }

        if(replyStruct.HasField('Param2b')){
          linkNode.isActive2Params.Param2 = replyStruct.GetFieldByLabel('Param2b').GetValue();
        }

        if(replyStruct.HasField('Param3b')){
          linkNode.isActive2Params.Param3 = replyStruct.GetFieldByLabel('Param3b').GetValue();
        }

        if(replyStruct.HasField('Param4b')){
          linkNode.isActive2Params.Param4 = replyStruct.GetFieldByLabel('Param4b').GetValue();
        }

        if(replyStruct.HasField('Param5b')){
          linkNode.isActive2Params.Param5 = replyStruct.GetFieldByLabel('Param5b').GetValue();
        }

        if(replyStruct.HasField('ParamStrB')){
          linkNode.isActive2Params.String = replyStruct.GetFieldByLabel('ParamStrB').GetValue();
        }

        if(replyStruct.HasField('Logic')){
          linkNode.Logic = !!replyStruct.GetFieldByLabel('Logic').GetValue();
        }

        if(replyStruct.HasField('Active')){
          const resref = replyStruct.GetFieldByLabel('Active').GetValue();
          if(resref){
            linkNode.isActive = NWScript.Load(resref);
            if(linkNode.isActive instanceof NWScriptInstance){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(replyStruct.HasField('Active2')){
          const resref = replyStruct.GetFieldByLabel('Active2').GetValue();
          if(resref){
            linkNode.isActive2 = NWScript.Load(resref);
            if(linkNode.isActive2 instanceof NWScriptInstance){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(replyStruct.HasField('Index')){
          linkNode.index = replyStruct.GetFieldByLabel('Index').GetValue();
        }

        node.replies.push(linkNode);

      }
    }

    if(struct.HasField('EntriesList')){
      const structs = struct.GetFieldByLabel('EntriesList').GetChildStructs();
      node.replies = [];
      for(let i = 0; i < structs.length; i++){
        let entryStruct = structs[i];
        let linkNode = new DLGNode();
        
        if(entryStruct.HasField('Not')){
          linkNode.isActiveParams.Not = entryStruct.GetFieldByLabel('Not').GetValue();
        }

        if(entryStruct.HasField('Param1')){
          linkNode.isActiveParams.Param1 = entryStruct.GetFieldByLabel('Param1').GetValue();
        }

        if(entryStruct.HasField('Param2')){
          linkNode.isActiveParams.Param2 = entryStruct.GetFieldByLabel('Param2').GetValue();
        }

        if(entryStruct.HasField('Param3')){
          linkNode.isActiveParams.Param3 = entryStruct.GetFieldByLabel('Param3').GetValue();
        }

        if(entryStruct.HasField('Param4')){
          linkNode.isActiveParams.Param4 = entryStruct.GetFieldByLabel('Param4').GetValue();
        }

        if(entryStruct.HasField('Param5')){
          linkNode.isActiveParams.Param5 = entryStruct.GetFieldByLabel('Param5').GetValue();
        }

        if(entryStruct.HasField('ParamStrA')){
          linkNode.isActiveParams.String = entryStruct.GetFieldByLabel('ParamStrA').GetValue();
        }

        if(entryStruct.HasField('Not2')){
          linkNode.isActive2Params.Not = entryStruct.GetFieldByLabel('Not2').GetValue();
        }

        if(entryStruct.HasField('Param1b')){
          linkNode.isActive2Params.Param1 = entryStruct.GetFieldByLabel('Param1b').GetValue();
        }

        if(entryStruct.HasField('Param2b')){
          linkNode.isActive2Params.Param2 = entryStruct.GetFieldByLabel('Param2b').GetValue();
        }

        if(entryStruct.HasField('Param3b')){
          linkNode.isActive2Params.Param3 = entryStruct.GetFieldByLabel('Param3b').GetValue();
        }

        if(entryStruct.HasField('Param4b')){
          linkNode.isActive2Params.Param4 = entryStruct.GetFieldByLabel('Param4b').GetValue();
        }

        if(entryStruct.HasField('Param5b')){
          linkNode.isActive2Params.Param5 = entryStruct.GetFieldByLabel('Param5b').GetValue();
        }

        if(entryStruct.HasField('ParamStrB')){
          linkNode.isActive2Params.String = entryStruct.GetFieldByLabel('ParamStrB').GetValue();
        }

        if(entryStruct.HasField('Logic')){
          linkNode.Logic = !!entryStruct.GetFieldByLabel('Logic').GetValue();
        }

        if(entryStruct.HasField('Active')){
          const resref = entryStruct.GetFieldByLabel('Active').GetValue();
          if(resref){
            linkNode.isActive = NWScript.Load(resref);
            if(linkNode.isActive instanceof NWScriptInstance){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(entryStruct.HasField('Active2')){
          const resref = entryStruct.GetFieldByLabel('Active2').GetValue();
          if(resref){
            linkNode.isActive2 = NWScript.Load(resref);
            if(linkNode.isActive2 instanceof NWScriptInstance){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(entryStruct.HasField('Index')){
          linkNode.index = entryStruct.GetFieldByLabel('Index').GetValue();
        }

        node.entries.push(linkNode);

      }
    }

    if(struct.HasField('AnimList')){
      const structs = struct.GetFieldByLabel('AnimList').GetChildStructs();
      for(let i = 0; i < structs.length; i++){
        let childStruct = structs[i];
        let animation = {
          animation: '',
          participant: '',
        };
        
        if(childStruct.HasField('Animation')){
          animation.animation = childStruct.GetFieldByLabel('Animation').GetValue();
        }
        
        if(childStruct.HasField('Participant')){
          animation.participant = childStruct.GetFieldByLabel('Participant').GetValue().toLocaleLowerCase();
        }

        node.animations.push(animation);
      }
    }

    if(struct.HasField('Text')){
      node.text = struct.GetFieldByLabel('Text').GetValue();
    }

    if(struct.HasField('Delay')){
      node.delay = struct.GetFieldByLabel('Delay').GetValue() & 0xFFFFFFFF;
    }

    if(struct.HasField('FadeType')){
      node.fade.type = struct.GetFieldByLabel('FadeType').GetValue();
    }

    if(struct.HasField('FadeLength')){
      node.fade.length = struct.GetFieldByLabel('FadeLength').GetValue();
    }

    if(struct.HasField('FadeDelay')){
      node.fade.delay = struct.GetFieldByLabel('FadeDelay').GetValue();
    }

    if(struct.HasField('NodeUnskippable')){
      node.skippable = !struct.GetFieldByLabel('NodeUnskippable').GetValue();
    }else{
      node.skippable = true;
    }

    return node;
  }

  getCompiledString(): string {
    let text = this.text;
    text = text.split('##')[0].replaceAll(/\{.*\}/ig, '').trim();
    //if(this.speaker instanceof ModuleCreature){
      text = text.replace(/<FullName>/gm, GameState.player.firstName);
      text = text.replace(/<LastName>/gm, GameState.player.lastName);
      text = text.replace(/<CUSTOM(\d+)>/gm, function(match, p1, offset, string){
        return GameState.module.getCustomToken(parseInt(p1));
      });
    //}

    return text;
  }

  

  isContinueDialog() {
    let parsedText = this.getCompiledString();
    switch(this.nodeType){
      case DLGNodeType.REPLY:
        return parsedText == '' && this.entries.length == 1;
      break;
      case DLGNodeType.ENTRY:
        return parsedText == '' && this.replies.length == 1;
      break;
      default: 
        return parsedText == '';
      break;
    }

    return false;
  }

  isEndDialog() {
    let parsedText = this.getCompiledString();
    switch(this.nodeType){
      case DLGNodeType.REPLY:
        return parsedText == '' && !this.entries.length;
      break;
      case DLGNodeType.ENTRY:
        return parsedText == '' && !this.replies.length;
      break;
      default: 
        return parsedText == '';
      break;
    }
  }

}

