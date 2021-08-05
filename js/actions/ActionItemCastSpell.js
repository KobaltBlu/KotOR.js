class ActionItemCastSpell extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionItemCastSpell;
  }

}

module.exports = ActionItemCastSpell;