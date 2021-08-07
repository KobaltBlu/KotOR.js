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

    this.target = this.getParameter(0);
    let conversation = this.getParameter(1) || '';
    let ignoreStartRange = this.getParameter(4) || 0;

    if(this.owner instanceof ModuleCreature){
      if(!Game.inDialog){
        let distance = Utility.Distance2D(this.owner.position, this.target.position);
        if(distance > 4.5 && !ignoreStartRange){

          this.owner.openSpot = undefined;
          let actionMoveToTarget = new ActionMoveToPoint();
          actionMoveToTarget.setParameter(0, Action.Parameter.TYPE.FLOAT, this.target.position.x);
          actionMoveToTarget.setParameter(1, Action.Parameter.TYPE.FLOAT, this.target.position.y);
          actionMoveToTarget.setParameter(2, Action.Parameter.TYPE.FLOAT, this.target.position.z);
          actionMoveToTarget.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
          actionMoveToTarget.setParameter(4, Action.Parameter.TYPE.DWORD, this.target.id);
          actionMoveToTarget.setParameter(5, Action.Parameter.TYPE.INT, 1);
          actionMoveToTarget.setParameter(6, Action.Parameter.TYPE.FLOAT, 4.5 );
          actionMoveToTarget.setParameter(7, Action.Parameter.TYPE.INT, 0);
          actionMoveToTarget.setParameter(8, Action.Parameter.TYPE.FLOAT, 30.0);
          this.owner.actionQueue.addFront(actionMoveToTarget);

          return Action.STATUS.IN_PROGRESS;
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
        console.log('ActionDialogObject: Already in dialog', this.owner.getName(), this.owner.getTag());
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