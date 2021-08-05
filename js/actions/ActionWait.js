class ActionWait extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionWait;

    //PARAMS
    // 0 - float: delta time left to wait
    
  }

  update(delta){
    if( this.setParameter(0, 1, this.getParameter(0) - delta) <= 0 ){
      return Action.STATUS.COMPLETE;
    }
    return Action.STATUS.IN_PROGRESS;
  }

}

module.exports = ActionWait;