import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { OdysseyModel3D } from "@/three/odyssey";
import { DLGNode } from "@/resource/DLGNode";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import * as THREE from "three";
import { IDLGStuntActor } from "@/interface/dialog/IDLGStuntActor";
import { DLGNodeType } from "@/enums/dialog/DLGNodeType";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
// import { NWScript } from "@/nwscript/NWScript";
import { MDLLoader, ResourceLoader } from "@/loaders";
import { AudioLoader } from "@/audio/AudioLoader";
import { AudioEngine } from "@/audio/AudioEngine";

import { isCreature } from "@/module/guards/isCreature";

export interface DLGObjectScripts {
  onEndConversationAbort: NWScriptInstance,
  onEndConversation: NWScriptInstance,
}

/**
 * DLGObject class.
 * 
 * Class representing a DLG file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file DLGObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class DLGObject {
  resref: string;
  gff: GFFObject;
  conversationType: number;
  /** Root ComputerType BYTE — default 0 (LoadDialog). */
  computerType: number = 0;
  entryList: DLGNode[] = [];
  replyList: DLGNode[] = [];
  startingList: DLGNode[] = [];
  stuntActors: Map<string, IDLGStuntActor> = new Map();
  owner: ModuleObject;
  listener: ModuleObject;

  vo_id: string; //folder where the vo files reside

  scripts: DLGObjectScripts = {
    onEndConversationAbort: undefined,
    onEndConversation: undefined,
  }

  ambientTrack: string;
  unequipHeadItem: boolean;
  unequipItems: boolean;
  /** Root Skippable BYTE — default true (LoadDialog). */
  skippable: boolean = true;
  isAnimatedCutscene: boolean;
  animatedCameraResRef: string;
  animatedCamera: OdysseyModel3D;
  recordNoVO: boolean;
  oldHitCheck: boolean;
  postProcOwner: number;
  alienRaceOwner: number;
  /** DLG root DelayEntry — default entry delay in seconds when node Delay is -1. */
  delayEntry: number = 0;
  /** DLG root DelayReply — default reply delay in seconds. */
  delayReply: number = 0;

  constructor(resref = ''){
    this.resref = resref;

    this.conversationType = 0;
    this.computerType = 0;
    this.entryList = [];
    this.replyList = [];
    this.startingList = [];

    this.owner = undefined;
    this.listener = undefined;

  }

  init(){

    let conversationType = this.gff.RootNode.getFieldByLabel('ConversationType');
    if(conversationType){
      this.conversationType = conversationType.getValue();
    }

    // LoadDialog default ComputerType = 0
    if(this.gff.RootNode.hasField('ComputerType')){
      this.computerType = this.gff.RootNode.getFieldByLabel('ComputerType').getValue() & 0xff;
    }else{
      this.computerType = 0;
    }

    if(this.gff.RootNode.hasField('VO_ID')){
      this.vo_id = this.gff.RootNode.getFieldByLabel('VO_ID').getValue();
    }

    if(this.gff.RootNode.hasField('CameraModel')){
      this.animatedCameraResRef = this.gff.RootNode.getFieldByLabel('CameraModel').getValue();
    }

    // Load before EntryList/ReplyList so LoadDialogBase mutations can use DelayEntry
    if(this.gff.RootNode.hasField('DelayEntry')){
      this.delayEntry = this.gff.RootNode.getFieldByLabel('DelayEntry').getValue() >>> 0;
    }
    if(this.gff.RootNode.hasField('DelayReply')){
      this.delayReply = this.gff.RootNode.getFieldByLabel('DelayReply').getValue() >>> 0;
    }

    if(this.gff.RootNode.hasField('EndConverAbort')){
      const scriptName = this.gff.RootNode.getFieldByLabel('EndConverAbort').getValue();
      this.scripts.onEndConversationAbort = GameState.NWScript.Load(scriptName);
      if(this.scripts.onEndConversationAbort){
        this.scripts.onEndConversationAbort.name = scriptName;
      }
    }

    if(this.gff.RootNode.hasField('EndConversation')){
      const scriptName = this.gff.RootNode.getFieldByLabel('EndConversation').getValue();
      this.scripts.onEndConversation = GameState.NWScript.Load(scriptName);
      if(this.scripts.onEndConversation){
        this.scripts.onEndConversation.name = scriptName;
      }
    }

    // LoadDialog default Skippable = 1
    if(this.gff.RootNode.hasField('Skippable')){
      this.skippable = this.gff.RootNode.getFieldByLabel('Skippable').getValue() ? true : false;
    }else{
      this.skippable = true;
    }

    if(this.gff.RootNode.hasField('AnimatedCut')){
      this.isAnimatedCutscene = this.gff.RootNode.getFieldByLabel('AnimatedCut').getValue() ? true : false;
    }

    if(this.gff.RootNode.hasField('AmbientTrack')){
      this.ambientTrack = this.gff.RootNode.getFieldByLabel('AmbientTrack').getValue();
    }

    if(this.gff.RootNode.hasField('UnequipHItem')){
      this.unequipHeadItem = this.gff.RootNode.getFieldByLabel('UnequipHItem').getValue() ? true : false;
    }

    if(this.gff.RootNode.hasField('UnequipItems')){
      this.unequipItems = this.gff.RootNode.getFieldByLabel('UnequipItems').getValue() ? true : false;
    }

    if(this.gff.RootNode.hasField('AlienRaceOwner')){
      this.alienRaceOwner = this.gff.RootNode.getFieldByLabel('AlienRaceOwner').getValue();
    }

    if(this.gff.RootNode.hasField('RecordNoVO')){
      this.recordNoVO = this.gff.RootNode.getFieldByLabel('RecordNoVO').getValue() ? true : false;
    }

    if(this.gff.RootNode.hasField('OldHitCheck')){
      this.oldHitCheck = this.gff.RootNode.getFieldByLabel('OldHitCheck').getValue() ? true : false;
    }

    if(this.gff.RootNode.hasField('PostProcOwner')){
      this.postProcOwner = this.gff.RootNode.getFieldByLabel('PostProcOwner').getValue();
    }

    if(this.gff.RootNode.hasField('EntryList')){
      const entries = this.gff.RootNode.getFieldByLabel('EntryList').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        let node = DLGNode.FromDialogStruct(entries[i], this, this.delayEntry);
        node.nodeType = DLGNodeType.ENTRY;
        this.entryList.push( node );
      }
    }

    if(this.gff.RootNode.hasField('ReplyList')){
      const replies = this.gff.RootNode.getFieldByLabel('ReplyList').getChildStructs();
      for(let i = 0; i < replies.length; i++){
        let node = DLGNode.FromDialogStruct(replies[i], this, this.delayReply);
        node.nodeType = DLGNodeType.REPLY;
        this.replyList.push( node );
      }
    }

    if(this.gff.RootNode.hasField('StuntList')){
      const stunts = this.gff.RootNode.getFieldByLabel('StuntList').getChildStructs();
      for(let i = 0; i < stunts.length; i++){
        const stunt: IDLGStuntActor = {
          participant: '',
          resref: ''
        };

        const struct = stunts[i];
        if(struct.hasField('Participant')){
          stunt.participant = struct.getFieldByLabel('Participant').getValue();
          stunt.participant = stunt.participant != '' ? stunt.participant : 'OWNER';
        }

        if(struct.hasField('StuntModel')){
          stunt.resref = struct.getFieldByLabel('StuntModel').getValue();
        }

        this.stuntActors.set(stunt.participant.toLocaleLowerCase(), stunt);
      }
    }

    if(this.gff.RootNode.hasField('StartingList')){
      const startingList = this.gff.RootNode.getFieldByLabel('StartingList').getChildStructs();

      for(let i = 0; i < startingList.length; i++){
        let struct = startingList[i];
        let linkNode = new DLGNode(this);
        linkNode.nodeType = DLGNodeType.STARTING;
        
        linkNode.entries = [];
        linkNode.replies = [];

        if(struct.hasField('Not')){
          linkNode.isActiveParams.Not = struct.getFieldByLabel('Not').getValue();
        }

        if(struct.hasField('Param1')){
          linkNode.isActiveParams.Param1 = struct.getFieldByLabel('Param1').getValue();
        }

        if(struct.hasField('Param2')){
          linkNode.isActiveParams.Param2 = struct.getFieldByLabel('Param2').getValue();
        }

        if(struct.hasField('Param3')){
          linkNode.isActiveParams.Param3 = struct.getFieldByLabel('Param3').getValue();
        }

        if(struct.hasField('Param4')){
          linkNode.isActiveParams.Param4 = struct.getFieldByLabel('Param4').getValue();
        }

        if(struct.hasField('Param5')){
          linkNode.isActiveParams.Param5 = struct.getFieldByLabel('Param5').getValue();
        }

        if(struct.hasField('ParamStrA')){
          linkNode.isActiveParams.String = struct.getFieldByLabel('ParamStrA').getValue();
        }

        if(struct.hasField('Not2')){
          linkNode.isActive2Params.Not = struct.getFieldByLabel('Not2').getValue();
        }

        if(struct.hasField('Param1b')){
          linkNode.isActive2Params.Param1 = struct.getFieldByLabel('Param1b').getValue();
        }

        if(struct.hasField('Param2b')){
          linkNode.isActive2Params.Param2 = struct.getFieldByLabel('Param2b').getValue();
        }

        if(struct.hasField('Param3b')){
          linkNode.isActive2Params.Param3 = struct.getFieldByLabel('Param3b').getValue();
        }

        if(struct.hasField('Param4b')){
          linkNode.isActive2Params.Param4 = struct.getFieldByLabel('Param4b').getValue();
        }

        if(struct.hasField('Param5b')){
          linkNode.isActive2Params.Param5 = struct.getFieldByLabel('Param5b').getValue();
        }

        if(struct.hasField('ParamStrB')){
          linkNode.isActive2Params.String = struct.getFieldByLabel('ParamStrB').getValue();
        }

        if(struct.hasField('Logic')){
          linkNode.Logic = !!struct.getFieldByLabel('Logic').getValue();
        }

        if(struct.hasField('Active')){
          const resref = struct.getFieldByLabel('Active').getValue();
          if(resref){
            linkNode.isActive = GameState.NWScript.Load(resref);
            if(linkNode.isActive){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(struct.hasField('Active2')){
          const resref = struct.getFieldByLabel('Active2').getValue();
          if(resref){
            linkNode.isActive2 = GameState.NWScript.Load(resref);
            if(linkNode.isActive2){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(struct.hasField('Index')){
          linkNode.index = struct.getFieldByLabel('Index').getValue();
        }

        this.startingList.push(linkNode);
      }
    }

  }

  getReplyByIndex( index = -1 ){
    return this.replyList[index];
  }

  getEntryByIndex( index = -1 ){
    return this.entryList[index];
  }

  getConversationType(){
    return this.conversationType;
  }

  getStuntActors(){
    return this.stuntActors;
  }

  getNextEntryIndex( entryLinkList: DLGNode[] = [] ){
    if(!entryLinkList.length){
      return undefined;
    }

    let e_count = entryLinkList.length;
    for(let i = 0; i < e_count; i++){
      let entryLink = entryLinkList[i];
      let isActive = entryLink.runActiveScripts();
      if(isActive){
        return entryLink.index;
      }
    }

    return undefined;
  }

  getAvailableReplies( entry: DLGNode ){
    let replies: DLGNode[] = [];
    let replyLinks = entry.getActiveReplies();
    for (let i = 0; i < replyLinks.length; i++) {
      let reply = this.getReplyByIndex(replyLinks[i]);
      if (reply) {
        replies.push(reply);
      } else {
        console.warn('getAvailableReplies() Failed to find reply at index: ' + replyLinks[i]);
      }
    }
    return replies;
  }

  async loadStuntCamera(){
    try{
      console.log('loadStuntCamera', this.animatedCameraResRef);
      if(!this.animatedCameraResRef){ return; }

      const model = await MDLLoader.loader.load(this.animatedCameraResRef);
      if(!model){ return; }

      const mdl = await OdysseyModel3D.FromMDL(model);
      if(!mdl){ return; }

      this.animatedCamera = mdl;
      this.animatedCamera.bonesInitialized = true;
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Bind a StuntList participant. Returns false when the object/model is not
   * ready yet (SpawnAvailableNPC race) so the caller can retry.
   */
  async loadStuntActor(actor: IDLGStuntActor): Promise<boolean> {
    try{
      const key = (actor.participant || '').toLocaleLowerCase();
      let creature: ModuleObject | undefined;

      if(key === 'player'){
        creature = GameState.PartyManager.party[0];
      }else if(key === 'owner'){
        creature = this.owner;
      }else{
        creature = GameState.ModuleObjectManager.GetObjectByTag(actor.participant);
      }

      if(!creature){
        return false;
      }

      // SpawnAvailableNPC returns before loadModel finishes. Poll first so we
      // don't bump modelLoadGeneration and discard the in-flight spawn load.
      if(isCreature(creature)){
        const c = creature as ModuleCreature;
        if(!c.model){
          await DLGObject.waitForCreatureModel(c, 1500);
        }
        if(!c.model){
          await c.loadModel();
        }
        if(!c.model){
          return false;
        }
      }

      if(actor.resref){
        const actorModel = await MDLLoader.loader.load(actor.resref);
        if(actorModel){
          const actorSuperModel = await OdysseyModel3D.FromMDL(actorModel);
          if(actorSuperModel){
            actor.animations = actorSuperModel.odysseyAnimations;
          }
        }
      }

      if(this.isAnimatedCutscene){
        creature.setFacing?.(0, true);
      }

      if(
        (this.unequipItems || this.unequipHeadItem) &&
        isCreature(creature)
      ){
        GameState.CutsceneManager.hideEquippedItemsForDialog(creature as ModuleCreature);
      }

      actor.moduleObject = creature;
      creature.setCutsceneMode?.(true);

      if(creature.model){
        try{
          creature.model.box = new THREE.Box3().setFromObject(creature.model);
        }catch(_e){ /* model may still be assembling skins */ }
      }

      return !!(actor.animations?.length || !actor.resref);
    }catch(e){
      console.error('DLGObject.loadStuntActor', actor.participant, e);
      return false;
    }
  }

  /** Wait for an in-flight ModuleCreature.loadModel without starting another. */
  static async waitForCreatureModel(creature: ModuleCreature, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + Math.max(0, timeoutMs);
    while(!creature.model && Date.now() < deadline){
      await new Promise<void>((resolve) => setTimeout(resolve, 16));
    }
  }

  async loadStuntActors(){
    for(const actor of this.stuntActors.values()){
      await this.loadStuntActor(actor);
    }
  }

  /** Re-attempt StuntList binds that failed because models were still loading. */
  async reloadMissingStuntActors(){
    for(const actor of this.stuntActors.values()){
      const needsReload =
        !actor.moduleObject ||
        (isCreature(actor.moduleObject) &&
          !(actor.moduleObject as ModuleCreature).model) ||
        (actor.resref && !actor.animations?.length);
      if(needsReload){
        await this.loadStuntActor(actor);
      }
    }
  }

  releaseStuntActors(){
    while (GameState.group.stunt.children.length) {
      GameState.group.stunt.remove(GameState.group.stunt.children[0]);
    }
    this.stuntActors.forEach( async (actor) => {
      const moduleObject = actor.moduleObject;
      if(moduleObject){
        moduleObject.clearAllActions();
        moduleObject.setCutsceneMode(false);
      }
    });
    this.stuntActors.clear()
  }

  /**
   * Load the dialog AmbientTrack (LoadAmbientTrackForDialog).
   * Empty / missing track destroys any prior dialog stream without recreating.
   */
  async loadBackgroundMusic() {
    const audio = AudioEngine.GetAudioEngine();
    if (!this.ambientTrack) {
      // empty LoadAmbientTrack: hard-destroy prior source (no fade).
      audio.dialogMusicAudioEmitter.stop();
      return;
    }
    const bgm = await AudioLoader.LoadMusic(this.ambientTrack);
    if(!bgm){ return; }
    audio.setAudioBuffer('DIALOG', bgm.buffer as ArrayBuffer, this.ambientTrack);
    // : new streaming sound source → looping off; Play never SetLooping.
    // AIL loop_count with looping off → 1 (play once). Play's 4th arg is STREAMMUSIC path, not loop.
    // Layers over ducked area BGM (do not stop area).
    audio.dialogMusicAudioEmitter.play(false);
  }

  async load(){
    return new Promise<void>( (resolve, reject) => {
      if(this.resref){
        const buffer = ResourceLoader.loadCachedResource(ResourceTypes['dlg'], this.resref);
        if(buffer){
          this.gff = new GFFObject(buffer);
          this.init();
          resolve();
        }else{
          reject();
        }
      }else{
        reject();
      }
    });
  }

  static FromGFFObject(gff: GFFObject): DLGObject {
    const dlg = new DLGObject();
    dlg.gff = gff;
    dlg.init();
    return dlg;
  }

  static FromResRef(resref: string): DLGObject {
    if(resref){
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['dlg'], resref.toLocaleLowerCase());
      if(buffer){
        const dlg = DLGObject.FromGFFObject(new GFFObject(buffer));
        if(dlg){
          dlg.resref = resref.toLocaleLowerCase();
        }
        return dlg;
      }
    }
    return;
  }

}

