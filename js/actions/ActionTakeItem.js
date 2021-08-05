class ActionTakeItem extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionTakeItem;
  }

}

module.exports = ActionTakeItem;