class ActionDialogObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionDialogObject;

    //PARAMS
    // 0 - dword: speaker object id
    // 1 - string : conversation resref
    // 2 - int: 
    // 3 - int: 
    // 4 - int: ignoreStartRange
    // 5 - dword: listener? object_invalid mostly
    
  }

  update(delta){
    //console.log('ActionDialogObject', this);

    this.target = ModuleObject.GetObjectById(this.getParameter(0) || ModuleObject.OBJECT_INVALID);
    let conversation = this.getParameter(1) || '';
    let ignoreStartRange = this.getParameter(4) || 0;

    if(this.owner instanceof ModuleCreature){
      if(!Game.inDialog){
        let distance = Utility.Distance2D(this.owner.position, this.target.position);
        if(distance > 4.5 && !ignoreStartRange){
          try{
            this.actionPathfinder(4.5, undefined, delta);
          }catch(e){}
          return Action.STATUS.WAITING;
        }else{
          this.owner.animState = ModuleCreature.AnimState.IDLE;
          this.owner.force = 0;

          this.target._conversation = this.owner.conversation;
          this._conversation = this.owner.conversation;

          this.owner.heardStrings = [];
          this.target.heardStrings = [];
          if(this.target.scripts.onDialog instanceof NWScriptInstance){
            this.target.onDialog(this.owner, -1);
          }else{
            Game.InGameDialog.StartConversation(this.owner.conversation, this.target, this.owner);
          }
          return Action.STATUS.COMPLETE;
        }
      }else{
        console.log('ActionDialogObject: Already in dialog', this);
        return Action.STATUS.FAILED;
      }
    }else{
      Game.InGameDialog.StartConversation(this.owner.conversation ? conversation : this.owner.conversation, this.owner, this.target);
      return Action.STATUS.COMPLETE;
    }
    
    return Action.STATUS.FAILED;
  }

}

module.exports = ActionDialogObject;