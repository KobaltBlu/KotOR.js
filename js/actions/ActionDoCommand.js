class ActionDoCommand extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionDoCommand;

    //PARAMS
    // 0 - script_situation: NWScriptInstance

  }

  update(delta){
    if(this.script instanceof NWScriptInstance){
      this.script.beginLoop({
        _instr: null, 
        index: -1, 
        seek: this.action.offset
      });
      return Action.STATUS.COMPLETE;
    }else{
      console.error('ActionDoCommand: Not an instanceof NWScriptInstance');
      return Action.STATUS.FAILED;
    }
    
    return Action.STATUS.FAILED;
  }

}

module.exports = ActionDoCommand;