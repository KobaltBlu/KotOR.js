class ActionPauseDialog extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionPauseDialog;
  }

  update(){
    Game.InGameDialog.PauseConversation();
    return Action.STATUS.COMPLETE;
  }

}

module.exports = ActionPauseDialog;