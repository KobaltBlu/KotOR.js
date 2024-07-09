import { GameState } from "../GameState";
import type { ModuleCreature, ModuleObject } from "../module";
import { OdysseyModel } from "../odyssey";
import { OdysseyModel3D } from "../three/odyssey";
import { DLGNode } from "./DLGNode";
import { GFFObject } from "./GFFObject";
import { ResourceTypes } from "./ResourceTypes";
import * as THREE from "three";
import { IDLGStuntActor } from "../interface/dialog/IDLGStuntActor";
import { DLGNodeType } from "../enums/dialog/DLGNodeType";
import type { NWScriptInstance } from "../nwscript/NWScriptInstance";
// import { NWScript } from "../nwscript/NWScript";
import { MDLLoader, ResourceLoader } from "../loaders";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums";

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
  isAnimatedCutscene: boolean;
  animatedCameraResRef: string;
  animatedCamera: OdysseyModel3D;
  recordNoVO: boolean;
  oldHitCheck: boolean;
  postProcOwner: number;
  alienRaceOwner: number;

  constructor(resref = ''){
    this.resref = resref;

    this.conversationType = 0;
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

    if(this.gff.RootNode.hasField('VO_ID')){
      this.vo_id = this.gff.RootNode.getFieldByLabel('VO_ID').getValue();
    }

    if(this.gff.RootNode.hasField('CameraModel')){
      this.animatedCameraResRef = this.gff.RootNode.getFieldByLabel('CameraModel').getValue();
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
        let node = DLGNode.FromDialogStruct(entries[i]);
        node.dialog = this;
        node.nodeType = DLGNodeType.ENTRY;
        this.entryList.push( node );
      }
    }

    if(this.gff.RootNode.hasField('ReplyList')){
      const replies = this.gff.RootNode.getFieldByLabel('ReplyList').getChildStructs();
      for(let i = 0; i < replies.length; i++){
        let node = DLGNode.FromDialogStruct(replies[i]);
        node.dialog = this;
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
        let linkNode = new DLGNode();
        linkNode.dialog = this;
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

  async loadStuntActor( actor: IDLGStuntActor ){
    return new Promise<void>( (resolve, reject) => {
      let model: any;
      if(actor.participant == 'PLAYER'){
        model = GameState.PartyManager.party[0].model;
        //Load the actor's supermodel
        MDLLoader.loader.load(actor.resref)
        .then((actorModel: OdysseyModel) => {
          OdysseyModel3D.FromMDL(actorModel)
          .then((actorSuperModel: OdysseyModel3D) => {
            actor.animations = actorSuperModel.odysseyAnimations;

            if(this.isAnimatedCutscene)
              GameState.PartyManager.party[0].setFacing(0, true);

            if(this.unequipItems)
              GameState.PartyManager.party[0].UnequipItems();

            if(this.unequipHeadItem)
              GameState.PartyManager.party[0].UnequipHeadItem();

            actor.moduleObject = GameState.PartyManager.party[0];
            if(actor.moduleObject){
              actor.moduleObject.setCutsceneMode(true);
            }
            resolve();
          }).catch(resolve);
        }).catch(resolve);
      }else if(actor.participant == 'OWNER'){

        actor.moduleObject = this.owner;
        if(this.isAnimatedCutscene)
          this.owner.setFacing(0, true);

        if(actor.moduleObject){
          actor.moduleObject.setCutsceneMode(true);
        }
        
        resolve();

      }else{
        let creature = GameState.ModuleObjectManager.GetObjectByTag(actor.participant);
        if(creature){
          model = creature.model;
          //Load the actor's supermodel
          MDLLoader.loader.load(actor.resref)
          .then((actorModel: OdysseyModel) => {
            OdysseyModel3D.FromMDL(actorModel)
            .then((actorSuperModel: OdysseyModel3D) => {
              actor.animations = actorSuperModel.odysseyAnimations;

              if(this.isAnimatedCutscene)
                creature.setFacing(0, true);

              model.box = new THREE.Box3().setFromObject(model);

              if(this.unequipItems && BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature))
                (creature as ModuleCreature).UnequipItems();

              if(this.unequipHeadItem && BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature))
                (creature as ModuleCreature).UnequipHeadItem();

              actor.moduleObject = creature;
              if(actor.moduleObject){
                actor.moduleObject.setCutsceneMode(true);
              }
              resolve();
            }).catch(resolve);
          }).catch(resolve);
        }else{
          resolve();
        }
      }
    });
  }

  async loadStuntActors(){
    for (var [key, actor] of this.stuntActors.entries()) {
      await this.loadStuntActor(actor);
    };
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

