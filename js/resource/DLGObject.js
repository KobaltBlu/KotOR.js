const { resolve } = require("bluebird");
const DLGNode = require("./DLGNode");

class DLGObject {

  constructor(resref = ''){
    this.resref = resref;
    this.gff = undefined;

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

    let conversationType = this.gff.GetFieldByLabel('ConversationType') || 0;
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
      
      linkNode.entries = undefined;
      linkNode.replies = undefined;

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

  async getNextEntryIndex( entryLinkList = [] ){
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
    return new Promise( (resolve, reject) => {
      if(this.cameraModel != ''){
        Game.ModelLoader.load({
          file: this.cameraModel,
          onLoad: (model) => {
            THREE.AuroraModel.FromMDL(model, { 
              onComplete: (model) => {
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

  async loadStuntActor( actor = undefined ){
    return new Promise( (resolve, reject) => {
      let model;
      if(actor.participant == 'PLAYER'){
        model = Game.player.model;
        //Load the actor's supermodel
        Game.ModelLoader.load({
          file: actor.model,
          onLoad: (actorModel) => {
            THREE.AuroraModel.FromMDL(actorModel, { 
              onComplete: (actorSuperModel) => {
                Game.player.model.animations = Game.player.model.animations.concat(actorSuperModel.animations);
                //console.log('actor', actorSuperModel.animations)
                //Game.player.anim = true;

                if(this.isAnimatedCutscene)
                  Game.player.setFacing(0, true);

                if(this.unequipItems)
                  Game.player.UnequipItems();

                if(this.unequipHeadItem)
                  Game.player.UnequipHeadItem();

                if(Game.player.model.skins){
                  for(let i = 0; i < Game.player.model.skins.length; i++){
                    Game.player.model.skins[i].frustumCulled = false;
                  }
                }
    
                this.stunt[actor.participant.toLowerCase()] = Game.player;
                resolve();
              }
            });
          }
        });
      }else if(actor.participant == 'OWNER'){

        this.stunt['OWNER'.toLowerCase()] = this.owner;
        if(this.isAnimatedCutscene)
          this.owner.setFacing(0, true);
        
        resolve();

      }else{
        let creature = Game.GetObjectByTag(actor.participant);
        if(creature){
          model = creature.model;
          //Load the actor's supermodel
          Game.ModelLoader.load({
            file: actor.model,
            onLoad: (actorModel) => {
              THREE.AuroraModel.FromMDL(actorModel, { 
                onComplete: (actorSuperModel) => {
                  model.animations = actorSuperModel.animations;

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
    return new Promise( (resolve, reject) => {
      TemplateLoader.Load({
        ResRef: this.resref,
        ResType: ResourceTypes.dlg,
        onLoad: (gff) => {
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

DLGObject.ConversationType = {
  CONVERSATION: 0,
  COMPUTER: 1
};

module.exports = DLGObject;