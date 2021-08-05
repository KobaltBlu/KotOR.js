class ActionSetCommandable extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionSetCommandable;

    //PARAMS
    // 0 - int: commandable value
    
  }

  update(delta){
    if(this.object instanceof ModuleObject){
      this.object.setCommandable( this.getParameter(0) ? 1 : 0 );
      return Action.STATUS.COMPLETE;
    }
    return Action.STATUS.FAILED;
  }

}

module.exports = ActionSetCommandable;