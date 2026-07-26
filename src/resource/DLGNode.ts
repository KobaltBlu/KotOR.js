import { AudioEmitter } from "@/audio";
import { DLGNodeType } from "@/enums/dialog/DLGNodeType";
import { DLGNodeEngineType } from "@/enums/dialog/DLGNodeEngineType";
import { GameState } from "@/GameState";
import { IDLGNodeScriptParams } from "@/interface/dialog/IDLGNodeScriptParams";
// import { DialogMessageEntry, DialogMessageManager, FadeOverlayManager, JournalManager, ModuleObjectManager } from "@/managers";
import type { ModuleCreature, ModuleObject } from "@/module";
// import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { LIPObject } from "@/resource/LIPObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { DialogMessageEntry } from "@/engine/DialogMessageEntry";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { DLGCameraAngle } from "@/enums/dialog/DLGCameraAngle";
import type { DLGObject } from "@/resource/DLGObject";

class DummyScriptInstance extends NWScriptInstance {
  name: string = 'SWG_DUMMY_SCRIPT';
  run(caller?: any, scriptVar?: number): false | 0 | 1 {
    return false;
  }
}

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
  animations: any[];
  cameraAngle: number;
  cameraID: number;
  cameraAnimation: number;
  camFieldOfView: number;
  /** Retail CamHeightOffset — SetShot field3 / GetCameraParameters height bias. */
  camHeightOffset: number = 0;
  /** Retail TarHeightOffset — SetShot field4 / focus height bias. */
  tarHeightOffset: number = 0;
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
  isActive: NWScriptInstance | DummyScriptInstance;
  isActiveParams: IDLGNodeScriptParams = {} as IDLGNodeScriptParams;
  isActive2: NWScriptInstance | DummyScriptInstance;
  isActive2Params: IDLGNodeScriptParams = {} as IDLGNodeScriptParams;
  Logic: boolean;
  index: number;
  isChild: number;
  sound: string;
  soundExists: number;
  speakerTag: string;
  text: string;
  vo_resref: string;
  waitFlags: number;
  /** Runtime entry timer in ms (set by CutsceneManager via setNodeDelay). */
  nodeDelayMs: number = 0;
  elapsed: number = 0;
  fade: { type: number; length: number; delay: number; color: { r: number; g: number; b: number; };  started: boolean };
  speaker: ModuleObject;
  dialog: DLGObject;

  /** Retail WaitFlags bits (CSWSObject::IsDialogDelay). */
  static readonly WAIT_CAMERA = 0x01;
  static readonly WAIT_VOICE = 0x02;
  static readonly WAIT_ANIM = 0x04;
  static readonly WAIT_FADE = 0x08;
  static readonly WAIT_EXPLICIT_DELAY = 0x10;
  /** Retail Delay DWORD 0xFFFFFFFF — use unsigned (>>> 0); JS `& 0xFFFFFFFF` yields signed -1. */
  static readonly DELAY_UNSET = 0xFFFFFFFF >>> 0;

  listener: ModuleObject;
  owner: ModuleObject;

  checkList: any = {};
  timeout: any;
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
    this.camHeightOffset = 0;
    this.tarHeightOffset = 0;
    this.camVidEffect = -1;
    this.comment = '';
    this.delay = 0;
    this.nodeDelayMs = 0;
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
    this.vo_resref = '';
    this.waitFlags = 0;
    this.elapsed = 0;
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

    this.elapsed = 0;
    this.fade.started = false;
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

  /**
   * Retail SendDialogReplies @ 007562c0 — Logic 0=AND, 1=OR;
   * a single present Active script is evaluated alone.
   */
  runActiveScripts(){
    const hasActive1 = !!this.isActive;
    const hasActive2 = !!this.isActive2;
    if(hasActive1 && hasActive2){
      const a = this.runActiveScript1();
      const b = this.runActiveScript2();
      return this.Logic ? (a || b) : (a && b);
    }
    if(hasActive1){
      return this.runActiveScript1();
    }
    if(hasActive2){
      return this.runActiveScript2();
    }
    return true;
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
    const speaker = this.speaker || (this.nodeType == DLGNodeType.REPLY ? GameState.getCurrentPlayer() : this.speaker);
    if(this.quest){
      const allowOverrideHigher = false;
      GameState.JournalManager.AddJournalQuestEntry(this.quest, this.questEntry, allowOverrideHigher);
    }
    // Retail CSWSDialog::GiveDialogPlotXP @ 00758ad0
    this.awardPlotIndexXP();
    if(!this.text || this.text.length == 0 || this.isContinueDialog()){
      console.warn(`No text found for ${this.text} on ${this.speaker?.getName()}. not saving to journal`, this.isContinueDialog());
      return;
    }
    try{
      if(!speaker){
        console.error(`No speaker found for ${this.text}`);
        console.log(this);
        return;
      }
      console.log('saving', speaker.getName(), this.text);
      GameState.DialogMessageManager.AddEntry(
        new DialogMessageEntry(
          speaker.getName(), this.text
        )
      )
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Award plot.2da XP from PlotIndex + PlotXPPercentage (retail GiveDialogPlotXP).
   */
  awardPlotIndexXP(){
    if(this.plotIndex === -1 || !(this.plotXPPercentage > 0)){
      return;
    }
    const plotTable = GameState.TwoDAManager.datatables.get('plot');
    if(!plotTable){
      return;
    }
    const row = plotTable.getByID(this.plotIndex) || plotTable.rows[this.plotIndex];
    if(!row){
      return;
    }
    const baseXP = parseInt(row.xp, 10);
    if(!(baseXP > 0)){
      return;
    }
    const percentage = Math.ceil(this.plotXPPercentage * 100);
    const award = Math.floor(baseXP * (percentage * 0.01));
    if(award > 0){
      GameState.PartyManager.GiveXP(award);
    }
  }

  update(delta: number = 0): boolean {
    this.elapsed += delta * 1000;
    this.processFadeOverlay();
    if(!!this.checkList.voiceOverError){
      if(this.elapsed >= this.nodeDelayMs){
        this.checkList.voiceOverComplete = true;
      }
    }
    return this.checkList.isComplete();
  }

  /**
   * Set the runtime entry delay timer (milliseconds).
   */
  setNodeDelay(delayMs: number = 0){
    this.nodeDelayMs = delayMs;
  }

  /**
   * Apply DLG node fade overlay.
   * Retail HandleDialogEntry → CSWGuiDialogLetterbox::SetFade @ 006a7620
   * (KotOR.js reuses FadeOverlayManager with the same dir/wait/length/color).
   * Types 1/4 fade out; 2/3 fade in. Length 0 is an instant cut (types 1/2).
   * WaitFlags&0x08 (WAIT_FADE) completes when the overlay IsFadeDone, with a
   * delay+length seconds fallback matching IsDialogDelay bit 8.
   */
  processFadeOverlay(){
    if(this.fade.type === 0){
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
    // Retail IsFadingInDialog: !letterbox.IsFadeDone
    if(GameState.FadeOverlayManager.isFadeDone() ||
       this.elapsed >= (this.fade.delay + this.fade.length) * 1000){
      this.checkList.fadeComplete = true;
    }
  }

  loadResources(): Promise<void> {
    return new Promise( (resolve, reject) => {

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
        this.onVoiceOverFailed();
        return false;
      }catch(e){
        this.onVoiceOverFailed();
        return false;
      }
    }else{
      this.checkList.voiceOverError = true;
      return false;
    }
  }

  /**
   * VO resref exists but playback failed (missing/undecodable file or denied voice).
   * Retail SendDialogEntry: when the sound file is not found and the explicit delay
   * bit (0x10) is clear, the entry timer falls back to the spoken-time estimate
   * instead of the node delay (often a 0s DelayEntry) — otherwise the line would
   * advance on the next frame.
   */
  private onVoiceOverFailed(){
    this.checkList.voiceOverError = true;
    this.checkList.voiceOverComplete = true;
    if((this.waitFlags & DLGNode.WAIT_EXPLICIT_DELAY) !== 0){
      return;
    }
    // Animated cuts use a 0s delay in retail (SetDialogDelay(0.0) when camera dialog)
    const delaySec = this.dialog?.isAnimatedCutscene
      ? 0
      : Math.max(0.01, DLGNode.estimateSpokenTimeSeconds(this.getCompiledString()));
    this.setNodeDelay(delaySec * 1000);
  }

  getVoiceResRef(): string {
    // Retail SoundExists: 0 → no VO playback (even if Sound/VO_ResRef strings present).
    // Default when field absent is 0x80; alien VO success sets bits via | 3.
    if((this.soundExists >>> 0) === 0){
      return '';
    }
    if (this.sound != '') {
      return this.sound;
    }else if (this.vo_resref != '') {
      return this.vo_resref;
    }else{
      return '';
    }
  }

  getVideoEffect(): number {
    return this.camVidEffect == -1 || this.cameraAngle != DLGCameraAngle.ANGLE_PLACEABLE_CAMERA ? -1 : this.camVidEffect;
  }

  /**
   * Entry completion checklist mirroring retail CSWSObject::IsDialogDelay WaitFlags bits.
   */
  resetChecklist(){
    const waitCamera = (this.waitFlags & DLGNode.WAIT_CAMERA) !== 0;
    const waitVoice = (this.waitFlags & DLGNode.WAIT_VOICE) !== 0;
    const waitAnim = (this.waitFlags & DLGNode.WAIT_ANIM) !== 0;
    const waitFade = (this.waitFlags & DLGNode.WAIT_FADE) !== 0;
    const hasAnimatedCamera = !!(this.dialog?.animatedCamera)
      && this.cameraAnimation > -1
      && this.cameraAngle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA;

    this.checkList = {
      isSkipped: false,
      cameraAnimationComplete: waitCamera && hasAnimatedCamera ? false : true,
      voiceOverComplete: waitVoice ? false : true,
      participantAnimationComplete: waitAnim ? false : true,
      alreadyAllowed: false,
      fadeComplete: waitFade ? false : true,
      voiceOverError: false,
      isComplete: (): boolean => {
        if (this.checkList.alreadyAllowed || this.checkList.isSkipped) {
          return false;
        }
        if (waitVoice && !this.checkList.voiceOverComplete) {
          return false;
        }
        if (waitFade && !this.checkList.fadeComplete) {
          return false;
        }
        if (waitCamera && !this.checkList.cameraAnimationComplete) {
          return false;
        }
        if (waitAnim && !this.checkList.participantAnimationComplete) {
          return false;
        }
        if (this.elapsed < this.nodeDelayMs) {
          return false;
        }
        this.checkList.alreadyAllowed = true;
        return true;
      }
    };
  }

  static FromDialogStruct( struct: GFFStruct, dialog: DLGObject, defaultUnsetDelay?: number ){
    let node = new DLGNode(dialog);
    node.setDialog(dialog);

    if(struct.hasField('Quest')){
      node.quest = struct.getFieldByLabel('Quest').getValue();
    }

    if(struct.hasField('QuestEntry')){
      node.questEntry = struct.getFieldByLabel('QuestEntry').getValue();
    }

    if(struct.hasField('PlotXPPercentage')){
      node.plotXPPercentage = struct.getFieldByLabel('PlotXPPercentage').getValue();
    }

    if(struct.hasField('PlotIndex')){
      node.plotIndex = struct.getFieldByLabel('PlotIndex').getValue();
    }

    if(struct.hasField('Listener')){
      node.listenerTag = struct.getFieldByLabel('Listener').getValue();
    }

    if(struct.hasField('Speaker')){
      node.speakerTag = struct.getFieldByLabel('Speaker').getValue();
    }

    if(struct.hasField('VO_ResRef')){
      node.vo_resref = struct.getFieldByLabel('VO_ResRef').getValue();
    }

    if(struct.hasField('Sound')){
      node.sound = struct.getFieldByLabel('Sound').getValue();
    }

    // Retail LoadDialogBase @ 0074f4f0 — SoundExists default 0x80 when absent
    if(struct.hasField('SoundExists')){
      node.soundExists = struct.getFieldByLabel('SoundExists').getValue();
    }else{
      node.soundExists = 0x80;
    }

    if(struct.hasField('CameraID')){
      node.cameraID = struct.getFieldByLabel('CameraID').getValue();
    }

    if(struct.hasField('CameraAnimation')){
      // Retail WORD; 0 means none. Valid CUT ids are 1000..0x6BF (SetAnimatedCamera @ 0062bfa0).
      const anim = struct.getFieldByLabel('CameraAnimation').getValue();
      node.cameraAnimation = anim > 0 ? anim : -1;
    }

    if(struct.hasField('CameraAngle')){
      node.cameraAngle = struct.getFieldByLabel('CameraAngle').getValue();
    }

    if(struct.hasField('CamVidEffect')){
      node.camVidEffect = struct.getFieldByLabel('CamVidEffect').getValue();
    }

    if(struct.hasField('Script')){
      const resref = struct.getFieldByLabel('Script').getValue();
      if(resref){
        const instance = GameState.NWScript.Load(resref);
        if(instance){
          node.script = instance;
          node.script.name = resref;
        }
      }
    }

    // Retail LoadDialogBase always reads ActionParam1-5/StrA with Script (not gated on Script2)
    if(struct.hasField('ActionParam1')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.scriptParams.Param1 = struct.getFieldByLabel('ActionParam1').getValue();
    }

    if(struct.hasField('ActionParam2')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.scriptParams.Param2 = struct.getFieldByLabel('ActionParam2').getValue();
    }

    if(struct.hasField('ActionParam3')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.scriptParams.Param3 = struct.getFieldByLabel('ActionParam3').getValue();
    }

    if(struct.hasField('ActionParam4')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.scriptParams.Param4 = struct.getFieldByLabel('ActionParam4').getValue();
    }

    if(struct.hasField('ActionParam5')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.scriptParams.Param5 = struct.getFieldByLabel('ActionParam5').getValue();
    }

    if(struct.hasField('ActionParamStrA')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.scriptParams.String = struct.getFieldByLabel('ActionParamStrA').getValue();
    }

    if(struct.hasField('Script2')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      const resref = struct.getFieldByLabel('Script2').getValue();
      if(resref){
        const instance = GameState.NWScript.Load(resref);
        if(instance){
          node.script2 = instance;
          node.script2.name = resref;
        }
      }
    }

    if(struct.hasField('ActionParam1b')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.script2Params.Param1 = struct.getFieldByLabel('ActionParam1b').getValue();
    }

    if(struct.hasField('ActionParam2b')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.script2Params.Param2 = struct.getFieldByLabel('ActionParam2b').getValue();
    }

    if(struct.hasField('ActionParam3b')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.script2Params.Param3 = struct.getFieldByLabel('ActionParam3b').getValue();
    }

    if(struct.hasField('ActionParam4b')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.script2Params.Param4 = struct.getFieldByLabel('ActionParam4b').getValue();
    }

    if(struct.hasField('ActionParam5b')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.script2Params.Param5 = struct.getFieldByLabel('ActionParam5b').getValue();
    }

    if(struct.hasField('ActionParamStrB')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.script2Params.String = struct.getFieldByLabel('ActionParamStrB').getValue();
    }

    if(struct.hasField('CamFieldOfView')){
      node.camFieldOfView = struct.getFieldByLabel('CamFieldOfView').getValue();
    }

    // LoadDialogCamera @ 0059eaa0
    if(struct.hasField('CamHeightOffset')){
      node.camHeightOffset = struct.getFieldByLabel('CamHeightOffset').getValue();
    }

    if(struct.hasField('TarHeightOffset')){
      node.tarHeightOffset = struct.getFieldByLabel('TarHeightOffset').getValue();
    }

    if(struct.hasField('RepliesList')){
      const structs = struct.getFieldByLabel('RepliesList').getChildStructs();
      node.entries = [];
      for(let i = 0; i < structs.length; i++){
        let replyStruct = structs[i];
        let linkNode = new DLGNode(dialog);

        if(replyStruct.hasField('Not')){
          linkNode.isActiveParams.Not = replyStruct.getFieldByLabel('Not').getValue();
        }

        if(replyStruct.hasField('Param1')){
          linkNode.isActiveParams.Param1 = replyStruct.getFieldByLabel('Param1').getValue();
        }

        if(replyStruct.hasField('Param2')){
          linkNode.isActiveParams.Param2 = replyStruct.getFieldByLabel('Param2').getValue();
        }

        if(replyStruct.hasField('Param3')){
          linkNode.isActiveParams.Param3 = replyStruct.getFieldByLabel('Param3').getValue();
        }

        if(replyStruct.hasField('Param4')){
          linkNode.isActiveParams.Param4 = replyStruct.getFieldByLabel('Param4').getValue();
        }

        if(replyStruct.hasField('Param5')){
          linkNode.isActiveParams.Param5 = replyStruct.getFieldByLabel('Param5').getValue();
        }

        if(replyStruct.hasField('ParamStrA')){
          linkNode.isActiveParams.String = replyStruct.getFieldByLabel('ParamStrA').getValue();
        }

        if(replyStruct.hasField('Not2')){
          linkNode.isActive2Params.Not = replyStruct.getFieldByLabel('Not2').getValue();
        }

        if(replyStruct.hasField('Param1b')){
          linkNode.isActive2Params.Param1 = replyStruct.getFieldByLabel('Param1b').getValue();
        }

        if(replyStruct.hasField('Param2b')){
          linkNode.isActive2Params.Param2 = replyStruct.getFieldByLabel('Param2b').getValue();
        }

        if(replyStruct.hasField('Param3b')){
          linkNode.isActive2Params.Param3 = replyStruct.getFieldByLabel('Param3b').getValue();
        }

        if(replyStruct.hasField('Param4b')){
          linkNode.isActive2Params.Param4 = replyStruct.getFieldByLabel('Param4b').getValue();
        }

        if(replyStruct.hasField('Param5b')){
          linkNode.isActive2Params.Param5 = replyStruct.getFieldByLabel('Param5b').getValue();
        }

        if(replyStruct.hasField('ParamStrB')){
          linkNode.isActive2Params.String = replyStruct.getFieldByLabel('ParamStrB').getValue();
        }

        if(replyStruct.hasField('Logic')){
          linkNode.Logic = !!replyStruct.getFieldByLabel('Logic').getValue();
        }

        if(replyStruct.hasField('Active')){
          const resref = replyStruct.getFieldByLabel('Active').getValue();
          if(resref){
            linkNode.isActive = GameState.NWScript.Load(resref) || new DummyScriptInstance(null);
            if(linkNode.isActive){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(replyStruct.hasField('Active2')){
          const resref = replyStruct.getFieldByLabel('Active2').getValue();
          if(resref){
            linkNode.isActive2 = GameState.NWScript.Load(resref) || new DummyScriptInstance(null);
            if(linkNode.isActive2){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(replyStruct.hasField('Index')){
          linkNode.index = replyStruct.getFieldByLabel('Index').getValue();
        }

        node.replies.push(linkNode);

      }
    }

    if(struct.hasField('EntriesList')){
      const structs = struct.getFieldByLabel('EntriesList').getChildStructs();
      node.replies = [];
      for(let i = 0; i < structs.length; i++){
        let entryStruct = structs[i];
        let linkNode = new DLGNode(dialog);
        
        if(entryStruct.hasField('Not')){
          linkNode.isActiveParams.Not = entryStruct.getFieldByLabel('Not').getValue();
        }

        if(entryStruct.hasField('Param1')){
          linkNode.isActiveParams.Param1 = entryStruct.getFieldByLabel('Param1').getValue();
        }

        if(entryStruct.hasField('Param2')){
          linkNode.isActiveParams.Param2 = entryStruct.getFieldByLabel('Param2').getValue();
        }

        if(entryStruct.hasField('Param3')){
          linkNode.isActiveParams.Param3 = entryStruct.getFieldByLabel('Param3').getValue();
        }

        if(entryStruct.hasField('Param4')){
          linkNode.isActiveParams.Param4 = entryStruct.getFieldByLabel('Param4').getValue();
        }

        if(entryStruct.hasField('Param5')){
          linkNode.isActiveParams.Param5 = entryStruct.getFieldByLabel('Param5').getValue();
        }

        if(entryStruct.hasField('ParamStrA')){
          linkNode.isActiveParams.String = entryStruct.getFieldByLabel('ParamStrA').getValue();
        }

        if(entryStruct.hasField('Not2')){
          linkNode.isActive2Params.Not = entryStruct.getFieldByLabel('Not2').getValue();
        }

        if(entryStruct.hasField('Param1b')){
          linkNode.isActive2Params.Param1 = entryStruct.getFieldByLabel('Param1b').getValue();
        }

        if(entryStruct.hasField('Param2b')){
          linkNode.isActive2Params.Param2 = entryStruct.getFieldByLabel('Param2b').getValue();
        }

        if(entryStruct.hasField('Param3b')){
          linkNode.isActive2Params.Param3 = entryStruct.getFieldByLabel('Param3b').getValue();
        }

        if(entryStruct.hasField('Param4b')){
          linkNode.isActive2Params.Param4 = entryStruct.getFieldByLabel('Param4b').getValue();
        }

        if(entryStruct.hasField('Param5b')){
          linkNode.isActive2Params.Param5 = entryStruct.getFieldByLabel('Param5b').getValue();
        }

        if(entryStruct.hasField('ParamStrB')){
          linkNode.isActive2Params.String = entryStruct.getFieldByLabel('ParamStrB').getValue();
        }

        if(entryStruct.hasField('Logic')){
          linkNode.Logic = !!entryStruct.getFieldByLabel('Logic').getValue();
        }

        if(entryStruct.hasField('Active')){
          const resref = entryStruct.getFieldByLabel('Active').getValue();
          if(resref){
            linkNode.isActive = GameState.NWScript.Load(resref) || new DummyScriptInstance(null);
            if(linkNode.isActive){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(entryStruct.hasField('Active2')){
          const resref = entryStruct.getFieldByLabel('Active2').getValue();
          if(resref){
            linkNode.isActive2 = GameState.NWScript.Load(resref) || new DummyScriptInstance(null);
            if(linkNode.isActive2){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(entryStruct.hasField('Index')){
          linkNode.index = entryStruct.getFieldByLabel('Index').getValue();
        }

        node.entries.push(linkNode);

      }
    }

    if(struct.hasField('AnimList')){
      const structs = struct.getFieldByLabel('AnimList').getChildStructs();
      for(let i = 0; i < structs.length; i++){
        let childStruct = structs[i];
        let animation = {
          animation: '',
          participant: '',
        };
        
        if(childStruct.hasField('Animation')){
          animation.animation = childStruct.getFieldByLabel('Animation').getValue();
        }
        
        if(childStruct.hasField('Participant')){
          animation.participant = childStruct.getFieldByLabel('Participant').getValue().toLocaleLowerCase();
        }

        node.animations.push(animation);
      }
    }

    if(struct.hasField('Text')){
      node.text = struct.getFieldByLabel('Text').getValue();
    }

    if(struct.hasField('Delay')){
      // >>> 0: JS bitwise & yields signed -1 for 0xFFFFFFFF; retail Delay unset is unsigned
      node.delay = struct.getFieldByLabel('Delay').getValue() >>> 0;
    }

    if(struct.hasField('WaitFlags')){
      node.waitFlags = struct.getFieldByLabel('WaitFlags').getValue() >>> 0;
    }

    let fadeTypePresent = false;
    if(struct.hasField('FadeType')){
      fadeTypePresent = true;
      node.fade.type = struct.getFieldByLabel('FadeType').getValue();
    }

    if(struct.hasField('FadeLength')){
      node.fade.length = struct.getFieldByLabel('FadeLength').getValue();
    }

    if(struct.hasField('FadeDelay')){
      node.fade.delay = struct.getFieldByLabel('FadeDelay').getValue();
    }

    if(struct.hasField('FadeColor')){
      const color = struct.getFieldByLabel('FadeColor').getVector();
      if(color){
        node.fade.color.r = color.x;
        node.fade.color.g = color.y;
        node.fade.color.b = color.z;
      }
    }

    if(struct.hasField('AlienRaceNode')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.alienRaceNode = struct.getFieldByLabel('AlienRaceNode').getValue();
    }

    if(struct.hasField('Emotion')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.emotion = struct.getFieldByLabel('Emotion').getValue();
    }

    if(struct.hasField('FacialAnim')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.facialAnimation = struct.getFieldByLabel('FacialAnim').getValue();
    }

    // Retail LoadDialogBase alien VO resolve must run before delay/WaitFlags mutations
    node.resolveAlienVO(dialog);

    // Retail CSWSDialog::LoadDialogBase fade / delay / WaitFlags mutations
    node.applyLoadDialogBaseMutations(dialog, fadeTypePresent, defaultUnsetDelay);

    if(struct.hasField('NodeUnskippable')){
      node.skippable = !struct.getFieldByLabel('NodeUnskippable').getValue();
    }else{
      node.skippable = true;
    }

    if(struct.hasField('PostProcNode')){
      node.nodeEngineType = DLGNodeEngineType.K2;
      node.postProcessNode = struct.getFieldByLabel('PostProcNode').getValue();
    }

    if(struct.hasField('RecordNoVOOverri')){
      node.recordNoVOOverride = struct.getFieldByLabel('RecordNoVOOverri').getValue();
    }

    if(struct.hasField('RecordVO')){
      node.recordVO = struct.getFieldByLabel('RecordVO').getValue();
    }

    if(struct.hasField('VOTextChanged')){
      node.voTextChanged = !!struct.getFieldByLabel('VOTextChanged').getValue();
    }

    return node;
  }

  /**
   * Retail LoadDialogBase @ 0074f4f0 alien/foreign-language VO resolution.
   * When VO_ResRef is empty: race row from AlienRaceNode (or AlienRaceOwner for
   * empty Speaker); emotion.2da[Emotion].LABEL names the alienvo.2da column.
   */
  resolveAlienVO(dialog: DLGObject){
    if(this.vo_resref || this.sound){
      return;
    }
    const speakerEmpty = !(this.speakerTag && String(this.speakerTag).trim().length);
    let raceRow = 0;
    if(!speakerEmpty){
      // Tagged speaker: only AlienRaceNode > 0 (no owner fallback)
      if(this.alienRaceNode > 0){
        raceRow = this.alienRaceNode;
      }
    }else if(this.alienRaceNode > 0){
      raceRow = this.alienRaceNode;
    }else if((dialog?.alienRaceOwner ?? 0) > 0){
      raceRow = dialog.alienRaceOwner;
    }
    if(!(raceRow > 0)){
      return;
    }

    const emotionTable = GameState.TwoDAManager.datatables.get('emotion');
    const alienVOTable = GameState.TwoDAManager.datatables.get('alienvo');
    if(!emotionTable || !alienVOTable){
      console.warn('DLGNode.resolveAlienVO: emotion.2da or alienvo.2da not loaded');
      return;
    }

    const emotionRow = emotionTable.getByID(this.emotion) || emotionTable.rows[this.emotion];
    if(!emotionRow){
      return;
    }
    const column = String(emotionRow.label || emotionRow.LABEL || '').trim();
    if(!column || column === '****'){
      return;
    }

    const alienRow = alienVOTable.getByID(raceRow) || alienVOTable.rows[raceRow];
    if(!alienRow){
      return;
    }
    // Column names from emotion LABEL — try exact then lowercase (TwoDA column keys vary)
    const resref = String(
      alienRow[column] ?? alienRow[column.toLowerCase()] ?? alienRow[column.toUpperCase()] ?? ''
    ).trim();
    if(!resref || resref === '****'){
      return;
    }

    this.vo_resref = resref;
    this.soundExists = (this.soundExists | 3) >>> 0;
  }

  /**
   * Retail CSWSDialog::LoadDialogBase post-load mutations for Delay, WaitFlags, and fade fields.
   * @param defaultUnsetDelay — DelayEntry for entries, DelayReply for replies.
   */
  applyLoadDialogBaseMutations(
    dialog: DLGObject,
    fadeTypePresent: boolean = true,
    defaultUnsetDelay?: number
  ){
    const hasSound = !!(this.sound || this.vo_resref);
    const delayDefault = (
      typeof defaultUnsetDelay === 'number'
        ? defaultUnsetDelay
        : (dialog?.delayEntry ?? 0)
    ) >>> 0;
    // Normalize in case callers stored a signed -1 from a bitwise op
    this.delay = this.delay >>> 0;

    if(this.delay === DLGNode.DELAY_UNSET){
      if(!hasSound){
        if(this.waitFlags === 0){
          // leave delay unset; SendDialogEntry will use spoken-time estimate
        }else{
          this.delay = delayDefault;
        }
      }else{
        this.delay = delayDefault;
        if(this.waitFlags === 0){
          this.waitFlags = DLGNode.WAIT_VOICE;
        }
      }
    }else{
      this.waitFlags = this.waitFlags | DLGNode.WAIT_EXPLICIT_DELAY;
    }

    if(this.fade.type === 1 || this.fade.type === 2){
      this.fade.length = 0;
    }
    if(this.fade.type === 0 || !fadeTypePresent){
      this.fade.type = 0;
      this.fade.delay = 0;
      this.fade.length = 0;
      this.fade.color.r = 0;
      this.fade.color.g = 0;
      this.fade.color.b = 0;
    }
  }

  /**
   * Spoken-time estimate in seconds when Delay is unset and there is no VO.
   * Retail CExoLocString::GetSpokenTimeEstimate @ 005ea270: length * 0.11 + 1.0
   * (empty text returns 0; CSWSDialog::SetDialogDelay floors the result to 0.01).
   */
  static estimateSpokenTimeSeconds(text: string): number {
    const cleaned = (text || '').trim();
    if(!cleaned.length){
      return 0;
    }
    return cleaned.length * 0.11 + 1.0;
  }

  getCompiledString(): string {
    let text = this.text;
    text = text.split('##')[0].replaceAll(/\{.*?\}/ig, '').trim();
    //if(this.speaker instanceof ModuleCreature){
      text = text.replace(/<FullName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getFieldByLabel('FirstName')?.getValue());
      text = text.replace(/<FirstName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getFieldByLabel('FirstName')?.getValue());
      text = text.replace(/<LastName>/gm, GameState.PartyManager.ActualPlayerTemplate?.getFieldByLabel('LastName')?.getValue());
      text = text.replace(/<CUSTOM(\d+)>/gm, function(match, p1, offset, string){
        return GameState.module.getCustomToken(parseInt(p1));
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

