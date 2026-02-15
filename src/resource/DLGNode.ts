import { AudioEmitter } from "@/audio";
import { DialogMessageEntry } from "@/engine/DialogMessageEntry";
import { DLGCameraAngle } from "@/enums/dialog/DLGCameraAngle";
import { DLGNodeEngineType } from "@/enums/dialog/DLGNodeEngineType";
import { DLGNodeType } from "@/enums/dialog/DLGNodeType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { IDLGNodeCheckList } from "@/interface/dialog/IDLGNodeCheckList";
import type { IDLGNodeScriptParams } from "@/interface/dialog/IDLGNodeScriptParams";
// import { DialogMessageEntry, DialogMessageManager, FadeOverlayManager, JournalManager, ModuleObjectManager } from "@/managers";
import type { ModuleCreature, ModuleObject } from "@/module";
// import { NWScript } from "@/nwscript/NWScript";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { CExoLocString } from "@/resource/CExoLocString";
import type { DLGObject } from "@/resource/DLGObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { LIPObject } from "@/resource/LIPObject";
import { BitWise } from "@/utility/BitWise";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

/**
 * DLGNode class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGNode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class DLGNode {
  nodeType: DLGNodeType;
  nodeEngineType: DLGNodeEngineType;
  animations: unknown[];
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
  repliesShown: boolean = false;
  replies: DLGNode[] = [];
  entries: DLGNode[] = [];
  script: NWScriptInstance;
  scriptParams: IDLGNodeScriptParams = {} as IDLGNodeScriptParams;
  script2: NWScriptInstance;
  script2Params: IDLGNodeScriptParams = {} as IDLGNodeScriptParams;
  isActive: NWScriptInstance;
  isActiveParams: IDLGNodeScriptParams = {} as IDLGNodeScriptParams;
  isActive2: NWScriptInstance;
  isActive2Params: IDLGNodeScriptParams = {} as IDLGNodeScriptParams;
  Logic: boolean;
  index: number;
  isChild: number;
  sound: string;
  soundExists: number;
  speakerTag: string;
  text: string;
  textLoc: CExoLocString;
  vo_resref: string;
  waitFlags: number;
  elapsed: number = 0;
  fade: { type: number; length: number; delay: number; color: { r: number; g: number; b: number; };  started: boolean };
  speaker: ModuleObject;
  dialog: DLGObject;
  gffStruct?: GFFStruct;

  listener: ModuleObject;
  owner: ModuleObject;

  checkList: IDLGNodeCheckList = {};
  timeout: unknown;
  skippable: boolean;

  alienRaceNode: number = 0;
  emotion: number = 4;
  facialAnimation: number = 0;
  postProcessNode: number = 0;
  recordNoVOOverride: number = 0;
  recordVO: number = 0;
  voTextChanged: boolean = true;

  constructor(dialog?: DLGObject){
    this.nodeEngineType = DLGNodeEngineType.K1;
    this.dialog = dialog || undefined;
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
    this.scriptParams = {} as IDLGNodeScriptParams;
    this.script2 = undefined;
    this.script2Params = {} as IDLGNodeScriptParams;

    //Conditional Active Node Properties
    this.isActive = undefined;
    this.isActive2 = undefined;
    this.isActiveParams = {} as IDLGNodeScriptParams;
    this.isActive2Params = {} as IDLGNodeScriptParams;
    this.Logic = false;
    this.index = -1;
    this.isChild = 0;

    this.sound = '';
    this.soundExists = 0;
    this.speakerTag = '';
    this.text = '';
    this.textLoc = new CExoLocString();
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

  setDialog(dialog: DLGObject){
    this.dialog = dialog;
  }

  initProperties(){
    if(this.speakerTag != ''){
      this.speaker = GameState.ModuleObjectManager.GetObjectByTag(this.speakerTag);
    }else{
      this.speaker = this.dialog.owner;
    }

    if(typeof this.speaker == 'undefined'){
      this.speaker = this.dialog.owner;
    }

    if(this.listenerTag != ''){
      if(this.listenerTag == 'PLAYER'){
        this.listener = GameState.PartyManager.party[0];
      }else{
        this.listener = GameState.ModuleObjectManager.GetObjectByTag(this.listenerTag);
      }
    }else{
      this.listener = GameState.PartyManager.party[0];
    }

    if(typeof this.listener == 'undefined'){
      this.listener = this.dialog.listener;
    }

    //Checklist
    this.resetChecklist();
  }

  runScript1(){
    if(this.script){
      this.script.setScriptParam(1, this.scriptParams.Param1);
      this.script.setScriptParam(2, this.scriptParams.Param2);
      this.script.setScriptParam(3, this.scriptParams.Param3);
      this.script.setScriptParam(4, this.scriptParams.Param4);
      this.script.setScriptParam(5, this.scriptParams.Param5);
      this.script.setScriptStringParam(this.scriptParams.String);
      this.script.run(this.speaker || this.dialog?.owner || this.dialog?.owner, 0);
    }
  }

  runScript2(){
    if(this.script2){
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
    if(this.isActive){
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
    if(this.isActive2){
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
    const totalReplies = this.replies.length;
    const replyIds: number[] = [];
    for(let i = 0; i < totalReplies; i++){
      const replyLink = this.replies[i];
      if(replyLink.runActiveScripts()){
        replyIds.push(replyLink.index);
      }
    }
    return replyIds;
  }

  updateJournal(){
    if(this.quest){
      const allowOverrideHigher = false;
      GameState.JournalManager.AddJournalQuestEntry(this.quest, this.questEntry, allowOverrideHigher);
    }
    try{
      const speakerName = this.speaker?.getName?.() ?? '';
      log.trace('saving', speakerName, this.text);
      if(this.nodeType == DLGNodeType.ENTRY){
        GameState.DialogMessageManager.AddEntry(
          new DialogMessageEntry(
            speakerName, this.text
          )
        )
      }else{
        if(this.text.length){ /* empty */ }
      }
    }catch(e){
      log.error(String(e), e);
    }
  }

  update(delta: number = 0): boolean {
    this.elapsed += delta * 1000;
    this.processFadeOverlay();
    if(this.checkList.voiceOverError){
      if(this.elapsed >= this.delay){
        this.checkList.voiceOverComplete = true;
      }
    }
    return this.checkList.isComplete?.() ?? false;
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
    if(!this.fade.started){
      this.fade.started = true;
      switch(this.fade.type){
        case 1:
          GameState.FadeOverlayManager.FadeOut(0, this.fade.color.r, this.fade.color.g, this.fade.color.b, this.fade.delay);
        break;
        case 2:
          GameState.FadeOverlayManager.FadeIn(0, this.fade.color.r, this.fade.color.g, this.fade.color.b, this.fade.delay);
        break;
        case 3:
          GameState.FadeOverlayManager.FadeIn(this.fade.length, this.fade.color.r, this.fade.color.g, this.fade.color.b, this.fade.delay);
        break;
        case 4:
          GameState.FadeOverlayManager.FadeOut(this.fade.length, this.fade.color.r, this.fade.color.g, this.fade.color.b, this.fade.delay);
        break;
      }
    }
    if(this.elapsed >= (this.fade.delay + this.fade.length)){
      this.checkList.fadeComplete = true;
    }
  }

  loadResources(): Promise<void> {
    return new Promise((_resolve, _reject) => {
      // Dialog node resources (VO, LIP, etc.) loaded on demand when node plays
    });
  }

  async loadLIP(): Promise<boolean> {
    const resref = this.getVoiceResRef();
    if(resref){
      const lip = await LIPObject.Load(resref);
      if (BitWise.InstanceOfObject(this.speaker, ModuleObjectType.ModuleCreature)) {
        (this.speaker as ModuleCreature).setLIP(lip);
      }
      return true;
    }else{
      return false;
    }
  }

  resetLIP(){
    if (BitWise.InstanceOfObject(this.speaker, ModuleObjectType.ModuleCreature)) {
      (this.speaker as ModuleCreature).setLIP(undefined);
    }
  }

  async playVoiceOver(audioEmitter: AudioEmitter): Promise<boolean> {
    const resref = this.getVoiceResRef();
    if(resref){
      await this.loadLIP();
      try{
        const audioNode = await audioEmitter.playStreamWave(resref);
        if(audioNode){
          audioNode.onended = () => {
            this.checkList.voiceOverComplete = true;
          }
          return true;
        }
        return false;
      }catch{
        this.checkList.voiceOverError = true;
        return false;
      }
    }else{
      this.checkList.voiceOverError = true;
      return false;
    }
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
      cameraAnimationComplete: this.dialog.animatedCamera && this.cameraID > -1 && this.cameraAngle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA ? false : true,
      voiceOverComplete: false,
      alreadyAllowed: false,
      fadeComplete: false,
      voiceOverError: false,
      isComplete: (): boolean => {
        if (this.checkList.alreadyAllowed || this.checkList.isSkipped) {
          return false;
        }
        if (!!this.dialog.animatedCamera && this.cameraID > -1 && this.cameraAngle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA) {
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

  static FromDialogStruct( struct: GFFStruct, dialog: DLGObject ){
    const node = new DLGNode(dialog);
    node.setDialog(dialog);
    node.gffStruct = struct;

    if(struct.hasField('Quest')){
      node.quest = struct.getStringByLabel('Quest');
    }

    if(struct.hasField('Comment')){
      node.comment = struct.getStringByLabel('Comment');
    }

    if(struct.hasField('QuestEntry')){
      node.questEntry = struct.getNumberByLabel('QuestEntry');
    }

    if(struct.hasField('PlotXPPercentage')){
      node.plotXPPercentage = struct.getNumberByLabel('PlotXPPercentage');
    }

    if(struct.hasField('PlotIndex')){
      node.plotIndex = struct.getNumberByLabel('PlotIndex');
    }

    if(struct.hasField('Listener')){
      node.listenerTag = struct.getStringByLabel('Listener');
    }

    if(struct.hasField('Speaker')){
      node.speakerTag = struct.getStringByLabel('Speaker');
    }

    if(struct.hasField('VO_ResRef')){
      node.vo_resref = struct.getStringByLabel('VO_ResRef');
    }

    if(struct.hasField('Sound')){
      node.sound = struct.getStringByLabel('Sound');
    }

    if(struct.hasField('CameraID')){
      node.cameraID = struct.getNumberByLabel('CameraID');
    }

    if(struct.hasField('CameraAnimation')){
      node.cameraAnimation = struct.getNumberByLabel('CameraAnimation');
    }

    if(struct.hasField('CameraAngle')){
      node.cameraAngle = struct.getNumberByLabel('CameraAngle');
    }

    if(struct.hasField('CamVidEffect')){
      node.camVidEffect = struct.getNumberByLabel('CamVidEffect');
    }

    if(struct.hasField('Script')){
      const resref = struct.getStringByLabel('Script');
      if(resref){
        const instance = GameState.NWScript.Load(resref);
        if(instance){
          node.script = instance;
          node.script.name = resref;
        }
      }
    }

    if(struct.hasField('Script2')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      const resref = struct.getStringByLabel('Script2');
      if(resref){
        const instance = GameState.NWScript.Load(resref);
        if(instance){
          node.script2 = instance;
          node.script2.name = resref;
        }
      }

      //k2 MODE
      if(struct.hasField('ActionParam1')){
        node.scriptParams.Param1 = struct.getNumberByLabel('ActionParam1');
      }

      if(struct.hasField('ActionParam2')){
        node.scriptParams.Param2 = struct.getNumberByLabel('ActionParam2');
      }

      if(struct.hasField('ActionParam3')){
        node.scriptParams.Param3 = struct.getNumberByLabel('ActionParam3');
      }

      if(struct.hasField('ActionParam4')){
        node.scriptParams.Param4 = struct.getNumberByLabel('ActionParam4');
      }

      if(struct.hasField('ActionParam5')){
        node.scriptParams.Param5 = struct.getNumberByLabel('ActionParam5');
      }

      if(struct.hasField('ActionParamStrA')){
        node.scriptParams.String = struct.getStringByLabel('ActionParamStrA');
      }

      //k2 MODE
      if(struct.hasField('ActionParam1b')){
        node.script2Params.Param1 = struct.getNumberByLabel('ActionParam1b');
      }

      if(struct.hasField('ActionParam2b')){
        node.script2Params.Param2 = struct.getNumberByLabel('ActionParam2b');
      }

      if(struct.hasField('ActionParam3b')){
        node.script2Params.Param3 = struct.getNumberByLabel('ActionParam3b');
      }

      if(struct.hasField('ActionParam4b')){
        node.script2Params.Param4 = struct.getNumberByLabel('ActionParam4b');
      }

      if(struct.hasField('ActionParam5b')){
        node.script2Params.Param5 = struct.getNumberByLabel('ActionParam5b');
      }

      if(struct.hasField('ActionParamStrB')){
        node.script2Params.String = struct.getStringByLabel('ActionParamStrB');
      }

    }

    if(struct.hasField('CamFieldOfView')){
      node.camFieldOfView = struct.getNumberByLabel('CamFieldOfView');
    }

    if(struct.hasField('RepliesList')){
      const structs = struct.getFieldByLabel('RepliesList').getChildStructs();
      node.entries = [];
      for(let i = 0; i < structs.length; i++){
        const replyStruct = structs[i];
        const linkNode = new DLGNode(dialog);
        linkNode.gffStruct = replyStruct;

        if(replyStruct.hasField('Not')){
          linkNode.isActiveParams.Not = replyStruct.getBooleanByLabel('Not');
        }

        if(replyStruct.hasField('Param1')){
          linkNode.isActiveParams.Param1 = replyStruct.getNumberByLabel('Param1');
        }

        if(replyStruct.hasField('Param2')){
          linkNode.isActiveParams.Param2 = replyStruct.getNumberByLabel('Param2');
        }

        if(replyStruct.hasField('Param3')){
          linkNode.isActiveParams.Param3 = replyStruct.getNumberByLabel('Param3');
        }

        if(replyStruct.hasField('Param4')){
          linkNode.isActiveParams.Param4 = replyStruct.getNumberByLabel('Param4');
        }

        if(replyStruct.hasField('Param5')){
          linkNode.isActiveParams.Param5 = replyStruct.getNumberByLabel('Param5');
        }

        if(replyStruct.hasField('ParamStrA')){
          linkNode.isActiveParams.String = replyStruct.getStringByLabel('ParamStrA');
        }

        if(replyStruct.hasField('Not2')){
          linkNode.isActive2Params.Not = replyStruct.getBooleanByLabel('Not2');
        }

        if(replyStruct.hasField('Param1b')){
          linkNode.isActive2Params.Param1 = replyStruct.getNumberByLabel('Param1b');
        }

        if(replyStruct.hasField('Param2b')){
          linkNode.isActive2Params.Param2 = replyStruct.getNumberByLabel('Param2b');
        }

        if(replyStruct.hasField('Param3b')){
          linkNode.isActive2Params.Param3 = replyStruct.getNumberByLabel('Param3b');
        }

        if(replyStruct.hasField('Param4b')){
          linkNode.isActive2Params.Param4 = replyStruct.getNumberByLabel('Param4b');
        }

        if(replyStruct.hasField('Param5b')){
          linkNode.isActive2Params.Param5 = replyStruct.getNumberByLabel('Param5b');
        }

        if(replyStruct.hasField('ParamStrB')){
          linkNode.isActive2Params.String = replyStruct.getStringByLabel('ParamStrB');
        }

        if(replyStruct.hasField('Logic')){
          linkNode.Logic = replyStruct.getBooleanByLabel('Logic');
        }

        if(replyStruct.hasField('Active')){
          const resref = replyStruct.getStringByLabel('Active');
          if(resref){
            linkNode.isActive = GameState.NWScript.Load(resref);
            if(linkNode.isActive){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(replyStruct.hasField('Active2')){
          const resref = replyStruct.getStringByLabel('Active2');
          if(resref){
            linkNode.isActive2 = GameState.NWScript.Load(resref);
            if(linkNode.isActive2){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(replyStruct.hasField('Index')){
          linkNode.index = replyStruct.getNumberByLabel('Index');
        }

        node.replies.push(linkNode);

      }
    }

    if(struct.hasField('EntriesList')){
      const structs = struct.getFieldByLabel('EntriesList').getChildStructs();
      node.replies = [];
      for(let i = 0; i < structs.length; i++){
        const entryStruct = structs[i];
        const linkNode = new DLGNode(dialog);
        linkNode.gffStruct = entryStruct;

        if(entryStruct.hasField('Not')){
          linkNode.isActiveParams.Not = entryStruct.getBooleanByLabel('Not');
        }

        if(entryStruct.hasField('Param1')){
          linkNode.isActiveParams.Param1 = entryStruct.getNumberByLabel('Param1');
        }

        if(entryStruct.hasField('Param2')){
          linkNode.isActiveParams.Param2 = entryStruct.getNumberByLabel('Param2');
        }

        if(entryStruct.hasField('Param3')){
          linkNode.isActiveParams.Param3 = entryStruct.getNumberByLabel('Param3');
        }

        if(entryStruct.hasField('Param4')){
          linkNode.isActiveParams.Param4 = entryStruct.getNumberByLabel('Param4');
        }

        if(entryStruct.hasField('Param5')){
          linkNode.isActiveParams.Param5 = entryStruct.getNumberByLabel('Param5');
        }

        if(entryStruct.hasField('ParamStrA')){
          linkNode.isActiveParams.String = entryStruct.getStringByLabel('ParamStrA');
        }

        if(entryStruct.hasField('Not2')){
          linkNode.isActive2Params.Not = entryStruct.getBooleanByLabel('Not2');
        }

        if(entryStruct.hasField('Param1b')){
          linkNode.isActive2Params.Param1 = entryStruct.getNumberByLabel('Param1b');
        }

        if(entryStruct.hasField('Param2b')){
          linkNode.isActive2Params.Param2 = entryStruct.getNumberByLabel('Param2b');
        }

        if(entryStruct.hasField('Param3b')){
          linkNode.isActive2Params.Param3 = entryStruct.getNumberByLabel('Param3b');
        }

        if(entryStruct.hasField('Param4b')){
          linkNode.isActive2Params.Param4 = entryStruct.getNumberByLabel('Param4b');
        }

        if(entryStruct.hasField('Param5b')){
          linkNode.isActive2Params.Param5 = entryStruct.getNumberByLabel('Param5b');
        }

        if(entryStruct.hasField('ParamStrB')){
          linkNode.isActive2Params.String = entryStruct.getStringByLabel('ParamStrB');
        }

        if(entryStruct.hasField('Logic')){
          linkNode.Logic = entryStruct.getBooleanByLabel('Logic');
        }

        if(entryStruct.hasField('Active')){
          const resref = entryStruct.getStringByLabel('Active');
          if(resref){
            linkNode.isActive = GameState.NWScript.Load(resref);
            if(linkNode.isActive){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(entryStruct.hasField('Active2')){
          const resref = entryStruct.getStringByLabel('Active2');
          if(resref){
            linkNode.isActive2 = GameState.NWScript.Load(resref);
            if(linkNode.isActive2){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(entryStruct.hasField('Index')){
          linkNode.index = entryStruct.getNumberByLabel('Index');
        }

        node.entries.push(linkNode);

      }
    }

    if(struct.hasField('AnimList')){
      const structs = struct.getFieldByLabel('AnimList').getChildStructs();
      for(let i = 0; i < structs.length; i++){
        const childStruct = structs[i];
        const animation = {
          animation: '',
          participant: '',
        };

        if(childStruct.hasField('Animation')){
          animation.animation = childStruct.getStringByLabel('Animation');
        }

        if(childStruct.hasField('Participant')){
          animation.participant = childStruct.getStringByLabel('Participant').toLocaleLowerCase();
        }

        node.animations.push(animation);
      }
    }

    if(struct.hasField('Text')){
      const textField = struct.getFieldByLabel('Text');
      node.text = struct.getStringByLabel('Text');
      node.textLoc = textField.getCExoLocString();
    }

    if(struct.hasField('Delay')){
      node.delay = struct.getNumberByLabel('Delay') & 0xFFFFFFFF;
    }

    if(struct.hasField('FadeType')){
      node.fade.type = struct.getNumberByLabel('FadeType');
    }

    if(struct.hasField('FadeLength')){
      node.fade.length = struct.getNumberByLabel('FadeLength');
    }

    if(struct.hasField('FadeDelay')){
      node.fade.delay = struct.getNumberByLabel('FadeDelay');
    }

    if(struct.hasField('NodeUnskippable')){
      node.skippable = !struct.getBooleanByLabel('NodeUnskippable');
    }else{
      node.skippable = true;
    }

    if(struct.hasField('AlienRaceNode')){
      node.alienRaceNode = struct.getNumberByLabel('AlienRaceNode');
    }

    if(struct.hasField('Emotion')){
      node.emotion = struct.getNumberByLabel('Emotion');
    }

    if(struct.hasField('FacialAnim')){
      node.facialAnimation = struct.getNumberByLabel('FacialAnim');
    }

    if(struct.hasField('PostProcNode')){
      node.postProcessNode = struct.getNumberByLabel('PostProcNode');
    }

    if(struct.hasField('RecordNoVOOverri')){
      node.recordNoVOOverride = struct.getNumberByLabel('RecordNoVOOverri');
    }

    if(struct.hasField('RecordVO')){
      node.recordVO = struct.getNumberByLabel('RecordVO');
    }

    if(struct.hasField('VOTextChanged')){
      node.voTextChanged = struct.getBooleanByLabel('VOTextChanged');
    }

    return node;
  }

  getCompiledString(): string {
    let text = this.text;
    text = text.split('##')[0].replaceAll(/\{.*\}/ig, '').trim();
    //if(this.speaker instanceof ModuleCreature){
      text = text.replace(/<FullName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getStringByLabel('FirstName') ?? '');
      text = text.replace(/<FirstName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getStringByLabel('FirstName') ?? '');
      text = text.replace(/<LastName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getStringByLabel('LastName') ?? '');
      text = text.replace(/<CUSTOM(\d+)>/gm, (_match, p1: string) => {
        return GameState.module.getCustomToken(parseInt(p1, 10));
      });
    //}

    return text;
  }

  /**
   * Check if a dialog entry is a bark dialog node
   */
  isBarkDialog() {
    return this.replies.length == 1 /*&& !this.cameraAngle*/ && this.dialog.getReplyByIndex(this.replies[0].index).isEndDialog();
  }

  /**
   * Check if a dialog entry is a continue dialog node
   */
  isContinueDialog() {
    const parsedText = this.getCompiledString();
    if (this.nodeType == DLGNodeType.REPLY) {
      return parsedText == '' && this.entries.length;
    } else if (this.nodeType == DLGNodeType.ENTRY) {
      return parsedText == '' && this.replies.length;
    }
    return !parsedText;
  }

  /**
   * Check if a dialog entry is an end dialog node
   */
  isEndDialog() {
    const parsedText = this.getCompiledString();
    if (this.nodeType == DLGNodeType.REPLY) {
      return parsedText == '' && !this.entries.length;
    } else if (this.nodeType == DLGNodeType.ENTRY) {
      return parsedText == '' && !this.replies.length;
    }
    return !parsedText;
  }

}

