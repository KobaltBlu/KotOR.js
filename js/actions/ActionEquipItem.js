class ActionEquipItem extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionEquipItem;
  }

}

module.exports = ActionEquipItem;