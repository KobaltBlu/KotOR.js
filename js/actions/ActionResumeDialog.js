class ActionResumeDialog extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionResumeDialog;
  }

  update(){
    Game.InGameDialog.ResumeConversation();
    console.log('ActionResumeDialog', this.owner.getName(), this.owner.getTag());
    return Action.STATUS.COMPLETE;
  }

}

module.exports = ActionResumeDialog;