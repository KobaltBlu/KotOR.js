import { GameState } from "../GameState";
import { TemplateLoader } from "../loaders/TemplateLoader";
import { ModuleCreature } from "../module";
import { OdysseyModel } from "../odyssey";
import { OdysseyModel3D } from "../three/odyssey";
import { DLGNode } from "./DLGNode";
import { GFFObject } from "./GFFObject";
import { ResourceTypes } from "./ResourceTypes";
import * as THREE from "three";
import { ModuleObjectManager } from "../managers/ModuleObjectManager";
import { DLGStuntActor } from "../interface/dialog/DLGStuntActor";
import { DLGNodeType } from "../enums/dialog/DLGNodeType";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScript } from "../nwscript/NWScript";
import { ResourceLoader } from "./ResourceLoader";

export interface DLGObjectScripts {
  onEndConversationAbort: NWScriptInstance,
  onEndConversation: NWScriptInstance,
}

export class DLGObject {
  resref: string;
  gff: GFFObject;
  conversationType: number;
  entryList: DLGNode[] = [];
  replyList: DLGNode[] = [];
  startingList: DLGNode[] = [];
  stuntActors: Map<string, DLGStuntActor> = new Map();
  owner: any;
  listener: any;
  vo_id: any;

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

    let conversationType = this.gff.GetFieldByLabel('ConversationType');
    if(conversationType){
      this.conversationType = conversationType.GetValue();
    }

    if(this.gff.json.fields.VO_ID)
      this.vo_id = this.gff.json.fields.VO_ID.value;
    
    if(this.gff.json.fields.CameraModel)
      this.animatedCameraResRef = this.gff.json.fields.CameraModel.value;
    
    if(this.gff.json.fields.EndConverAbort){
      const scriptName = this.gff.json.fields.EndConverAbort.value;
      this.scripts.onEndConversationAbort = NWScript.Load(scriptName);
      if(this.scripts.onEndConversationAbort){
        this.scripts.onEndConversationAbort.name = scriptName;
      }
    }

    if(this.gff.json.fields.EndConversation){
      const scriptName = this.gff.json.fields.EndConversation.value;
      this.scripts.onEndConversation = NWScript.Load(scriptName);
      if(this.scripts.onEndConversation){
        this.scripts.onEndConversation.name = scriptName;
      }
    }

    if(this.gff.json.fields.AnimatedCut)
      this.isAnimatedCutscene = this.gff.json.fields.AnimatedCut.value ? true : false;

    if(this.gff.json.fields.AmbientTrack)
      this.ambientTrack = this.gff.json.fields.AmbientTrack.value;

    if(this.gff.json.fields.UnequipHItem)
      this.unequipHeadItem = this.gff.json.fields.UnequipHItem.value ? true : false;

    if(this.gff.json.fields.UnequipItems)
      this.unequipItems = this.gff.json.fields.UnequipItems.value ? true : false;

    for(let i = 0; i < this.gff.json.fields.EntryList.structs.length; i++){
      let node = DLGNode.FromDialogStruct(this.gff.json.fields.EntryList.structs[i].fields);
      node.dialog = this;
      node.nodeType = DLGNodeType.ENTRY;
      this.entryList.push( node );
    }

    for(let i = 0; i < this.gff.json.fields.ReplyList.structs.length; i++){
      let node = DLGNode.FromDialogStruct(this.gff.json.fields.ReplyList.structs[i].fields);
      node.dialog = this;
      node.nodeType = DLGNodeType.REPLY;
      this.replyList.push( node );
    }

    for(let i = 0; i < this.gff.json.fields.StuntList.structs.length; i++){
      let stnt = this.gff.json.fields.StuntList.structs[i].fields;
      let participant: string = stnt.Participant.value != '' ? stnt.Participant.value : 'OWNER';
      this.stuntActors.set(participant.toLocaleLowerCase(), {
        participant: participant,
        resref: stnt.StuntModel.value
      });
    }

    for(let i = 0; i < this.gff.json.fields.StartingList.structs.length; i++){
      let _node = this.gff.json.fields.StartingList.structs[i].fields;
      let linkNode = new DLGNode();
      linkNode.dialog = this;
      linkNode.nodeType = DLGNodeType.STARTING;
      
      linkNode.entries = [];
      linkNode.replies = [];

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
        linkNode.isActive = NWScript.Load(_node.Active.value);
        if(linkNode.isActive instanceof NWScriptInstance){
          linkNode.isActive.name = _node.Active.value;
        }
      }

      if(typeof _node.Active2 !== 'undefined'){
        linkNode.isActive2 = NWScript.Load(_node.Active2.value);
        if(linkNode.isActive2 instanceof NWScriptInstance){
          linkNode.isActive2.name = _node.Active.value;
        }
      }

      if(typeof _node.Index !== 'undefined'){
        linkNode.index = _node.Index.value;
      }

      this.startingList.push(linkNode);
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

  async loadStuntCamera(){
    return new Promise<void>( (resolve, reject) => {
      if(!!this.animatedCameraResRef){
        GameState.ModelLoader.load(this.animatedCameraResRef)
        .then((model: OdysseyModel) => {
          OdysseyModel3D.FromMDL(model)
          .then((model: OdysseyModel3D) => {
            this.animatedCamera = model;
            this.animatedCamera.bonesInitialized = true;
            resolve();
          }).catch(resolve);
        }).catch(resolve);
      }else{
        resolve();
      }
    });
  }

  async loadStuntActor( actor: DLGStuntActor ){
    return new Promise<void>( (resolve, reject) => {
      let model: any;
      if(actor.participant == 'PLAYER'){
        model = GameState.player.model;
        //Load the actor's supermodel
        GameState.ModelLoader.load(actor.resref)
        .then((actorModel: OdysseyModel) => {
          OdysseyModel3D.FromMDL(actorModel)
          .then((actorSuperModel: OdysseyModel3D) => {
            GameState.player.model.odysseyAnimations = GameState.player.model.odysseyAnimations.concat(actorSuperModel.odysseyAnimations);
            //console.log('actor', actorSuperModel.animations)
            //GameState.player.anim = true;

            if(this.isAnimatedCutscene)
              GameState.player.setFacing(0, true);

            if(this.unequipItems)
              GameState.player.UnequipItems();

            if(this.unequipHeadItem)
              GameState.player.UnequipHeadItem();

            if(GameState.player.model.skins){
              for(let i = 0; i < GameState.player.model.skins.length; i++){
                GameState.player.model.skins[i].frustumCulled = false;
              }
            }
            actor.moduleObject = GameState.player;
            resolve();
          }).catch(resolve);
        }).catch(resolve);
      }else if(actor.participant == 'OWNER'){

        actor.moduleObject = this.owner;
        if(this.isAnimatedCutscene)
          this.owner.setFacing(0, true);
        
        resolve();

      }else{
        let creature = ModuleObjectManager.GetObjectByTag(actor.participant);
        if(creature){
          model = creature.model;
          //Load the actor's supermodel
          GameState.ModelLoader.load(actor.resref)
          .then((actorModel: OdysseyModel) => {
            OdysseyModel3D.FromMDL(actorModel)
            .then((actorSuperModel: OdysseyModel3D) => {
              model.odysseyAnimations = actorSuperModel.animations;

              //console.log('actor', actorSuperModel.animations)

              if(this.isAnimatedCutscene)
                creature.setFacing(0, true);

              model.box = new THREE.Box3().setFromObject(model);

              if(this.unequipItems && creature instanceof ModuleCreature)
                creature.UnequipItems();

              if(this.unequipHeadItem && creature instanceof ModuleCreature)
                creature.UnequipHeadItem();

              if(model.skins){
                for(let i = 0; i < model.skins.length; i++){
                  model.skins[i].frustumCulled = false;
                }
              }
  
              actor.moduleObject = creature;
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
    this.stuntActors.forEach( async (actor) => {
      await this.loadStuntActor(actor);
    });
  }

  releaseStuntActors(){
    while (GameState.group.stunt.children.length) {
      GameState.group.stunt.remove(GameState.group.stunt.children[0]);
    }
    this.stuntActors.forEach( async (actor) => {
      const moduleObject = actor.moduleObject;
      if(moduleObject){
        const model = moduleObject.model;
        if(model){
          if (model.skins) {
            for (let i = 0; i < model.skins.length; i++) {
              model.skins[i].frustumCulled = true;
            }
          }
        }
        moduleObject.clearAllActions();
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
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['dlg'], resref);
      if(buffer){
        const dlg = DLGObject.FromGFFObject(new GFFObject(buffer));
        if(dlg){
          dlg.resref = resref;
        }
        return dlg;
      }
    }
    return;
  }

}

