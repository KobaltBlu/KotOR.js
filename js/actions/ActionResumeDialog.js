class ActionResumeDialog extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionResumeDialog;
  }

}

module.exports = ActionResumeDialog;