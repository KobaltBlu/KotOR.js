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
import { GFFStruct } from "./GFFStruct";

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

    let conversationType = this.gff.RootNode.GetFieldByLabel('ConversationType');
    if(conversationType){
      this.conversationType = conversationType.GetValue();
    }

    if(this.gff.RootNode.HasField('VO_ID')){
      this.vo_id = this.gff.RootNode.GetFieldByLabel('VO_ID').GetValue();
    }

    if(this.gff.RootNode.HasField('CameraModel')){
      this.animatedCameraResRef = this.gff.RootNode.GetFieldByLabel('ObjectId').GetValue();
    }

    if(this.gff.RootNode.HasField('EndConverAbort')){
      const scriptName = this.gff.RootNode.GetFieldByLabel('EndConverAbort').GetValue();
      this.scripts.onEndConversationAbort = NWScript.Load(scriptName);
      if(this.scripts.onEndConversationAbort){
        this.scripts.onEndConversationAbort.name = scriptName;
      }
    }

    if(this.gff.RootNode.HasField('EndConversation')){
      const scriptName = this.gff.RootNode.GetFieldByLabel('EndConversation').GetValue();
      this.scripts.onEndConversation = NWScript.Load(scriptName);
      if(this.scripts.onEndConversation){
        this.scripts.onEndConversation.name = scriptName;
      }
    }

    if(this.gff.RootNode.HasField('AnimatedCut')){
      this.isAnimatedCutscene = this.gff.RootNode.GetFieldByLabel('AnimatedCut').GetValue() ? true : false;
    }

    if(this.gff.RootNode.HasField('AmbientTrack')){
      this.ambientTrack = this.gff.RootNode.GetFieldByLabel('AmbientTrack').GetValue();
    }

    if(this.gff.RootNode.HasField('UnequipHItem')){
      this.unequipHeadItem = this.gff.RootNode.GetFieldByLabel('UnequipHItem').GetValue() ? true : false;
    }

    if(this.gff.RootNode.HasField('UnequipItems')){
      this.unequipItems = this.gff.RootNode.GetFieldByLabel('UnequipItems').GetValue() ? true : false;
    }

    if(this.gff.RootNode.HasField('EntryList')){
      const entries = this.gff.RootNode.GetFieldByLabel('EntryList').GetChildStructs();
      for(let i = 0; i < entries.length; i++){
        let node = DLGNode.FromDialogStruct(entries[i]);
        node.dialog = this;
        node.nodeType = DLGNodeType.ENTRY;
        this.entryList.push( node );
      }
    }

    if(this.gff.RootNode.HasField('ReplyList')){
      const replies = this.gff.RootNode.GetFieldByLabel('ReplyList').GetChildStructs();
      for(let i = 0; i < replies.length; i++){
        let node = DLGNode.FromDialogStruct(replies[i]);
        node.dialog = this;
        node.nodeType = DLGNodeType.REPLY;
        this.replyList.push( node );
      }
    }

    if(this.gff.RootNode.HasField('StuntList')){
      const stunts = this.gff.RootNode.GetFieldByLabel('StuntList').GetChildStructs();
      for(let i = 0; i < stunts.length; i++){
        const stunt: DLGStuntActor = {
          participant: '',
          resref: ''
        };

        const struct = stunts[i];
        if(struct.HasField('Participant')){
          stunt.participant = struct.GetFieldByLabel('Participant').GetValue();
          stunt.participant = stunt.participant != '' ? stunt.participant : 'OWNER';
        }

        if(struct.HasField('StuntModel')){
          stunt.participant = struct.GetFieldByLabel('StuntModel').GetValue();
        }

        this.stuntActors.set(stunt.participant.toLocaleLowerCase(), stunt);
      }
    }

    if(this.gff.RootNode.HasField('StartingList')){
      const startingList = this.gff.RootNode.GetFieldByLabel('StartingList').GetChildStructs();

      for(let i = 0; i < startingList.length; i++){
        let struct = startingList[i];
        let linkNode = new DLGNode();
        linkNode.dialog = this;
        linkNode.nodeType = DLGNodeType.STARTING;
        
        linkNode.entries = [];
        linkNode.replies = [];

        if(struct.HasField('Not')){
          linkNode.isActiveParams.Not = struct.GetFieldByLabel('Not').GetValue();
        }

        if(struct.HasField('Param1')){
          linkNode.isActiveParams.Param1 = struct.GetFieldByLabel('Param1').GetValue();
        }

        if(struct.HasField('Param2')){
          linkNode.isActiveParams.Param2 = struct.GetFieldByLabel('Param2').GetValue();
        }

        if(struct.HasField('Param3')){
          linkNode.isActiveParams.Param3 = struct.GetFieldByLabel('Param3').GetValue();
        }

        if(struct.HasField('Param4')){
          linkNode.isActiveParams.Param4 = struct.GetFieldByLabel('Param4').GetValue();
        }

        if(struct.HasField('Param5')){
          linkNode.isActiveParams.Param5 = struct.GetFieldByLabel('Param5').GetValue();
        }

        if(struct.HasField('ParamStrA')){
          linkNode.isActiveParams.String = struct.GetFieldByLabel('ParamStrA').GetValue();
        }

        if(struct.HasField('Not2')){
          linkNode.isActive2Params.Not = struct.GetFieldByLabel('Not2').GetValue();
        }

        if(struct.HasField('Param1b')){
          linkNode.isActive2Params.Param1 = struct.GetFieldByLabel('Param1b').GetValue();
        }

        if(struct.HasField('Param2b')){
          linkNode.isActive2Params.Param2 = struct.GetFieldByLabel('Param2b').GetValue();
        }

        if(struct.HasField('Param3b')){
          linkNode.isActive2Params.Param3 = struct.GetFieldByLabel('Param3b').GetValue();
        }

        if(struct.HasField('Param4b')){
          linkNode.isActive2Params.Param4 = struct.GetFieldByLabel('Param4b').GetValue();
        }

        if(struct.HasField('Param5b')){
          linkNode.isActive2Params.Param5 = struct.GetFieldByLabel('Param5b').GetValue();
        }

        if(struct.HasField('ParamStrB')){
          linkNode.isActive2Params.String = struct.GetFieldByLabel('ParamStrB').GetValue();
        }

        if(struct.HasField('Logic')){
          linkNode.Logic = !!struct.GetFieldByLabel('Logic').GetValue();
        }

        if(struct.HasField('Active')){
          const resref = struct.GetFieldByLabel('Active').GetValue();
          if(resref){
            linkNode.isActive = NWScript.Load(resref);
            if(linkNode.isActive instanceof NWScriptInstance){
              linkNode.isActive.name = resref;
            }
          }
        }

        if(struct.HasField('Active2')){
          const resref = struct.GetFieldByLabel('Active2').GetValue();
          if(resref){
            linkNode.isActive2 = NWScript.Load(resref);
            if(linkNode.isActive2 instanceof NWScriptInstance){
              linkNode.isActive2.name = resref;
            }
          }
        }

        if(struct.HasField('Index')){
          linkNode.index = struct.GetFieldByLabel('Index').GetValue();
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

