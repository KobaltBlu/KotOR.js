class ActionLockObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionLockObject;

    //PARAMS
    // 0 - dword: object id
    
  }

}

module.exports = ActionLockObject;