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

export class DLGObject {
  resref: string;
  gff: GFFObject;
  conversationType: number;
  entryList: any[] = [];
  replyList: any[] = [];
  startingList: any[] = [];
  stuntActors: any[] = [];
  stunt: any[] = [];
  owner: any;
  listener: any;
  vo_id: any;
  cameraModel: any;
  onEndConversationAbort: any;
  onEndConversation: any;
  isAnimatedCutscene: boolean;
  ambientTrack: any;
  unequipHeadItem: boolean;
  unequipItems: boolean;
  animatedCamera: any;

  constructor(resref = ''){
    this.resref = resref;

    this.conversationType = 0;
    this.entryList = [];
    this.replyList = [];
    this.startingList = [];
    this.stuntActors = [];
    this.stunt = [];

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
      this.cameraModel = this.gff.json.fields.CameraModel.value;
    
    if(this.gff.json.fields.EndConverAbort)
      this.onEndConversationAbort = this.gff.json.fields.EndConverAbort.value;

    if(this.gff.json.fields.EndConversation)
      this.onEndConversation = this.gff.json.fields.EndConversation.value;

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
      this.entryList.push(
        node
      );
    }

    for(let i = 0; i < this.gff.json.fields.ReplyList.structs.length; i++){
      let node = DLGNode.FromDialogStruct(this.gff.json.fields.ReplyList.structs[i].fields);
      node.dialog = this;
      this.replyList.push(
        node
      );
    }

    for(let i = 0; i < this.gff.json.fields.StuntList.structs.length; i++){
      let stnt = this.gff.json.fields.StuntList.structs[i].fields;
      this.stuntActors.push({
        participant: stnt.Participant.value != '' ? stnt.Participant.value : 'OWNER',
        model: stnt.StuntModel.value
      });
    }

    for(let i = 0; i < this.gff.json.fields.StartingList.structs.length; i++){
      let _node = this.gff.json.fields.StartingList.structs[i].fields;
      let linkNode = new DLGNode();
      linkNode.dialog = this;
      
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
        linkNode.isActive = _node.Active.value;
      }

      if(typeof _node.Active2 !== 'undefined'){
        linkNode.isActive2 = _node.Active2.value;
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

  async getNextEntryIndex( entryLinkList: any[] = [] ){
    if(!entryLinkList.length){
      return undefined;
    }

    let e_count = entryLinkList.length;
    for(let i = 0; i < e_count; i++){
      let entryLink = entryLinkList[i];
      let isActive = await entryLink.runActiveScripts();
      if(isActive){
        return entryLink.index;
      }
    }

    return undefined;
  }

  async loadStuntCamera(){
    return new Promise<void>( (resolve, reject) => {
      if(this.cameraModel != ''){
        GameState.ModelLoader.load({
          file: this.cameraModel,
          onLoad: (model: OdysseyModel) => {
            OdysseyModel3D.FromMDL(model, { 
              onComplete: (model: OdysseyModel3D) => {
                this.animatedCamera = model;
                this.animatedCamera.bonesInitialized = true;
                resolve();
              }
            });
          }
        });
      }else{
        resolve();
      }
    });
  }

  async loadStuntActor( actor: any ){
    return new Promise<void>( (resolve, reject) => {
      let model: any;
      if(actor.participant == 'PLAYER'){
        model = GameState.player.model;
        //Load the actor's supermodel
        GameState.ModelLoader.load({
          file: actor.model,
          onLoad: (actorModel: OdysseyModel) => {
            OdysseyModel3D.FromMDL(actorModel, { 
              onComplete: (actorSuperModel: OdysseyModel3D) => {
                GameState.player.model.odysseyAnimations = GameState.player.model.odysseyAnimations.concat(actorSuperModel.animations);
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
    
                this.stunt[actor.participant.toLowerCase()] = GameState.player;
                resolve();
              }
            });
          }
        });
      }else if(actor.participant == 'OWNER'){

        (this.stunt as any)['owner'] = this.owner;
        if(this.isAnimatedCutscene)
          this.owner.setFacing(0, true);
        
        resolve();

      }else{
        let creature = ModuleObjectManager.GetObjectByTag(actor.participant);
        if(creature){
          model = creature.model;
          //Load the actor's supermodel
          GameState.ModelLoader.load({
            file: actor.model,
            onLoad: (actorModel: OdysseyModel) => {
              OdysseyModel3D.FromMDL(actorModel, { 
                onComplete: (actorSuperModel: OdysseyModel3D) => {
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
      
                  this.stunt[actor.participant.toLowerCase()] = creature;
                  //console.log('STUNT', this.stunt[actor.participant.toLowerCase()]);
                  resolve();
                }
              });
            }
          });
        }else{
          resolve();
        }
      }
    });
  }

  async loadStuntActors(){

    for(let i = 0; i < this.stuntActors.length; i++){
      let actor = this.stuntActors[i];
      await this.loadStuntActor(actor);
    }

  }

  async load(){
    return new Promise<void>( (resolve, reject) => {
      TemplateLoader.Load({
        ResRef: this.resref,
        ResType: ResourceTypes.dlg,
        onLoad: (gff: GFFObject) => {
          this.gff = gff;
          this.init();
          resolve();
        },
        onFail: () => {
          reject();
        }
      });
    });
  }

}

