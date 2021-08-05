class ActionPauseDialog extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionPauseDialog;
  }

}

module.exports = ActionPauseDialog;